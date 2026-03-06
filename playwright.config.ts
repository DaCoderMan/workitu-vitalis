import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3002",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});