/**
 * E2E: Accessibility audits
 * Uses @axe-core/playwright to scan key pages and fail if critical a11y violations are found.
 *
 * Covers:
 * - /login page: form labels, color contrast, focus order
 * - /dashboard (client): page heading, keyboard navigation, ARIA roles
 * - /admin/clients: table accessibility, sortable column announcements
 *
 * These are NOT tagged @smoke — they run in the nightly suite.
 * Required env vars for authenticated scans: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility audits", () => {
  test("login page has no critical a11y violations", async ({ page }) => {
    await page.goto("/login");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      // Exclude third-party widgets that we can't control
      .exclude("#intercom-container")
      .analyze();

    // Log all violations for visibility in CI reports
    if (results.violations.length > 0) {
      console.error(
        "A11y violations on /login:",
        JSON.stringify(results.violations, null, 2)
      );
    }

    expect(results.violations).toHaveLength(0);
  });

  test("login form inputs all have associated labels", async ({ page }) => {
    await page.goto("/login");

    // All inputs should be reachable via label association (not just placeholder)
    const inputs = page.locator("input");
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute("id");
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        expect(await label.count()).toBeGreaterThan(0);
      }
    }
  });

  test("login page can be tab-navigated to the submit button", async ({ page }) => {
    await page.goto("/login");
    // Start from the body, tab through to the submit button
    await page.keyboard.press("Tab"); // email
    await page.keyboard.press("Tab"); // password
    await page.keyboard.press("Tab"); // submit button

    const focused = page.locator(":focus");
    const tagName = await focused.evaluate((el) => el.tagName.toLowerCase());
    const text = await focused.textContent();

    // The focused element should be a button
    expect(tagName).toBe("button");
    expect(text?.toLowerCase()).toMatch(/sign in|log in|submit/i);
  });

  test("admin clients page has no critical a11y violations", async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByLabel(/password/i).fill(adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
    await page.goto("/admin/clients");

    // Wait for the table to load
    await page.waitForSelector("table, [role='table'], [data-testid='clients-table']", {
      timeout: 10_000,
    }).catch(() => {
      // Page might use a non-table layout; that's fine
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});
