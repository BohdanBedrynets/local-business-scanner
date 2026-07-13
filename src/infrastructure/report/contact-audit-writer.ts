import {
  mkdir,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import type { ScanResult } from "../../core/types/scan-result.types.js";

import {
  buildContactAuditIssues,
  type ContactAuditIssue,
} from "../../core/audit/contact-audit-content.service.js";

import { createSlug } from "../../utils/slug.utils.js";

type ScreenshotSelection = {
  showDesktop: boolean;
  showMobile: boolean;
};

export async function writeContactAudits(
  directoryPath: string,
  results: ScanResult[]
): Promise<number> {
  await mkdir(directoryPath, {
    recursive: true,
  });

  await removeOldAuditFiles(directoryPath);

  const contactResults = results.filter(
    (result) =>
      result.error === null &&
      result.outreachRecommendation === "CONTACT"
  );

  let createdCount = 0;

  for (const result of contactResults) {
    const issues = buildContactAuditIssues(result);

    if (issues.length === 0) {
      continue;
    }

    const slug = createSlug(result.site.name);

    const filePath = path.join(
      directoryPath,
      `${slug}.html`
    );

    const html = buildContactAuditHtml(
      result,
      issues,
      directoryPath
    );

    await writeFile(filePath, html, "utf-8");

    createdCount += 1;
  }

  return createdCount;
}

async function removeOldAuditFiles(
  directoryPath: string
): Promise<void> {
  const directoryEntries = await readdir(
    directoryPath,
    {
      withFileTypes: true,
    }
  );

  const htmlFiles = directoryEntries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".html")
  );

  await Promise.all(
    htmlFiles.map((file) =>
      unlink(path.join(directoryPath, file.name))
    )
  );
}

