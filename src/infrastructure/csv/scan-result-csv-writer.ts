import { writeFile } from "node:fs/promises";
import { stringify } from "csv-stringify/sync";
import type { ScanResult } from "../../core/types/scan-result.types.js";

export async function writeScanResultsToCsv(
  filePath: string,
  results: ScanResult[]
): Promise<void> {
  const records = results.map((result) => ({
    name: result.site.name,
    url: result.site.url,
    title: result.title,
    hasHttps: result.hasHttps,
    responseStatus: result.responseStatus,
    loadTimeMs: result.loadTimeMs,
    loadTimeSeconds: (result.loadTimeMs / 1000).toFixed(2),
    hasFavicon: result.hasFavicon,
    hasViewport: result.hasViewport,
    hasPdfLinks: result.hasPdfLinks,
    pdfLinksCount: result.pdfLinksCount,
    pdfLinks: result.pdfLinks.join(" | "),
    brokenImagesCount: result.brokenImagesCount,
    brokenImages: result.brokenImages.join(" | "),
    hasHorizontalScrollDesktop: result.hasHorizontalScrollDesktop,
    hasHorizontalScrollMobile: result.hasHorizontalScrollMobile,
    mobileViewportWidth: result.mobileViewportWidth,
    mobileContentWidth: result.mobileContentWidth,
    desktopScreenshotPath: result.desktopScreenshotPath,
    mobileScreenshotPath: result.mobileScreenshotPath,
    error: result.error,
  }));

  const csv = stringify(records, {
    header: true,
  });

  await writeFile(filePath, csv, "utf-8");
}