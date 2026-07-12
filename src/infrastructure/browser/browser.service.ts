import {
  chromium,
  type Browser,
  type ConsoleMessage,
  type Page,
  type Response,
} from "playwright";

import { appConfig } from "../../config/app.config.js";

import type {
  JavaScriptIssue,
} from "../../core/types/scan-result.types.js";

export type DeviceType = "desktop" | "mobile";

export type OpenPageResult = {
  page: Page;
  response: Response | null;
  loadTimeMs: number;
  javaScriptIssues: JavaScriptIssue[];
};

const VIEWPORTS = appConfig.browser.viewports;

/*
 * Повідомлення, які часто виглядають як помилки в консолі,
 * але зазвичай не означають, що функціональність сайту зламана.
 */
const IGNORED_MESSAGE_PATTERNS: RegExp[] = [
  /mixed content/i,
  /jquery migrate/i,
  /source map/i,
  /sourcemap/i,
  /deprecated/i,
  /deprecation/i,
  /preload/i,
  /was preloaded using link preload/i,
  /cookie/i,
  /borlabs/i,
  /consent/i,
  /analytics/i,
  /google analytics/i,
  /google tag manager/i,
  /gtag/i,
  /facebook pixel/i,
  /hotjar/i,
  /clarity/i,
  /favicon/i,
  /manifest/i,
  /failed to decode downloaded font/i,
  /downloadable font/i,
  /intervention/i,
  /permissions policy/i,
  /third-party cookie/i,
  /cors policy/i,
  /cross-origin/i,
  /blocked by client/i,
  /net::err_blocked_by_client/i,
  /content security policy/i,
  /refused to frame/i,
  /resizeobserver loop/i,
  /unable to preload css/i,
];

/*
 * Повідомлення, які вже більше схожі на реальні помилки
 * виконання JavaScript.
 */
const IMPORTANT_MESSAGE_PATTERNS: RegExp[] = [
  /uncaught/i,
  /referenceerror/i,
  /typeerror/i,
  /syntaxerror/i,
  /rangeerror/i,
  /evalerror/i,
  /urierror/i,
  /is not defined/i,
  /cannot read propert/i,
  /cannot set propert/i,
  /cannot access/i,
  /is not a function/i,
  /failed to execute/i,
  /unexpected token/i,
  /script error/i,
  /promise rejection/i,
  /unhandled promise rejection/i,
  /maximum call stack size exceeded/i,
];

const MAX_JAVASCRIPT_ISSUES = 20;

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
    const seenIssueKeys = new Set<string>();

    const page = await this.browser.newPage({
      viewport: VIEWPORTS[device],
      isMobile: device === "mobile",
    });

    page.on("console", (message) => {
      this.captureConsoleIssue(
        message,
        javaScriptIssues,
        seenIssueKeys
      );
    });

    page.on("pageerror", (error) => {
      this.capturePageError(
        error.message,
        javaScriptIssues,
        seenIssueKeys
      );
    });

    const startedAt = Date.now();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: appConfig.browser.navigationTimeoutMs,
    });

    const loadTimeMs = Date.now() - startedAt;

    /*
     * Даємо сторінці трохи часу на помилки, які виникають
     * одразу після первинної ініціалізації скриптів.
     */
    await page.waitForTimeout(500);

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

  private captureConsoleIssue(
    consoleMessage: ConsoleMessage,
    issues: JavaScriptIssue[],
    seenIssueKeys: Set<string>
  ): void {
    if (consoleMessage.type() !== "error") {
      return;
    }

    const rawMessage = consoleMessage.text();
    const normalizedMessage = normalizeMessage(rawMessage);

    if (!normalizedMessage) {
      return;
    }

    if (shouldIgnoreMessage(normalizedMessage)) {
      return;
    }

    /*
     * Для console-error залишаємо лише ті повідомлення,
     * які схожі на справжню runtime-помилку.
     */
    if (!isImportantJavaScriptMessage(normalizedMessage)) {
      return;
    }

    pushUniqueIssue(
      {
        type: "console-error",
        message: rawMessage,
      },
      issues,
      seenIssueKeys
    );
  }

  private capturePageError(
    rawMessage: string,
    issues: JavaScriptIssue[],
    seenIssueKeys: Set<string>
  ): void {
    const normalizedMessage = normalizeMessage(rawMessage);

    if (!normalizedMessage) {
      return;
    }

    /*
     * pageerror зазвичай надійніший за console.error,
     * але типовий шум усе одно відсіюємо.
     */
    if (shouldIgnoreMessage(normalizedMessage)) {
      return;
    }

    pushUniqueIssue(
      {
        type: "page-error",
        message: rawMessage,
      },
      issues,
      seenIssueKeys
    );
  }
}

function pushUniqueIssue(
  issue: JavaScriptIssue,
  issues: JavaScriptIssue[],
  seenIssueKeys: Set<string>
): void {
  if (issues.length >= MAX_JAVASCRIPT_ISSUES) {
    return;
  }

  const normalizedMessage = normalizeMessage(
    issue.message
  );

  const key = `${issue.type}:${normalizedMessage}`;

  if (seenIssueKeys.has(key)) {
    return;
  }

  seenIssueKeys.add(key);

  issues.push({
    type: issue.type,
    message: compactMessage(issue.message),
  });
}

function shouldIgnoreMessage(
  normalizedMessage: string
): boolean {
  return IGNORED_MESSAGE_PATTERNS.some(
    (pattern) => pattern.test(normalizedMessage)
  );
}

function isImportantJavaScriptMessage(
  normalizedMessage: string
): boolean {
  return IMPORTANT_MESSAGE_PATTERNS.some(
    (pattern) => pattern.test(normalizedMessage)
  );
}

function normalizeMessage(message: string): string {
  return message
    .replace(/\s+/g, " ")
    .replace(
      /https?:\/\/[^\s)]+/gi,
      "<url>"
    )
    .replace(
      /:\d+:\d+/g,
      ":<line>:<column>"
    )
    .trim()
    .toLowerCase();
}

function compactMessage(message: string): string {
  const compacted = message
    .replace(/\s+/g, " ")
    .trim();

  if (compacted.length <= 500) {
    return compacted;
  }

  return `${compacted.slice(0, 497)}...`;
}