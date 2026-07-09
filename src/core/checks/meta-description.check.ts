import type { Page } from "playwright";

export type MetaDescriptionCheckResult = {
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
};

export async function checkMetaDescription(
  page: Page
): Promise<MetaDescriptionCheckResult> {
  const content = await page
    .locator('meta[name="description"]')
    .first()
    .getAttribute("content")
    .catch(() => null);

  const metaDescription = content?.trim() ?? "";

  return {
    hasMetaDescription: metaDescription.length > 0,
    metaDescriptionLength: metaDescription.length,
  };
}