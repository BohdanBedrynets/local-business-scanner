import type { ScanResult } from "../types/scan-result.types.js";

export type OutreachRecommendation =
  | "CONTACT"
  | "REVIEW"
  | "SKIP";

export type OutreachDecision = {
  shouldContact: boolean;
  outreachRecommendation: OutreachRecommendation;
  outreachReasons: string[];
};

type DecisionInput = Omit<
  ScanResult,
  | "technicalScore"
  | "outreachScore"
  | "priority"
  | "scoreReasons"
  | "shouldContact"
  | "outreachRecommendation"
  | "outreachReasons"
>;

export function calculateOutreachDecision(
  result: DecisionInput
): OutreachDecision {
  const strongReasons: string[] = [];
  const reviewReasons: string[] = [];

  const mobileOverflowPixels = Math.max(
    0,
    result.mobileContentWidth - result.mobileViewportWidth
  );

  const botProtectionDetected =
    isLikelyBotProtection(result);

  /*
   * Сильні сигнали.
   * Вони достатньо надійні, щоб автоматично ставити CONTACT.
   */

  if (!result.hasViewport) {
    strongReasons.push("Missing mobile viewport");
  }

  if (
    result.hasHorizontalScrollMobile &&
    mobileOverflowPixels > 100
  ) {
    strongReasons.push(
      `Severe mobile horizontal overflow (${mobileOverflowPixels}px)`
    );
  }

  if (result.brokenLinksCount >= 2) {
    strongReasons.push(
      `${result.brokenLinksCount} confirmed broken links`
    );
  }

  if (result.brokenImagesCount >= 3) {
    strongReasons.push(
      `${result.brokenImagesCount} confirmed broken images`
    );
  }

  if (
    !botProtectionDetected &&
    isConfirmedMainPageFailure(result.responseStatus)
  ) {
    strongReasons.push(
      `Main page returned HTTP ${result.responseStatus}`
    );
  }

  /*
   * Слабші сигнали.
   * Вони потребують короткої ручної перевірки.
   */

  if (result.hasHorizontalScrollDesktop) {
    reviewReasons.push("Desktop horizontal overflow");
  }

  if (
    result.hasHorizontalScrollMobile &&
    mobileOverflowPixels > 20 &&
    mobileOverflowPixels <= 100
  ) {
    reviewReasons.push(
      `Moderate mobile horizontal overflow (${mobileOverflowPixels}px)`
    );
  }

  if (result.brokenLinksCount === 1) {
    reviewReasons.push("1 confirmed broken link");
  }

  if (
    result.brokenImagesCount > 0 &&
    result.brokenImagesCount < 3
  ) {
    reviewReasons.push(
      formatBrokenImagesReason(
        result.brokenImagesCount
      )
    );
  }

  if (!result.hasHttps) {
    reviewReasons.push(
      "Website does not use HTTPS"
    );
  }

  if (result.loadTimeMs > 5000) {
    reviewReasons.push(
      `Slow initial loading time (${formatSeconds(result.loadTimeMs)}s)`
    );
  }

  /*
   * Після фільтрації JavaScript-помилки стали чистішими,
   * але самі по собі все одно не є достатньою причиною
   * для автоматичного CONTACT.
   */
  if (result.javaScriptIssuesCount >= 5) {
    reviewReasons.push(
      `${result.javaScriptIssuesCount} JavaScript issues`
    );
  }

  if (strongReasons.length > 0) {
    return {
      shouldContact: true,
      outreachRecommendation: "CONTACT",
      outreachReasons: strongReasons,
    };
  }

  if (reviewReasons.length > 0) {
    return {
      shouldContact: false,
      outreachRecommendation: "REVIEW",
      outreachReasons: reviewReasons,
    };
  }

  return {
    shouldContact: false,
    outreachRecommendation: "SKIP",
    outreachReasons: [],
  };
}

function isConfirmedMainPageFailure(
  status: number | null
): boolean {
  if (status === 404 || status === 410) {
    return true;
  }

  return status !== null && status >= 500;
}

function isLikelyBotProtection(
  result: DecisionInput
): boolean {
  if (
    result.responseStatus !== 403 &&
    result.responseStatus !== 429 &&
    result.responseStatus !== 503
  ) {
    return false;
  }

  const title = result.title.toLowerCase();

  return (
    title.includes("cloudflare") ||
    title.includes("attention required") ||
    title.includes("access denied") ||
    title.includes("just a moment") ||
    title.includes("temporarily unavailable") ||
    title.includes("security service") ||
    title.includes("access to this site has been limited")
  );
}

function formatBrokenImagesReason(
  count: number
): string {
  if (count === 1) {
    return "1 confirmed broken image";
  }

  return `${count} confirmed broken images`;
}

function formatSeconds(
  milliseconds: number
): string {
  return (milliseconds / 1000).toFixed(2);
}