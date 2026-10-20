#!/usr/bin/env bash
# One-time setup for the Deploy Hosting job in .github/workflows/ci.yml.
#
# The job holds no stored credential. Workload Identity Federation trades its
# GitHub OIDC token for a short-lived token of a service account that can only
# manage Firebase Hosting, so there is no key to leak or rotate.
#
# The provider condition pins the job, not just the repository: claude.yml also
# holds `id-token: write` and runs on main for issue and comment events, and a
# repository-only condition would let it deploy. The workflow file and ref
# exclude every other workflow and pull requests; the event and the
# `production` environment in `sub` exclude any other job or trigger in ci.yml.
#
# Needs gcloud signed in as a project owner and gh signed in as a repository
# admin. Safe to re-run: existing resources are kept and the provider
# condition is brought back in line with this file.
set -euo pipefail

PROJECT_ID=crescebr-portfolio-9048
REPOSITORY=oguarni/crescebr-b2b-marketplace
# Immutable, unlike the name: a deleted and re-created repository of the same
# name gets a new ID and cannot inherit this trust.
REPOSITORY_ID=993609424
POOL=github
PROVIDER=crescebr-ci
SERVICE_ACCOUNT_NAME=github-hosting-deploy
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
WORKFLOW_REF="${REPOSITORY}/.github/workflows/ci.yml@refs/heads/main"
CONDITION="assertion.repository_id == '${REPOSITORY_ID}' && assertion.workflow_ref == '${WORKFLOW_REF}' && assertion.event_name == 'push' && assertion.sub == 'repo:${REPOSITORY}:environment:production'"
ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.workflow_ref=assertion.workflow_ref"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
PROVIDER_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"

echo "Enabling the IAM APIs that the token exchange uses"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com --project "$PROJECT_ID"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating service account $SERVICE_ACCOUNT"
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" --project "$PROJECT_ID" \
    --display-name "GitHub Actions Firebase Hosting deploy"
fi

# The two roles Firebase's own GitHub integration grants for Hosting deploys,
# without the Auth and Cloud Run roles it adds for preview channels and
# Cloud Run rewrites, neither of which this site uses.
for role in roles/firebasehosting.admin roles/serviceusage.apiKeysViewer; do
  echo "Granting $role"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}" \
    --role "$role" --condition None >/dev/null
done

if ! gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT_ID" --location global \
  >/dev/null 2>&1; then
  echo "Creating workload identity pool $POOL"
  gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global \
    --display-name "GitHub Actions"
fi

if gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT_ID" \
  --location global --workload-identity-pool "$POOL" >/dev/null 2>&1; then
  echo "Updating provider $PROVIDER"
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" --project "$PROJECT_ID" \
    --location global --workload-identity-pool "$POOL" \
    --attribute-mapping "$ATTRIBUTE_MAPPING" --attribute-condition "$CONDITION"
else
  echo "Creating provider $PROVIDER"
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT_ID" \
    --location global --workload-identity-pool "$POOL" --display-name "CresceBR CI deploy" \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping "$ATTRIBUTE_MAPPING" --attribute-condition "$CONDITION"
fi

echo "Letting the provider impersonate $SERVICE_ACCOUNT"
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository_id/${REPOSITORY_ID}" \
  >/dev/null

# Not a secret: it names the provider, and only a token that passes the
# condition above can use it.
echo "Setting GCP_WORKLOAD_IDENTITY_PROVIDER on $REPOSITORY"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPOSITORY" --body "$PROVIDER_NAME"

echo "Done. The next push to main deploys through $PROVIDER_NAME"
