import type { Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

type ImageDebugInfo = {
  src: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  clientWidth: number;
  clientHeight: number;
  loading: string;
  visible: boolean;
  broken: boolean;
};

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  /*
   * Прокручуємо сторінку вниз, щоб lazy-loaded картинки
   * отримали шанс реально завантажитися.
   */
  await autoScrollPage(page);

  /*
   * Даємо браузеру ще трохи часу після прокрутки.
   */
  await page.waitForTimeout(1000);

  const imagesInfo = await page.locator("img").evaluateAll((images) => {
    const result: ImageDebugInfo[] = [];

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

      if (
        src.startsWith("data:") ||
        src.startsWith("blob:") ||
        src.includes("cdninstagram.com")
      ) {
        continue;
      }

      const styles = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();

      const visible =
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        Number(styles.opacity) !== 0 &&
        rect.width > 1 &&
        rect.height > 1;

      /*
       * Важлива зміна:
       *
       * Раніше !img.complete також могло рахуватися проблемою.
       * Але це часто означає лише те, що lazy-картинка ще вантажиться.
       *
       * Тепер картинка вважається битою лише коли:
       * 1. браузер уже завершив її завантаження;
       * 2. naturalWidth залишився 0;
       * 3. картинка реально видима на сторінці.
       */
      const broken =
        visible &&
        img.complete &&
        img.naturalWidth === 0;

      result.push({
        src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        clientWidth: img.clientWidth,
        clientHeight: img.clientHeight,
        loading: img.loading || "",
        visible,
        broken,
      });
    }

    return result;
  });

  const brokenImages = normalizeAndDeduplicateImages(
    imagesInfo
      .filter((image) => image.broken)
      .map((image) => image.src)
  );

  printBrokenImagesDebug(page.url(), imagesInfo);

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
      const currentBottom =
        window.scrollY + window.innerHeight;

      const documentHeight =
        Math.max(
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

function normalizeAndDeduplicateImages(
  sources: string[]
): string[] {
  const normalizedSources: string[] = [];

  for (const originalSrc of sources) {
    let normalizedSrc = originalSrc;

    /*
     * Wix часто створює багато URL однієї картинки
     * з різними розмірами.
     */
    if (originalSrc.includes("static.wixstatic.com/media/")) {
      const parts = originalSrc.split("/");
      const mediaIndex = parts.findIndex(
        (part) => part === "media"
      );

      if (mediaIndex !== -1 && parts[mediaIndex + 1]) {
        normalizedSrc = `wix:${parts[mediaIndex + 1]}`;
      }
    }

    normalizedSources.push(normalizedSrc);
  }

  return Array.from(new Set(normalizedSources));
}

function printBrokenImagesDebug(
  pageUrl: string,
  imagesInfo: ImageDebugInfo[]
): void {
  const brokenImages = imagesInfo.filter(
    (image) => image.broken
  );

  const unfinishedImages = imagesInfo.filter(
    (image) => !image.complete
  );

  const hiddenImagesWithNoNaturalWidth = imagesInfo.filter(
    (image) =>
      !image.visible &&
      image.complete &&
      image.naturalWidth === 0
  );

  console.log(`\n[Image debug] ${pageUrl}`);
  console.log(`All checked images: ${imagesInfo.length}`);
  console.log(`Visible broken images: ${brokenImages.length}`);
  console.log(`Still loading images: ${unfinishedImages.length}`);
  console.log(
    `Hidden images with naturalWidth 0: ${hiddenImagesWithNoNaturalWidth.length}`
  );

  if (brokenImages.length > 0) {
    console.log("Visible broken image details:");

    console.table(
      brokenImages.slice(0, 20).map((image) => ({
        src: image.src.slice(0, 120),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        clientWidth: image.clientWidth,
        clientHeight: image.clientHeight,
        loading: image.loading,
        visible: image.visible,
      }))
    );
  }
}