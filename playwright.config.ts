import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "https://bee-ai-app.vercel.app",
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["json", { outputFile: "test-results.json" }]],
});
