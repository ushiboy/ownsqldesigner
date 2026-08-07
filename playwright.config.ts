import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Fixed and generous so canvas geometry (table grid layout, drag
        // deltas, side panel width) stays clear of React Flow's own
        // bottom-corner panels (MiniMap, Controls) across runs, rather than
        // depending on the Desktop Chrome preset's default (1280x720) —
        // this must come after the devices(...) spread, since that preset
        // sets its own viewport and a project's `use` wins over the
        // top-level `use` for the same key.
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
