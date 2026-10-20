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
# Needs gcloud signed in as a project owner. Safe to re-run: existing resources
# are kept and the provider condition is brought back in line with this file.
# It never removes a role binding, so a role dropped from this file has to be
# removed by hand.
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

# ci.yml names the provider and the service account itself, so a mismatch here
# would build a trust configuration that no deploy uses. Check before changing
# anything.
CI_WORKFLOW="$(dirname "$0")/../.github/workflows/ci.yml"
for expected in "workload_identity_provider: ${PROVIDER_NAME}" "service_account: ${SERVICE_ACCOUNT}"; do
  if ! grep -qF "$expected" "$CI_WORKFLOW"; then
    echo "error: ${CI_WORKFLOW} does not contain '${expected}'" >&2
    exit 1
  fi
done

echo "Enabling the IAM APIs that the token exchange uses"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com --project "$PROJECT_ID"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating service account $SERVICE_ACCOUNT"
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" --project "$PROJECT_ID" \
    --display-name "GitHub Actions Firebase Hosting deploy"
fi

# A Hosting deploy checks only firebase.projects.get and
# firebasehosting.sites.update (firebase-tools 15.34.0, lib/deploy/index.js),
# and Firebase Hosting Admin holds both. Firebase's own GitHub integration also
# grants API Keys Viewer, Firebase Auth Admin and Cloud Run Viewer; this deploy
# uses none of them. Firebase's docs ask CLI users for API Keys Viewer because
# a `source` web-framework deploy reads the web app config, API key included.
# The deploy job refuses such a config, so recheck this when upgrading the CLI.
echo "Granting roles/firebasehosting.admin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:${SERVICE_ACCOUNT}" \
  --role roles/firebasehosting.admin --condition None >/dev/null

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

echo "Done. The next push to main deploys through $PROVIDER_NAME"
