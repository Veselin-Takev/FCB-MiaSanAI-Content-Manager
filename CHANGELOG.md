# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/),
die Versionierung an [Semantic Versioning](https://semver.org/).

## [1.1.2] – 2026-07-15

Bugfix-Release.

### Fixed

- **Veraltetes Embedding-Modell** – `text-embedding-004` (von Google zum
  14.01.2026 deprecatet) durch `gemini-embedding-001` ersetzt (`embedText` in
  `server.ts` sowie UI-Anzeige in `RagHub.tsx`). Nach dem Update den Vektorstore
  neu aufbauen (`.data/vectorstore.json` löschen bzw. `POST /api/rag/seed`),
  da sich die Embedding-Dimension ändert.
- **Nicht auflösbare Dependency-Pins** – `recharts` `^3.9.1 → ^3.8.1` und
  `pdfjs-dist` `^6.1.200 → ^6.0.227` (Versionen existierten nicht → `npm install`
  schlug fehl).

### Changed

- `vite`-Duplikat aus `dependencies` entfernt; deprecated `@types/helmet` und
  `@types/express-rate-limit` entfernt; `@types/react` und `@types/react-dom`
  ergänzt; `engines.node` auf `>=20`; `version` auf `1.1.2`.

## [1.1.0] – 2026-07-14

Umsetzung des strategischen Multi-Agenten-QA-Konzepts als realer Ablauf sowie
Befüllung der RAG-Wissensbasis.

### Added

- **RAG-Seed-Route** – `POST /api/rag/seed` indexiert einen Default-Wissenskorpus
  (`src/server/seedKnowledge.ts`: Tone-of-Voice-Leitfaden, Markenrichtlinien,
  Kanal-Stilmatrix, stabile Vereinsfakten, Sponsoren-Richtlinie, Spielbericht-
  Vorlage) sowie optionale eigene Dokumente; idempotent per Source-ID.

### Changed

- **Multi-Agent-QA von simuliert auf echt** (`/api/automation/multi-agent-qa`):
  Der Entwurf wird auf Basis des echten Vektorstore-Retrievals generiert und
  durch **drei architektonisch unabhängige, parallele und wechselseitig blinde**
  Prüfinstanzen validiert – Auditor (OpenAI GPT-4o-mini bei vorhandenem Schlüssel,
  sonst Gemini), Fact-Check (Gemini gegen Kern-/Retrieval-Daten) und Brand-Guard
  (Gemini). Die gewichtete Aggregation (40/35/25) steuert reale Folgeaktionen
  (Freigabe, erneute Generierung, Eskalation).
- Reviewer-Bezeichnungen im Ausgabekontrakt datengetreu benannt.

### Removed

- Hartcodierter RAG-Chunk-String sowie die festen GPT/Grok-Bewertungen in der
  QA-Pipeline (durch reale Modellaufrufe ersetzt).

## [1.0.0] – 2026-07-14

Erste konsolidierte, prüfungs- und enterprise-reife Fassung. Bereinigung des
Prototyps, Abarbeitung des kompletten Optimierungs-Backlogs und Enterprise-Härtung.

### Added

- **RAG mit Vektorstore** – Gemini-Embeddings (`text-embedding-004`) mit
  deterministischem Offline-Fallback, Cosine-Similarity-Retrieval und
  Disk-Persistenz; Endpunkte `POST /api/rag/index` und (echtes) `POST /api/rag/search`.
- **Server-seitige Persistenz** – datei-basierter Key/Value-Store
  (`POST /api/store/get|set`) als Ablösung der reinen LocalStorage-Haltung.
- **Multi-Agenten-Orchestrierung** – reale State-Graph-Engine
  (`src/server/agentGraph.ts`) mit bedingtem Routing, Tool-Trace und Guardrails;
  Endpunkt `POST /api/agents/run` (Draft → Critique → Revise-Loop → Finalize).
- **Server-STT-Fallback** – `POST /api/transcribe` (OpenAI Whisper → Gemini →
  Simulation) plus Frontend-Utility und Integration in die Voice-Eingabe.
- **Kosten-/Token-Transparenz** – Erfassung realer `usageMetadata`,
  `GET /api/usage`, `POST /api/usage/reset`; Live-Anzeige im `TokenCostEstimator`.
- **Text-Chunking** – Map-Reduce-Kondensierung langer Dokumente statt harter
  Kürzung; behebt das Token-Limit-Problem in `/api/rag/summarize-doc`.
- **Response-Caching** – `node-cache` für reproduzierbare Generierungsantworten.
- **Strukturiertes Logging** – dependency-freier JSONL-Logger (`src/server/logger.ts`).
- **Startup-Config-Validierung** – `src/server/config.ts` (zod, fail-fast).
- **Enterprise-Betrieb** – Request-ID-Korrelation, konfigurierbares CORS,
  produktive Helmet-CSP, Request-Timeouts, zentraler Error-Handler,
  Graceful-Shutdown (SIGTERM/SIGINT), `unhandledRejection`/`uncaughtException`,
  Readiness-Probe `GET /api/ready`.
- **Qualitäts-Tooling** – Vitest-Test-Suite (config, utils, RAG, store, agent,
  usage), CI-Workflow (Node 18/20: type-check, strict-check, test, build),
  Multi-Stage-`Dockerfile` (non-root, HEALTHCHECK), ESLint/Prettier/EditorConfig.
- **Scoped-Strict-Migration** – `tsconfig.strict.json` erzwingt `strict` für den
  Server-Kern (`src/server/**`); in CI verdrahtet.
- **Governance** – `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, PR-Template,
  `LICENSE` (MIT).

### Changed

- **Bildgenerierung** – OpenAI-Modell `dall-e-2` → `dall-e-3` korrigiert.
- **Eingabevalidierung** – wiederverwendbare `validateBody`-Middleware; zod-Schemas
  auf allen relevanten `/api/*`-Endpunkten (16 von 17 POST-Routen).
- **Dokumentation** – README auf den tatsächlich implementierten Stack
  (React 19 · Vite · Express · Google Gemini) umgestellt; `.env.example` bereinigt
  und um Betriebsvariablen erweitert.

### Removed

- **Repository-Bereinigung** – Entfernung von ~80 Ad-hoc-/Patch-Skripten und der
  AI-Studio-Scaffolding-Ordner; sauberer Projektbaum.

### Security

- Server-seitiger API-Proxy (kein Client-seitiger Schlüssel), GCP Secret Manager,
  fail-closed Admin-Endpunkte, Rate-Limiting, `x-powered-by` deaktiviert,
  keine Stacktrace-Leaks in Produktion.

### Fixed

- Crash-Bug im bisherigen `/api/rag/search`-Stub (`retrievedDocs[0].text` auf
  leerem Array) durch echtes Retrieval ersetzt.

---

### Commit-Referenz

| Commit | Beschreibung |
|---|---|
| `3cbd51b` | Initial commit: Cleanup, README, LICENSE, .gitignore, .env.example |
| `138a94b` | Sprint 1: Bild-Modell-Fix, Response-Caching, zod-Validierung (DRY) |
| `6a4f996` | Sprint 2 + Validierungs-Ausweitung (Chunking, Logger, Vitest) |
| `0d083d4` | Sprint 3: Server-STT-Fallback (Whisper/Gemini) |
| `ce8229a` | Sprint 3: Echtes RAG (Vektorstore) + Server-Persistenz |
| `8a07819` | Sprint 3: Reale Multi-Agenten-State-Graph-Engine |
| `27761cf` | #12: Echte Kosten-/Token-Transparenz |
| `6af53f2` | Enterprise-Härtung (Config, Security, Resilienz, CI/Docker/Governance) |
