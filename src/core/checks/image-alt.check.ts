import type { Page } from "playwright";

export type ImageAltCheckResult = {
  imagesCount: number;
  imagesWithoutAltCount: number;
};

export async function checkImageAlt(
  page: Page
): Promise<ImageAltCheckResult> {
  const result = await page.locator("img").evaluateAll((images) => {
    const imagesCount = images.length;

    const imagesWithoutAltCount = images.filter((image) => {
      const img = image as HTMLImageElement;
      const alt = img.getAttribute("alt");

      return alt === null || alt.trim().length === 0;
    }).length;

    return {
      imagesCount,
      imagesWithoutAltCount,
    };
  });

  return result;
}