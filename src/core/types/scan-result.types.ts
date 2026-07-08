import type { Site } from "./site.types.js";

export type ScanResult = {
  site: Site;
  hasHttps: boolean;
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
  hasHorizontalScrollDesktop: boolean;
  hasHorizontalScrollMobile: boolean;
  mobileViewportWidth: number;
  mobileContentWidth: number;
  desktopScreenshotPath: string;
  mobileScreenshotPath: string;
  error: string | null;
};