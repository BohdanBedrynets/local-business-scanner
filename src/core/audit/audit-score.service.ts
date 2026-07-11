import type { ScanResult } from "../types/scan-result.types.js";

export type AuditPriority = "LOW" | "MEDIUM" | "HIGH";

export type AuditScore = {
  technicalScore: number;
  outreachScore: number;
  priority: AuditPriority;
  scoreReasons: string[];
};

type ScoreInput = Omit<
  ScanResult,
  | "technicalScore"
  | "outreachScore"
  | "priority"
  | "scoreReasons"
  | "shouldContact"
  | "outreachRecommendation"
  | "outreachReasons"
>;

export function calculateAuditScore(result: ScoreInput): AuditScore {
  let technicalScore = 100;
  let outreachScore = 0;

  const scoreReasons: string[] = [];

  /*
   * HTTPS — реальна технічна проблема й нормальний аргумент
   * для звернення до власника.
   */
  if (!result.hasHttps) {
    technicalScore -= 15;
    outreachScore += 15;

    scoreReasons.push("Website does not use HTTPS: +15 outreach");
  }

  /*
   * Cloudflare та інші антибот-захисти можуть повертати 403
   * лише автоматичному браузеру. Це не означає, що сайт зламаний.
   */
  const botProtectionDetected = isLikelyBotProtection(result);

  if (
    result.responseStatus !== 200 &&
    !botProtectionDetected
  ) {
    /*
     * 404 і 410 — підтверджена проблема.
     */
    if (
      result.responseStatus === 404 ||
      result.responseStatus === 410
    ) {
      technicalScore -= 25;
      outreachScore += 25;

      scoreReasons.push(
        `Main page response status is ${result.responseStatus}: +25 outreach`
      );
    } else if (
      result.responseStatus !== null &&
      result.responseStatus >= 500
    ) {
      /*
       * 5xx може бути тимчасовою проблемою, тому не даємо
       * надто велику вагу після одного вимірювання.
       */
      technicalScore -= 15;
      outreachScore += 12;

      scoreReasons.push(
        `Main page server error ${result.responseStatus}: +12 outreach`
      );
    } else {
      technicalScore -= 8;
      outreachScore += 5;

      scoreReasons.push(
        `Main page response status is ${result.responseStatus ?? "unknown"}: +5 outreach`
      );
    }
  }

  /*
   * Відсутність viewport майже завжди означає погану
   * мобільну адаптацію.
   */
  if (!result.hasViewport) {
    technicalScore -= 20;
    outreachScore += 25;

    scoreReasons.push("Missing mobile viewport: +25 outreach");
  }

  /*
   * Mobile overflow тепер оцінюється не лише як boolean,
   * а за фактичною різницею ширини.
   */
  const mobileOverflowPixels = Math.max(
    0,
    result.mobileContentWidth - result.mobileViewportWidth
  );

  if (result.hasHorizontalScrollMobile) {
    if (mobileOverflowPixels > 100) {
      technicalScore -= 25;
      outreachScore += 35;

      scoreReasons.push(
        `Severe mobile horizontal overflow detected (${mobileOverflowPixels}px): +35 outreach`
      );
    } else if (mobileOverflowPixels > 20) {
      technicalScore -= 15;
      outreachScore += 20;

      scoreReasons.push(
        `Mobile horizontal overflow detected (${mobileOverflowPixels}px): +20 outreach`
      );
    } else {
      /*
       * Невелике переповнення фіксуємо, але воно не повинно
       * автоматично робити сайт сильним кандидатом.
       */
      technicalScore -= 4;
      outreachScore += 4;

      scoreReasons.push(
        `Minor mobile horizontal overflow detected (${mobileOverflowPixels}px): +4 outreach`
      );
    }
  }

  /*
   * Desktop overflow залишається важливим, але невелика
   * різниця ширини не повинна давати повний штраф.
   */
  const desktopOverflowPixels = Math.max(
    0,
    result.mobileContentWidth - result.mobileViewportWidth
  );

  if (result.hasHorizontalScrollDesktop) {
    if (desktopOverflowPixels > 100) {
      technicalScore -= 10;
      outreachScore += 10;

      scoreReasons.push(
        "Desktop horizontal overflow detected: +10 outreach"
      );
    } else {
      technicalScore -= 3;
      outreachScore += 3;

      scoreReasons.push(
        "Minor desktop horizontal overflow detected: +3 outreach"
      );
    }
  }

  /*
   * Підтверджені broken links залишаються сильним сигналом.
   */
  if (result.brokenLinksCount > 0) {
    const technicalPenalty = Math.min(
      result.brokenLinksCount * 8,
      24
    );

    const outreachPoints = Math.min(
      result.brokenLinksCount * 12,
      30
    );

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.brokenLinksCount} broken link(s): +${outreachPoints} outreach`
    );
  }

  /*
   * Broken images залишаємо, але з невеликою вагою.
   */
  if (result.brokenImagesCount > 0) {
    const technicalPenalty = Math.min(
      result.brokenImagesCount * 2,
      10
    );

    const outreachPoints = Math.min(
      result.brokenImagesCount * 2,
      8
    );

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.brokenImagesCount} potentially broken image(s): +${outreachPoints} outreach`
    );
  }

  /*
   * JavaScript issues зараз шумні: сторонні сервіси,
   * analytics та cookie-скрипти можуть генерувати помилки.
   *
   * Тому значно зменшуємо їхній вплив.
   */
  if (result.javaScriptIssuesCount > 0) {
    const technicalPenalty = Math.min(
      result.javaScriptIssuesCount * 2,
      8
    );

    const outreachPoints = Math.min(
      result.javaScriptIssuesCount * 3,
      9
    );

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.javaScriptIssuesCount} JavaScript issue(s): +${outreachPoints} outreach`
    );
  }

  /*
   * Meta description — корисна SEO-інформація, але слабкий
   * аргумент для холодного листа.
   */
  if (!result.hasMetaDescription) {
    technicalScore -= 7;
    outreachScore += 3;

    scoreReasons.push("Missing meta description: +3 outreach");
  }

  /*
   * Title також більше впливає на technicalScore,
   * ніж на рішення писати бізнесу.
   */
  if (result.titleQuality !== "ok") {
    technicalScore -= 6;
    outreachScore += 2;

    scoreReasons.push(
      `Page title quality is ${result.titleQuality}: +2 outreach`
    );
  }

  /*
   * Один вимір швидкості ненадійний, тому послаблюємо вагу.
   */
  if (result.loadTimeMs > 5000) {
    technicalScore -= 10;
    outreachScore += 8;

    scoreReasons.push(
      `Slow initial loading time (${formatSeconds(result.loadTimeMs)}s): +8 outreach`
    );
  } else if (result.loadTimeMs > 3000) {
    technicalScore -= 5;
    outreachScore += 3;

    scoreReasons.push(
      `Elevated initial loading time (${formatSeconds(result.loadTimeMs)}s): +3 outreach`
    );
  }

  /*
   * Alt-тексти залишаються технічною та accessibility-проблемою,
   * але більше не підвищують outreachScore.
   */
  if (result.imagesCount > 0) {
    const missingAltRatio =
      result.imagesWithoutAltCount / result.imagesCount;

    if (missingAltRatio >= 0.75) {
      technicalScore -= 7;
    } else if (missingAltRatio >= 0.25) {
      technicalScore -= 3;
    }
  }

  technicalScore = clampScore(technicalScore);
  outreachScore = clampScore(outreachScore);

  return {
    technicalScore,
    outreachScore,
    priority: getPriority(outreachScore),
    scoreReasons,
  };
}

function isLikelyBotProtection(result: ScoreInput): boolean {
  if (
    result.responseStatus !== 403 &&
    result.responseStatus !== 429
  ) {
    return false;
  }

  const normalizedTitle = result.title.toLowerCase();

  return (
    normalizedTitle.includes("cloudflare") ||
    normalizedTitle.includes("attention required") ||
    normalizedTitle.includes("access denied") ||
    normalizedTitle.includes("just a moment")
  );
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function getPriority(outreachScore: number): AuditPriority {
  if (outreachScore >= 70) {
    return "HIGH";
  }

  if (outreachScore >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2);
}