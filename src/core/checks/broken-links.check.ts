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

export async function checkBrokenLinks(
  page: Page,
  baseUrl: string
): Promise<BrokenLinksCheckResult> {
  const links = await page.locator("a").evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
  );

  const internalLinks = normalizeInternalLinks(links, baseUrl).slice(
    0,
    appConfig.checks.brokenLinks.maxLinksPerSite
  );

  const results = await Promise.all(
    internalLinks.map(async (link): Promise<BrokenLink | null> => {
      try {
        const response = await page.request.get(link, {
          timeout: appConfig.checks.brokenLinks.timeoutMs,
        });

        const status = response.status();

        if (status >= 400) {
          return {
            url: link,
            status,
          };
        }

        return null;
      } catch {
        return {
          url: link,
          status: null,
        };
      }
    })
  );

  const brokenLinks = results.filter(
    (result): result is BrokenLink => result !== null
  );

  return {
    brokenLinksCount: brokenLinks.length,
    brokenLinks,
  };
}

function normalizeInternalLinks(links: string[], baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const normalizedLinks: string[] = [];

  for (const link of links) {
    if (
      link.startsWith("#") ||
      link.startsWith("mailto:") ||
      link.startsWith("tel:") ||
      link.startsWith("javascript:")
    ) {
      continue;
    }

    try {
      const url = new URL(link, baseUrl);

      if (url.hostname !== base.hostname) {
        continue;
      }

      if (url.pathname.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      if (
        url.pathname.includes("wp-login") ||
        url.pathname.includes("wp-admin")
      ) {
        continue;
      }

      url.hash = "";
      url.search = "";

      normalizedLinks.push(url.toString());
    } catch {
      continue;
    }
  }

  return Array.from(new Set(normalizedLinks));
}