import type { Page } from "playwright";

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

  const internalLinks = normalizeInternalLinks(links, baseUrl);

  const brokenLinks: BrokenLink[] = [];

  for (const link of internalLinks) {
    try {
      const response = await page.request.get(link, {
        timeout: 10000,
      });

      const status = response.status();

      if (status >= 400) {
        brokenLinks.push({
          url: link,
          status,
        });
      }
    } catch {
      brokenLinks.push({
        url: link,
        status: null,
      });
    }
  }

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

      url.hash = "";

      normalizedLinks.push(url.toString());
    } catch {
      continue;
    }
  }

  return Array.from(new Set(normalizedLinks));
}