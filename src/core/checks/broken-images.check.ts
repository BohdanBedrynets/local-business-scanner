import type { Page } from "playwright";

export type BrokenImagesCheckResult = {
  brokenImagesCount: number;
  brokenImages: string[];
};

export async function checkBrokenImages(
  page: Page
): Promise<BrokenImagesCheckResult> {
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .map((image) => {
        const img = image as HTMLImageElement;

        return {
          src: img.getAttribute("src"),
          isBroken: !img.complete || img.naturalWidth === 0,
        };
      })
      .filter((image) => image.isBroken && Boolean(image.src))
      .map((image) => image.src as string)
  );

  return {
    brokenImagesCount: brokenImages.length,
    brokenImages,
  };
}