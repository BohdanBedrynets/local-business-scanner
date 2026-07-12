import type { APIResponse, Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

type ImageCandidate = {
  src: string;
};

type ImageCheckResult = {
  src: string;
  status: number | null;
  isConfirmedBroken: boolean;
};

const CONFIRMED_BROKEN_STATUSES = new Set([
  404,
  410,
]);

const IMAGE_REQUEST_TIMEOUT_MS = 5000;
const IMAGE_CHECK_CONCURRENCY = 3;

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  /*
   * Прокручуємо сторінку, щоб lazy-loaded картинки
   * отримали можливість реально завантажитися.
   */
  await autoScrollPage(page);

  /*
   * Після прокрутки даємо браузеру додатковий час
   * на обробку srcset, data-src і lazy loading.
   */
  await page.waitForTimeout(1500);

  const candidates = await collectBrokenImageCandidates(
    page
  );

  const uniqueCandidates =
    normalizeAndDeduplicateImages(
      candidates.map((candidate) => candidate.src)
    );

  const checkedImages =
    await checkImagesInBatches(
      page,
      uniqueCandidates,
      IMAGE_CHECK_CONCURRENCY
    );

  const brokenImages = checkedImages
    .filter((image) => image.isConfirmedBroken)
    .map((image) => image.src);

  return {
    brokenImagesCount: brokenImages.length,
    brokenImages,
  };
}

async function collectBrokenImageCandidates(
  page: Page
): Promise<ImageCandidate[]> {
  return page.locator("img").evaluateAll((images) => {
    const candidates: ImageCandidate[] = [];

    for (const image of images) {
      const img = image as HTMLImageElement;

      const rawSource =
        img.currentSrc ||
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        "";

      const src = rawSource.trim();

      if (!src) {
        continue;
      }

      if (isIgnoredSourceInsideBrowser(src)) {
        continue;
      }

      const styles = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();

      const parentIsHidden = hasHiddenParent(img);

      const isRendered =
        !parentIsHidden &&
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        Number(styles.opacity) > 0 &&
        rect.width > 2 &&
        rect.height > 2;

      if (!isRendered) {
        continue;
      }

      /*
       * Дрібні службові пікселі, trackers та placeholders
       * не мають цінності для нашого аудиту.
       */
      if (
        rect.width <= 5 ||
        rect.height <= 5
      ) {
        continue;
      }

      /*
       * Якщо картинка ще не завершила завантаження,
       * ми не маємо права називати її битою.
       */
      if (!img.complete) {
        continue;
      }

      /*
       * naturalWidth === 0 — лише підозра.
       * Остаточно підтвердимо її HTTP-запитом.
       */
      if (img.naturalWidth !== 0) {
        continue;
      }

      try {
        const absoluteUrl = new URL(
          src,
          window.location.href
        ).toString();

        candidates.push({
          src: absoluteUrl,
        });
      } catch {
        /*
         * Некоректний або нестандартний src не перевіряємо.
         */
        continue;
      }
    }

    return candidates;

    function hasHiddenParent(
      element: HTMLElement
    ): boolean {
      let current: HTMLElement | null = element;

      while (current) {
        const currentStyles =
          window.getComputedStyle(current);

        if (
          currentStyles.display === "none" ||
          currentStyles.visibility === "hidden" ||
          Number(currentStyles.opacity) === 0
        ) {
          return true;
        }

        current = current.parentElement;
      }

      return false;
    }

    function isIgnoredSourceInsideBrowser(
      source: string
    ): boolean {
      const normalizedSource =
        source.toLowerCase();

      return (
        normalizedSource.startsWith("data:") ||
        normalizedSource.startsWith("blob:") ||
        normalizedSource.startsWith("javascript:") ||
        normalizedSource.includes(
          "cdninstagram.com"
        ) ||
        normalizedSource.includes(
          "facebook.com/tr"
        ) ||
        normalizedSource.includes(
          "google-analytics.com"
        )
      );
    }
  });
}

async function checkImagesInBatches(
  page: Page,
  sources: string[],
  concurrency: number
): Promise<ImageCheckResult[]> {
  const results: ImageCheckResult[] = [];

  for (
    let index = 0;
    index < sources.length;
    index += concurrency
  ) {
    const batch = sources.slice(
      index,
      index + concurrency
    );

    const batchResults = await Promise.all(
      batch.map((src) =>
        checkSingleImage(page, src)
      )
    );

    results.push(...batchResults);

    /*
     * Невелика пауза знижує ризик rate limit
     * та блокування з боку CDN або Wordfence.
     */
    if (index + concurrency < sources.length) {
      await page.waitForTimeout(250);
    }
  }

  return results;
}

async function checkSingleImage(
  page: Page,
  src: string
): Promise<ImageCheckResult> {
  try {
    const response = await page.request.get(src, {
      timeout: IMAGE_REQUEST_TIMEOUT_MS,
      failOnStatusCode: false,
    });

    return classifyImageResponse(
      src,
      response
    );
  } catch {
    /*
     * Timeout або network error не доводить,
     * що зображення справді видалене.
     */
    return {
      src,
      status: null,
      isConfirmedBroken: false,
    };
  }
}

function classifyImageResponse(
  src: string,
  response: APIResponse
): ImageCheckResult {
  const status = response.status();

  return {
    src,
    status,
    isConfirmedBroken:
      CONFIRMED_BROKEN_STATUSES.has(status),
  };
}

async function autoScrollPage(
  page: Page
): Promise<void> {
  await page.evaluate(async () => {
    const scrollStep = 600;
    const delayMs = 180;
    const maxSteps = 40;

    for (
      let step = 0;
      step < maxSteps;
      step += 1
    ) {
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      const currentBottom =
        window.scrollY + window.innerHeight;

      if (currentBottom >= documentHeight) {
        break;
      }

      window.scrollBy({
        top: scrollStep,
        behavior: "instant",
      });

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }

    /*
     * На мить залишаємося внизу, оскільки деякі
     * lazy-load плагіни запускаються із затримкою.
     */
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 400);
    });

    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  });
}

function normalizeAndDeduplicateImages(
  sources: string[]
): string[] {
  const normalizedSources: string[] = [];

  for (const originalSource of sources) {
    const normalizedSource =
      normalizeImageSource(originalSource);

    if (!normalizedSource) {
      continue;
    }

    normalizedSources.push(
      normalizedSource
    );
  }

  return Array.from(
    new Set(normalizedSources)
  );
}

function normalizeImageSource(
  source: string
): string {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return "";
  }

  /*
   * Wix генерує багато URL різних розмірів для одного
   * зображення. Для HTTP-перевірки краще залишити
   * реальний URL, але прибрати hash.
   */
  try {
    const url = new URL(trimmedSource);

    url.hash = "";

    return url.toString();
  } catch {
    return trimmedSource;
  }
}