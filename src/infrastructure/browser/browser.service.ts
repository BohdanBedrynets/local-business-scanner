import { chromium, type Browser, type Page, type Response } from "playwright";
import { appConfig } from "../../config/app.config.js";

export type DeviceType = "desktop" | "mobile";

export type OpenPageResult = {
  page: Page;
  response: Response | null;
};

const VIEWPORTS = appConfig.browser.viewports;

export class BrowserService {
  private browser: Browser | null = null;

  async start(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  async openPage(
    url: string,
    device: DeviceType = "desktop"
  ): Promise<OpenPageResult> {
    if (!this.browser) {
      throw new Error("Browser is not started");
    }

    const page = await this.browser.newPage({
      viewport: VIEWPORTS[device],
      isMobile: device === "mobile",
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: appConfig.browser.navigationTimeoutMs,
    });

    return {
      page,
      response,
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}