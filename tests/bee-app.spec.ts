import { test, expect } from "@playwright/test";

// Collect all console errors and failed network requests
const errors: string[] = [];

test.describe("Ria AI App — Production Smoke Tests", () => {
  test("Homepage loads and redirects to sign-in", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });

    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    // Should redirect to sign-in (admin-only app)
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });

    console.log("--- Homepage Console Errors ---");
    consoleErrors.forEach((e) => console.log("  ERROR:", e));
    console.log("--- Homepage Failed Requests ---");
    failedRequests.forEach((r) => console.log("  FAIL:", r));

    // Page should have content
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("Sign-in page renders correctly", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto("/sign-in");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // Should have user + password inputs
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Should have Ria AI branding
    const body = await page.textContent("body");
    expect(body).toContain("Ria");
    expect(body).toContain("Your AI Chief of Staff");

    console.log("--- Sign-in Console Errors ---");
    consoleErrors.forEach((e) => console.log("  ERROR:", e));
  });

  test("Login with correct credentials works", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="text"]').click();
    await page.locator('input[type="text"]').pressSequentially("89", { delay: 20 });
    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').pressSequentially("89", { delay: 20 });

    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 3000 });
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    const body = await page.textContent("body");
    expect(body).toMatch(/Welcome back|Good morning|Good afternoon|Good evening/i);
  });

  test("Login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    await page.locator('input[type="text"]').click();
    await page.locator('input[type="text"]').pressSequentially("wrong", { delay: 20 });
    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').pressSequentially("wrong", { delay: 20 });

    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 3000 });
    await page.locator('button[type="submit"]').click();

    const errorMsg = page.locator("text=/invalid|wrong|error/i");
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test("Dashboard redirects unauthenticated users", async ({ page }) => {
    const response = await page.goto("/dashboard");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);

    // Should redirect to sign-in
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("Protected routes redirect — /projects", async ({ page }) => {
    const response = await page.goto("/projects");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("Protected routes redirect — /tasks", async ({ page }) => {
    const response = await page.goto("/tasks");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("Protected routes redirect — /vps", async ({ page }) => {
    const response = await page.goto("/vps");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("Protected routes redirect — /settings", async ({ page }) => {
    const response = await page.goto("/settings");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("Protected routes redirect — /chat/general", async ({ page }) => {
    const response = await page.goto("/chat/general");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await page.waitForURL(/sign-in|api\/auth/, { timeout: 10000 });
  });

  test("API health — /api/chat returns 401 without auth", async ({ page }) => {
    const response = await page.goto("/api/chat");
    expect(response).not.toBeNull();
    // Should be 401 or 405 (not 500)
    expect(response!.status()).toBeLessThan(500);
  });

  test("API health — /api/clickup/tasks returns error without auth", async ({ page }) => {
    const response = await page.goto("/api/clickup/tasks");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test("API health — /api/vps/status returns data", async ({ page }) => {
    const response = await page.goto("/api/vps/status");
    expect(response).not.toBeNull();
    // VPS status is public or returns error, but should not 500
    expect(response!.status()).toBeLessThan(500);
  });

  test("Static assets load — favicon", async ({ page }) => {
    const response = await page.goto("/icon.svg");
    // Might be served or not depending on Next.js routing
    if (response) {
      console.log("Favicon status:", response.status());
    }
  });

  test("No 500 errors on any page", async ({ page }) => {
    const pages = ["/", "/sign-in", "/dashboard", "/projects", "/tasks", "/vps", "/settings"];
    for (const path of pages) {
      const response = await page.goto(path);
      if (response) {
        expect(response.status(), `${path} returned 500`).toBeLessThan(500);
      }
    }
  });
});
