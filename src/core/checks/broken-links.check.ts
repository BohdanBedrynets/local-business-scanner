import type { Page } from "playwright";
import { appConfig } from "../../config/app.config.js";

export type BrokenLink = {
  url: string;
  status: number | null;
};

export type BrokenLinksCheckResult = {
  brokenLinksCount: number;
  brokenLinks: BrokenLink[];
};

type LinkCheckResult = {
  url: string;
  status: number | null;
  isBroken: boolean;
};

export async function checkBrokenLinks(
  page: Page,
  baseUrl: string
): Promise<BrokenLinksCheckResult> {
  const rawLinks = await page.locator("a").evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
  );

  const internalLinks = normalizeInternalLinks(rawLinks, baseUrl).slice(
    0,
    appConfig.checks.brokenLinks.maxLinksPerSite
  );

  const checkedLinks = await checkLinksInBatches(
    page,
    internalLinks,
    3
  );

  const brokenLinks: BrokenLink[] = checkedLinks
    .filter((link) => link.isBroken)
    .map((link) => ({
      url: link.url,
      status: link.status,
    }));

  return {
    brokenLinksCount: brokenLinks.length,
    brokenLinks,
  };
}

async function checkLinksInBatches(
  page: Page,
  links: string[],
  concurrency: number
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];

  for (let index = 0; index < links.length; index += concurrency) {
    const batch = links.slice(index, index + concurrency);

    const batchResults = await Promise.all(
      batch.map((url) => checkSingleLink(page, url))
    );

    results.push(...batchResults);

    /*
     * Невелика пауза між пачками зменшує ризик
     * отримати 429 Too Many Requests.
     */
    if (index + concurrency < links.length) {
      await page.waitForTimeout(250);
    }
  }

  return results;
}

async function checkSingleLink(
  page: Page,
  url: string
): Promise<LinkCheckResult> {
  try {
    const response = await page.request.get(url, {
      timeout: appConfig.checks.brokenLinks.timeoutMs,
      failOnStatusCode: false,
    });

    const status = response.status();

    return {
      url,
      status,
      isBroken: isBrokenStatus(status),
    };
  } catch {
    /*
     * Timeout або мережевий збій не доводить,
     * що посилання справді бите.
     */
    return {
      url,
      status: null,
      isBroken: false,
    };
  }
}

function isBrokenStatus(status: number): boolean {
  return status === 404 || status === 410 || status >= 500;
}

function normalizeInternalLinks(
  links: string[],
  baseUrl: string
): string[] {
  const base = new URL(baseUrl);
  const normalizedLinks: string[] = [];

  for (const rawLink of links) {
    const link = rawLink.trim();

    if (!link) {
      continue;
    }

    const lowercaseLink = link.toLowerCase();

    if (
      lowercaseLink.startsWith("#") ||
      lowercaseLink.startsWith("mailto:") ||
      lowercaseLink.startsWith("tel:") ||
      lowercaseLink.startsWith("javascript:") ||
      lowercaseLink.startsWith("sms:") ||
      lowercaseLink.startsWith("data:") ||
      lowercaseLink.startsWith("blob:")
    ) {
      continue;
    }

    try {
      const url = new URL(link, baseUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        continue;
      }

      if (url.hostname !== base.hostname) {
        continue;
      }

      const pathname = url.pathname.toLowerCase();

      if (
        pathname.endsWith(".pdf") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".webp") ||
        pathname.endsWith(".avif") ||
        pathname.endsWith(".gif") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".zip")
      ) {
        continue;
      }

      if (
        pathname.includes("/wp-admin") ||
        pathname.includes("/wp-login")
      ) {
        continue;
      }

      url.hash = "";

      normalizedLinks.push(url.toString());
    } catch {
      continue;
    }
  }

  return Array.from(new Set(normalizedLinks));
}