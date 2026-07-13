export const appConfig = {
  inputCsvPath: "data/input/sites.csv",
  outputCsvPath: "data/output/results.csv",
  reportPath: "data/output/report.html",
  auditsDir: "data/output/audits",

  screenshots: {
    desktopDir: "data/screenshots/desktop",
    mobileDir: "data/screenshots/mobile",
  },

  browser: {
    navigationTimeoutMs: 20000,
    overflowThresholdPx: 10,

    viewports: {
      desktop: {
        width: 1440,
        height: 900,
      },
      mobile: {
        width: 390,
        height: 844,
      },
    },
  },

  checks: {
    brokenLinks: {
      maxLinksPerSite: 30,
      timeoutMs: 5000,
    },
  },
} as const;