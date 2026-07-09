import type { Page } from "playwright";

export type SitemapCheckResult = {
  hasSitemap: boolean;
  sitemapStatus: number | null;
};

export async function checkSitemap(
  page: Page,
  siteUrl: string
): Promise<SitemapCheckResult> {
  try {
    const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString();

    const response = await page.request.get(sitemapUrl, {
      timeout: 5000,
    });

    const status = response.status();

    return {
      hasSitemap: status >= 200 && status < 400,
      sitemapStatus: status,
    };
  } catch {
    return {
      hasSitemap: false,
      sitemapStatus: null,
    };
  }
}