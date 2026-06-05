import { defineConfig, devices } from '@playwright/test';

// Where the running app lives. On the GCP VM the app runs on localhost, so the
// default is correct. Set E2E_BASE_URL to point at an already-running instance
// (and skip the managed webServer below).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

// Only let Playwright boot the dev servers when we are NOT targeting an external
// URL. On the VM we usually let Playwright manage the lifecycle.
const manageServers = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  // Headless everywhere — this is the whole point on low-end / cloud hardware.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot the backend (auto-migrates + seeds demo accounts) and the Vite dev
  // server. Backend must be up first so the frontend has an API to talk to.
  webServer: manageServers
    ? [
        {
          command: 'npm --prefix ../backend run dev',
          url: 'http://localhost:3001/api/v1/products',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: 'npm --prefix ../frontend run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ]
    : undefined,
});
