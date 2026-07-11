import type { Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

type ImageInfo = {
  src: string;
  isBroken: boolean;
};

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  /*
   * Прокручуємо сторінку, щоб lazy-loaded зображення
   * отримали можливість завантажитися.
   */
  await autoScrollPage(page);

  /*
   * Невелика пауза після прокрутки для завершення
   * завантаження зображень.
   */
  await page.waitForTimeout(1000);

  const imagesInfo = await page.locator("img").evaluateAll((images) => {
    const result: ImageInfo[] = [];

    for (const image of images) {
      const img = image as HTMLImageElement;

      const src =
        img.currentSrc ||
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        "";

      if (!src) {
        continue;
      }

      /*
       * Ці джерела не варто рахувати як звичайні
       * мережеві зображення.
       */
      if (
        src.startsWith("data:") ||
        src.startsWith("blob:") ||
        src.includes("cdninstagram.com")
      ) {
        continue;
      }

      const styles = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();

      const isVisible =
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        Number(styles.opacity) !== 0 &&
        rect.width > 1 &&
        rect.height > 1;

      /*
       * Зображення вважається підтверджено битим лише тоді,
       * коли браузер завершив завантаження, але naturalWidth
       * залишився нульовим, і саме зображення видиме.
       */
      const isBroken =
        isVisible &&
        img.complete &&
        img.naturalWidth === 0;

      result.push({
        src,
        isBroken,
      });
    }

    return result;
  });

  const brokenImages = normalizeAndDeduplicateImages(
    imagesInfo
      .filter((image) => image.isBroken)
      .map((image) => image.src)
  );

  return {
    brokenImagesCount: brokenImages.length,
    brokenImages,
  };
}

async function autoScrollPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const scrollStep = 700;
    const delayMs = 120;
    const maxSteps = 30;

    for (let step = 0; step < maxSteps; step += 1) {
      const currentBottom = window.scrollY + window.innerHeight;

      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );

      if (currentBottom >= documentHeight) {
        break;
      }

      window.scrollBy(0, scrollStep);

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }

    window.scrollTo(0, 0);
  });
}

function normalizeAndDeduplicateImages(sources: string[]): string[] {
  const normalizedSources: string[] = [];

  for (const originalSrc of sources) {
    let normalizedSrc = originalSrc;

    /*
     * Wix створює різні URL для різних розмірів
     * одного й того самого зображення.
     */
    if (originalSrc.includes("static.wixstatic.com/media/")) {
      const parts = originalSrc.split("/");
      const mediaIndex = parts.findIndex((part) => part === "media");

      if (mediaIndex !== -1 && parts[mediaIndex + 1]) {
        normalizedSrc = `wix:${parts[mediaIndex + 1]}`;
      }
    }

    normalizedSources.push(normalizedSrc);
  }

  return Array.from(new Set(normalizedSources));
}