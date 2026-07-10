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
>;

export function calculateAuditScore(result: ScoreInput): AuditScore {
  let technicalScore = 100;
  let outreachScore = 0;

  const scoreReasons: string[] = [];

  if (!result.hasHttps) {
    technicalScore -= 15;
    outreachScore += 15;
    scoreReasons.push("Website does not use HTTPS: +15 outreach");
  }

  if (result.responseStatus !== 200) {
    technicalScore -= 20;
    outreachScore += 20;
    scoreReasons.push(
      `Main page response status is ${result.responseStatus ?? "unknown"}: +20 outreach`
    );
  }

  if (!result.hasViewport) {
    technicalScore -= 20;
    outreachScore += 25;
    scoreReasons.push("Missing mobile viewport: +25 outreach");
  }

  if (result.hasHorizontalScrollMobile) {
    technicalScore -= 25;
    outreachScore += 35;
    scoreReasons.push("Mobile horizontal overflow detected: +35 outreach");
  }

  if (result.hasHorizontalScrollDesktop) {
    technicalScore -= 10;
    outreachScore += 10;
    scoreReasons.push("Desktop horizontal overflow detected: +10 outreach");
  }

  if (result.brokenLinksCount > 0) {
    const technicalPenalty = Math.min(result.brokenLinksCount * 8, 24);
    const outreachPoints = Math.min(result.brokenLinksCount * 12, 30);

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.brokenLinksCount} broken link(s): +${outreachPoints} outreach`
    );
  }

  if (result.brokenImagesCount > 0) {
    const technicalPenalty = Math.min(result.brokenImagesCount * 2, 10);
    const outreachPoints = Math.min(result.brokenImagesCount * 2, 10);

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.brokenImagesCount} potentially broken image(s): +${outreachPoints} outreach`
    );
  }

  if (result.javaScriptIssuesCount > 0) {
    const technicalPenalty = Math.min(
      result.javaScriptIssuesCount * 5,
      15
    );

    const outreachPoints = Math.min(
      result.javaScriptIssuesCount * 7,
      20
    );

    technicalScore -= technicalPenalty;
    outreachScore += outreachPoints;

    scoreReasons.push(
      `${result.javaScriptIssuesCount} JavaScript issue(s): +${outreachPoints} outreach`
    );
  }

  if (!result.hasMetaDescription) {
    technicalScore -= 8;
    outreachScore += 8;
    scoreReasons.push("Missing meta description: +8 outreach");
  }

  if (result.titleQuality !== "ok") {
    technicalScore -= 7;
    outreachScore += 7;
    scoreReasons.push(
      `Page title quality is ${result.titleQuality}: +7 outreach`
    );
  }

  if (result.loadTimeMs > 5000) {
    technicalScore -= 15;
    outreachScore += 15;

    scoreReasons.push(
      `Slow initial loading time (${formatSeconds(result.loadTimeMs)}s): +15 outreach`
    );
  } else if (result.loadTimeMs > 3000) {
    technicalScore -= 8;
    outreachScore += 8;

    scoreReasons.push(
      `Elevated initial loading time (${formatSeconds(result.loadTimeMs)}s): +8 outreach`
    );
  }

  if (result.imagesCount > 0) {
    const missingAltRatio =
      result.imagesWithoutAltCount / result.imagesCount;

    if (missingAltRatio >= 0.75) {
      technicalScore -= 8;
      outreachScore += 6;

      scoreReasons.push(
        `${result.imagesWithoutAltCount}/${result.imagesCount} images lack alt text: +6 outreach`
      );
    } else if (missingAltRatio >= 0.25) {
      technicalScore -= 4;
      outreachScore += 3;

      scoreReasons.push(
        `${result.imagesWithoutAltCount}/${result.imagesCount} images lack alt text: +3 outreach`
      );
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