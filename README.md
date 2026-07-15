# MiaSanAI – FC Bayern AI Content Manager

KI-gestützter, markenkonformer **Content-Manager** für die Sport-Redaktion. Rohdaten
(Spielberichte, Pressekonferenz-Transkripte, Metadaten) werden über **deterministische
Prompt-Ketten** in kanal- und zielgruppenspezifischen Content transformiert – konsequent
als Assistenzsystem mit **Human-in-the-Loop**.

> Studien-Prototyp aus dem Modul „Praxisprojekt KI Expert". Unabhängiges, nicht-kommerzielles
> Projekt ohne Verbindung zur FC Bayern München AG (siehe [LICENSE](./LICENSE)).

![React](https://img.shields.io/badge/React-19-149ECA)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![Express](https://img.shields.io/badge/Express-4-000000)
![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash-8E75B2)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

- **Textgenerierung & Prompt-Chaining** – dreistufige Kette (Faktenextraktion → Tonalität → Kanaloptimierung mit erzwungenem JSON).
- **Deterministisches Prompt-Design** – server-seitig erzwungene `temperature`/`seed`-Defaults für reproduzierbare Ausgaben.
- **Multimodale Generierung** – Bild (OpenAI / Leonardo AI) und Video (Fal.ai) mit simuliertem Fallback bei fehlendem Schlüssel.
- **RAG mit Vektorstore** – Gemini-Embeddings + Cosine-Similarity-Retrieval (`/api/rag/index`, `/api/rag/seed`, `/api/rag/search`) mit Disk-Persistenz und deterministischem Offline-Fallback; die Multi-Agent-QA-Pipeline nutzt dieses Retrieval real.
- **Server-Persistenz** – datei-basierter Server-Store (`/api/store/*`) für Presets, Kategorien und Einstellungen (nicht mehr nur LocalStorage).
- **Kosten-Transparenz** – echte Token-Erfassung aus Geminis `usageMetadata`, kumuliert über `/api/usage` und live im `TokenCostEstimator` angezeigt.
- **Voice-Eingabe** – Speech-to-Text über die Web Speech API, mit **server-seitigem Fallback** (`/api/transcribe`: OpenAI Whisper → Gemini → Simulation) für Browser ohne Web-Speech-Unterstützung.
- **Multi-Agenten-Orchestrierung** – echte State-Graph-Engine (`/api/agents/run`: Draft → Critique → Revise-Loop → Finalize) mit bedingtem Routing, Tool-Trace und Guardrails (Max-Steps/Abort).
- **Presets & Kategorien** – hierarchischer Preset-Manager, A/B-Varianten, Export als JSON/Text.
- **Sicherheit by design** – server-seitiger API-Proxy (kein Client-Key), GCP Secret Manager, Helmet, Rate-Limiting, `fail-closed` Admin-Endpunkte.

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Lucide-React, Motion, Recharts, D3 |
| Backend | Node.js, Express 4 (TypeScript via `tsx`/`esbuild`) |
| KI | Google Gemini 3.5 Flash (`@google/genai`); optional OpenAI/Leonardo (Bild), Fal.ai (Video) |
| Sicherheit/Betrieb | GCP Secret Manager, Helmet, `express-rate-limit`, `node-cache`, `compression` |
| Sonstiges | Zod (Validierung), jsPDF (Export), PrismJS (Highlighting) |

## Architektur

```
Browser (React SPA)  ──REST /api/*──►  Express-Proxy (Node/TS)
                                          ├─► Google Gemini 3.5 Flash
                                          ├─► Bild: OpenAI / Leonardo
                                          ├─► Video: Fal.ai / Storyboard
                                          ├─► GCP Secret Manager
                                          ├─► node-cache (In-Memory)
                                          └─► Simulierte Fallback-Engine
```

Sämtliche KI-Aufrufe laufen **ausschließlich server-seitig**; der API-Schlüssel verlässt den
Server nie. Fällt ein Dienst aus oder fehlt ein Schlüssel, greift eine simulierte
Fallback-Engine, sodass die Oberfläche bedienbar bleibt.

## Voraussetzungen

- Node.js ≥ 18
- Ein Google **Gemini API Key** (ohne Key läuft die App im Simulationsmodus)

## Setup

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
#   → GEMINI_API_KEY in .env.local eintragen (weitere Keys optional)

# 3. Entwicklungsserver starten
npm run dev
```

Die App ist anschließend unter der in `APP_URL` konfigurierten Adresse erreichbar
(lokal typischerweise `http://localhost:3000`).

## NPM-Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | Startet den Express-Server mit `tsx` (Hot-Reload) |
| `npm run build` | Vite-Production-Build + Bundling des Servers via `esbuild` |
| `npm start` | Startet den gebauten Server (`dist/server.cjs`) |
| `npm run lint` | Typprüfung (`tsc --noEmit`) |
| `npm run clean` | Entfernt Build-Artefakte |

## Projektstruktur

```
.
├── server.ts            # Express-Backend: API-Proxy, Prompt-Ketten, Determinismus-Wrapper
├── index.html           # Vite-Einstiegspunkt
├── vite.config.ts       # Build-Konfiguration
├── src/
│   ├── App.tsx          # Haupt-SPA
│   ├── components/      # UI-Bereiche (ContentGenerator, RagHub, VideoStudio, …)
│   ├── hooks/           # z. B. useLocalStorage
│   ├── context/         # LanguageContext (i18n)
│   ├── data/            # Mock-Daten, i18n
│   └── utils/           # CSV-Export, Presets
├── docs/                # Use Case, Dokumentation & Reflexion, Pitch
├── kubernetes/          # Deployment-Manifeste (Cloud Run / K8s, External Secrets)
└── public/              # Statische Assets
```

## Sicherheit & Secrets

- Echte Schlüssel gehören **ausschließlich** in `.env.local` (via `.gitignore` ausgeschlossen) oder in den GCP Secret Manager.
- Administrative Endpunkte (`/api/secrets/*`) sind ohne gesetzten `ADMIN_API_TOKEN` **deaktiviert** (fail-closed).
- Es werden keine personenbezogenen Endnutzerdaten an externe LLM-APIs übermittelt.

## Betrieb & Enterprise-Härtung

Vollständige Env-Key-Übersicht und Migrationshinweise: siehe [`OPERATIONS.md`](./OPERATIONS.md).


- **Config-Validierung:** Env wird beim Start typgeprüft (`src/server/config.ts`); strukturell ungültige Werte lassen den Prozess sofort scheitern (fail-fast).
- **Sicherheit:** Helmet mit produktiver CSP, konfigurierbares CORS (`CORS_ORIGINS`), Rate-Limiting, zod-Validierung, `x-powered-by` deaktiviert.
- **Resilienz:** zentraler Error-Handler (keine Stacktraces in Prod), JSON-`404` für unbekannte `/api`-Routen, Request-Timeouts, Request-ID-Korrelation, Graceful-Shutdown (SIGTERM/SIGINT) sowie `unhandledRejection`/`uncaughtException`-Handler.
- **Probes:** `GET /api/health` (Liveness) und `GET /api/ready` (Readiness).
- **CI:** `.github/workflows/ci.yml` führt Type-Check, Tests und Build auf Node 18/20 aus.
- **Container:** Multi-Stage-`Dockerfile` (non-root, HEALTHCHECK).

## Deployment

Das Verzeichnis [`kubernetes/`](./kubernetes) enthält Manifeste für den Betrieb auf Cloud Run /
Kubernetes inklusive Anbindung des External Secrets Operators. Ein Multi-Stage-[`Dockerfile`](./Dockerfile)
baut ein schlankes Production-Image (non-root, Healthcheck).

## Roadmap

Bereits umgesetzt: Text-Chunking, `zod`-Validierung aller Endpunkte, Vitest-Test-Suite, strukturiertes Logging, Server-STT-Fallback, RAG mit Vektorstore, server-seitige Persistenz und eine reale Multi-Agenten-State-Graph-Engine.

Nächste Schritte:

- Managed Vektordatenbank (pgvector / Pinecone) statt des datei-basierten Stores für Skalierung
- Echte Datenbank (SQL) hinter `/api/store/*` und vollständige Ablösung von LocalStorage im UI
- Persistenz und Parallelisierung der Agenten-Traces; Anbindung externer Tools an die Engine
- Freigabegebundene Distribution via Make / Zapier

## Lizenz

[MIT](./LICENSE) © 2026 Veselin Takev
