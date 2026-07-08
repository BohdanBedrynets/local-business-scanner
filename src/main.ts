import { appConfig } from "./config/app.config.js";

import { readSitesFromCsv } from "./infrastructure/csv/site-csv-reader.js";
import { writeScanResultsToCsv } from "./infrastructure/csv/scan-result-csv-writer.js";
import { writeHtmlReport } from "./infrastructure/report/html-report-writer.js";

import { BrowserService } from "./infrastructure/browser/browser.service.js";
import { ScannerService } from "./core/scanner/scanner.service.js";

import type { ScanResult } from "./core/types/scan-result.types.js";

async function main(): Promise<void> {
  const startedAt = Date.now();

  const sites = await readSitesFromCsv(appConfig.inputCsvPath);

  console.log(`Loaded ${sites.length} sites`);

  const browserService = new BrowserService();
  const scannerService = new ScannerService(browserService);

  const results: ScanResult[] = [];

  await browserService.start();

  try {
    for (const [index, site] of sites.entries()) {
      const current = index + 1;
      const total = sites.length;

      console.log(`\n[${current}/${total}] Scanning ${site.name}`);
      console.log(site.url);

      try {
        const result = await scannerService.scanSite(site);

        results.push(result);

        console.log(`✓ Finished ${site.name}`);
      } catch (error) {
        const failedResult: ScanResult = {
          site,
          title: "",
          hasHttps: site.url.startsWith("https://"),
          responseStatus: null,
          loadTimeMs: 0,
          hasFavicon: false,
          hasViewport: false,
          hasPdfLinks: false,
          pdfLinksCount: 0,
          pdfLinks: [],
          brokenImagesCount: 0,
          brokenImages: [],
          hasHorizontalScrollDesktop: false,
          hasHorizontalScrollMobile: false,
          mobileViewportWidth: 0,
          mobileContentWidth: 0,
          desktopScreenshotPath: "",
          mobileScreenshotPath: "",
          error:
            error instanceof Error
              ? error.message.split("\n")[0]
              : "Unknown error",
        };

        results.push(failedResult);

        console.error(`✗ Failed ${site.name}: ${failedResult.error}`);
      }
    }
  } finally {
    await browserService.close();
  }

  await writeScanResultsToCsv(appConfig.outputCsvPath, results);
  await writeHtmlReport(appConfig.reportPath, results);

  const failedCount = results.filter((result) => result.error !== null).length;
  const successCount = results.length - failedCount;

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log("\nScan finished");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Duration: ${durationSeconds}s`);
  console.log(`Results saved to ${appConfig.outputCsvPath}`);
  console.log(`HTML report saved to ${appConfig.reportPath}`);
}

main();