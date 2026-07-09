export type TitleQuality = "missing" | "poor" | "ok";

export type TitleQualityCheckResult = {
  titleLength: number;
  titleQuality: TitleQuality;
};

export function checkTitleQuality(title: string): TitleQualityCheckResult {
  const normalizedTitle = title.trim();
  const titleLength = normalizedTitle.length;

  if (titleLength === 0) {
    return {
      titleLength,
      titleQuality: "missing",
    };
  }

  if (
    titleLength < 10 ||
    titleLength > 70 ||
    ["home", "startseite", "untitled"].includes(normalizedTitle.toLowerCase())
  ) {
    return {
      titleLength,
      titleQuality: "poor",
    };
  }

  return {
    titleLength,
    titleQuality: "ok",
  };
}