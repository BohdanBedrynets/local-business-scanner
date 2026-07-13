import type { ScanResult } from "../types/scan-result.types.js";

export type ContactAuditIssueSeverity =
  | "high"
  | "medium"
  | "low";

export type ContactAuditIssue = {
  title: string;
  severity: ContactAuditIssueSeverity;
  description: string;
  impact: string;
  recommendation: string;
  technicalDetails: string[];
};

export function buildContactAuditIssues(
  result: ScanResult
): ContactAuditIssue[] {
  const issues: ContactAuditIssue[] = [];

  const mobileOverflowPixels = Math.max(
    0,
    result.mobileContentWidth -
      result.mobileViewportWidth
  );

  addMobileLayoutIssue(
    result,
    mobileOverflowPixels,
    issues
  );

  addDesktopOverflowIssue(result, issues);
  addBrokenLinksIssue(result, issues);
  addBrokenImagesIssue(result, issues);
  addMainPageStatusIssue(result, issues);
  addHttpsIssue(result, issues);

  return issues;
}

function addMobileLayoutIssue(
  result: ScanResult,
  overflowPixels: number,
  issues: ContactAuditIssue[]
): void {
  const missingViewport = !result.hasViewport;

  const severeOverflow =
    result.hasHorizontalScrollMobile &&
    overflowPixels > 100;

  /*
   * Відсутній viewport і сильний overflow для власника
   * є частинами однієї проблеми: сайт не адаптований
   * під смартфони.
   */
  if (missingViewport || severeOverflow) {
    const technicalDetails: string[] = [
      `Gemessene Bildschirmbreite: ${result.mobileViewportWidth}px`,
      `Gemessene Inhaltsbreite: ${result.mobileContentWidth}px`,
    ];

    if (missingViewport) {
      technicalDetails.unshift(
        "Mobile Viewport-Konfiguration: nicht vorhanden"
      );
    }

    if (overflowPixels > 0) {
      technicalDetails.push(
        `Horizontale Überschreitung: ${overflowPixels}px`
      );
    }

    issues.push({
      title:
        "Die Website ist auf Smartphones nicht korrekt angepasst",

      severity: "high",

      description:
        "Die mobile Darstellung passt sich nicht korrekt an die Breite eines Smartphones an. Statt einer optimierten mobilen Ansicht wird ein deutlich breiterer Seitenbereich dargestellt oder die Desktop-Version lediglich verkleinert.",

      impact:
        "Texte, Navigation, Bilder oder Schaltflächen können abgeschnitten, sehr klein oder nur durch horizontales Scrollen erreichbar sein. Das erschwert Besuchern die Nutzung der Website erheblich.",

      recommendation:
        "Die Website sollte mit einer korrekten Viewport-Konfiguration und einem responsiven Layout überarbeitet werden. Breite Container, Bilder und Navigationselemente müssen sich an die verfügbare Bildschirmbreite anpassen.",

      technicalDetails,
    });

    return;
  }

  /*
   * Помірний overflow залишається окремою,
   * менш серйозною проблемою.
   */
  if (
    result.hasHorizontalScrollMobile &&
    overflowPixels > 20
  ) {
    issues.push({
      title:
        "Einzelne Inhalte überschreiten die mobile Bildschirmbreite",

      severity: "medium",

      description:
        "Mindestens ein Element der Website ragt auf Smartphones über den sichtbaren Bildschirmbereich hinaus.",

      impact:
        "Einzelne Inhalte können abgeschnitten erscheinen oder unbeabsichtigtes horizontales Scrollen verursachen.",

      recommendation:
        "Die Breite der betroffenen Container, Bilder oder eingebetteten Inhalte sollte auf die verfügbare Bildschirmbreite begrenzt werden.",

      technicalDetails: [
        `Gemessene Bildschirmbreite: ${result.mobileViewportWidth}px`,
        `Gemessene Inhaltsbreite: ${result.mobileContentWidth}px`,
        `Horizontale Überschreitung: ${overflowPixels}px`,
      ],
    });
  }
}

function addDesktopOverflowIssue(
  result: ScanResult,
  issues: ContactAuditIssue[]
): void {
  if (!result.hasHorizontalScrollDesktop) {
    return;
  }

  issues.push({
    title:
      "Die Website erzeugt horizontales Scrollen auf Desktop-Geräten",

    severity: "medium",

    description:
      "Mindestens ein Seitenelement ist breiter als der sichtbare Bereich des Browserfensters.",

    impact:
      "Teile der Website können abgeschnitten erscheinen oder einen unnötigen horizontalen Scrollbalken erzeugen.",

    recommendation:
      "Breite Container, Bilder und positionierte Elemente sollten überprüft und an die verfügbare Fensterbreite angepasst werden.",

    technicalDetails: [
      "Horizontales Scrollen auf Desktop-Geräten erkannt",
    ],
  });
}

