import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Smoke tests (tagged @smoke) run on every PR.
 * Full suite runs nightly.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",

  /* Maximum time per test */
  timeout: 30_000,
  expect: { timeout: 5_000 },

  /* Run tests in parallel by file */
  fullyParallel: true,
  /* Fail the build if any test.only was accidentally committed */
  forbidOnly: !!process.env.CI,
  /* Retry flaky tests once in CI */
  retries: process.env.CI ? 1 : 0,
  /* Limit parallel workers in CI to avoid resource contention */
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    /* Base URL so tests can use page.goto('/login') */
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    /* Collect traces on failures for debugging */
    trace: "on-first-retry",
    /* Record video on first retry */
    video: "on-first-retry",
    /* Always capture screenshot on failure */
    screenshot: "only-on-failure",
  },

  projects: [
    /* ── Smoke: Chromium only, fast ── */
    {
      name: "smoke-chromium",
      use: { ...devices["Desktop Chrome"] },
      grep: /@smoke/,
    },

    /* ── Full cross-browser regression suite ── */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@smoke/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      grepInvert: /@smoke/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      grepInvert: /@smoke/,
    },

    /* ── Mobile emulation ── */
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      grepInvert: /@smoke/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      grepInvert: /@smoke/,
    },
  ],

  /* Spin up the dev server before running tests, if not already running */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
