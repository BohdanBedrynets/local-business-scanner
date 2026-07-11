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

  const botProtectionDetected = isLikelyBotProtection(result);

  /*
   * Сильні сигнали, які вже підтверджувалися
   * під час ручного тестування.
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

  if (result.hasHorizontalScrollDesktop) {
    strongReasons.push("Desktop horizontal overflow");
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
    (
      result.responseStatus === 404 ||
      result.responseStatus === 410 ||
      (
        result.responseStatus !== null &&
        result.responseStatus >= 500
      )
    )
  ) {
    strongReasons.push(
      `Main page returned HTTP ${result.responseStatus}`
    );
  }

  /*
   * Слабші сигнали. Вони не повинні автоматично
   * запускати розсилку, але сайт варто переглянути.
   */

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
      `${result.brokenImagesCount} potentially broken image(s)`
    );
  }

  if (!result.hasHttps) {
    reviewReasons.push("Website does not use HTTPS");
  }

  if (result.loadTimeMs > 5000) {
    reviewReasons.push(
      `Slow initial loading time (${formatSeconds(result.loadTimeMs)}s)`
    );
  }

  /*
   * JavaScript issues поки шумні.
   * Лише велика кількість переводить сайт у REVIEW,
   * але ніколи сама не робить CONTACT.
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

function isLikelyBotProtection(result: DecisionInput): boolean {
  if (
    result.responseStatus !== 403 &&
    result.responseStatus !== 429
  ) {
    return false;
  }

  const title = result.title.toLowerCase();

  return (
    title.includes("cloudflare") ||
    title.includes("attention required") ||
    title.includes("access denied") ||
    title.includes("just a moment")
  );
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2);
}