import type { Page } from "playwright";

export async function checkFavicon(page: Page): Promise<boolean> {
  const favicon = await page.locator(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  ).count();

  return favicon > 0;
}