import type { Site } from "./site.types.js";


export type BrokenLink = {
  url: string;
  status: number | null;
};

export type ScanResult = {
  site: Site;
  hasHttps: boolean;
  title: string;
  titleLength: number;
  titleQuality: TitleQuality;
  responseStatus: number | null;
  loadTimeMs: number;
  hasFavicon: boolean;
  hasViewport: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  hasPdfLinks: boolean;
  pdfLinksCount: number;
  pdfLinks: string[];
  brokenImagesCount: number;
  brokenImages: string[];
  brokenLinksCount: number;
  brokenLinks: BrokenLink[];
  hasHorizontalScrollDesktop: boolean;
  hasHorizontalScrollMobile: boolean;
  mobileViewportWidth: number;
  mobileContentWidth: number;
  desktopScreenshotPath: string;
  mobileScreenshotPath: string;
  error: string | null;
  emailsCount: number;
  phonesCount: number;
  socialLinksCount: number;
  emails: string[];
  phones: string[];
  socialLinks: string[];
  hasRobotsTxt: boolean;
  robotsTxtStatus: number | null;
};

export type TitleQuality = "missing" | "poor" | "ok";