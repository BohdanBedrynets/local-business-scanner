import type { Page } from "playwright";

export async function checkHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
}