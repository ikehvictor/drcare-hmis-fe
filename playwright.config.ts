import { defineConfig, devices } from "@playwright/test";

// An uncommon port, and never reuse a server already on it: another project could be listening there.
const PORT = 4317;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Production build under parallel load: give page transitions more than the default 5s.
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    env: { NEXT_DIST_DIR: ".next-e2e" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
