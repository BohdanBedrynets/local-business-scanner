import type { Page } from "playwright";

export type RobotsTxtCheckResult = {
  hasRobotsTxt: boolean;
  robotsTxtStatus: number | null;
};

export async function checkRobotsTxt(
  page: Page,
  siteUrl: string
): Promise<RobotsTxtCheckResult> {
  try {
    const robotsUrl = new URL("/robots.txt", siteUrl).toString();

    const response = await page.request.get(robotsUrl, {
      timeout: 10000,
    });

    const status = response.status();

    return {
      hasRobotsTxt: status >= 200 && status < 400,
      robotsTxtStatus: status,
    };
  } catch {
    return {
      hasRobotsTxt: false,
      robotsTxtStatus: null,
    };
  }
}