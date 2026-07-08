import type { Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  const brokenImages = await page.locator("img").evaluateAll((images) => {
    const srcList: string[] = [];

    for (const image of images) {
      const img = image as HTMLImageElement;

      const originalSrc = img.currentSrc || img.getAttribute("src");

      if (!originalSrc) {
        continue;
      }

      if (originalSrc.includes("cdninstagram.com")) {
        continue;
      }

      if (originalSrc.startsWith("data:")) {
        continue;
      }

      const isBroken = !img.complete || img.naturalWidth === 0;

      if (!isBroken) {
        continue;
      }

      let normalizedSrc = originalSrc;

      if (originalSrc.includes("static.wixstatic.com/media/")) {
        const parts = originalSrc.split("/");
        const mediaIndex = parts.findIndex((part) => part === "media");

        if (mediaIndex !== -1 && parts[mediaIndex + 1]) {
          normalizedSrc = `wix:${parts[mediaIndex + 1]}`;
        }
      }

      srcList.push(normalizedSrc);
    }

    return Array.from(new Set(srcList));
  });

  return {
    brokenImagesCount: brokenImages.length,
    brokenImages,
  };
}