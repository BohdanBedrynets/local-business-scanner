import type { Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  const brokenImages = await page.locator("img").evaluateAll((images) => {
    const srcList = images
      .map((image) => {
        const img = image as HTMLImageElement;

        return {
          src: img.currentSrc || img.getAttribute("src"),
          isBroken: !img.complete || img.naturalWidth === 0,
        };
      })
      .filter((image) => image.isBroken && Boolean(image.src))
      .map((image) => image.src as string)
      .filter((src) => {
        return !src.includes("cdninstagram.com") && !src.startsWith("data:");
      });

    return Array.from(new Set(srcList));
  });

  return {
    brokenImagesCount: brokenImages.length,
    brokenImages,
  };
}