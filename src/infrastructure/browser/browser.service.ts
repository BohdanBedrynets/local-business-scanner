import { chromium, type Browser, type Page, type Response } from "playwright";
import { appConfig } from "../../config/app.config.js";
import type { JavaScriptIssue } from "../../core/types/scan-result.types.js";

export type DeviceType = "desktop" | "mobile";

export type OpenPageResult = {
  page: Page;
  response: Response | null;
  loadTimeMs: number;
  javaScriptIssues: JavaScriptIssue[];
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

    const javaScriptIssues: JavaScriptIssue[] = [];

    const page = await this.browser.newPage({
      viewport: VIEWPORTS[device],
      isMobile: device === "mobile",
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        javaScriptIssues.push({
          type: "console-error",
          message: message.text(),
        });
      }
    });

    page.on("pageerror", (error) => {
      javaScriptIssues.push({
        type: "page-error",
        message: error.message,
      });
    });

    const startedAt = Date.now();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: appConfig.browser.navigationTimeoutMs,
    });

    const loadTimeMs = Date.now() - startedAt;

    return {
      page,
      response,
      loadTimeMs,
      javaScriptIssues,
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}