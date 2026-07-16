# Changeset: Pre-Deploy-Fixes

Umsetzung der Blocker aus dem Pre-Deploy-Audit. Übernimm die drei Code-Änderungen
in deinem Codespace (VS Code: Datei öffnen, Stelle suchen, ersetzen) und lege die
zwei gelieferten HTML-Dateien in `public/` ab.

---

## 1. Sicherheits-Blocker F2 — `requireAdminAuth` auf fail-closed

**Datei:** `server.ts` (Funktion `requireAdminAuth`, ~Z. 405)

**Vorher:**
```ts
  if (!ADMIN_API_TOKEN) {
    logger.warn("[Auth] ADMIN_API_TOKEN is not configured – allowing access for preview environment.");
    return next();
  }
```

**Nachher:**
```ts
  if (!ADMIN_API_TOKEN) {
    logger.warn("[Auth] ADMIN_API_TOKEN is not configured – admin endpoints are disabled (fail-closed).");
    return res.status(503).json({ error: "Administrative endpoints are disabled: ADMIN_API_TOKEN is not configured." });
  }
```

> Wirkung: Ohne gesetztes `ADMIN_API_TOKEN` sind Admin-Endpunkte jetzt **deaktiviert**
> (503) statt offen — konsistent mit der Zusicherung in README/Kommentar.

---

## 2. Sicherheits-Blocker F1 — `/api/secrets/fetch` schützen

**Datei:** `server.ts` (~Z. 506)

**Vorher:**
```ts
app.post("/api/secrets/fetch", async (req, res) => {
```

**Nachher:**
```ts
app.post("/api/secrets/fetch", requireAdminAuth, async (req, res) => {
```

> Wirkung: Der Endpunkt, der Secrets/Env-Werte im Klartext zurückgibt, ist nun nur
> mit gültigem Admin-Token erreichbar.

---

## 3. Rechtlicher Blocker — falsche Autorisierungs-Aussage entfernen

**Datei:** `src/components/SettingsPanel.tsx` (~Z. 753)

**Vorher:**
```tsx
            {language === "de" 
              ? "Dieses Portal ist für die weltweite Medienarbeit des FC Bayern München autorisiert. Jede KI-generierte Kampagne unterliegt den FCB-Compliance-Regeln."
              : "This platform is authorized for the global media output of FC Bayern Munich. Every AI-assisted customer journey complies with standard FCB policy rules."}
```

**Nachher:**
```tsx
            {language === "de"
              ? "Unabhängiges, nicht-kommerzielles Studienprojekt – keine offizielle Verbindung zum oder Autorisierung durch den FC Bayern München. „FC Bayern München“ und „Mia san mia“ sind Marken ihrer jeweiligen Inhaber."
              : "Independent, non-commercial study project – not affiliated with or authorized by FC Bayern Munich. \"FC Bayern München\" and \"Mia san mia\" are trademarks of their respective owners."}
```

---

## 4. Rechtsseiten — Impressum & Datenschutz

Lege die zwei gelieferten Dateien in den Ordner **`public/`**:

- `public/impressum.html`
- `public/datenschutz.html`

Vite kopiert `public/` beim Build nach `dist/`; der Express-Server liefert sie über
`express.static` aus. Danach erreichbar unter `/impressum.html` und
`/datenschutz.html` — **keine** Änderung an `server.ts` nötig.

**Noch zu tun (durch dich):**
- Alle rot markierten Platzhalter `[…]` (Name, Anschrift, E-Mail, Region, Datum,
  Drittanbieter-Transferstatus) mit echten Daten füllen.
- Juristische Prüfung — die Vorlagen sind ein technischer Entwurf, keine Rechtsberatung.

**Optional (empfohlen): Footer-Links.** Damit die Seiten aus der App verlinkt sind,
im Footer von `src/App.tsx` zwei Links ergänzen, z. B.:
```tsx
<a href="/impressum.html" className="hover:text-white">Impressum</a>
<a href="/datenschutz.html" className="hover:text-white">Datenschutz</a>
```
(Sag Bescheid, dann liefere ich den exakten Footer-Edit.)

---

## 5. Danach: committen & intern deployen

```bash
git add -A && git commit -m "fix(security): admin-auth fail-closed + secrets/fetch geschuetzt; legal: impressum/datenschutz + disclaimer" && git push
```

Anschließend siehe `DEPLOY_INTERNAL_CLOUD_RUN.md` für den authentifizierten Testdeploy.
