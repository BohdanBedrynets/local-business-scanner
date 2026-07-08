import type { Page } from "playwright";

import { checkMobileWidth } from "./mobile-width.check.js";

export type MobileChecksResult = {
  hasHorizontalScrollMobile: boolean;
  mobileViewportWidth: number;
  mobileContentWidth: number;
};

export async function runMobileChecks(
  page: Page
): Promise<MobileChecksResult> {
  const { mobileViewportWidth, mobileContentWidth } =
    await checkMobileWidth(page);

  const hasHorizontalScrollMobile =
    mobileContentWidth > mobileViewportWidth;

  return {
    hasHorizontalScrollMobile,
    mobileViewportWidth,
    mobileContentWidth,
  };
}