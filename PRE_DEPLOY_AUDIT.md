# Pre-Deploy-Audit — MiaSanAI Content Manager

*Statisches Code-Audit vor dem Cloud-Run-Deploy · Stand 2026-07-16*

> **Methodik & Grenze (Transparenz):** Die npm-Registry ist in dieser Umgebung
> gesperrt; die App konnte **nicht gebaut, gestartet oder im Browser bedient**
> werden. Alle Befunde stammen aus **statischer Quellcode-Analyse** (drei parallele
> Fachprüfungen). Rein laufzeitabhängige Punkte sind als „im Codespace/Browser zu
> verifizieren" markiert. Der Rechtsteil ist ein technisches Compliance-Audit und
> **ersetzt keine Rechtsberatung**.

---

## 0. Executive Summary & Deploy-Empfehlung

**Empfehlung: Vor einem *öffentlichen* Deploy sollten zwei Sicherheits-Blocker und
die rechtlichen Mindestpflichten behoben werden.** Funktional und optisch ist die
App weit fortgeschritten und robust gebaut; die Blocker sind eng umrissen und
schnell behebbar.

| Dimension | Kurzurteil | Deploy-Blocker? |
|---|---|---|
| Funktionalität / Robustheit | Sehr solide (Validierung, Fallbacks, Simulationsmodus) | **Ja – 2 Sicherheits-Blocker** |
| Design | Aufwendig, konsistent, professionelles Dark-Enterprise-UI | Nein |
| UX / Barrierefreiheit | Für Sehende/Desktop gut; A11y stark lückenhaft | Nein (aber wichtig) |
| Rechtskonformität | Pflichttexte fehlen; falsche Autorisierungs-Aussage; Markennutzung | **Ja – für öffentliche Bereitstellung** |

**Kernaussage zur Frage „legal konform?":** Nach aktuellem Code-Stand **nein, nicht
für eine öffentliche Bereitstellung** — es fehlen Impressum und Datenschutzerklärung,
und im UI steht eine Aussage, die eine **offizielle Autorisierung durch den FC Bayern
behauptet** (`SettingsPanel.tsx:754`), obwohl Lizenz/README das Projekt als
unabhängig kennzeichnen. Das sind konkrete, belegbare Punkte — kein Rechtsurteil.

---

## 1. Funktionalität & Robustheit

**Gesamturteil:** Architektonisch sauber und ungewöhnlich robust — nahezu jede
`/api/*`-Route hat zod-Validierung, try/catch und einen echten Simulationsmodus
(läuft **auch ohne API-Key** voll). Zwei ernste Sicherheitslücken und ein latentes
Modell-Namensrisiko trüben das Bild.

### Stärken
- 21 Routen mit `validateBody(zod)`; zentraler Error-Handler ohne Stack-Leak in Prod.
- Durchgängige Fallbacks: Gemini→Simulation, Secret Manager→env, deterministisches
  Offline-Embedding. Graceful Shutdown, Rate-Limiting (100/15 min), 30 s-Timeouts,
  429-Retry mit Backoff, `unhandledRejection`/`uncaughtException`-Handler.
- Health/Readiness-Endpunkte; `PORT` wird korrekt aus der Umgebung gelesen (Cloud-Run-tauglich).

### Blocker & Risiken

| # | Schwere | Befund | Ort |
|---|---|---|---|
| F1 | **KRITISCH (Blocker)** | `POST /api/secrets/fetch` **ohne** `requireAdminAuth`; gibt `process.env[secretId]` im Klartext zurück → Secrets/API-Keys auslesbar. In Nicht-Prod völlig offen; in Prod nur geschützt, falls `APP_API_KEY` gesetzt. | `server.ts:506` |
| F2 | **KRITISCH (Blocker)** | `requireAdminAuth` ist **fail-open**: ohne `ADMIN_API_TOKEN` wird `next()` aufgerufen (Zugriff erlaubt). Kommentar **und** README behaupten „fail-closed" — Widerspruch zwischen zugesicherter und echter Sicherheit. Betrifft `/api/secrets/save` (kann Secrets schreiben) und `/api/secrets/status`. | `server.ts:405` |
| F3 | Mittel | 19× hartcodierter Modellname `gemini-3.5-flash` (+ `gemini-3.1-flash-image`). Falls die IDs ungültig sind, schlagen **alle** Echt-Calls still fehl und fallen auf Simulation zurück → nie echte KI-Ausgaben trotz gültigem Key. **Nur zur Laufzeit verifizierbar.** | `server.ts` |
| F4 | Mittel | `APP_API_KEY`-Schutz greift nur bei `NODE_ENV=production`; sonst alle `/api/*` offen. Timing-unsicherer `!==`-Token-Vergleich. | `server.ts:363` |
| F5 | Mittel | `uncaughtException` loggt nur, beendet den Prozess nicht → undefinierter Zustand. | `server.ts:3304` |
| F6 | Gering | CI testet Node 18, aber `engines`/`.nvmrc`/Docker = 20/22 → Inkonsistenz. | `.github/workflows/ci.yml` |
| F7 | Gering | Nicht-atomare Datei-Persistenz ohne Locking (Race bei parallelen Writes) — für Single-Instance-Demo ok, bekannt. | `fileStore.ts`, `vectorStore.ts` |

