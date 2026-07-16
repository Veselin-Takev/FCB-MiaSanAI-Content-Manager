#!/usr/bin/env node
/**
 * apply-fixes.cjs — wendet die drei Pre-Deploy-Fixes exakt und idempotent an:
 *   1) server.ts  : requireAdminAuth -> fail-closed (503 statt next())
 *   2) server.ts  : /api/secrets/fetch mit requireAdminAuth schuetzen
 *   3) SettingsPanel.tsx : falsche "FCB-autorisiert"-Aussage -> Unabhaengigkeits-Disclaimer
 *
 * Sicherheit: Wird eine Stelle weder im "alt"- noch im "neu"-Zustand gefunden,
 * wird die Datei NICHT veraendert und ein Fehler gemeldet (kein Teil-Zerschreiben).
 * Bereits angewandte Aenderungen werden uebersprungen (idempotent).
 *
 * Ausfuehren im Projekt-Root:  node apply-fixes.cjs
 */
const fs = require("fs");

const EN_DASH = "–"; // –
const LOW9 = "„";    // „
const RDQUO = "“";   // “

const edits = [
  {
    id: "F2 requireAdminAuth -> fail-closed",
    file: "server.ts",
    old:
      'logger.warn("[Auth] ADMIN_API_TOKEN is not configured ' + EN_DASH + ' allowing access for preview environment.");\n    return next();',
    new:
      'logger.warn("[Auth] ADMIN_API_TOKEN is not configured ' + EN_DASH + ' admin endpoints are disabled (fail-closed).");\n    return res.status(503).json({ error: "Administrative endpoints are disabled: ADMIN_API_TOKEN is not configured." });',
  },
  {
    id: "F1 /api/secrets/fetch schuetzen",
    file: "server.ts",
    old: 'app.post("/api/secrets/fetch", async (req, res) => {',
    new: 'app.post("/api/secrets/fetch", requireAdminAuth, async (req, res) => {',
  },
  {
    id: "Legal Disclaimer (DE)",
    file: "src/components/SettingsPanel.tsx",
    old:
      '"Dieses Portal ist für die weltweite Medienarbeit des FC Bayern München autorisiert. Jede KI-generierte Kampagne unterliegt den FCB-Compliance-Regeln."',
    new:
      '"Unabhängiges, nicht-kommerzielles Studienprojekt ' + EN_DASH + ' keine offizielle Verbindung zum oder Autorisierung durch den FC Bayern München. ' +
      LOW9 + 'FC Bayern München' + RDQUO + ' und ' + LOW9 + 'Mia san mia' + RDQUO + ' sind Marken ihrer jeweiligen Inhaber."',
  },
  {
    id: "Legal Disclaimer (EN)",
    file: "src/components/SettingsPanel.tsx",
    old:
      '"This platform is authorized for the global media output of FC Bayern Munich. Every AI-assisted customer journey complies with standard FCB policy rules."',
    new:
      '"Independent, non-commercial study project ' + EN_DASH + ' not affiliated with or authorized by FC Bayern Munich. \\"FC Bayern München\\" and \\"Mia san mia\\" are trademarks of their respective owners."',
  },
];

let hadError = false;
const touched = new Set();
const cache = {};

function read(file) {
  if (!(file in cache)) {
    if (!fs.existsSync(file)) {
      console.error("FEHLER: Datei nicht gefunden: " + file + " (im Projekt-Root ausfuehren?)");
      hadError = true;
      cache[file] = null;
    } else {
      cache[file] = fs.readFileSync(file, "utf8");
    }
  }
  return cache[file];
}

for (const e of edits) {
  const content = read(e.file);
  if (content == null) continue;
  if (content.includes(e.new)) {
    console.log("[skip] bereits angewandt: " + e.id + " (" + e.file + ")");
    continue;
  }
  const count = content.split(e.old).length - 1;
  if (count === 0) {
    console.error("[FEHLER] Anker NICHT gefunden: " + e.id + " (" + e.file + ") -> Datei unveraendert.");
    hadError = true;
    continue;
  }
  if (count > 1) {
    console.error("[FEHLER] Anker MEHRDEUTIG (" + count + "x): " + e.id + " (" + e.file + ") -> Datei unveraendert.");
    hadError = true;
    continue;
  }
  cache[e.file] = content.replace(e.old, e.new);
  touched.add(e.file);
  console.log("[ok]   angewandt: " + e.id + " (" + e.file + ")");
}

if (hadError) {
  console.error("\nAbbruch: mindestens ein Anker fehlte/war mehrdeutig. KEINE Datei wurde geschrieben.");
  process.exit(1);
}

for (const file of touched) {
  fs.writeFileSync(file, cache[file], "utf8");
  console.log("[write] gespeichert: " + file);
}

if (touched.size === 0) {
  console.log("\nNichts zu tun (alles bereits angewandt).");
} else {
  console.log("\nFertig. Naechste Schritte: npm run lint && npm test && npm run build, dann git add/commit/push.");
}
