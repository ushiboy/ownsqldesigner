import type { Page } from "@playwright/test";

/**
 * Clears all app storage and reloads once, so the app's own "no
 * last-schema pointer -> auto-create a blank schema" startup flow
 * (docs/design/0002) always runs against a clean slate. Deliberately not
 * page.addInitScript: that re-runs on every later navigation in the same
 * page, which would also wipe storage on a spec's own intentional
 * page.reload() after a save.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}