function buildContactAuditHtml(
  result: ScanResult,
  issues: ContactAuditIssue[],
  auditDirectoryPath: string
): string {
  const desktopScreenshotSource =
    buildRelativeScreenshotPath(
      auditDirectoryPath,
      result.desktopScreenshotPath
    );

  const mobileScreenshotSource =
    buildRelativeScreenshotPath(
      auditDirectoryPath,
      result.mobileScreenshotPath
    );

  const screenshotSelection =
    getScreenshotSelection(result);

  const issuesHtml = issues
    .map(buildIssueCard)
    .join("\n");

  const summaryText = buildSummaryText(issues);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Website-Kurzanalyse – ${escapeHtml(result.site.name)}
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      background: #f3f4f6;
      color: #1f2937;
      line-height: 1.65;
    }

    a {
      color: #1d4ed8;
    }

    .page-header {
      padding: 46px 24px;
      background: #111827;
      color: #ffffff;
    }

    .page-header__inner {
      max-width: 1050px;
      margin: 0 auto;
    }

    .page-header h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.2;
    }

    .page-header p {
      margin: 0;
      color: #d1d5db;
      font-size: 17px;
    }

    main {
      max-width: 1050px;
      margin: 0 auto;
      padding: 28px 20px 60px;
    }

    .section {
      margin-bottom: 24px;
      padding: 26px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .section h2 {
      margin: 0 0 18px;
      font-size: 24px;
    }

    .site-name {
      display: block;
      margin-bottom: 4px;
      font-size: 20px;
    }

    .site-link {
      display: inline-block;
      overflow-wrap: anywhere;
    }

    .page-title {
      margin: 14px 0 0;
      color: #6b7280;
      font-size: 14px;
    }

    .summary-box {
      padding: 20px;
      background: #f9fafb;
      border-left: 5px solid #2563eb;
      border-radius: 10px;
    }

    .summary-box p {
      margin: 0;
      color: #374151;
      font-size: 16px;
    }

    .issue-list {
      display: grid;
      gap: 18px;
    }

    .issue-card {
      padding: 22px;
      border: 1px solid #e5e7eb;
      border-left-width: 6px;
      border-radius: 12px;
      background: #ffffff;
    }

    .issue-card--high {
      border-left-color: #dc2626;
    }

    .issue-card--medium {
      border-left-color: #d97706;
    }

    .issue-card--low {
      border-left-color: #2563eb;
    }

    .issue-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }

    .issue-card h3 {
      margin: 0;
      font-size: 20px;
      line-height: 1.35;
    }

    .severity {
      flex-shrink: 0;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .severity--high {
      background: #fee2e2;
      color: #991b1b;
    }

    .severity--medium {
      background: #fef3c7;
      color: #92400e;
    }

    .severity--low {
      background: #dbeafe;
      color: #1e40af;
    }

    .issue-row {
      margin-top: 15px;
    }

    .issue-row strong {
      display: block;
      margin-bottom: 4px;
    }

    .issue-row p {
      margin: 0;
      color: #4b5563;
    }

    .technical-details {
      margin: 8px 0 0;
      padding-left: 22px;
      color: #4b5563;
    }

    .technical-details li {
      margin-bottom: 6px;
      overflow-wrap: anywhere;
    }

    .screenshots {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }

    .screenshot-card {
      min-width: 0;
    }

    .screenshot-card h3 {
      margin: 0 0 10px;
      font-size: 17px;
    }

    .screenshot-card img {
      display: block;
      width: 100%;
      max-height: 760px;
      object-fit: contain;
      object-position: top;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
    }

    .footer {
      padding: 6px 4px;
      color: #6b7280;
      font-size: 13px;
      text-align: center;
    }

    @media (max-width: 760px) {
      .page-header {
        padding: 30px 18px;
      }

      .page-header h1 {
        font-size: 27px;
      }

      main {
        padding: 18px 12px 40px;
      }

      .section {
        padding: 18px;
      }

      .issue-card__header {
        flex-direction: column;
      }
    }
  </style>
</head>

<body>
  <header class="page-header">
    <div class="page-header__inner">
      <h1>
        Website-Kurzanalyse
      </h1>

      <p>
        Technische Prüfung von
        ${escapeHtml(result.site.name)}
      </p>
    </div>
  </header>

  <main>
    <section class="section">
      <strong class="site-name">
        ${escapeHtml(result.site.name)}
      </strong>

      <a
        class="site-link"
        href="${escapeHtml(result.site.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(result.site.url)}
      </a>

      ${
        result.title
          ? `<p class="page-title">
              Seitentitel:
              ${escapeHtml(result.title)}
            </p>`
          : ""
      }
    </section>

    <section class="section">
      <h2>Kurzes Ergebnis</h2>

      <div class="summary-box">
        <p>
          ${escapeHtml(summaryText)}
        </p>
      </div>
    </section>

    <section class="section">
      <h2>Festgestellte Probleme</h2>

      <div class="issue-list">
        ${issuesHtml}
      </div>
    </section>

    ${buildScreenshotsSection(
      desktopScreenshotSource,
      mobileScreenshotSource,
      screenshotSelection
    )}

    <div class="footer">
      Technische Kurzanalyse der öffentlich
      erreichbaren Website.
    </div>
  </main>
</body>
</html>`;
}

function getScreenshotSelection(
  result: ScanResult
): ScreenshotSelection {
  const mainPageError =
    result.responseStatus === 404 ||
    result.responseStatus === 410 ||
    (
      result.responseStatus !== null &&
      result.responseStatus >= 500
    );

  const hasMobileProblem =
    !result.hasViewport ||
    result.hasHorizontalScrollMobile;

  const hasDesktopProblem =
    result.hasHorizontalScrollDesktop;

  /*
   * Для broken links загальний скріншот нічого не доводить.
   * Доказом є конкретні URL та HTTP-статуси.
   */
  const hasOnlyBrokenLinks =
    result.brokenLinksCount > 0 &&
    !hasMobileProblem &&
    !hasDesktopProblem &&
    !mainPageError &&
    result.brokenImagesCount === 0;

  if (hasOnlyBrokenLinks) {
    return {
      showDesktop: false,
      showMobile: false,
    };
  }

  if (mainPageError) {
    return {
      showDesktop: true,
      showMobile: true,
    };
  }

  return {
    showDesktop: hasDesktopProblem,
    showMobile: hasMobileProblem,
  };
}

function buildSummaryText(
  issues: ContactAuditIssue[]
): string {
  const highIssues = issues.filter(
    (issue) => issue.severity === "high"
  );

  if (highIssues.length >= 2) {
    return "Bei der Prüfung wurden mehrere deutliche technische Probleme festgestellt. Diese können die Bedienung, Erreichbarkeit oder Darstellung der Website beeinträchtigen. Die wichtigsten Punkte und konkrete technische Details sind im Folgenden zusammengefasst.";
  }

  if (highIssues.length === 1) {
    return "Bei der Prüfung wurde ein deutliches technisches Problem festgestellt, das die Nutzung oder Erreichbarkeit der Website beeinträchtigen kann. Der betroffene Bereich und eine mögliche Lösung sind im Folgenden beschrieben.";
  }

  return "Bei der Prüfung wurden einzelne technische Punkte festgestellt, die verbessert werden können. Die Ergebnisse und Empfehlungen sind im Folgenden zusammengefasst.";
}

function buildIssueCard(
  issue: ContactAuditIssue
): string {
  const severityLabel =
    issue.severity === "high"
      ? "Hoch"
      : issue.severity === "medium"
        ? "Mittel"
        : "Niedrig";

  const detailsHtml = issue.technicalDetails
    .map(
      (detail) =>
        `<li>${escapeHtml(detail)}</li>`
    )
    .join("");

  return `<article
    class="issue-card issue-card--${issue.severity}"
  >
    <div class="issue-card__header">
      <h3>${escapeHtml(issue.title)}</h3>

      <span
        class="severity severity--${issue.severity}"
      >
        ${severityLabel}
      </span>
    </div>

    <div class="issue-row">
      <strong>Beschreibung</strong>

      <p>
        ${escapeHtml(issue.description)}
      </p>
    </div>

    <div class="issue-row">
      <strong>Mögliche Auswirkung</strong>

      <p>
        ${escapeHtml(issue.impact)}
      </p>
    </div>

    <div class="issue-row">
      <strong>Empfehlung</strong>

      <p>
        ${escapeHtml(issue.recommendation)}
      </p>
    </div>

    ${
      detailsHtml
        ? `<div class="issue-row">
            <strong>Technische Details</strong>

            <ul class="technical-details">
              ${detailsHtml}
            </ul>
          </div>`
        : ""
    }
  </article>`;
}

function buildScreenshotsSection(
  desktopScreenshotSource: string,
  mobileScreenshotSource: string,
  selection: ScreenshotSelection
): string {
  const desktopCard =
    selection.showDesktop &&
    desktopScreenshotSource
      ? buildScreenshotCard(
          "Desktop-Ansicht",
          desktopScreenshotSource
        )
      : "";

  const mobileCard =
    selection.showMobile &&
    mobileScreenshotSource
      ? buildScreenshotCard(
          "Mobile Ansicht",
          mobileScreenshotSource
        )
      : "";

  if (!desktopCard && !mobileCard) {
    return "";
  }

  return `<section class="section">
    <h2>Relevante Ansicht der Website</h2>

    <div class="screenshots">
      ${desktopCard}
      ${mobileCard}
    </div>
  </section>`;
}

function buildScreenshotCard(
  title: string,
  source: string
): string {
  return `<div class="screenshot-card">
    <h3>${escapeHtml(title)}</h3>

    <img
      src="${escapeHtml(source)}"
      alt="${escapeHtml(title)}"
    />
  </div>`;
}

function buildRelativeScreenshotPath(
  auditDirectoryPath: string,
  screenshotPath: string
): string {
  if (!screenshotPath) {
    return "";
  }

  const relativePath = path.relative(
    auditDirectoryPath,
    screenshotPath
  );

  return relativePath
    .split(path.sep)
    .join("/");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}