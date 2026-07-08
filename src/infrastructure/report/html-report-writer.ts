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

  const rows = results.map(buildSiteCard).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Local Business Scanner Report</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #1f2937;
    }

    header {
      background: #111827;
      color: white;
      padding: 32px;
    }

    header h1 {
      margin: 0 0 8px;
    }

    main {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .summary-card {
      background: white;
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      min-width: 140px;
    }

    .summary-card strong {
      display: block;
      font-size: 28px;
      margin-bottom: 4px;
    }

    .site-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
    }

    .site-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .site-header h2 {
      margin: 0 0 6px;
    }

    .site-header a {
      color: #2563eb;
      word-break: break-all;
    }

    .status {
      padding: 6px 10px;
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

    .checks {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }

    .check {
      background: #f9fafb;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .screenshots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }

    .screenshot-block h3 {
      margin: 0 0 8px;
      font-size: 16px;
    }

    .screenshot-block img {
      width: 100%;
      max-height: 520px;
      object-fit: contain;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
    }

    .details {
      margin-top: 12px;
      font-size: 14px;
      color: #4b5563;
    }

    @media (max-width: 800px) {
      .screenshots {
        grid-template-columns: 1fr;
      }

      .site-header {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Local Business Scanner Report</h1>
    <p>Generated from scanned website data.</p>
  </header>

  <main>
    <section class="summary">
      <div class="summary-card">
        <strong>${total}</strong>
        Total sites
      </div>
      <div class="summary-card">
        <strong>${success}</strong>
        Successful
      </div>
      <div class="summary-card">
        <strong>${failed}</strong>
        Failed
      </div>
    </section>

    ${rows}
  </main>
</body>
</html>`;
}

function buildSiteCard(result: ScanResult): string {
  const statusClass = getSiteStatusClass(result);
  const statusLabel = getSiteStatusLabel(result);

  if (result.error) {
    return `<section class="site-card">
      <div class="site-header">
        <div>
          <h2>${escapeHtml(result.site.name)}</h2>
          <a href="${escapeHtml(result.site.url)}" target="_blank">${escapeHtml(result.site.url)}</a>
        </div>
        <span class="status status-error">Failed</span>
      </div>
      <div class="details"><strong>Error:</strong> ${escapeHtml(result.error)}</div>
    </section>`;
  }

  return `<section class="site-card">
    <div class="site-header">
      <div>
        <h2>${escapeHtml(result.site.name)}</h2>
        <a href="${escapeHtml(result.site.url)}" target="_blank">${escapeHtml(result.site.url)}</a>
        <div class="details">${escapeHtml(result.title)}</div>
      </div>
      <span class="status ${statusClass}">${statusLabel}</span>
    </div>

    <div class="checks">
      ${buildCheck("HTTPS", result.hasHttps)}
      ${buildCheck("Status 200", result.responseStatus === 200)}
      ${buildCheck("Favicon", result.hasFavicon)}
      ${buildCheck("Viewport", result.hasViewport)}
      ${buildCheck("PDF links", !result.hasPdfLinks)}
      ${buildCheck("Broken images", result.brokenImagesCount === 0)}
      ${buildCheck("Desktop overflow", !result.hasHorizontalScrollDesktop)}
      ${buildCheck("Mobile overflow", !result.hasHorizontalScrollMobile)}
      <div class="check">Load time: ${formatSeconds(result.loadTimeMs)}s</div>
      <div class="check">Mobile width: ${result.mobileContentWidth}px / ${result.mobileViewportWidth}px</div>
    </div>

    ${buildList("PDF links", result.pdfLinks)}
    ${buildList("Broken images", result.brokenImages)}

    <div class="screenshots">
      <div class="screenshot-block">
        <h3>Desktop screenshot</h3>
        <img src="../../${escapeHtml(result.desktopScreenshotPath)}" alt="Desktop screenshot" />
      </div>
      <div class="screenshot-block">
        <h3>Mobile screenshot</h3>
        <img src="../../${escapeHtml(result.mobileScreenshotPath)}" alt="Mobile screenshot" />
      </div>
    </div>
  </section>`;
}

function buildCheck(label: string, isOk: boolean): string {
  return `<div class="check">${isOk ? "✅" : "⚠️"} ${escapeHtml(label)}</div>`;
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

  const hasMajorIssue =
    !result.hasHttps ||
    result.responseStatus !== 200 ||
    result.hasHorizontalScrollMobile ||
    result.brokenImagesCount > 0;

  return hasMajorIssue ? "Needs review" : "OK";
}

function getSiteStatusClass(result: ScanResult): string {
  if (result.error) {
    return "status-error";
  }

  const hasMajorIssue =
    !result.hasHttps ||
    result.responseStatus !== 200 ||
    result.hasHorizontalScrollMobile ||
    result.brokenImagesCount > 0;

  return hasMajorIssue ? "status-warning" : "status-ok";
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}