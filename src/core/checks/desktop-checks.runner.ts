import type { Page, Response } from "playwright";

import type { BrokenLink, JavaScriptIssue } from "../types/scan-result.types.js";

import { checkFavicon } from "./favicon.check.js";
import { checkViewport } from "./viewport.check.js";
import { checkPdfLinks } from "./pdf-links.check.js";
import { checkHorizontalScroll } from "./horizontal-scroll.check.js";
import { checkBrokenImages } from "./broken-images.check.js";
import { checkBrokenLinks } from "./broken-links.check.js";
import { checkMetaDescription } from "./meta-description.check.js";
import { checkTitleQuality } from "./title-quality.check.js";
import { checkContactInfo } from "./contact-info.check.js";
import { checkRobotsTxt } from "./robots-txt.check.js";
import { checkSitemap } from "./sitemap.check.js";
import { checkImageAlt } from "./image-alt.check.js";

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
  titleLength: number;
  titleQuality: "missing" | "poor" | "ok";
  emailsCount: number;
  phonesCount: number;
  socialLinksCount: number;
  emails: string[];
  phones: string[];
  socialLinks: string[];
  hasRobotsTxt: boolean;
  robotsTxtStatus: number | null;
  hasSitemap: boolean;
  sitemapStatus: number | null;
  imagesCount: number;
  imagesWithoutAltCount: number;
  javaScriptIssuesCount: number;
  javaScriptIssues: JavaScriptIssue[];
};

export async function runDesktopChecks(
  page: Page,
  response: Response | null,
  loadTimeMs: number,
  siteUrl: string,
  javaScriptIssues: JavaScriptIssue[]
): Promise<DesktopChecksResult> {
  const title = await page.title();
  const { titleLength, titleQuality } = checkTitleQuality(title);

  const hasFavicon = await checkFavicon(page);
  const hasViewport = await checkViewport(page);

  const { hasMetaDescription, metaDescriptionLength } =
  await checkMetaDescription(page);

  const {
  emailsCount,
  phonesCount,
  socialLinksCount,
  emails,
  phones,
  socialLinks,
} = await checkContactInfo(page);

  const pdfLinks = await checkPdfLinks(page);
  const pdfLinksCount = pdfLinks.length;
  const hasPdfLinks = pdfLinksCount > 0;

  const { brokenImagesCount, brokenImages } =
    await checkBrokenImages(page);

  const { imagesCount, imagesWithoutAltCount } = await checkImageAlt(page);

  const { brokenLinksCount, brokenLinks } =
    await checkBrokenLinks(page, siteUrl);

  const { hasRobotsTxt, robotsTxtStatus } =
  await checkRobotsTxt(page, siteUrl);

  const { hasSitemap, sitemapStatus } =
  await checkSitemap(page, siteUrl);

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
    titleLength,
    titleQuality,
    emailsCount,
    phonesCount,
    socialLinksCount,
    emails,
    phones,
    socialLinks,
    hasRobotsTxt,
    robotsTxtStatus,
    hasSitemap,
    sitemapStatus,
    imagesCount,
    imagesWithoutAltCount,
    javaScriptIssuesCount: javaScriptIssues.length,
    javaScriptIssues,
  };
}