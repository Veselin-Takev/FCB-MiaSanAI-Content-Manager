# Betriebs- & Migrationsnotiz

Diese Notiz beschreibt die Umgebungsvariablen, ihr Fallback-Verhalten sowie die
Schritte zur Aktivierung des realen RAG- und Multi-Agenten-QA-Betriebs. Sie
ergänzt `README.md` und `.env.example`.

## Grundprinzip: Fail-open bei fehlenden Keys

Das System startet und funktioniert **ohne jeden API-Schlüssel** – alle
KI-Funktionen fallen dann auf eine simulierte Engine zurück. Schlüssel schalten
schrittweise reale Funktionen frei. Die Konfiguration wird beim Start typgeprüft;
strukturell ungültige Werte (z. B. nicht-numerischer `PORT`) führen zum
sofortigen, kontrollierten Abbruch (Fail-Fast).

## Umgebungsvariablen

### KI-Schlüssel (funktionsentscheidend)

| Variable | Schaltet frei | Ohne Schlüssel |
|---|---|---|
| `GEMINI_API_KEY` | **Kern-LLM**: Textgenerierung, Prompt-Ketten, RAG-Embeddings, Fact-Check- & Brand-Guard-Reviewer, QA-Aggregation | Simulierte Antworten; lokales Ersatz-Embedding fürs RAG |
| `OPENAI_API_KEY` | **QA-Auditor als echtes Zweitmodell** (GPT-4o-mini), Bildgenerierung (DALL·E 3), Server-STT (Whisper) | Auditor läuft über Gemini; Bild/STT über Alternativen bzw. Simulation |
| `LEONARDO_API_KEY` | Alternative Bildgenerierung (Leonardo AI) | Fallback auf OpenAI oder Simulation |
| `FAL_API_KEY` (alt. `FAL_KEY`) | Videogenerierung (Fal.ai) | Simuliertes Storyboard |

> Für die im Konzept beschriebene **echte, herstellerübergreifende Cross-Validation**
> ist zusätzlich zu `GEMINI_API_KEY` ein `OPENAI_API_KEY` zu setzen. Ohne diesen
> laufen alle drei Prüfinstanzen über Gemini (mit distinkten System-Prompts),
> bleiben aber weiterhin architektonisch unabhängig und wechselseitig blind.

### Sicherheit & Zugriff

| Variable | Zweck | Default |
|---|---|---|
| `ADMIN_API_TOKEN` | Schützt `/api/secrets/*` und `/api/usage/reset` (Header `x-admin-token`). Ohne Wert sind diese Endpunkte **deaktiviert** (fail-closed). | – |
| `APP_API_KEY` | Optionaler API-Gate für alle `/api/*`-Routen in Produktion (Header `x-api-key`). Nur aktiv, wenn `NODE_ENV=production` **und** gesetzt. | – |
| `CORS_ORIGINS` | Kommagetrennte Allow-Liste erlaubter Origins. Leer = same-origin. | leer |

### Betrieb & Tuning

| Variable | Zweck | Default |
|---|---|---|
| `NODE_ENV` | `development` \| `production` \| `test`. Steuert CSP, Fehler-Detailgrad, Vite-Dev-Server. | `development` |
| `PORT` | HTTP-Port. | `3000` |
| `APP_URL` | Öffentliche URL (Links/Callbacks). | – |
| `REQUEST_TIMEOUT_MS` | Timeout je API-Request. | `30000` |
| `JSON_BODY_LIMIT` | Max. Body-Größe (base64-Medien). | `25mb` |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error`. | `debug` |
| `GEMINI_DEFAULT_TEMPERATURE` | Determinismus-Default. | `0` |
| `GEMINI_DEFAULT_SEED` | Reproduzierbarkeits-Seed. | `42` |
| `GEMINI_COST_PER_1K` | Kostensatz pro 1.000 Tokens für `/api/usage`. | `0.0015` |

### Google Cloud Secret Manager (optional)

| Variable | Zweck |
|---|---|
| `GCP_CREDENTIALS` | Service-Account-JSON (String) für den Secret-Manager-Zugriff. |
| `GOOGLE_CLOUD_PROJECT` / `GCP_PROJECT` | Projekt-ID für die Secret-Auflösung. |

Schlüssel werden zuerst aus `process.env` gelesen; fehlt ein Wert, wird – sofern
konfiguriert – der Secret Manager als Fallback abgefragt. Reale Schlüssel gehören
in `.env.local` (git-ignoriert) oder in den Secret Manager, **niemals** in den Code.

## Inbetriebnahme (Quick Start)

```bash
npm install
cp .env.example .env.local          # mindestens GEMINI_API_KEY setzen
npm run dev                         # http://localhost:3000
```

### RAG-Wissensbasis befüllen (einmalig nach Start)

```bash
curl -X POST http://localhost:3000/api/rag/seed
```

Danach liefert `/api/rag/search` echte Treffer, und die Multi-Agenten-QA-Pipeline
nutzt diesen Kontext.

### Smoke-Tests

```bash
curl http://localhost:3000/api/health     # Liveness
curl http://localhost:3000/api/ready      # Readiness
curl http://localhost:3000/api/usage      # Token-/Kostenkennzahlen
```

## Migration v1.0.0 → v1.1.0

- **Keine Breaking Changes.** Bestehende Deployments laufen unverändert weiter.
- **Neu optional:** `OPENAI_API_KEY` aktiviert den echten GPT-Auditor in der
  QA-Pipeline. Ohne ihn bleibt das Verhalten funktionsfähig (Gemini-Auditor).
- **Empfohlener Schritt:** nach dem Deploy einmalig `POST /api/rag/seed` aufrufen,
  damit das Retrieval sofort wirksam ist. Der Vektorstore wird unter `.data/`
  persistiert (git-ignoriert); in Container-Umgebungen ein Volume vorsehen oder
  den Seed-Aufruf beim Start automatisieren.

## Persistenz-Hinweis (Container/K8s)

`.data/` enthält Vektorstore und Key/Value-Store. Für persistente Haltung ist ein
Volume-Mount vorzusehen; andernfalls ist nach jedem Neustart erneut zu seeden.
Für den großskaligen Produktivbetrieb ist die Ablösung durch eine verwaltete
Vektor- bzw. relationale Datenbank vorgesehen (identische Schnittstellen).
