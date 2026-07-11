import type { Site } from "../types/site.types.js";
import type { ScanResult } from "../types/scan-result.types.js";

import { BrowserService } from "../../infrastructure/browser/browser.service.js";
import { takeScreenshot } from "../../infrastructure/screenshots/screenshot.service.js";

import { checkHttps } from "../checks/https.check.js";

import {
  runDesktopChecks,
  type DesktopChecksResult,
} from "../checks/desktop-checks.runner.js";

import {
  runMobileChecks,
  type MobileChecksResult,
} from "../checks/mobile-checks.runner.js";

import { calculateAuditScore } from "../audit/audit-score.service.js";
import {
  calculateOutreachDecision,
} from "../outreach/outreach-decision.service.js";

import { createSlug } from "../../utils/slug.utils.js";
import { appConfig } from "../../config/app.config.js";

type DesktopScanResult = DesktopChecksResult & {
  desktopScreenshotPath: string;
};

type MobileScanResult = MobileChecksResult & {
  mobileScreenshotPath: string;
};

export class ScannerService {
  constructor(
    private readonly browserService: BrowserService
  ) {}

  async scanSite(site: Site): Promise<ScanResult> {
    const screenshotName = createSlug(site.name);

    const desktopResult = await this.scanDesktop(
      site,
      screenshotName
    );

    const mobileResult = await this.scanMobile(
      site,
      screenshotName
    );

    const scanData = {
      site,
      hasHttps: checkHttps(site),
      ...desktopResult,
      ...mobileResult,
      error: null,
    };

    const auditScore = calculateAuditScore(scanData);

    const outreachDecision =
      calculateOutreachDecision(scanData);

    return {
      ...scanData,
      ...auditScore,
      ...outreachDecision,
    };
  }

  private async scanDesktop(
    site: Site,
    screenshotName: string
  ): Promise<DesktopScanResult> {
    const {
      page,
      response,
      loadTimeMs,
      javaScriptIssues,
    } = await this.browserService.openPage(
      site.url,
      "desktop"
    );

    try {
      const checksResult = await runDesktopChecks(
        page,
        response,
        loadTimeMs,
        site.url,
        javaScriptIssues
      );

      const desktopScreenshotPath =
        `${appConfig.screenshots.desktopDir}/${screenshotName}.png`;

      await takeScreenshot(
        page,
        desktopScreenshotPath
      );

      return {
        ...checksResult,
        desktopScreenshotPath,
      };
    } finally {
      await page.close();
    }
  }

  private async scanMobile(
    site: Site,
    screenshotName: string
  ): Promise<MobileScanResult> {
    const { page } =
      await this.browserService.openPage(
        site.url,
        "mobile"
      );

    try {
      const checksResult =
        await runMobileChecks(page);

      const mobileScreenshotPath =
        `${appConfig.screenshots.mobileDir}/${screenshotName}.png`;

      await takeScreenshot(
        page,
        mobileScreenshotPath
      );

      return {
        ...checksResult,
        mobileScreenshotPath,
      };
    } finally {
      await page.close();
    }
  }
}