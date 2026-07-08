import type { Page } from "playwright";

export async function checkPdfLinks(page: Page): Promise<string[]> {
  const links = await page.locator("a").evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
      .filter((href) => href.toLowerCase().includes(".pdf"))
  );

  return links;
}