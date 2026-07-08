import type { Page } from "playwright";

export type MobileWidthCheckResult = {
  mobileViewportWidth: number;
  mobileContentWidth: number;
};

export async function checkMobileWidth(
  page: Page
): Promise<MobileWidthCheckResult> {
  const mobileViewportWidth = page.viewportSize()?.width ?? 0;

  const mobileContentWidth = await page.evaluate(() => {
    return document.documentElement.scrollWidth;
  });

  return {
    mobileViewportWidth,
    mobileContentWidth,
  };
}