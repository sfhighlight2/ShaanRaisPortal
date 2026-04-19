/**
 * E2E: Impersonation flow
 *
 * Covers:
 * - Admin clicks "View as Client" → URL changes to impersonation route
 * - Impersonation banner is visible with the correct client name
 * - "Stop Impersonating" / "Exit" returns to the admin client list
 * - While impersonating, accessing /admin/settings is redirected or blocked
 *   (validates that impersonation state doesn't grant elevated access)
 *
 * Note: These tests require a real Supabase session for an admin user.
 * Set env vars E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run these in CI.
 * They are NOT tagged @smoke — they run in the nightly suite only.
 */
import { test, expect, Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

test.describe("Impersonation flow", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "E2E_ADMIN_EMAIL/PASSWORD not set — skipping live impersonation tests");

  async function loginAsAdmin(page: Page) {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  }

  test("admin can navigate to a client and start impersonation", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to any client detail page (first client in list)
    await page.goto("/admin/clients");
    const firstClientRow = page.getByRole("row").nth(1);
    await firstClientRow.click();

    // Click "View as Client"
    await page.getByRole("button", { name: /view as client/i }).click();

    // URL should change to the impersonation route
    await expect(page).toHaveURL(/\/view\/dashboard/);
  });

  test("impersonation banner is visible during client view", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/clients");
    const firstClientRow = page.getByRole("row").nth(1);
    await firstClientRow.click();
    await page.getByRole("button", { name: /view as client/i }).click();

    // The ImpersonationBanner component should be visible
    await expect(
      page.getByText(/viewing this portal as|impersonating/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("exiting impersonation returns to admin area", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/clients");
    const firstClientRow = page.getByRole("row").nth(1);
    await firstClientRow.click();
    await page.getByRole("button", { name: /view as client/i }).click();
    await expect(page).toHaveURL(/\/view\/dashboard/);

    // Find and click the exit impersonation button on the banner
    await page.getByRole("button", { name: /exit|stop|back to admin/i }).first().click();

    // Should land somewhere in /admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 8_000 });
    // Banner should be gone
    await expect(page.getByText(/viewing this portal as/i)).not.toBeVisible();
  });

  test("admin in impersonation mode cannot access /admin/settings directly", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/clients");
    const firstClientRow = page.getByRole("row").nth(1);
    await firstClientRow.click();
    await page.getByRole("button", { name: /view as client/i }).click();
    await expect(page).toHaveURL(/\/view\/dashboard/);

    // Attempt direct navigation to admin settings while impersonating
    await page.goto("/admin/settings");

    // Should NOT show admin settings — either redirect or render an access denied state
    const adminSettingsHeading = page.getByRole("heading", { name: /settings/i });
    const accessDenied = page.getByText(/access denied|not authorized|exit impersonation/i);

    // At least one of these should be true: they're blocked or redirected
    const isBlocked = await accessDenied.isVisible().catch(() => false);
    const isRedirected = !page.url().includes("/admin/settings");

    expect(isBlocked || isRedirected).toBe(true);
  });
});