### Testabdeckung
Gute Unit-Tests (config, utils, RAG, store, agent, usage). **Es fehlen:**
Route-/Integrationstests (keine der ~30 Routen end-to-end), Auth-Tests (genau die
Blocker F1/F2 sind ungetestet), Frontend-Tests, Coverage-Gate in CI.

---

## 2. Design, UX & Barrierefreiheit

**Gesamturteil:** Visuell aufwendiges, konsistentes „Sophisticated-Dark"-Enterprise-
Dashboard mit sauberem Code-Splitting und guten Feedback-Zuständen — für Sehende am
Desktop sehr professionell. UX wird durch **fast vollständig fehlende Barrierefreiheit**
und dutzende **unleserlich kleine Schriften** deutlich beeinträchtigt.

### Stärken
Semantische Buttons (344 echte `<button>`, nur 5 legitime `div onClick`), solide
Lade-/Fehler-/Empty-/Disabled-Zustände, 175 responsive Breakpoint-Utilities,
zentrales Design-System via Tailwind `@theme`, semantische Landmarks (header/main/footer).

### Schwächen

| # | Schwere | Befund |
|---|---|---|
| U1 | Kritisch | Praktisch **keine ARIA-Semantik** (nur 3 `aria-*` in ganz `src/`). Tabs ohne `role="tablist"/tab"`/`aria-selected`; Formularfelder ohne verknüpfte Labels (nur `placeholder`). Screenreader-Nutzung stark eingeschränkt. |
| U2 | Kritisch | **Winzige Schriften mit echtem Inhalt**: `text-[4px]`…`text-[9px]` hundertfach (Feldwerte/Labels), faktisch unleserlich, schlechtes Zoom-Verhalten. |
| U3 | Kritisch | **Kein `prefers-reduced-motion`** bei massiver Animation (130× `motion.div`, animate-pulse/spin/bounce/ping). |
| U4 | Mittel | `<html lang="en">` fest, obwohl Default Deutsch; Sprachumschalter aktualisiert `lang` nicht. |
| U5 | Kritisch (verdächtig) | Kontrast: `--color-slate-600 = #25262b` auf dunklem BG ≈ 1,3:1 (WCAG-Minimum 4,5:1) — 76 Vorkommen. **Im Browser messen.** |
| U6 | Mittel | i18n nur rudimentär (~70 Keys); **11 von 16 Komponenten** ohne `useLanguage` → fest englisch; viele hartcodierte Strings. |

**Nur im Browser verifizierbar:** echte Kontrastwerte, Screenreader-Verhalten,
Responsivität 320–768 px, Tastatur-Fokus-Sichtbarkeit, Lesbarkeit/Zoom, Motion-Wirkung.

---

## 3. Rechtskonformität

