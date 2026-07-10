import { writeFile } from "node:fs/promises";
import type { ScanResult } from "../../core/types/scan-result.types.js";

export async function writeHtmlReport(
  filePath: string,
  results: ScanResult[]
): Promise<void> {
  const html = buildHtmlReport(results);

  await writeFile(filePath, html, "utf-8");
}

function buildHtmlReport(results: ScanResult[]): string {
  const total = results.length;
  const failed = results.filter((result) => result.error !== null).length;
  const success = total - failed;

  const highPriority = results.filter(
    (result) => result.error === null && result.priority === "HIGH"
  ).length;

  const mediumPriority = results.filter(
    (result) => result.error === null && result.priority === "MEDIUM"
  ).length;

  const lowPriority = results.filter(
    (result) => result.error === null && result.priority === "LOW"
  ).length;

  const siteCards = [...results]
    .sort((first, second) => second.outreachScore - first.outreachScore)
    .map(buildSiteCard)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Local Business Scanner Report</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f4f6f8;
      color: #1f2937;
      line-height: 1.5;
    }

    header {
      padding: 32px;
      background: #111827;
      color: white;
    }

    header h1 {
      margin: 0 0 8px;
    }

    header p {
      margin: 0;
      color: #d1d5db;
    }

    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      min-width: 0;
      padding: 16px 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .summary-card strong {
      display: block;
      margin-bottom: 4px;
      font-size: 28px;
    }

    .summary-card span {
      color: #6b7280;
      font-size: 14px;
    }

    .site-card {
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
    }

    .site-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .site-header h2 {
      margin: 0 0 6px;
    }

    .site-header a {
      color: #2563eb;
      word-break: break-all;
    }

    .site-title {
      margin-top: 6px;
      color: #6b7280;
      font-size: 14px;
    }

    .status {
      flex-shrink: 0;
      padding: 6px 11px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: bold;
      white-space: nowrap;
    }

    .status-ok {
      background: #dcfce7;
      color: #166534;
    }

    .status-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .status-error {
      background: #fee2e2;
      color: #991b1b;
    }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .score-card {
      padding: 14px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    .score-card strong {
      display: block;
      margin-bottom: 4px;
      font-size: 22px;
    }

    .score-card span {
      color: #6b7280;
      font-size: 14px;
    }

    .checks {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }

    .check {
      padding: 10px 12px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
    }

    .check-ok {
      border-left: 4px solid #16a34a;
    }

    .check-warning {
      border-left: 4px solid #d97706;
    }

    .details {
      margin-top: 14px;
      color: #4b5563;
      font-size: 14px;
    }

    .details ul {
      margin: 8px 0 0;
      padding-left: 22px;
    }

    .details li {
      margin-bottom: 5px;
      overflow-wrap: anywhere;
    }

    .error-box {
      padding: 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
    }

    .screenshots {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr);
      gap: 16px;
      margin-top: 20px;
    }

    .screenshot-block h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .screenshot-block img {
      display: block;
      width: 100%;
      max-height: 600px;
      object-fit: contain;
      object-position: top;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    @media (max-width: 800px) {
      header {
        padding: 24px;
      }

      main {
        padding: 16px;
      }

      .site-header {
        flex-direction: column;
      }

      .screenshots {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>

<body>
  <header>
    <h1>Local Business Scanner Report</h1>
    <p>
      Sites are ordered from the highest to the lowest outreach score.
    </p>
  </header>

  <main>
    <section class="summary">
      ${buildSummaryCard(total, "Total sites")}
      ${buildSummaryCard(success, "Successful")}
      ${buildSummaryCard(failed, "Failed")}
      ${buildSummaryCard(highPriority, "High priority")}
      ${buildSummaryCard(mediumPriority, "Medium priority")}
      ${buildSummaryCard(lowPriority, "Low priority")}
    </section>

    ${siteCards}
  </main>
</body>
</html>`;
}

function buildSiteCard(result: ScanResult): string {
  if (result.error) {
    return buildFailedSiteCard(result);
  }

  const statusClass = getSiteStatusClass(result);
  const statusLabel = getSiteStatusLabel(result);

  return `<section class="site-card">
    <div class="site-header">
      <div>
        <h2>${escapeHtml(result.site.name)}</h2>

        <a
          href="${escapeHtml(result.site.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(result.site.url)}
        </a>

        <div class="site-title">
          ${escapeHtml(result.title)}
        </div>
      </div>

      <span class="status ${statusClass}">
        ${escapeHtml(statusLabel)}
      </span>
    </div>

    <div class="score-grid">
      ${buildScoreCard(`${result.technicalScore}/100`, "Technical score")}
      ${buildScoreCard(`${result.outreachScore}/100`, "Outreach score")}
      ${buildScoreCard(result.priority, "Outreach priority")}
    </div>

    ${buildList("Score reasons", result.scoreReasons)}

    <div class="checks">
      ${buildCheck("HTTPS", result.hasHttps)}
      ${buildCheck("Response status 200", result.responseStatus === 200)}
      ${buildCheck("Favicon", result.hasFavicon)}
      ${buildCheck("Mobile viewport", result.hasViewport)}
      ${buildCheck("Meta description", result.hasMetaDescription)}
      ${buildCheck("Title quality", result.titleQuality === "ok")}
      ${buildCheck("No broken links", result.brokenLinksCount === 0)}
      ${buildCheck("No JavaScript issues", result.javaScriptIssuesCount === 0)}
      ${buildCheck("No broken images", result.brokenImagesCount === 0)}
      ${buildCheck(
        "No desktop horizontal overflow",
        !result.hasHorizontalScrollDesktop
      )}
      ${buildCheck(
        "No mobile horizontal overflow",
        !result.hasHorizontalScrollMobile
      )}
      ${buildCheck("robots.txt", result.hasRobotsTxt)}
      ${buildCheck("sitemap.xml", result.hasSitemap)}

      ${buildValueCheck(
        "Load time",
        `${formatSeconds(result.loadTimeMs)} s`,
        result.loadTimeMs <= 3000
      )}

      ${buildValueCheck(
        "Mobile content width",
        `${result.mobileContentWidth}px / ${result.mobileViewportWidth}px`,
        !result.hasHorizontalScrollMobile
      )}

      ${buildValueCheck(
        "PDF links",
        String(result.pdfLinksCount),
        result.pdfLinksCount === 0
      )}

      ${buildValueCheck(
        "Images without alt",
        `${result.imagesWithoutAltCount} / ${result.imagesCount}`,
        result.imagesWithoutAltCount === 0
      )}

      ${buildValueCheck(
        "Emails found",
        String(result.emailsCount),
        result.emailsCount > 0
      )}

      ${buildValueCheck(
        "Phones found",
        String(result.phonesCount),
        result.phonesCount > 0
      )}

      ${buildValueCheck(
        "Social links found",
        String(result.socialLinksCount),
        result.socialLinksCount > 0
      )}
    </div>

    ${buildBrokenLinksList(result)}
    ${buildJavaScriptIssuesList(result)}
    ${buildList("Potentially broken images", result.brokenImages)}
    ${buildList("PDF links", result.pdfLinks)}
    ${buildList("Emails", result.emails)}
    ${buildList("Phones", result.phones)}
    ${buildList("Social links", result.socialLinks)}

    ${buildScreenshots(result)}
  </section>`;
}

function buildFailedSiteCard(result: ScanResult): string {
  return `<section class="site-card">
    <div class="site-header">
      <div>
        <h2>${escapeHtml(result.site.name)}</h2>

        <a
          href="${escapeHtml(result.site.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(result.site.url)}
        </a>
      </div>

      <span class="status status-error">Failed</span>
    </div>

    <div class="error-box">
      <strong>Scan error:</strong>
      ${escapeHtml(result.error ?? "Unknown error")}
    </div>
  </section>`;
}

function buildScreenshots(result: ScanResult): string {
  if (!result.desktopScreenshotPath && !result.mobileScreenshotPath) {
    return "";
  }

  return `<div class="screenshots">
    ${buildScreenshotBlock(
      "Desktop screenshot",
      result.desktopScreenshotPath
    )}

    ${buildScreenshotBlock(
      "Mobile screenshot",
      result.mobileScreenshotPath
    )}
  </div>`;
}

function buildScreenshotBlock(title: string, filePath: string): string {
  if (!filePath) {
    return "";
  }

  return `<div class="screenshot-block">
    <h3>${escapeHtml(title)}</h3>

    <img
      src="../../${escapeHtml(filePath)}"
      alt="${escapeHtml(title)}"
    />
  </div>`;
}

function buildBrokenLinksList(result: ScanResult): string {
  if (result.brokenLinks.length === 0) {
    return "";
  }

  const items = result.brokenLinks.map((link) => {
    const status =
      link.status === null ? "request failed" : `status ${link.status}`;

    return `${link.url} — ${status}`;
  });

  return buildList("Broken links", items);
}

function buildJavaScriptIssuesList(result: ScanResult): string {
  if (result.javaScriptIssues.length === 0) {
    return "";
  }

  const items = result.javaScriptIssues.map(
    (issue) => `${issue.type}: ${issue.message}`
  );

  return buildList("JavaScript issues", items);
}

function buildSummaryCard(value: number, label: string): string {
  return `<div class="summary-card">
    <strong>${value}</strong>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function buildScoreCard(value: string, label: string): string {
  return `<div class="score-card">
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function buildCheck(label: string, isOk: boolean): string {
  const icon = isOk ? "✓" : "⚠";
  const className = isOk ? "check-ok" : "check-warning";

  return `<div class="check ${className}">
    ${icon} ${escapeHtml(label)}
  </div>`;
}

function buildValueCheck(
  label: string,
  value: string,
  isOk: boolean
): string {
  const icon = isOk ? "✓" : "⚠";
  const className = isOk ? "check-ok" : "check-warning";

  return `<div class="check ${className}">
    ${icon} ${escapeHtml(label)}: ${escapeHtml(value)}
  </div>`;
}

function buildList(title: string, items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  const listItems = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<div class="details">
    <strong>${escapeHtml(title)}:</strong>
    <ul>${listItems}</ul>
  </div>`;
}

function getSiteStatusLabel(result: ScanResult): string {
  if (result.error) {
    return "Failed";
  }

  return result.priority;
}

function getSiteStatusClass(result: ScanResult): string {
  if (result.error || result.priority === "HIGH") {
    return "status-error";
  }

  if (result.priority === "MEDIUM") {
    return "status-warning";
  }

  return "status-ok";
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}