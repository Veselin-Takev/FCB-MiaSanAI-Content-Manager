import React, { useState, useEffect } from "react";
import { Settings, Shield, Volume2, VolumeX, CheckCircle, Eye, RefreshCw, Sparkles, Key, Lock, Unlock, Server, ShieldCheck, ArrowRight, EyeOff, FileText, Terminal } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface SettingsPanelProps {
  theme: "dark" | "classic";
  setTheme: (theme: "dark" | "classic") => void;
  onAddLog: (log: any) => void;
  speechEnabled: boolean;
  setSpeechEnabled: (enabled: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  theme,
  setTheme,
  onAddLog,
  speechEnabled,
  setSpeechEnabled,
}) => {
  const { language, t } = useLanguage();

  const [secretsStatus, setSecretsStatus] = useState<any>(null);
  const [activeArchitecture, setActiveArchitecture] = useState<"gcp_sm" | "eso">("eso");
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [selectedSecretId, setSelectedSecretId] = useState<string>("FAL_API_KEY");
  const [secretValue, setSecretValue] = useState<string>("dev_key_simulation_active");
  const [showSecretValue, setShowSecretValue] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backupModel, setBackupModel] = useState<string>("none");

  useEffect(() => {
    const saved = localStorage.getItem("miasanai_backup_model") || "none";
    setBackupModel(saved);
  }, []);

  const handleBackupModelChange = (model: string) => {
    setBackupModel(model);
    localStorage.setItem("miasanai_backup_model", model);
    
    let labelDe = "Standard (Primäre APIs)";
    let labelEn = "Standard (Primary APIs)";
    if (model === "nano_banana") {
      labelDe = "Nano Banana 2 🍌 (Kostenloses Ausweich-Modell)";
      labelEn = "Nano Banana 2 🍌 (Free Backup Tool)";
    } else if (model === "bavarian_llama") {
      labelDe = "Bavarian Llama 3B 🥨 (Lokaler kostenloser Node)";
      labelEn = "Bavarian Llama 3B 🥨 (Local Free Node)";
    }
    
    onAddLog({
      id: `backup-model-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Model Registry",
      message: language === "de"
        ? `Generierungs-Engine umgeleitet auf: ${labelDe}`
        : `Generation engine routed to: ${labelEn}`
    });
  };

  const fetchSecretsStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/secrets/status", { headers: adminToken ? { "x-admin-token": adminToken } : {} });
      if (res.ok) {
        const data = await res.json();
        setSecretsStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch secrets status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchSecretsStatus();
  }, []);

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretValue.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/secrets/save", {
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {})
        },
        method: "POST",
        
        body: JSON.stringify({
          secretId: selectedSecretId,
          secretValue: secretValue
        })
      });

      if (res.ok) {
        setSaveMessage({
          type: "success",
          text: language === "de"
            ? `Schlüssel '${selectedSecretId}' wurde erfolgreich im Laufzeit-Cache gespeichert!`
            : `Key '${selectedSecretId}' has been successfully stored in runtime cache!`
        });
        setSecretValue("");
        onAddLog({
          id: `secret-update-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Cloud Infrastructure",
          message: language === "de"
            ? `GCP Secret Manager Simulator: Schlüssel '${selectedSecretId}' im Laufzeit-Cache aktualisiert.`
            : `GCP Secret Manager Simulator: Key '${selectedSecretId}' updated in runtime cache.`
        });
        fetchSecretsStatus();
      } else {
        throw new Error("Failed to save secret");
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: language === "de"
          ? "Fehler beim Speichern des Schlüssels."
          : "Error saving the secret key."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "dark" | "classic") => {
    setTheme(newTheme);
    onAddLog({
      id: `theme-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "System UI",
      message: language === "de" 
        ? `Design-Thema geändert zu: ${newTheme === "classic" ? "FCB Classic (Rot/Weiß)" : "Sophisticated Dark"}`
        : `Theme changed to: ${newTheme === "classic" ? "FCB Classic (Red/White)" : "Sophisticated Dark"}`
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in" id="settings-tab">
      {/* Primary Display Settings (Col Span 2) */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-fcb-red animate-spin-slow" />
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">
                {language === "de" ? "System- & Anzeigeeinstellungen" : "System & Display Settings"}
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {language === "de" ? "Konfiguration" : "Configuration"}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {language === "de" 
              ? "Personalisieren Sie die MiaSanAI-Benutzeroberfläche. Wechseln Sie zwischen dem standardmäßigen eleganten Dunkelmodus und dem klassischen rot-weißen Vereinsdesign für maximale Kontraste."
              : "Personalize the MiaSanAI interface. Toggle between the default sophisticated dark mode and the classic red-and-white club layout for high-contrast viewing."}
          </p>

          {/* Theme Selector Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
              {language === "de" ? "Anzeige-Thema (Display Theme):" : "Display Theme:"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sophisticated Dark Option */}
              <button
                onClick={() => handleThemeChange("dark")}
                className={`text-left rounded-xl p-4 border transition-all relative overflow-hidden group cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-950 border-fcb-gold/80 shadow-lg shadow-fcb-gold/5 text-white"
                    : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                {/* Theme visual card mimic */}
                <div className="h-20 bg-[#0c0c0f] rounded-lg border border-slate-850 p-2.5 mb-3 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-bold text-fcb-gold uppercase tracking-wider">MiaSanAI Dark</span>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-1/2 bg-slate-800 rounded"></div>
                    <div className="h-1.5 w-3/4 bg-fcb-red rounded"></div>
                  </div>
                  {/* Visual design representation */}
                  <div className="absolute right-2 bottom-2 h-6 w-6 rounded-full bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center">
                    <Eye className="h-3 w-3 text-fcb-gold" />
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-xs">
                      {language === "de" ? "Sophisticated Dark" : "Sophisticated Dark"}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      {language === "de" 
                        ? "Elegantes, augenschonendes Dunkelblau-Grau mit goldenen Highlights."
                        : "Premium, low-light blue-grey slate canvas with gold details."}
                    </p>
                  </div>
                  {theme === "dark" && (
                    <span className="bg-fcb-gold/15 text-fcb-gold border border-fcb-gold/30 rounded-full p-1 self-start">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>

              {/* FCB Classic Red/White Option */}
              <button
                onClick={() => handleThemeChange("classic")}
                className={`text-left rounded-xl p-4 border transition-all relative overflow-hidden group cursor-pointer ${
                  theme === "classic"
                    ? "bg-white border-fcb-red shadow-lg shadow-fcb-red/5 text-slate-900"
                    : "bg-slate-950/20 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                {/* Theme visual card mimic */}
                <div className="h-20 bg-slate-100 rounded-lg border border-slate-200 p-2.5 mb-3 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-bold text-fcb-red uppercase tracking-wider">FCB Classic</span>
                    <span className="h-2 w-2 rounded-full bg-fcb-red"></span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-1/2 bg-slate-300 rounded"></div>
                    <div className="h-1.5 w-3/4 bg-fcb-red rounded"></div>
                  </div>
                  {/* Visual design representation */}
                  <div className="absolute right-2 bottom-2 h-6 w-6 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                    <Eye className="h-3 w-3 text-fcb-red" />
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h5 className={`font-bold text-xs ${theme === "classic" ? "text-fcb-red" : ""}`}>
                      {language === "de" ? "FCB Classic (Rot/Weiß)" : "FCB Classic (Red/White)"}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      {language === "de" 
                        ? "Traditionelles FC Bayern Design mit hohem Kontrast und roten Akzenten."
                        : "High-contrast traditional FC Bayern Red & White layout."}
                    </p>
                  </div>
                  {theme === "classic" && (
                    <span className="bg-fcb-red/10 text-fcb-red border border-fcb-red/20 rounded-full p-1 self-start">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Voice Assistant Configurations */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Volume2 className="h-4.5 w-4.5 text-fcb-gold" />
            <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
              {language === "de" ? "Sprachassistent-Einstellungen" : "Voice Assistant Preferences"}
            </h4>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-850">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">
                {language === "de" ? "Audio-Rückmeldung (TTS)" : "Text-to-Speech (TTS) Feedback"}
              </span>
              <p className="text-[11px] text-slate-500">
                {language === "de" 
                  ? "Aktiviert die Sprachrückmeldung, wenn ein Sprachbefehl erkannt wurde."
                  : "Enable or disable verbal confirmation when speech commands are triggered."}
              </p>
            </div>

            <button
              onClick={() => {
                const nextVal = !speechEnabled;
                setSpeechEnabled(nextVal);
                onAddLog({
                  id: `audio-pref-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  level: "INFO",
                  source: "Voice Setup",
                  message: language === "de"
                    ? `Audio-Rückmeldung ${nextVal ? "aktiviert" : "deaktiviert"}`
                    : `Audio feedback ${nextVal ? "enabled" : "disabled"}`
                });
              }}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                speechEnabled
                  ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {speechEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{language === "de" ? "AKTIV" : "ENABLED"}</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>{language === "de" ? "DEAKTIVIERT" : "MUTED"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GCP Secret Manager Integration Card */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-fcb-gold animate-pulse" />
              <h3 className="font-bold text-white font-display text-xs uppercase tracking-wider font-mono">
                {language === "de" ? "GCP Secret Manager & Cloud Security" : "GCP Secret Manager & Cloud Security"}
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide font-bold flex items-center gap-1 ${
              secretsStatus?.gcp_available 
                ? "bg-green-500/10 border border-green-500/30 text-green-400" 
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${secretsStatus?.gcp_available ? "bg-green-500" : "bg-amber-500 animate-pulse"}`}></span>
              {secretsStatus?.gcp_available ? "GCP Active" : "Sandbox Mode"}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {language === "de"
              ? "MiaSanAI unterstützt hochgradig skalierbare Enterprise-Sicherheitsarchitekturen. Wählen Sie zwischen dem direkten API-Zugriff auf GCP Secret Manager oder der automatisierten Integration über den Kubernetes External Secrets Operator (ESO)."
              : "MiaSanAI supports highly scalable enterprise security architectures. Choose between direct GCP Secret Manager API lookups or automated sync via Kubernetes External Secrets Operator (ESO)."}
          </p>

          {/* Architecture Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
            <button
              type="button"
              onClick={() => setActiveArchitecture("eso")}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeArchitecture === "eso"
                  ? "bg-fcb-red text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>{language === "de" ? "Kubernetes ESO (Aktiv)" : "Kubernetes ESO (Active)"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveArchitecture("gcp_sm")}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeArchitecture === "gcp_sm"
                  ? "bg-fcb-red text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{language === "de" ? "Standard GCP Secret Manager" : "Standard GCP Secret Manager"}</span>
            </button>
          </div>

          {activeArchitecture === "eso" && (
            <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4.5 w-4.5" />
                <span className="text-xs font-bold font-mono uppercase tracking-wider">Kubernetes ESO Sync Integriert</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                {language === "de"
                  ? "Beste Praxis für GKE: Der External Secrets Operator (ESO) synchronisiert Google Cloud Secrets automatisch in native Kubernetes v1/Secret Ressourcen. Ihr Code benötigt kein GCP SDK und arbeitet vollständig entkoppelt über lokale Umgebungsvariablen."
                  : "GKE Best Practice: The External Secrets Operator (ESO) automatically synchronizes Google Cloud Secrets into native Kubernetes v1/Secret resources. Your container operates decoupled from GCP APIs, reading secrets purely from local env variables."}
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px] text-slate-400">
                <div className="p-2 bg-slate-950/60 rounded border border-slate-850">
                  <span className="text-slate-500 block text-[8px] uppercase">GKE Namespace</span>
                  <span className="font-bold text-white">miasanai</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-850">
                  <span className="text-slate-500 block text-[8px] uppercase">SecretStore ID</span>
                  <span className="font-bold text-white">gcp-secret-store</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-850 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[8px] uppercase">K8s Secret Target</span>
                  <span className="font-bold text-green-400">miasanai-secrets</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10.5px]">
                <span className="text-slate-400 font-bold">{language === "de" ? "Generierte YAML-Manifeste:" : "Generated YAML manifests:"}</span>
                <span className="flex items-center gap-1 text-fcb-gold font-mono hover:underline">
                  <FileText className="h-3 w-3" /> /kubernetes/eso/secret-store.yaml
                </span>
                <span className="flex items-center gap-1 text-fcb-gold font-mono hover:underline">
                  <FileText className="h-3 w-3" /> /kubernetes/eso/external-secrets.yaml
                </span>
              </div>
            </div>
          )}

          {/* Secret Status Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
              {language === "de" ? "Aktiver Anmeldeinformations-Status:" : "Active Credentials Status:"}
            </h4>

            {loadingStatus ? (
              <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-500 font-mono">
                <RefreshCw className="h-4 w-4 animate-spin text-fcb-gold" />
                <span>{language === "de" ? "Abfragen der Cloud-Infrastruktur..." : "Querying Cloud Infrastructure..."}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(secretsStatus?.secrets || {}).map(([key, details]: [string, any]) => (
                  <div key={key} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-mono font-bold text-white block truncate max-w-[150px]" title={key}>{key}</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                        {activeArchitecture === "eso" && details.configured
                          ? "Kubernetes Secret (ESO Sync)"
                          : details.source === "Not Configured" 
                            ? (language === "de" ? "Nicht konfiguriert" : "Not configured") 
                            : details.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {details.configured ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> SECURE
                        </span>
                      ) : (
                        <span className="bg-slate-900 text-slate-500 border border-slate-800 text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                          <Unlock className="h-2.5 w-2.5" /> SIMULATED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Secret Form */}
          <form onSubmit={handleSaveSecret} className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2">
              <Key className="h-4 w-4 text-fcb-gold" />
              <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider">
                {language === "de" ? "API-Key hinzufügen / rotieren" : "Add / Rotate API Key"}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide block">
                  {language === "de" ? "Variable / Secret ID" : "Variable / Secret ID"}
                </label>
                <select
                  value={selectedSecretId}
                  onChange={(e) => setSelectedSecretId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red cursor-pointer"
                >
                  <option value="FAL_API_KEY">FAL_API_KEY (Luma video generation)</option>
                  <option value="GEMINI_API_KEY">GEMINI_API_KEY (Core AI intelligence)</option>
                  <option value="OPENAI_API_KEY">OPENAI_API_KEY (Secondary translation agent)</option>
                  <option value="LEONARDO_API_KEY">LEONARDO_API_KEY (Premium image engine)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide block">
                  {language === "de" ? "Schlüsselwert (Secret Value)" : "Secret Value (Key)"}
                </label>
                <div className="relative">
                  <input
                    type={showSecretValue ? "text" : "password"}
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder={language === "de" ? "z.B. fal_a1b2c3d4..." : "e.g. fal_a1b2c3d4..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretValue(!showSecretValue)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                  >
                    {showSecretValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-800/50 pt-3">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide block">
                {language === "de" ? "Admin Token (Für Speicherung)" : "Admin Token (For Saving)"}
              </label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="ADMIN_API_TOKEN"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-[10px] text-slate-500 leading-tight">
                {language === "de"
                  ? "Hinweis: Im Produktivbetrieb werden Schlüssel über die Google Cloud Console verschlüsselt gespeichert."
                  : "Note: In production, values are managed via Google Cloud Console to prevent key leaks."}
              </p>
              <button
                type="submit"
                disabled={isSaving || !secretValue.trim()}
                className="bg-fcb-red hover:bg-fcb-red/95 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                <span>{language === "de" ? "Schlüssel anwenden" : "Apply Secret Key"}</span>
              </button>
            </div>

            {saveMessage && (
              <div className={`p-2.5 rounded-lg text-xs font-mono border ${
                saveMessage.type === "success" 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                {saveMessage.text}
              </div>
            )}
          </form>

          {/* Cloud Infrastructure Concept Visualizer */}
          <div className="p-4 bg-slate-950/30 rounded-xl border border-slate-850/60 space-y-3">
            <span className="text-[10px] text-fcb-gold uppercase tracking-wider font-mono font-bold flex items-center gap-1">
              <Server className="h-3.5 w-3.5" /> {language === "de" ? "Cloud-Infrastruktur Architektur-Konzept" : "Cloud Infrastructure Architecture Concept"}
            </span>
            
            {activeArchitecture === "eso" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center relative pt-1">
                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[8.5px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">1. SECURE VAULT</span>
                    <span className="text-[10.5px] font-bold text-white block">GCP Secret Manager</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "Zentraler Cloud-Tresor für alle API-Keys." : "Centralized cloud vault for all API keys."}
                    </p>
                  </div>

                  <div className="hidden sm:flex absolute left-[30.5%] top-1/2 -translate-y-1/2 z-10 text-fcb-gold animate-pulse">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1 border-dashed border-green-500/30">
                    <span className="text-[8.5px] font-mono text-fcb-gold uppercase tracking-wider block font-bold">2. ESO BACKGROUND RECONCILER</span>
                    <span className="text-[10.5px] font-bold text-white block">Kubernetes Operator</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "Synchronisiert Keys via Workload Identity." : "Synchronizes keys continuously using GKE Workload Identity."}
                    </p>
                  </div>

                  <div className="hidden sm:flex absolute left-[64%] top-1/2 -translate-y-1/2 z-10 text-fcb-gold animate-pulse">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[8.5px] font-mono text-green-400 uppercase tracking-wider block font-bold">3. ZERO-LATENCY ACCESS</span>
                    <span className="text-[10.5px] font-bold text-white block">Native K8s Secret</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "App liest Keys lokal als Umgebungsvariable." : "App reads keys locally with zero runtime external API latency."}
                    </p>
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-500 leading-relaxed font-mono">
                  {language === "de" 
                    ? "GKE Bindung: Der K8s Service Account 'external-secrets/external-secrets' ist über Workload Identity mit dem GCP GSA 'miasanai-gke-eso-sa@ais-europe-west2-031976db4a174.iam.gserviceaccount.com' verknüpft."
                    : "GKE Binding: The K8s service account 'external-secrets/external-secrets' is associated via Workload Identity with GCP GSA 'miasanai-gke-eso-sa@ais-europe-west2-031976db4a174.iam.gserviceaccount.com'."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center relative pt-1">
                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[8.5px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">1. CLIENT ACTION</span>
                    <span className="text-[10.5px] font-bold text-white block">MiaSanAI App</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "Video-Studio fordert Live-Generierung an." : "Video Studio requests live video generation."}
                    </p>
                  </div>

                  <div className="hidden sm:flex absolute left-[30.5%] top-1/2 -translate-y-1/2 z-10 text-fcb-gold">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[8.5px] font-mono text-fcb-gold uppercase tracking-wider block font-bold">2. SERVER RUNTIME</span>
                    <span className="text-[10.5px] font-bold text-white block">Cloud Run Container</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "Nutzt ADC (Ambient Credentials) des Service-Accounts." : "Leverages ADC via active Service Account IAM permissions."}
                    </p>
                  </div>

                  <div className="hidden sm:flex absolute left-[64%] top-1/2 -translate-y-1/2 z-10 text-fcb-gold">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[8.5px] font-mono text-green-400 uppercase tracking-wider block font-bold">3. SECURE VAULT</span>
                    <span className="text-[10.5px] font-bold text-white block">GCP Secret Manager</span>
                    <p className="text-[9.5px] text-slate-500 leading-normal">
                      {language === "de" ? "Löst FAL_API_KEY sicher ohne Hardcoding auf." : "Resolves FAL_API_KEY securely at runtime."}
                    </p>
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-500 leading-relaxed font-mono">
                  {language === "de" 
                    ? "IAM-Policy: Die Rolle 'roles/secretmanager.secretAccessor' ist exklusiv für den Service-Account 'miasanai-run-sa@fcb-media-prod.iam.gserviceaccount.com' auf das Secret 'FAL_API_KEY' gebunden."
                    : "IAM Policy: The 'roles/secretmanager.secretAccessor' role is bound exclusively to the 'miasanai-run-sa@fcb-media-prod.iam.gserviceaccount.com' service account on secret 'FAL_API_KEY'."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Info & Metadata (Right side Col Span 1) */}
      <div className="space-y-6">
        {/* Alternative & Free Backup Models Card */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-fcb-gold animate-pulse" />
            <h3 className="font-bold text-white font-display">
              {language === "de" ? "Alternative & Freie KI-Tools" : "Free AI Backup Tools"}
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {language === "de"
              ? "Als Backup bei fehlendem API-Guthaben oder verbrauchten Token-Credits können Sie hier auf kostenlose, unbegrenzte Alternativ-Modelle ausweichen."
              : "As a backup when primary API tokens or credits are exhausted, switch here to free, unlimited alternative tools."}
          </p>

          <div className="space-y-2.5">
            {/* Option 2: Nano Banana 2 */}
            <button
              type="button"
              onClick={() => handleBackupModelChange("nano_banana")}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                backupModel === "nano_banana"
                  ? "bg-yellow-950/20 border-yellow-500/50 text-yellow-100 font-bold"
                  : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-white"
              }`}
              id="nano-banana-toggle-btn"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono flex items-center gap-1">
                  <span>Nano Banana 2</span> <span>🍌</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 uppercase tracking-wide">
                  {language === "de" ? "Kostenloses Backup" : "Free Backup"}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 leading-normal">
                {language === "de" ? "Unbegrenzte freie Token. Schnelle, witzige Social-Beiträge." : "Unlimited free tokens. Fast, responsive, slightly witty social output."}
              </span>
            </button>

            {/* Option 3: Bavarian Llama 3B */}
            <button
              type="button"
              onClick={() => handleBackupModelChange("bavarian_llama")}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                backupModel === "bavarian_llama"
                  ? "bg-sky-950/20 border-sky-500/50 text-sky-100 font-bold"
                  : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono flex items-center gap-1">
                  <span>Bavarian Llama 3B</span> <span>🥨</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-sky-500/10 border border-sky-500/20 text-sky-400 uppercase tracking-wide">
                  {language === "de" ? "Freier Node" : "Free Local Node"}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 leading-normal">
                {language === "de" ? "Uriges, bayerisches Dialekt-Grounding auf Vereins-Motto." : "Folkloric, rustic dialect adjustments with core motto alignment."}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="h-5 w-5 text-fcb-gold" />
            <h3 className="font-bold text-white font-display">
              {language === "de" ? "Sicherheit & Status" : "System Diagnostics"}
            </h3>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide block">Orchestrator Mode</span>
              <div className="p-2 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Antigravity Core</span>
                <span className="text-fcb-gold font-bold">ACTIVE V3.1</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide block">RAG Engine Cluster</span>
              <div className="p-2 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Gemini Pro retrieved</span>
                <span className="text-green-400">SECURE DISPATCH</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide block">Active Profile</span>
              <div className="p-2 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{language === "de" ? "Aktiver Account:" : "Target User:"}</span>
                <span className="text-slate-300 font-bold">veselintakev@fcb.de</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand visual banner card */}
        <div className="bg-gradient-to-br from-fcb-red to-rose-700 p-5 rounded-2xl border border-fcb-red text-white space-y-3 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 font-display font-black text-6xl select-none translate-x-4 translate-y-4">
            FCB
          </div>
          <Sparkles className="h-6 w-6 text-fcb-gold animate-pulse" />
          <h4 className="font-display font-bold text-sm tracking-wide uppercase">Mia San Mia</h4>
          <p className="text-[11px] text-slate-100 leading-relaxed font-sans">
            {language === "de" 
              ? "Dieses Portal ist für die weltweite Medienarbeit des FC Bayern München autorisiert. Jede KI-generierte Kampagne unterliegt den FCB-Compliance-Regeln."
              : "This platform is authorized for the global media output of FC Bayern Munich. Every AI-assisted customer journey complies with standard FCB policy rules."}
          </p>
        </div>
      </div>
    </div>
  );
};
