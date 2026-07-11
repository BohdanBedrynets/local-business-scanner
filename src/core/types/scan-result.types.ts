import type { Site } from "./site.types.js";

export type BrokenLink = {
  url: string;
  status: number | null;
};

export type AuditPriority = "LOW" | "MEDIUM" | "HIGH";

export type OutreachRecommendation =
  | "CONTACT"
  | "REVIEW"
  | "SKIP";

export type TitleQuality = "missing" | "poor" | "ok";

export type JavaScriptIssue = {
  type: "console-error" | "page-error";
  message: string;
};

export type ScanResult = {
  site: Site;

  technicalScore: number;
  outreachScore: number;
  priority: AuditPriority;
  scoreReasons: string[];

  shouldContact: boolean;
  outreachRecommendation: OutreachRecommendation;
  outreachReasons: string[];

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

  emailsCount: number;
  phonesCount: number;
  socialLinksCount: number;

  emails: string[];
  phones: string[];
  socialLinks: string[];

  hasPdfLinks: boolean;
  pdfLinksCount: number;
  pdfLinks: string[];

  brokenImagesCount: number;
  brokenImages: string[];

  imagesCount: number;
  imagesWithoutAltCount: number;

  brokenLinksCount: number;
  brokenLinks: BrokenLink[];

  javaScriptIssuesCount: number;
  javaScriptIssues: JavaScriptIssue[];

  hasHorizontalScrollDesktop: boolean;
  hasHorizontalScrollMobile: boolean;

  mobileViewportWidth: number;
  mobileContentWidth: number;

  desktopScreenshotPath: string;
  mobileScreenshotPath: string;

  hasRobotsTxt: boolean;
  robotsTxtStatus: number | null;

  hasSitemap: boolean;
  sitemapStatus: number | null;

  error: string | null;
};