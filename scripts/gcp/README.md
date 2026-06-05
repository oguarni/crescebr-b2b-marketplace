# E2E testing on GCP (headless Playwright)

Run the whole stack **and** the browser automation on a small GCP VM, so your
local low-end machine never has to run Docker, Postgres, or a headless browser.
You drive it from Windows PowerShell with `gcloud`; the heavy work is in the cloud.

- **Project:** `crescebr-portfolio-9048`
- **Region:** `southamerica-east1` (São Paulo — closest to Paraná)
- **VM:** `e2-medium` (2 vCPU / 4 GB) — comfortable for the stack + Chromium

> Cost control: **stop the VM when you're not using it** (`gcloud compute instances stop`).
> A stopped `e2-medium` only bills for its small boot disk, not compute.

---

## 1. Create the VM

```powershell
gcloud config set project crescebr-portfolio-9048

gcloud compute instances create crescebr-e2e `
  --zone=southamerica-east1-a `
  --machine-type=e2-medium `
  --image-family=debian-12 `
  --image-project=debian-cloud `
  --boot-disk-size=20GB
```

## 2. Get the code onto the VM

**Option A — git clone (recommended).** Push your branch, then on the VM clone it.
Replace the URL/branch with yours:

```powershell
gcloud compute ssh crescebr-e2e --zone=southamerica-east1-a --command `
  "git clone --branch fix/supplier-rbac-quotations https://github.com/<you>/crescebr-b2b-marketplace.git app"
```

**Option B — copy local files up** (use if the repo isn't pushed). Heavier; skip
`node_modules`/`dist` by copying a clean checkout:

```powershell
gcloud compute scp --recurse --zone=southamerica-east1-a `
  .\backend .\frontend .\shared .\e2e .\scripts .\package.json `
  crescebr-e2e:~/app/
```

## 3. Provision the OS (one time) — Node 20 + PostgreSQL

```powershell
gcloud compute ssh crescebr-e2e --zone=southamerica-east1-a --command `
  "bash ~/app/scripts/gcp/provision-vm.sh"
```

## 4. Run the E2E suite (repeat this each test run)

```powershell
gcloud compute ssh crescebr-e2e --zone=southamerica-east1-a --command `
  "cd ~/app && bash scripts/gcp/run-e2e.sh"
```

Pass/fail prints in your terminal. To pull the HTML report down to your machine:

```powershell
gcloud compute scp --recurse --zone=southamerica-east1-a `
  crescebr-e2e:~/app/e2e/playwright-report .\e2e\playwright-report
```

Then open `e2e\playwright-report\index.html` locally (just a static page — light).

## 5. Stop the VM when done (saves money)

```powershell
gcloud compute instances stop crescebr-e2e --zone=southamerica-east1-a
# start again later with: gcloud compute instances start crescebr-e2e --zone southamerica-east1-a
# delete entirely with:   gcloud compute instances delete crescebr-e2e --zone southamerica-east1-a
```

---

## Optional: manual (eyeball) testing in your local browser

E2E above needs no open ports. If you later want to *click through* the app
yourself, expose the Vite port and browse to the VM's IP — rendering a page is
lightweight even on weak hardware:

```powershell
gcloud compute firewall-rules create crescebr-dev-ports `
  --allow=tcp:5173,tcp:3001 `
  --source-ranges=YOUR.IP.ADDR.ESS/32   # lock to your IP; don't open to 0.0.0.0/0

# Find the VM's external IP:
gcloud compute instances describe crescebr-e2e --zone=southamerica-east1-a `
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

Set `FRONTEND_URL` / `VITE_API_URL` to the VM IP if you go this route. Even
simpler: use VS Code **Remote-SSH** into the VM and let it auto-forward 5173 to
your `localhost`.
