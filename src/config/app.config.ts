export const appConfig = {
  inputCsvPath: "data/input/sites.csv",
  outputCsvPath: "data/output/results.csv",
  reportPath: "data/output/report.html",

  screenshots: {
    desktopDir: "data/screenshots/desktop",
    mobileDir: "data/screenshots/mobile",
  },

  browser: {
    navigationTimeoutMs: 20000,

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
} as const;