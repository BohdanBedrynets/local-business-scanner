import type { Page, Response } from "playwright";

import { checkFavicon } from "./favicon.check.js";
import { checkViewport } from "./viewport.check.js";
import { checkPdfLinks } from "./pdf-links.check.js";
import { checkHorizontalScroll } from "./horizontal-scroll.check.js";
import { checkBrokenImages } from "./broken-images.check.js";

export type DesktopChecksResult = {
  title: string;
  responseStatus: number | null;
  loadTimeMs: number;
  hasFavicon: boolean;
  hasViewport: boolean;
  hasPdfLinks: boolean;
  pdfLinks: string[];
  brokenImagesCount: number;
  brokenImages: string[];
  hasHorizontalScrollDesktop: boolean;
  pdfLinksCount: number;
};

export async function runDesktopChecks(
  page: Page,
  response: Response | null,
  loadTimeMs: number
): Promise<DesktopChecksResult> {
  const title = await page.title();

  const hasFavicon = await checkFavicon(page);
  const hasViewport = await checkViewport(page);

  const pdfLinks = await checkPdfLinks(page);
  const pdfLinksCount = pdfLinks.length;
  const hasPdfLinks = pdfLinksCount > 0;

  const { brokenImagesCount, brokenImages } =
    await checkBrokenImages(page);

  const hasHorizontalScrollDesktop = await checkHorizontalScroll(page);

  return {
    title,
    responseStatus: response?.status() ?? null,
    loadTimeMs,
    hasFavicon,
    hasViewport,
    hasPdfLinks,
    pdfLinks,
    brokenImagesCount,
    brokenImages,
    hasHorizontalScrollDesktop,
    pdfLinksCount,
  };
}