function addBrokenLinksIssue(
  result: ScanResult,
  issues: ContactAuditIssue[]
): void {
  if (result.brokenLinksCount === 0) {
    return;
  }

  const technicalDetails =
    result.brokenLinks.length > 0
      ? result.brokenLinks.map((link) => {
          const status =
            link.status === null
              ? "Anfrage fehlgeschlagen"
              : `HTTP ${link.status}`;

          return `${link.url} — ${status}`;
        })
      : [
          `${result.brokenLinksCount} nicht funktionierende Links erkannt`,
        ];

  if (result.brokenLinksCount >= 2) {
    issues.push({
      title:
        "Mehrere Links auf der Website funktionieren nicht",

      severity: "high",

      description:
        "Bei der technischen Prüfung wurden mehrere Links gefunden, die eine Fehlerseite zurückgeben oder nicht erreichbar sind.",

      impact:
        "Besucher können verlinkte Inhalte, Leistungen, Referenzen oder weitere Informationen möglicherweise nicht öffnen.",

      recommendation:
        "Die betroffenen Links sollten korrigiert, auf ein gültiges Ziel weitergeleitet oder entfernt werden.",

      technicalDetails,
    });

    return;
  }

  issues.push({
    title:
      "Ein Link auf der Website funktioniert nicht",

    severity: "medium",

    description:
      "Bei der Prüfung wurde ein Link gefunden, der eine Fehlerantwort zurückgibt oder nicht erreichbar ist.",

    impact:
      "Besucher können das verlinkte Ziel möglicherweise nicht öffnen.",

    recommendation:
      "Der Link sollte überprüft und bei Bedarf korrigiert, ersetzt oder entfernt werden.",

    technicalDetails,
  });
}

function addBrokenImagesIssue(
  result: ScanResult,
  issues: ContactAuditIssue[]
): void {
  if (result.brokenImagesCount === 0) {
    return;
  }

  const technicalDetails =
    result.brokenImages.length > 0
      ? result.brokenImages
      : [
          `${result.brokenImagesCount} nicht geladene Bilder erkannt`,
        ];

  if (result.brokenImagesCount >= 3) {
    issues.push({
      title:
        "Mehrere Bilder werden auf der Website nicht geladen",

      severity: "high",

      description:
        "Mehrere sichtbare Bilder konnten vom Browser nicht korrekt geladen werden.",

      impact:
        "Fehlende Bilder lassen die Website unvollständig wirken und können wichtige Informationen oder visuelle Inhalte verbergen.",

      recommendation:
        "Die Bilddateien, Dateipfade und Serverantworten sollten überprüft und korrigiert werden.",

      technicalDetails,
    });

    return;
  }

  issues.push({
    title:
      "Mindestens ein Bild wird möglicherweise nicht geladen",

    severity: "medium",

    description:
      "Bei der technischen Prüfung wurde ein Bild erkannt, das vom Browser nicht korrekt geladen werden konnte.",

    impact:
      "An der betroffenen Stelle kann ein leerer Bereich oder ein defektes Bildsymbol erscheinen.",

    recommendation:
      "Die Bilddatei und der verwendete Dateipfad sollten überprüft werden.",

    technicalDetails,
  });
}

function addMainPageStatusIssue(
  result: ScanResult,
  issues: ContactAuditIssue[]
): void {
  if (
    result.responseStatus === 404 ||
    result.responseStatus === 410
  ) {
    issues.push({
      title:
        "Die aufgerufene Website liefert eine Fehlerseite",

      severity: "high",

      description:
        "Die geprüfte Adresse hat eine HTTP-Fehlerantwort zurückgegeben.",

      impact:
        "Besucher können die Website oder die angeforderte Seite möglicherweise nicht öffnen.",

      recommendation:
        "Die URL, vorhandene Weiterleitungen und die Serverkonfiguration sollten überprüft werden.",

      technicalDetails: [
        `HTTP-Status: ${result.responseStatus}`,
      ],
    });

    return;
  }

  if (
    result.responseStatus !== null &&
    result.responseStatus >= 500
  ) {
    issues.push({
      title:
        "Der Webserver hat einen Fehler zurückgegeben",

      severity: "high",

      description:
        "Beim Aufruf der Website wurde eine Server-Fehlerantwort erkannt.",

      impact:
        "Die Website kann zeitweise oder vollständig nicht erreichbar sein.",

      recommendation:
        "Die Serverprotokolle, das Hosting und die Website-Anwendung sollten überprüft werden.",

      technicalDetails: [
        `HTTP-Status: ${result.responseStatus}`,
      ],
    });
  }
}

function addHttpsIssue(
  result: ScanResult,
  issues: ContactAuditIssue[]
): void {
  if (result.hasHttps) {
    return;
  }

  issues.push({
    title:
      "Die Website verwendet keine verschlüsselte HTTPS-Verbindung",

    severity: "medium",

    description:
      "Die Website wird über eine unverschlüsselte HTTP-Verbindung geöffnet.",

    impact:
      "Browser können eine Sicherheitswarnung anzeigen. Außerdem werden übertragene Daten nicht verschlüsselt.",

    recommendation:
      "Ein SSL-Zertifikat sollte eingerichtet und die Website dauerhaft auf HTTPS weitergeleitet werden.",

    technicalDetails: [
      `Website-Adresse: ${result.site.url}`,
      "HTTPS: nicht aktiviert",
    ],
  });
}