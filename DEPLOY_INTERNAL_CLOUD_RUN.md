# Interner Test-Deploy (auth-only) — Google Cloud Run

Ziel: Die App **live testen**, aber **nicht öffentlich** erreichbar machen. Zugriff
nur für dich (Google-IAM). Ideal, um Funktionalität/UX real zu prüfen, bevor die
öffentlichen Rechtsthemen final geklärt sind.

> Voraussetzungen wie im öffentlichen Deploy (Projekt gesetzt, APIs aktiv,
> `GEMINI_API_KEY`-Secret angelegt). Siehe `DEPLOY_CLOUD_RUN.md`, Abschnitte 2–4.

---

## 1. Deployen — ohne öffentlichen Zugriff

Unterschied zum öffentlichen Befehl: **`--no-allow-unauthenticated`** (nur
authentifizierter Zugriff). Ein einziger Befehl (einzeilig):

```bash
gcloud run deploy miasanai --source . --no-allow-unauthenticated --port 3000 --memory 1Gi --cpu 1 --min-instances 0 --max-instances 1 --set-env-vars NODE_ENV=production --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

**Bewusst NICHT gesetzt:** `APP_API_KEY`. Grund: Ist `APP_API_KEY` gesetzt, verlangt
der Server bei jedem `/api/*`-Aufruf einen passenden Header — den das Frontend von
sich aus nicht mitschickt, die UI würde brechen. Der Zugriffsschutz kommt hier
stattdessen sauber über **Cloud-Run-IAM** (`--no-allow-unauthenticated`).

---

## 2. Authentifiziert im Browser öffnen (Proxy)

Da der Dienst nicht öffentlich ist, lässt sich die URL nicht einfach im Browser
öffnen (es fehlt der Identity-Token). `gcloud` stellt dafür einen lokalen,
authentifizierten Proxy bereit:

```bash
gcloud run services proxy miasanai --region europe-west3
```

Danach im Browser öffnen: **http://localhost:8080** — die App läuft, alle Aufrufe
sind über deine Google-Identität authentifiziert. Beenden mit `Strg+C`.

---

## 3. Was du jetzt real verifizieren kannst (Laufzeit-Punkte aus dem Audit)

- **Echte KI-Ausgaben statt Simulation:** Content generieren → erscheint **kein**
  „Simulationsmodus"-Hinweis? Damit sind die Modell-IDs (`gemini-3.5-flash` …) real
  bestätigt (Audit-Punkt F3).
- **Health/Readiness:** in einem zweiten Terminal
  `curl -fsS http://localhost:8080/api/health`.
- **RAG:** einmal `POST /api/rag/seed` (z. B. per UI oder curl über den Proxy), dann
  Retrieval testen. Beachte: Cloud-Run-Speicher ist flüchtig → nach Kaltstart neu seeden.
- **UX/Responsivität/A11y:** DevTools → Lighthouse (Accessibility-Score),
  Responsive-Modus (320–768 px), Zoom 200 % — deckt die im Audit statisch vermuteten
  Punkte (Kontrast, Kleinstschriften) real ab.

---

## 4. Admin-Funktionen testen (optional)

Nach dem Fail-closed-Fix sind Admin-Endpunkte ohne Token deaktiviert (503). Willst du
die Secret-Manager-QA-Ansicht testen, ein Admin-Token setzen und neu deployen:

```bash
printf "%s" "EIN_LANGES_ZUFALLS_TOKEN" | gcloud secrets create ADMIN_API_TOKEN --data-file=- --replication-policy=automatic
```

Dann den Deploy-Befehl aus Abschnitt 1 erneut ausführen, ergänzt um
`,ADMIN_API_TOKEN=ADMIN_API_TOKEN:latest` am Ende des `--set-secrets`. In der App
(Einstellungen) dasselbe Token als Admin-Token hinterlegen — es wird als
`x-admin-token`-Header mitgesendet.

---

## 5. Später öffentlich schalten

Wenn Rechtsseiten gefüllt/geprüft und die restlichen Blocker erledigt sind: denselben
Deploy-Befehl mit **`--allow-unauthenticated`** statt `--no-allow-unauthenticated`
ausführen (siehe `DEPLOY_CLOUD_RUN.md`). Der Proxy entfällt dann.
