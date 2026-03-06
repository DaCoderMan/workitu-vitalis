import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  const testUser = {
    name: "Test User",
    email: `test-${Date.now()}@vitalis.test`,
    password: "TestPass123!",
  };

  test("unauthenticated user is redirected to sign-in", async ({ page }) => {
    const response = await page.goto("/dashboard");
    // Middleware redirects to /sign-in
    expect(page.url()).toContain("/sign-in");
    expect(response?.status()).toBeLessThan(400);
  });

  test("sign-in page renders form elements", async ({ page }) => {
    await page.goto("/sign-in");
    // CardTitle renders "Welcome back" text
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("sign-in page has link to sign-up", async ({ page }) => {
    await page.goto("/sign-in");
    const signUpLink = page.locator('a[href="/sign-up"]');
    await expect(signUpLink).toBeVisible();
  });

  test("sign-up page renders form elements", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("sign-up with new user", async ({ page }) => {
    await page.goto("/sign-up");

    await page.locator("#name").fill(testUser.name);
    await page.locator("#email").fill(testUser.email);
    await page.locator("#password").fill(testUser.password);

    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard after successful sign-up + auto sign-in
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("sign-in with existing user", async ({ page }) => {
    // This test depends on the sign-up test having created the user
    await page.goto("/sign-in");

    await page.locator("#email").fill(testUser.email);
    await page.locator("#password").fill(testUser.password);

    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/dashboard**", { timeout: 20000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("sign-in with wrong password shows error", async ({ page }) => {
    await page.goto("/sign-in");

    await page.locator("#email").fill("wrong@test.com");
    await page.locator("#password").fill("wrongpass");

    await page.locator('button[type="submit"]').click();

    // Should show error and stay on sign-in page
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain("/sign-in");
  });
});

test.describe("Dashboard (admin login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    // Use admin defaults: email=jonathanperlin@gmail.com, password=admin
    // or env overrides
    const adminEmail = process.env.ADMIN_EMAIL || "jonathanperlin@gmail.com";
    const adminPass = process.env.ADMIN_PASSWORD || "admin";
    await page.locator("#email").fill(adminEmail);
    await page.locator("#password").fill(adminPass);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  });

  test("dashboard loads successfully", async ({ page }) => {
    // Dashboard page should render with the title visible
    await expect(page.getByText("Dashboard").first()).toBeVisible({ timeout: 5000 });
  });

  test("sidebar is visible", async ({ page }) => {
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Protected routes redirect when unauthenticated", () => {
  const routes = ["/dashboard", "/sleep", "/mood", "/insights", "/data", "/settings"];

  for (const route of routes) {
    test(`${route} redirects to sign-in`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("**/sign-in**");
      expect(page.url()).toContain("/sign-in");
    });
  }
});

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.textContent("body");
    expect(content?.toLowerCase()).toContain("vitalis");
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible();
    const content = await page.textContent("body");
    expect(content?.toLowerCase()).toContain("privacy");
  });
});