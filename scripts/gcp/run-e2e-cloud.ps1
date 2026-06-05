<#
.SYNOPSIS
  One-shot cloud E2E runner: start the GCP VM, sync the branch, run the
  Playwright suite, fetch the HTML report, and ALWAYS stop the VM afterwards.

.DESCRIPTION
  Wraps the manual workflow in scripts/gcp/README.md into a single command so the
  "stop the VM when idle" step can never be forgotten. The VM is stopped in a
  finally block, so a failed test run (or a Ctrl-C) still releases compute billing.

  Run from Windows PowerShell anywhere on your machine (gcloud must be installed
  and authenticated):

      .\scripts\gcp\run-e2e-cloud.ps1

.PARAMETER Branch
  Git branch to test on the VM. Defaults to the branch currently checked out in
  this local repo, falling back to 'main' if that can't be determined.

.PARAMETER KeepUp
  Leave the VM running after the suite finishes (skips the auto-stop). Use this
  when you want to immediately re-run or do manual testing.

.PARAMETER NoReport
  Skip copying the Playwright HTML report back to .\e2e\playwright-report.

.EXAMPLE
  .\scripts\gcp\run-e2e-cloud.ps1
  Test the current branch, fetch the report, stop the VM.

.EXAMPLE
  .\scripts\gcp\run-e2e-cloud.ps1 -Branch main -KeepUp
  Test main and leave the VM running.
#>
[CmdletBinding()]
param(
  [string]$Branch,
  [string]$Project  = 'crescebr-portfolio-9048',
  [string]$Zone     = 'southamerica-east1-a',
  [string]$Instance = 'crescebr-e2e',
  [switch]$KeepUp,
  [switch]$NoReport
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "!!! $msg" -ForegroundColor Yellow }

# --- Resolve the branch to test --------------------------------------------
if (-not $Branch) {
  try { $Branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim() } catch {}
  if (-not $Branch -or $Branch -eq 'HEAD') { $Branch = 'main' }
}
Write-Step "Target: project=$Project zone=$Zone instance=$Instance branch=$Branch"

# --- Preflight: gcloud present? --------------------------------------------
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI not found on PATH. Install the Google Cloud SDK first."
}

$gcommon = @('--project', $Project, '--zone', $Zone)
$startedByUs = $false

try {
  # --- Start the VM if it isn't already running ----------------------------
  $status = (gcloud compute instances describe $Instance @gcommon --format='value(status)').Trim()
  if ($status -ne 'RUNNING') {
    Write-Step "VM status is '$status' - starting it"
    gcloud compute instances start $Instance @gcommon | Out-Null
    $startedByUs = $true
  } else {
    Write-Step "VM already RUNNING"
  }

  # --- Wait for SSH to accept connections ----------------------------------
  # A cold-booted VM refuses SSH for a while; gcloud writes that to stderr.
  # Redirecting a native exe's stderr under $ErrorActionPreference='Stop'
  # promotes it to a terminating error, which would abort the retry loop on the
  # first miss. Drop to 'Continue' for the probe and gate purely on the exit code.
  Write-Step "Waiting for SSH to come up (cold boots can take a couple minutes)"
  $ready = $false
  $eapPrev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  foreach ($attempt in 1..40) {
    gcloud compute ssh $Instance @gcommon --command='true' 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 5
  }
  $ErrorActionPreference = $eapPrev
  if (-not $ready) {
    throw "SSH never became ready. If the operator IP changed, update the 'crescebr-allow-ssh' firewall rule's --source-ranges."
  }

  # --- Sync the branch and run the suite on the VM -------------------------
  # run-e2e.sh uses `set -euo pipefail`; a test failure returns non-zero, which
  # we capture (not throw) so the report still gets pulled and the VM stops.
  $remote = @"
set -e
cd ~/app
echo '==> Syncing branch $Branch'
git fetch --prune origin
git checkout $Branch
git reset --hard origin/$Branch
bash scripts/gcp/run-e2e.sh
"@
  Write-Step "Running E2E suite on the VM (this builds deps + headless Chromium on first run)"
  gcloud compute ssh $Instance @gcommon --command=$remote
  $testExit = $LASTEXITCODE
  if ($testExit -eq 0) { Write-Host "==> E2E suite PASSED" -ForegroundColor Green }
  else { Write-Warn "E2E suite FAILED (exit $testExit)" }

  # --- Pull the HTML report down -------------------------------------------
  if (-not $NoReport) {
    Write-Step "Fetching HTML report to .\e2e\playwright-report"
    # Resolve the report dir ON the VM so the remote shell expands '~' and we
    # don't guess the CWD layout (pscp won't expand '~' itself). Probe both the
    # config-relative and root-relative locations.
    $eapPrev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $reportDir = gcloud compute ssh $Instance @gcommon `
      --command='for d in ~/app/e2e/playwright-report ~/app/playwright-report; do [ -d "$d" ] && echo "$d" && break; done' 2>&1 |
      Where-Object { $_ -match '/playwright-report' } | Select-Object -First 1
    if ($reportDir) {
      $reportDir = $reportDir.Trim()
      gcloud compute scp --recurse @gcommon "${Instance}:$reportDir" .\e2e\playwright-report 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) { Write-Host "    open .\e2e\playwright-report\index.html" -ForegroundColor Green }
      else { Write-Warn "Report copy failed from $reportDir" }
    } else {
      Write-Warn "No HTML report directory found on the VM (skipping)."
    }
    $ErrorActionPreference = $eapPrev
  }

  exit $testExit
}
finally {
  # --- Always release compute billing unless told otherwise ----------------
  if ($KeepUp) {
    Write-Warn "-KeepUp set: leaving VM RUNNING. Stop it later with:"
    Write-Host "    gcloud compute instances stop $Instance --project $Project --zone $Zone" -ForegroundColor Yellow
  } else {
    Write-Step "Stopping the VM to avoid compute billing"
    try { gcloud compute instances stop $Instance @gcommon | Out-Null; Write-Host "    VM stopped." -ForegroundColor Green }
    catch { Write-Warn "FAILED to stop VM! Stop it manually: gcloud compute instances stop $Instance --project $Project --zone $Zone" }
  }
}
