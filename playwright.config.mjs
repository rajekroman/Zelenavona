import { defineConfig, devices } from "@playwright/test";

const iphone13 = devices["iPhone 13"];

export default defineConfig({
  testDir: "./tests",
  testMatch: /visual\.spec\.mjs$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 25_000,
  expect: { timeout: 6_000 },
  reporter: [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } }
    },
    {
      name: "iphone-portrait",
      use: { ...iphone13, viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }
    },
    {
      name: "iphone-landscape",
      use: { ...iphone13, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }
    }
  ],
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  }
});
