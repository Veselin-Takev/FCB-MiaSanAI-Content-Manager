# ☸️ GKE Enterprise Integration: Python Secret File Loader (ESO)

Diese Dokumentation beschreibt, wie du dein Python-Schlüsselfile (.py) aus dem Google Cloud Secret Manager (`projects/project-0f0650fd-50cf-4f08-86c/secrets/Keys`) vollautomatisch und sicher in deiner Google Kubernetes Engine (GKE) Enterprise-Infrastruktur einbindest.

---

## 🏗️ Wie die Integration funktioniert

Da du alle Schlüssel (z. B. `GEMINI_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`) in einem einzigen Python-Skript gespeichert hast, haben wir ein intelligentes, zweistufiges Sicherheitsverfahren implementiert:

1. **GKE & External Secrets Operator (ESO)**: ESO synchronisiert deine Datei `Keys` aus dem Secret Manager und mountet sie sicher als native Kubernetes-Datei `/etc/secrets/keys.py` in deinem Pod.
2. **Dynamic Config Engine (Node.js/TypeScript Backend)**: Die Anwendung erkennt das Vorhandensein der Datei `/etc/secrets/keys.py` beim Start, liest den Inhalt aus, parst die Python-Variablen-Zuweisungen (z. B. `KEY = "value"`) mit regulären Ausdrücken und befüllt den Runtime-Cache mit Null-Latenz und ohne API-Netzwerkaufrufe!

---

## 🛠️ Installationsschritte

### 1. External Secrets Operator (ESO) installieren
Falls noch nicht geschehen, installiere ESO in deinem Cluster:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

### 2. GKE Workload Identity konfigurieren
Konfiguriere die sichere, schlüssellose GCP-Authentifizierung für dein Projekt `project-0f0650fd-50cf-4f08-86c`:

1. **Erstelle einen IAM Service Account (GSA) in GCP:**
   ```bash
   gcloud iam service-accounts create miasanai-gke-sa \
       --project="project-0f0650fd-50cf-4f08-86c"
   ```

2. **Gib dem GSA Zugriff auf dein Secret `Keys`:**
   ```bash
   gcloud secrets add-iam-policy-binding "Keys" \
       --project="project-0f0650fd-50cf-4f08-86c" \
       --member="serviceAccount:miasanai-gke-sa@project-0f0650fd-50cf-4f08-86c.iam.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   ```

3. **Verknüpfe den Kubernetes-Service-Account von ESO über Workload Identity:**
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
       miasanai-gke-sa@project-0f0650fd-50cf-4f08-86c.iam.gserviceaccount.com \
       --project="project-0f0650fd-50cf-4f08-86c" \
       --role="roles/iam.workloadIdentityUser" \
       --member="serviceAccount:project-0f0650fd-50cf-4f08-86c.svc.id.goog[external-secrets/external-secrets]"
   ```

---

## 🚀 Manifeste anwenden

1. **Erstelle den Namespace für deine App:**
   ```bash
   kubectl create namespace miasanai
   ```

2. **Wende den Secret Store an:**
   Aktualisiere die Projekt-ID im Manifest `/kubernetes/eso/secret-store.yaml` auf `project-0f0650fd-50cf-4f08-86c` und wende es an:
   ```bash
   kubectl apply -f kubernetes/eso/secret-store.yaml
   ```

3. **Wende das Python-spezifische ExternalSecret-Manifest an:**
   Dies zieht dein `Keys`-Secret und stellt es im Cluster bereit:
   ```bash
   kubectl apply -f kubernetes/eso/external-secrets-python.yaml
   ```

4. **Wende das Deployment an:**
   Mountet `/etc/secrets/keys.py` direkt in deine Pods:
   ```bash
   kubectl apply -f kubernetes/deployment.yaml
   ```

---

## 🛡️ Vorteile dieses GKE-Setups
* **Keine Codeänderungen bei neuen Keys**: Wenn du neue Variablen in deinem Python-File im Secret Manager hinzufügst, werden diese automatisch synchronisiert und von der App geladen.
* **Keine Cloud API-Latenzen**: Keys werden mit Dateisystemgeschwindigkeit gelesen (Null Netzwerkaufrufe beim Serverstart).
* **Höchste Sicherheit**: Keine statischen Secrets im GKE Cluster oder Git-Repository.
