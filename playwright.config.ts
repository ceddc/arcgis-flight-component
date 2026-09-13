import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3116",
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:3116/demos/simple/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
