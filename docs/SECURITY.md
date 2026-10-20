# CresceBR Security Operations

This document records security decisions and deployment requirements that must survive individual development sessions. It intentionally excludes secret values, reusable digests, tokens, and direct links to exposed revisions.

## JWT Signing Key Incident

**Status:** Remediated

**Last verified:** August 26, 2026

A valid 64-byte JWT signing key was historically committed in `docker-compose.yml` while the repository was public. A second publicly documented example value was also copied into local environment configuration. Both values must be treated as permanently compromised.

Removing a branch or rewriting history cannot make a published signing key trustworthy again. Rotation and runtime rejection are the security controls; history removal is optional exposure-reduction hygiene.

### Investigation Results

- The historical Docker key appeared in five revisions dated June 21–22, 2025. Its exact value changed Git history only through `docker-compose.yml`.
- Historical `accessToken`, `refreshToken`, `token`, and Bearer strings in project documentation were examples, not structurally valid JWTs. They provide no evidence that the exposed Docker key signed a token.
- No retained Docker container contains the historical Docker key.
- One stopped backend container contains the public environment-example value. It exited with code 127 almost immediately, produced no logs, and never served a request.
- A backend run directly from an old local checkout cannot be ruled out. Any token it issued is nevertheless rejected by the current signing key and runtime controls.
- The removed remote branch no longer exists, but the public Git host can still resolve at least one historical revision by object identifier. The historical value therefore remains compromised.

### Completed Remediation

- The ignored root and backend environment files use the same freshly generated 64-byte local signing key.
- The current key differs from both public values and has never appeared in repository history.
- Local environment files are restricted to owner-only access (`0600`).
- `backend/src/utils/jwt.ts` rejects both known public signing values using SHA-256 comparisons without republishing their literals.
- Production signing keys shorter than 32 characters are rejected.
- The remote branch that exposed the key was removed.
- Focused JWT regression coverage passed 86 tests during the August 26, 2026 verification.

### Current Deployment Assessment

As of August 26, 2026:

- The associated Google Cloud project has billing disabled.
- It contains no Cloud Run service and no Cloud SQL instance.
- The hosted Firebase application uses the browser-side demo adapter and has no live backend API.
- The repository has no JWT-related GitHub Actions deployment secret.
- Secret Manager contents could not be enumerated while billing was disabled. There is no live service consuming a stored value, and the backend guard would refuse either known compromised value during startup.

No additional local JWT rotation is currently required.

## Continuous A-Grade Requirement

The public site must maintain an external HTTP security grade of **A or better** after every merge and deployment. A+ satisfies this requirement and remains the preferred result.

The live site was independently verified on August 27, 2026:

- SecurityHeaders: **A+**
- MDN HTTP Observatory: **A+**, score 110, with 10 tests passed and none failed

The repository verifies this requirement at two levels:

- Pull-request and main-branch CI validates the Firebase and Nginx policies before a change can pass the `Security Grade` job.
- The `Deploy Hosting` job checks the live site right after every release, and the `Live Security Grade` workflow checks it once per day. Both fail when MDN Observatory reports anything below A or when required live headers are missing or weakened.

The `main` branch requires the `Security Grade` status check in strict mode before merging, and the rule applies to administrators. Do not disable or bypass this protection.

A failed grade check is a security regression until investigated. Do not suppress, skip, or lower the minimum grade to make the workflow pass.

## Hosting Deployment

Merging to `main` deploys the site. The `Deploy Hosting` job in `ci.yml` runs on a push to `main` once the `Security Grade`, `Backend`, `Frontend`, and `End-to-End` jobs have passed. It publishes the exact `frontend/dist` that the `Frontend` job built and tested, and then runs the live grade check against the new release. If that check fails, the regression is already live: roll back from the Hosting release history in the Firebase console, then fix forward.

The `Deploy Gate` job lets only the run for the current tip of `main` deploy. Otherwise an older push whose checks finished last would overwrite a newer release. A stale run ends green without deploying. If the newer push then fails its checks, nothing deploys until `main` is green again.

The job holds no stored credential. Workload Identity Federation trades its GitHub OIDC token for a short-lived token of `github-hosting-deploy@crescebr-portfolio-9048.iam.gserviceaccount.com`, which holds only `roles/firebasehosting.admin` and `roles/serviceusage.apiKeysViewer`. The provider accepts a token only for this repository's ID, the workflow `ci.yml` on `refs/heads/main`, a `push` event, and a job in the `production` environment. Pinning the job is deliberate: `claude.yml` also holds `id-token: write` and runs on `main` for issue and comment events, so a repository-only condition would let it deploy.

Every step in that job can request the token, so the job runs no project dependencies. The build arrives as an artifact, the third-party auth action is pinned by commit SHA, and the Firebase CLI is the standalone release binary checked against a SHA-256 in the workflow. To upgrade the CLI, change both `FIREBASE_TOOLS_VERSION` and `FIREBASE_TOOLS_SHA256` to the `firebase-tools-linux` asset of the new release.

`scripts/setup-hosting-deploy.sh` creates the service account, pool, provider, and bindings, and sets the `GCP_WORKLOAD_IDENTITY_PROVIDER` repository variable. It is safe to re-run and needs `gcloud` signed in as a project owner and `gh` signed in as a repository admin. Do not replace it with a service account key or a `FIREBASE_TOKEN` secret.

## Requirements Before the Next Backend Deployment

1. Generate a new production-only signing key with a cryptographically secure generator, for example `openssl rand -base64 64`.
2. Store it in the deployment platform's managed secret store. Do not copy the local development key or any example value into production.
3. Keep separate keys for development, staging, and production.
4. Confirm the deployed service receives the intended secret without printing it in logs, command output, CI artifacts, or documentation.
5. Verify the service starts successfully; the compromised-value guard must fail deployment if an old value is restored.
6. Run the JWT regression suite and authentication smoke tests before exposing the backend publicly.
7. Rotate immediately if a signing value reaches Git, logs, build artifacts, screenshots, tickets, or any other public or shared channel.

## Optional Hygiene

- Remove or recreate the stale stopped backend container before the next Docker-based development session.
- Coordinate any Git history rewrite with all repository users and hosting providers. A rewrite reduces accidental discovery but does not replace rotation.
