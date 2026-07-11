import type { APIResponse, Page } from "playwright";
import { appConfig } from "../../config/app.config.js";

export type BrokenLink = {
  url: string;
  status: number | null;
};

export type BrokenLinksCheckResult = {
  brokenLinksCount: number;
  brokenLinks: BrokenLink[];
};

type LinkCheckClassification =
  | "working"
  | "broken"
  | "blocked"
  | "server-error"
  | "request-failed";

type LinkCheckResult = {
  url: string;
  status: number | null;
  classification: LinkCheckClassification;
};

const BLOCKING_STATUSES = new Set([
  401,
  403,
  408,
  425,
  429,
  503,
]);

const CONFIRMED_BROKEN_STATUSES = new Set([
  404,
  410,
]);

export async function checkBrokenLinks(
  page: Page,
  baseUrl: string
): Promise<BrokenLinksCheckResult> {
  const rawLinks = await page.locator("a").evaluateAll((anchors) =>
    anchors
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
  );

  const internalLinks = normalizeInternalLinks(
    rawLinks,
    baseUrl
  ).slice(
    0,
    appConfig.checks.brokenLinks.maxLinksPerSite
  );

  const checkedLinks = await checkLinksInBatches(
    page,
    internalLinks,
    3
  );

  /*
   * Якщо сайт масово повертає той самий захисний статус,
   * це додатково підтверджує антибот або rate limit.
   *
   * Зараз це не змінює brokenLinksCount, оскільки такі
   * статуси й без того не класифікуються як broken.
   * Функція залишена для явної та стабільної логіки.
   */
  applyMassBlockingDetection(checkedLinks);

  const brokenLinks: BrokenLink[] = checkedLinks
    .filter(
      (link) => link.classification === "broken"
    )
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

  for (
    let index = 0;
    index < links.length;
    index += concurrency
  ) {
    const batch = links.slice(
      index,
      index + concurrency
    );

    const batchResults = await Promise.all(
      batch.map((url) =>
        checkSingleLink(page, url)
      )
    );

    results.push(...batchResults);

    /*
     * Зменшуємо ймовірність rate limit і блокування
     * з боку Cloudflare, Wordfence та інших систем.
     */
    if (index + concurrency < links.length) {
      await page.waitForTimeout(350);
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
      timeout:
        appConfig.checks.brokenLinks.timeoutMs,
      failOnStatusCode: false,
    });

    return classifyResponse(url, response);
  } catch {
    /*
     * Timeout або мережевий збій не доводить,
     * що посилання справді бите.
     */
    return {
      url,
      status: null,
      classification: "request-failed",
    };
  }
}

function classifyResponse(
  url: string,
  response: APIResponse
): LinkCheckResult {
  const status = response.status();

  /*
   * Підтверджені постійно відсутні ресурси.
   */
  if (CONFIRMED_BROKEN_STATUSES.has(status)) {
    return {
      url,
      status,
      classification: "broken",
    };
  }

  /*
   * Типові відповіді антибот-захисту,
   * rate limit або обмеженого доступу.
   */
  if (BLOCKING_STATUSES.has(status)) {
    return {
      url,
      status,
      classification: "blocked",
    };
  }

  /*
   * Інші 5xx можуть бути тимчасовими серверними збоями.
   * Вони не є підтвердженими broken links.
   */
  if (status >= 500) {
    return {
      url,
      status,
      classification: "server-error",
    };
  }

  /*
   * Редиректи та успішні відповіді не є битими.
   * Playwright зазвичай сам проходить редиректи.
   */
  return {
    url,
    status,
    classification: "working",
  };
}

function applyMassBlockingDetection(
  checkedLinks: LinkCheckResult[]
): void {
  if (checkedLinks.length < 3) {
    return;
  }

  const statusCounts = new Map<number, number>();

  for (const link of checkedLinks) {
    if (
      link.status === null ||
      !BLOCKING_STATUSES.has(link.status)
    ) {
      continue;
    }

    const currentCount =
      statusCounts.get(link.status) ?? 0;

    statusCounts.set(
      link.status,
      currentCount + 1
    );
  }

  for (const [status, count] of statusCounts) {
    const ratio = count / checkedLinks.length;

    /*
     * Якщо щонайменше три посилання і 60% перевірених
     * URL повернули однаковий захисний статус,
     * вважаємо це масовим блокуванням.
     */
    if (count < 3 || ratio < 0.6) {
      continue;
    }

    for (const link of checkedLinks) {
      if (link.status === status) {
        link.classification = "blocked";
      }
    }
  }
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

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        continue;
      }

      /*
       * Перевіряємо тільки посилання цього ж сайту.
       * Зовнішній сайт може блокувати наш запит, хоча
       * саме посилання в браузері працює нормально.
       */
      if (
        normalizeHostname(url.hostname) !==
        normalizeHostname(base.hostname)
      ) {
        continue;
      }

      const pathname =
        url.pathname.toLowerCase();

      if (isIgnoredFilePath(pathname)) {
        continue;
      }

      if (
        pathname.includes("/wp-admin") ||
        pathname.includes("/wp-login")
      ) {
        continue;
      }

      /*
       * Hash не створює іншу HTTP-сторінку.
       * Прибираємо його для нормальної дедуплікації.
       */
      url.hash = "";

      normalizedLinks.push(url.toString());
    } catch {
      /*
       * Некоректний href пропускаємо.
       * Його не можна надійно перевірити HTTP-запитом.
       */
      continue;
    }
  }

  return Array.from(
    new Set(normalizedLinks)
  );
}

function normalizeHostname(
  hostname: string
): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

function isIgnoredFilePath(
  pathname: string
): boolean {
  return (
    pathname.endsWith(".pdf") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".avif") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".zip") ||
    pathname.endsWith(".rar") ||
    pathname.endsWith(".doc") ||
    pathname.endsWith(".docx") ||
    pathname.endsWith(".xls") ||
    pathname.endsWith(".xlsx")
  );
}