**Gesamteinschätzung (neutral, faktenbasiert):** Die App ist als öffentlicher
Web-Dienst konzipiert, enthält aber **kein Impressum, keine Datenschutzerklärung und
keinen Consent-Mechanismus**. Nutzereingaben (Prompts, **Sprach-Audio**, Uploads)
gehen an mehrere Drittanbieter (Google, OpenAI/Whisper, Leonardo, Fal.ai) — teils
US-Infrastruktur. Gleichzeitig werden geschützte Kennzeichen (FC Bayern, „Mia San
Mia", Allianz Arena, reale Spielernamen) intensiv genutzt, und das UI **behauptet
eine offizielle Autorisierung durch den Verein**, was der eigenen Lizenz widerspricht.

| Themenfeld | Befund (belegt) | Risiko | Behebung |
|---|---|---|---|
| Impressum (§5 DDG) | Keine Impressum-Seite/-Route | **Hoch** | Impressum mit Pflichtangaben ergänzen |
| Datenschutzerklärung (Art. 12–14 DSGVO) | Fehlt vollständig | **Hoch** | Erstellen; Verarbeitungen/Empfänger/Rechtsgrundlagen/Drittlandtransfer nennen |
| Consent/Cookies | Kein Banner; `localStorage` (u.a. `adminToken`) genutzt | Mittel | §25 TTDSG prüfen; ggf. Consent ergänzen |
| Drittland-Transfer (Art. 44 ff.) | Prompts/Voice-Audio/Uploads → Google, OpenAI, Leonardo, Fal.ai, Make.com (eu1) | **Hoch** | AV-Verträge/Transfermechanismen (SCC/DPF) klären, offenlegen |
| Falsche Autorisierungs-Aussage | `SettingsPanel.tsx:754`: „…für die weltweite Medienarbeit des FC Bayern München autorisiert." — Widerspruch zu LICENSE/README | **Hoch** | Aussage entfernen/korrigieren; klaren „inoffiziell/keine Verbindung"-Hinweis platzieren |
| Marken-/Namensrecht | „FC Bayern", „Mia San Mia" (als Pflicht-Motto erzwungen, `server.ts:2487`), „Allianz Arena", Hashtags | **Hoch** | Kennzeichennutzung juristisch prüfen; ggf. Freigabe/Entfernung |
| Persönlichkeitsrecht/KUG | Reale Spielernamen in `mockData.ts`; Voice-Cloning-Konzepte (Müller/Neuer) in Prompts. Bilder = Unsplash-Platzhalter (keine echten Fotos) | **Hoch** | Verarbeitung realer Personendaten/Stimm-Klon rechtlich prüfen |
| EU-AI-Act Art. 50 (KI-Kennzeichnung) | Teilkennzeichnung vorhanden; kein systematischer Deepfake-Hinweis auf Bild/Video | Mittel–Hoch | Sichtbare + maschinenlesbare KI-/Deepfake-Kennzeichnung ergänzen |
| README-Aussage | `README.md:113`: „keine personenbezogenen Daten an LLMs" — technisch **nicht** erzwungen | Mittel | An reale Datenflüsse angleichen oder erzwingen |
| Lizenz vs. Marke | MIT deckt nur Code, nicht Marken-/Persönlichkeitsrechte | Mittel | „nicht-kommerziell"-Framing schützt öffentliches Deployment nicht automatisch |

**Fakt vs. Annahme:** Belegbar sind die fehlenden Pflichttexte, die konkreten
Datenflüsse, die Kennzeichennutzung und die widersprüchliche Autorisierungs-Aussage.
**Rechtlich zu klären** (durch Fachanwalt, hier nicht bewertet): ob Impressumspflicht
greift, welche Rechtsgrundlagen/Transfermechanismen nötig sind, ob die Kennzeichen-/
Motto-Nutzung eine Verletzung darstellt, Reichweite von KUG und AI-Act Art. 50.

---

## 4. Empfohlene Reihenfolge vor dem Deploy

**A — Sicherheits-Blocker (schnell, vor jedem Deploy):**
1. `requireAdminAuth` auf **echtes fail-closed** umstellen (ohne `ADMIN_API_TOKEN` → 503/deaktiviert statt `next()`).
2. `/api/secrets/fetch` mit `requireAdminAuth` schützen **oder** den Endpunkt entfernen.
3. `ADMIN_API_TOKEN` **und** `APP_API_KEY` als Secrets setzen (auch für den ersten Deploy).

**B — Rechtliche Mindestpflichten (vor *öffentlichem* Deploy):**
4. Impressum + Datenschutzerklärung ergänzen (Routen/Seiten).
5. Autorisierungs-Aussage in `SettingsPanel.tsx:754` entfernen/entschärfen + sichtbaren „inoffiziell"-Disclaimer.
6. Kennzeichen-/Spielernamen-/Voice-Cloning-Nutzung juristisch bewerten lassen.

**C — Laufzeit-Verifikation (im Codespace, nur du kannst das):**
7. `npm ci && npm run build && npm test` grün? Modell-IDs (`gemini-3.5-flash` …) liefern echte Antworten (nicht Simulation)?
8. Kurzer A11y-/Responsive-Check (Lighthouse, Responsive-Modus, Zoom 200 %).

**D — Nicht blockierend, empfohlen:** A11y-Nachbesserung (ARIA-Tabs/Labels,
Mindestschriftgröße, `prefers-reduced-motion`, Kontrast), i18n vervollständigen,
Route-/Auth-Tests ergänzen.

> **Zwischenlösung:** Willst du zuerst nur intern testen, deploye Cloud Run **ohne**
> `--allow-unauthenticated` (nur authentifizierter Zugriff) und mit gesetztem
> `ADMIN_API_TOKEN`/`APP_API_KEY`. Dann sind A+C abgedeckt, und die rechtlichen
> Punkte (B) betreffen erst die spätere Öffentlichkeit.
