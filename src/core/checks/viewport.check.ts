import type { Page } from "playwright";

export async function checkViewport(page: Page): Promise<boolean> {
  const viewport = await page.locator('meta[name="viewport"]').count();

  return viewport > 0;
}