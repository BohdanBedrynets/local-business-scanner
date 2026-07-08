import type { Page, Response } from "playwright";

import { checkFavicon } from "./favicon.check.js";
import { checkViewport } from "./viewport.check.js";
import { checkPdfLinks } from "./pdf-links.check.js";
import { checkHorizontalScroll } from "./horizontal-scroll.check.js";

export type DesktopChecksResult = {
  title: string;
  responseStatus: number | null;
  hasFavicon: boolean;
  hasViewport: boolean;
  hasPdfLinks: boolean;
  pdfLinks: string[];
  hasHorizontalScrollDesktop: boolean;
};

export async function runDesktopChecks(
  page: Page,
  response: Response | null
): Promise<DesktopChecksResult> {
  const title = await page.title();

  const hasFavicon = await checkFavicon(page);
  const hasViewport = await checkViewport(page);

  const pdfLinks = await checkPdfLinks(page);
  const hasPdfLinks = pdfLinks.length > 0;

  const hasHorizontalScrollDesktop = await checkHorizontalScroll(page);

  return {
    title,
    responseStatus: response?.status() ?? null,
    hasFavicon,
    hasViewport,
    hasPdfLinks,
    pdfLinks,
    hasHorizontalScrollDesktop,
  };
}