import type { Page, Response } from "playwright";

import type { BrokenLink } from "../types/scan-result.types.js";

import { checkFavicon } from "./favicon.check.js";
import { checkViewport } from "./viewport.check.js";
import { checkPdfLinks } from "./pdf-links.check.js";
import { checkHorizontalScroll } from "./horizontal-scroll.check.js";
import { checkBrokenImages } from "./broken-images.check.js";
import { checkBrokenLinks } from "./broken-links.check.js";
import { checkMetaDescription } from "./meta-description.check.js";

export type DesktopChecksResult = {
  title: string;
  responseStatus: number | null;
  loadTimeMs: number;
  hasFavicon: boolean;
  hasViewport: boolean;
  hasPdfLinks: boolean;
  pdfLinksCount: number;
  pdfLinks: string[];
  brokenImagesCount: number;
  brokenImages: string[];
  brokenLinksCount: number;
  brokenLinks: BrokenLink[];
  hasHorizontalScrollDesktop: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
};

export async function runDesktopChecks(
  page: Page,
  response: Response | null,
  loadTimeMs: number,
  siteUrl: string
): Promise<DesktopChecksResult> {
  const title = await page.title();

  const hasFavicon = await checkFavicon(page);
  const hasViewport = await checkViewport(page);

  const { hasMetaDescription, metaDescriptionLength } =
  await checkMetaDescription(page);

  const pdfLinks = await checkPdfLinks(page);
  const pdfLinksCount = pdfLinks.length;
  const hasPdfLinks = pdfLinksCount > 0;

  const { brokenImagesCount, brokenImages } =
    await checkBrokenImages(page);

  const { brokenLinksCount, brokenLinks } =
    await checkBrokenLinks(page, siteUrl);

  const hasHorizontalScrollDesktop = await checkHorizontalScroll(page);

  return {
    title,
    responseStatus: response?.status() ?? null,
    loadTimeMs,
    hasFavicon,
    hasViewport,
    hasPdfLinks,
    pdfLinksCount,
    pdfLinks,
    brokenImagesCount,
    brokenImages,
    brokenLinksCount,
    brokenLinks,
    hasHorizontalScrollDesktop,
    hasMetaDescription,
  metaDescriptionLength,
  };
}