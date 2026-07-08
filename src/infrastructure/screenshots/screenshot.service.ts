import type { Page } from "playwright";

export async function takeScreenshot(
  page: Page,
  path: string
): Promise<string> {
  await page.screenshot({
    path,
    fullPage: true,
  });

  return path;
}