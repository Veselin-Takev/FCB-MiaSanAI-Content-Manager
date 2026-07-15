import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, AlertTriangle, AlertCircle, Play, RefreshCw, Copy, Check, Terminal,
  Sliders, FileJson, Video, AudioLines, Sparkles, Send, Database, HelpCircle, Info, Layers, CheckCircle2, BadgeAlert, Plus, Download, FileText
} from "lucide-react";
import { jsPDF } from "jspdf";

interface MultiAgentAutomationProps {
  onAddLog: (log: any) => void;
}

interface AgentResult {
  score: number;
  reason: string;
  weight: number;
  name?: string;
}

interface QAExecutionResponse {
  success: boolean;
  draft: string;
  agent1: AgentResult;
  agent2: AgentResult;
  agent3: AgentResult;
  weightedScore: number;
  actionTaken: "APPROVE" | "STOP" | "RE_PROMPT" | "ESCALATE";
  errorLog: string | null;
  attempt: number;
  timestamp: string;
  metadata: {
    eventType: string;
    coreData: string;
    channels: string[];
    ragScope: string;
  };
  makeRouting?: string;
  makeGeneration?: {
    systemPrompt: string;
    ragContextApplied: string;
    model: string;
  };
  makeChannelRoutingParams?: {
    limit: string;
    emoji: string;
    hashtags: string;
    focus: string;
  };
  dbStatus?: string;
  approvalWebhookLink?: string;
}

export const MultiAgentAutomation: React.FC<MultiAgentAutomationProps> = ({ onAddLog }) => {
  // 1. Input states
  const [eventType, setEventType] = useState<string>("Spielday-Sieg (Full-Time Victory)");
  const [coreData, setCoreData] = useState<string>(
    "Thomas Müller feiert sein 710. Pflichtspiel-Jubiläum für den FC Bayern München. Er erzielt den entscheidenden Treffer in der 82. Minute zum 3:1 Sieg gegen Real Madrid vor 75.000 Zuschauern in der ausverkauften Allianz Arena."
  );
  const [channels, setChannels] = useState<string[]>(["Instagram"]);
  const [ragScope, setRagScope] = useState<string>("Squad Statistics & Match Reports");

  const handleDownloadStrategicConceptPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      
      const addHeaderAndFooter = (pageNum: number, totalPages: number) => {
        // Red Top Border Header
        doc.setFillColor(220, 5, 45); // FCB Red (#dc052d)
        doc.rect(0, 0, 210, 8, "F");
        
        // Footer Line
        doc.setDrawColor(226, 232, 240); // light grey
        doc.setLineWidth(0.3);
        doc.line(15, 280, 195, 280);
        
        // Footer text
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("FC Bayern München - MiaSanAI Content Operations", 15, 285);
        doc.text(`Seite ${pageNum} von ${totalPages}`, 195, 285, { align: "right" });
      };

      const totalPages = 5;

      // ================== PAGE 1 ==================
      addHeaderAndFooter(1, totalPages);
      
      // Title Block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(220, 5, 45); // FCB Red
      doc.text("Strategisches Konzept:", 15, 25);
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Multi-Agenten-Qualitätssicherung &", 15, 33);
      doc.text("Automatisierte Video-Content-Pipeline", 15, 41);
      
      // Red Separator Line
      doc.setDrawColor(220, 5, 45);
      doc.setLineWidth(1);
      doc.line(15, 46, 195, 46);
      
      // Intro Text
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85); // slate-700
      const introText = "Dieses Dokument beschreibt die Architektur, das dynamische Routing und die deterministischen Prompts für eine Multi-Agenten-Qualitätssicherungs-Pipeline sowie die automatisierte Produktion von Video-Inhalten.";
      const splitIntro = doc.splitTextToSize(introText, 180);
      doc.text(splitIntro, 15, 54);
      
      // Section 1
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("1. Systemarchitektur & Datenfluss (Make.com Orchestrierung)", 15, 75);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      const s1Text = "Um das harte 45-Minuten-Timeout-Limit von Make.com bei menschlichen Freigabeprozessen zu umgehen, wird die Architektur asynchron in zwei separate Szenarien aufgeteilt.";
      const splitS1 = doc.splitTextToSize(s1Text, 180);
      doc.text(splitS1, 15, 82);
      
      // Section 1.1
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(220, 5, 45);
      doc.text("1.1 Szenario 1: Generierung & Unabhängige Vorprüfung (Asynchron)", 15, 96);
      
      // Bullet points Page 1
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      
      let y = 103;
      const bulletsPage1 = [
        { title: "1. Input & Weiche: ", text: "Der Input wird erfasst und durch ein bedingtes Routing (Router-Modul in Make.com) nach Zielkanal segmentiert." },
        { title: "2. Generierung (Claude): ", text: "Claude erhält den kanalspezifischen System-Prompt und den RAG-Kontext. Der Output wird in Variablen zwischengespeichert." },
        { title: "3. Parallel / Unabhängiges Review (Cross-Validation): ", text: "Drei HTTP-Module feuern isoliert nacheinander oder parallel:" },
        { title: "   • GPT: ", text: "Prüft logische Konsistenz, Struktur und fängt Halluzinationen ab." },
        { title: "   • Grok: ", text: "Fokussiert sich auf den harten Faktencheck." },
        { title: "   • Gemini: ", text: "Validiert die Konsistenz mit den Marken-Guidelines und der Tonalität." },
        { title: "   Architektur-Regel: ", text: "Kein Agent sieht die Bewertung der anderen — vollständige Unabhängigkeit ist gewährleistet.", isItalic: true },
        { title: "4. Aggregation & Scoring: ", text: "Gemini konsolidiert in einem finalen Schritt die isolierten JSON-Antworten von GPT und Grok und berechnet den mathematischen Quality Score." },
        { title: "5. Datenbank-Schnittstelle: ", text: "Das Ergebnis wird in einer Datenbank abgelegt. Bei einem Score unter dem Schwellenwert erfolgt ein automatischer Re-Loop; bei Erfolg wird ein Webhook-Link für das Human Approval generiert." }
      ];
      
      bulletsPage1.forEach(item => {
        doc.setFont("Helvetica", item.isItalic ? "oblique" : "bold");
        doc.text(item.title, 15, y);
        const titleWidth = doc.getTextWidth(item.title);
        
        doc.setFont("Helvetica", item.isItalic ? "oblique" : "normal");
        const remainWidth = 180 - titleWidth;
        const splitText = doc.splitTextToSize(item.text, remainWidth);
        doc.text(splitText, 15 + titleWidth, y);
        
        y += (splitText.length * 4.2) + 2.5;
      });

      // Section 1.2
      y += 2;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(220, 5, 45);
      doc.text("1.2 Szenario 2: Human Approval Gate (Echtzeit)", 15, y);
      y += 6;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const s12Text = "Nach dem manuellen Klick des Nutzers auf dem Dashboard (Approve) triggert Make.com den nachgelagerten Veröffentlichungs- oder Produktions-Workflow (z. B. die YouTube-Rendering-Pipeline).";
      const splitS12 = doc.splitTextToSize(s12Text, 180);
      doc.text(splitS12, 15, y);

      // ================== PAGE 2 ==================
      doc.addPage();
      addHeaderAndFooter(2, totalPages);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Dynamisches Kanal-Routing (Matrix)", 15, 25);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const s2Text = "Bevor Claude den Text generiert, übersetzt Make.com die Metadaten in feste, deterministische Parameter:";
      doc.text(s2Text, 15, 32);
      
      // Draw Table Matrix
      const tableTop = 40;
      doc.setFillColor(241, 245, 249); // light blue/grey bg
      doc.rect(15, tableTop, 180, 8, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      
      doc.text("Zielkanal", 17, tableTop + 5.5);
      doc.text("Sys-Var {{LIMIT}}", 45, tableTop + 5.5);
      doc.text("Sys-Var {{EMOJI}}", 80, tableTop + 5.5);
      doc.text("Sys-Var {{HASHTAGS}}", 115, tableTop + 5.5);
      doc.text("Fokus / Besonderheit", 152, tableTop + 5.5);
      
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(15, tableTop, 195, tableTop);
      doc.line(15, tableTop + 8, 195, tableTop + 8);
      
      const matrixRows = [
        { ch: "Instagram", limit: "150 Zeichen", emoji: "true", tag: "2", spec: "Visuelle Hook" },
        { ch: "LinkedIn", limit: "700 Zeichen", emoji: "false", tag: "0", spec: "Professioneller Stil" },
        { ch: "YouTube", limit: "Dynamisch (Skript)", emoji: "true", tag: "-", spec: "Hook (0-15s), Script 90s, CTA" }
      ];
      
      let rowY = tableTop + 8;
      matrixRows.forEach((row, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, rowY, 180, 10, "F");
        }
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        
        doc.text(row.ch, 17, rowY + 6.5);
        doc.text(row.limit, 45, rowY + 6.5);
        doc.text(row.emoji, 80, rowY + 6.5);
        doc.text(row.tag, 115, rowY + 6.5);
        doc.text(row.spec, 152, rowY + 6.5);
        
        rowY += 10;
        doc.line(15, rowY, 195, rowY);
      });
      
      // Section 3
      y = rowY + 12;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("3. Deterministische Engineering Prompts (Produktionsreif)", 15, y);
      
      // Prompt 1
      y += 8;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 5, 45);
      doc.text("Prompt 1: Der Creator (Claude)", 15, y);
      y += 6;
      
      // Prompt Code Block Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      
      const p1Text = `[Rolle]: Du bist Redakteur des FC Bayern. Deine Tonalität ist professionell, nah am Fan, enthusiastisch, aber stets faktisch korrekt.

[Kontext]: Nutze ausschließlich die bereitgestellten verifizierten Informationen aus der RAG-Datenbank. System-Prompt verbietet das Ergänzen nicht gelieferter Fakten.

[Kanal-Parameter]:
- Kanal: {{KANAL}}
- Zeichenlimit: {{LIMIT}}Z
- Ton: {{TON}}
- Emojis erlaubt: {{EMOJI}}

[RAG-Kontext]: {{TOP_3_CHUNKS}}
[Ereignistyp]: {{EREIGNISTYP}}
[Kerndaten]: {{KERNDATEN}}

[Aufgabe]: Erstelle jetzt den Post basierend auf den Kerndaten und unter strikter Einhaltung des RAG-Kontexts.

[Output-Format]: NUR den fertigen Post ausgeben. Keine Einleitung, keine Metakommentare, keine Anmerkungen.`;

      const splitP1 = doc.splitTextToSize(p1Text, 170);
      const boxHeight = (splitP1.length * 3.8) + 6;
      doc.rect(15, y, 180, boxHeight, "FD");
      
      doc.setFont("Courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitP1, 20, y + 5.5);

      // ================== PAGE 3 ==================
      doc.addPage();
      addHeaderAndFooter(3, totalPages);
      
      y = 25;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 5, 45);
      doc.text("Prompt 2: Der Auditor (GPT - Isoliertes Review)", 15, y);
      y += 6;
      
      const p2Text = `[Rolle]: Du bist ein kritischer Auditor und Fachexperte.

[Aufgabe]: Analysiere den folgenden Text (erstellt von einer KI) auf logische Konsistenz, sachliche Richtigkeit und Einhaltung der Best Practices. Verschiedene Trainingsdaten bedeuten, dass du Schwächen abdeckst, die andere Modelle übersehen.

[Original-Input]: {{KERNDATEN}}
[KI-Generat]: {{CLAUDE_OUTPUT}}

[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden Format:
## Review-Punkte
* [Kriterium 1]: (Kritik/Lob)
* [Kriterium 2]: (Kritik/Lob)
Fehlerprotokoll: (Falls vorhanden, sonst "Keine Fehler")`;

      const splitP2 = doc.splitTextToSize(p2Text, 170);
      const boxHeight2 = (splitP2.length * 3.8) + 6;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, boxHeight2, "FD");
      
      doc.setFont("Courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitP2, 20, y + 5.5);
      
      y += boxHeight2 + 10;
      
      // Prompt 3
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 5, 45);
      doc.text("Prompt 3: Der Faktenchecker (Grok - Isoliertes Review)", 15, y);
      y += 6;
      
      const p3Text = `[Rolle]: Du bist ein unbestechlicher Faktencheck-Algorithmus.

[Aufgabe]: Vergleiche den generierten Text strikt mit den bereitgestellten RAG-Fakten. Identifiziere jede Form von Halluzination oder Hinzudichten von Informationen, die Claude übersehen hat.

[RAG-Referenzdaten]: {{TOP_3_CHUNKS}}
[Zu prüfender Text]: {{CLAUDE_OUTPUT}}

[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden JSON-Schema:
{
  "faktentreue_score": 0-100,
  "halluzination_erkannt": true/false,
  "diskrepanzen": ["Abweichung 1"] oder []
}`;

      const splitP3 = doc.splitTextToSize(p3Text, 170);
      const boxHeight3 = (splitP3.length * 3.8) + 6;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, boxHeight3, "FD");
      
      doc.setFont("Courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitP3, 20, y + 5.5);

      // ================== PAGE 4 ==================
      doc.addPage();
      addHeaderAndFooter(4, totalPages);
      
      y = 25;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 5, 45);
      doc.text("Prompt 4: Der Evaluator & Aggregations-Gate (Gemini)", 15, y);
      y += 6;
      
      const p4Text = `[Rolle]: Du bist der finale Qualitätsmanager (Quality Gate).

[Aufgabe]: Bewerte das KI-Generat basierend auf dem Original-Input, dem vorliegenden GPT-Review und dem Grok-Faktencheck. Berechne einen mathematischen Quality Score zwischen 0 und 100. Erst am Ende werden alle Scores zu einem Gesamtscore aggregiert.

[Daten]:
- Original-Input: {{KERNDATEN}}
- KI-Generat: {{CLAUDE_OUTPUT}}
- GPT-Review: {{GPT_REVIEW}}
- Grok-Review: {{GROK_REVIEW}}

[Metrik für Score]:
- Relevanz zum Input / Faktentreue (0-40)
- Korrektheit & Logik (0-40)
- Stil, Tonalität & Struktur (0-20)

[Output-Format]: Antworte NUR in JSON:
{
  "quality_score": [Zahl],
  "fakten_score": 0-100,
  "ton_score": 0-100,
  "kanal_score": 0-100,
  "justification": "[Kurze Begründung für den Score]",
  "anmerkungen": "[Detaillierte Anmerkungen]",
  "action_required": "[JA/NEIN - Muss ein Mensch eingreifen?]"
}`;

      const splitP4 = doc.splitTextToSize(p4Text, 170);
      const boxHeight4 = (splitP4.length * 3.8) + 6;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, boxHeight4, "FD");
      
      doc.setFont("Courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitP4, 20, y + 5.5);
      
      y += boxHeight4 + 12;
      
      // Section 4
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("4. Deep-Dive: Die automatisierte YouTube-Video-Pipeline", 15, y);
      y += 6;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const s4Text = "Sobald das Human Approval für ein YouTube-Skript erteilt wird, startet die vollautomatische Medienproduktion nahtlos über Make.com:";
      const splitS4 = doc.splitTextToSize(s4Text, 180);
      doc.text(splitS4, 15, y);
      y += 12;
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 5, 45);
      doc.text("4.1 RAG Wissensdatenbank & Datenbasis", 15, y);

      // ================== PAGE 5 ==================
      doc.addPage();
      addHeaderAndFooter(5, totalPages);
      
      y = 25;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      
      const r1Text = "• Infrastruktur: Eine selbstgehostete, vollständig DSGVO-konforme ChromaDB dient als zentraler Wissensspeicher.";
      const r2Text = "• Inhalte der Datenbank: Pressemitteilungen, Spielberichte, der offizielle Tone-of-Voice Guide sowie Sponsorinfos.";
      const r3Text = "• Abruf-Logik: Bei einem Ereignis extrahiert das System die Top-3 Chunks via Vektorsuche und übergibt diese als Kontext an die Prompt-Kette.";
      
      doc.text(doc.splitTextToSize(r1Text, 180), 15, y);
      y += 12;
      doc.text(doc.splitTextToSize(r2Text, 180), 15, y);
      y += 12;
      doc.text(doc.splitTextToSize(r3Text, 180), 15, y);
      
      // Section 4.2
      y += 18;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(220, 5, 45);
      doc.text("4.2 Audio-Synthese (OpenVoice v2)", 15, y);
      y += 6;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const audioBullets = [
        "Das von Claude erstellte YouTube-Skript (bestehend aus Hook, Body und CTA) wird an OpenVoice v2 (Open Source) übergeben.",
        "Voice Cloning: Das System nutzt ein vordefiniertes Sprachmodell für das Klonen der eigenen Stimme.",
        "Output: Es wird ein multilinguales (DE / EN) WAV-Audio in Studioqualität (44.1 kHz) generiert."
      ];
      audioBullets.forEach(txt => {
        const splitTxt = doc.splitTextToSize("• " + txt, 180);
        doc.text(splitTxt, 15, y);
        y += (splitTxt.length * 4.2) + 3;
      });
      
      // Section 4.3
      y += 10;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(220, 5, 45);
      doc.text("4.3 Video-Compositing (FFmpeg) & API-Upload", 15, y);
      y += 6;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const videoBullets = [
        "FFmpeg-Engine: Das System kombiniert das generierte WAV-Audio automatisiert mit passenden FC-Bayern-Bildern oder Videoclips zu einer finalen MP4-Videodatei.",
        "Auto-Upload: Über die YouTube Data API v3 wird die fertige MP4-Datei vollautomatisch auf den Kanal hochgeladen."
      ];
      videoBullets.forEach(txt => {
        const splitTxt = doc.splitTextToSize("• " + txt, 180);
        doc.text(splitTxt, 15, y);
        y += (splitTxt.length * 4.2) + 3;
      });
      
      // Save PDF
      doc.save("FCB_Strategisches_Konzept_Multi_Agenten_QA_Video_Pipeline.pdf");
      
      onAddLog({
        id: `download-concept-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Document Generator",
        message: "Das offizielle Strategische Konzept-Dokument wurde erfolgreich als PDF kompiliert und heruntergeladen."
      });
    } catch (err: any) {
      console.error("Failed to generate strategic concept PDF:", err);
      onAddLog({
        id: `download-concept-fail-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Document Generator",
        message: `Kompilierung des Strategischen Konzepts fehlgeschlagen: ${err.message}`
      });
    }
  };

  // Flow State
  const [forcePath, setForcePath] = useState<string>("auto");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [history, setHistory] = useState<QAExecutionResponse[]>([]);
  const [currentResult, setCurrentResult] = useState<QAExecutionResponse | null>(null);
  
  // Tab within JSON / schemas view
  const [jsonTab, setJsonTab] = useState<"make" | "interfaces" | "prompts">("make");
  const [copied, setCopied] = useState<boolean>(false);

  // Re-prompting cycle simulation states
  const [loopCount, setLoopCount] = useState<number>(1);
  const [repromptingLogs, setRepromptingLogs] = useState<string[]>([]);

  // MP4 openVoice / FFmpeg rendering state
  const [renderingProgress, setRenderingProgress] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [videoRendered, setVideoRendered] = useState<boolean>(false);
  const [playAudio, setPlayAudio] = useState<boolean>(false);
  const [expandedPipelineDetail, setExpandedPipelineDetail] = useState<"rag" | "audio" | "compositing" | null>("rag");
  const [pipelineViewMode, setPipelineViewMode] = useState<"player" | "deepdive">("player");
  
  const renderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (renderingProgress >= 100 && isRendering) {
      if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
      setIsRendering(false);
      setVideoRendered(true);
      onAddLog({
        id: `synthesis-rendered-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "OpenVoice / FFmpeg Engine",
        message: `Successfully synthesized German voice note via OpenVoice and rendered MP4 container.`
      });
    }
  }, [renderingProgress, isRendering, onAddLog]);

  // Channels definitions
  const availableChannels = ["Instagram", "LinkedIn", "YouTube", "X/Twitter", "TikTok", "FCB App"];

  const handleChannelToggle = (ch: string) => {
    if (channels.includes(ch)) {
      setChannels(channels.filter(item => item !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  // Run the full pipeline
  const runQAWorkflow = async () => {
    setIsRunning(true);
    setActiveStep(0);
    setCurrentResult(null);
    setVideoRendered(false);
    setRenderingProgress(0);
    setRepromptingLogs([]);
    
    onAddLog({
      id: `multi-agent-qa-trigger-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: "n8n Webhook Ingestion",
      message: `Inbound webhook triggered for event type '${eventType}' with RAG scope: [${ragScope}].`
    });

    // Step-by-step pipeline visualization
    const stepsDelays = [1000, 1500, 1200, 2000, 1500]; // Delay times for animation
    
    // Step 0: Input Layer (Ingestion & Setup)
    await new Promise(r => setTimeout(r, stepsDelays[0]));
    setActiveStep(1); // Step 1: n8n Routing and RAG retrieval
    onAddLog({
      id: `multi-agent-rag-retrieval-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "RAG Hub Integration",
      message: `Retrieving relevant narrative pillars from scope: [${ragScope}]. Retrieved 3 document chunks.`
    });

    // Step 1 -> Step 2: Generation via Claude/Gemini
    await new Promise(r => setTimeout(r, stepsDelays[1]));
    setActiveStep(2); // Step 2: Content generation
    onAddLog({
      id: `multi-agent-llm-generation-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "n8n LLM Node",
      message: "Orchestrating primary draft generation with Gemini using strict platform format rules."
    });

    // Step 2 -> Step 3: Multi-Agent QA
    await new Promise(r => setTimeout(r, stepsDelays[2]));
    setActiveStep(3); // Step 3: Multi-Agent QA Audit
    onAddLog({
      id: `multi-agent-review-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "QA Review Engine",
      message: "Initiating 3-Agent verification layer. Calculating weights: Fact-Checker (40%), Brand-Strategist (35%), Perspective-Analyst (25%)."
    });

    // Let's call the actual server endpoint or perform loops
    try {
      let currentAttempt = 1;
      let finalResult: QAExecutionResponse | null = null;
      let stopLoop = false;

      while (!stopLoop && currentAttempt <= 3) {
        // Prepare payload
        const payload = {
          eventType,
          coreData,
          channels,
          ragScope,
          attempt: currentAttempt,
          forcePath: currentAttempt === 1 ? forcePath : (forcePath === "force_re_prompt" && currentAttempt === 2 ? "force_escalate" : "auto")
        };

        const response = await fetch("/api/automation/multi-agent-qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Multi-Agent QA service responded with an error");
        }

        const data: QAExecutionResponse = await response.json();
        finalResult = data;

        if (data.actionTaken === "RE_PROMPT" && currentAttempt < 3) {
          const repromptLogStr = `[Loop #${currentAttempt} FAILED] Weighted Score: ${data.weightedScore}/100 (< 80). Reason: QA threshold not met. Initiating Auto Re-prompting...`;
          setRepromptingLogs(prev => [...prev, repromptLogStr]);
          onAddLog({
            id: `reprompt-log-${currentAttempt}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "WARNING",
            source: "Governance Guard",
            message: `QA verification score failed (${data.weightedScore}/100). Auto-initiating corrective prompt loop.`
          });
          currentAttempt++;
          await new Promise(r => setTimeout(r, 2200)); // Sleep before retrying to simulate LLM thinking
        } else {
          stopLoop = true;
        }
      }

      if (finalResult) {
        setCurrentResult(finalResult);
        setHistory(prev => [finalResult!, ...prev]);
        setActiveStep(4); // Step 4: Governance outcome determination

        // Write specific governance action logs
        if (finalResult.actionTaken === "APPROVE") {
          onAddLog({
            id: `qa-success-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "SUCCESS",
            source: "Governance Guard",
            message: `[AUTO-RELEASE] Weighted Quality Score of ${finalResult.weightedScore}/100 exceeded the threshold of 95. Caption auto-cleared and pushed to publication pipelines.`
          });
          
          // Trigger OpenVoice rendering automatically on success
          triggerMediaSynthesis();
        } else if (finalResult.actionTaken === "STOP") {
          onAddLog({
            id: `qa-stop-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "WARNING",
            source: "Governance Guard",
            message: `[AUTO-STOP] Quality Score of ${finalResult.weightedScore}/100 fell into the review window [80, 95). Manual Human-in-the-Loop clearance required.`
          });
        } else if (finalResult.actionTaken === "ESCALATE") {
          onAddLog({
            id: `qa-escalation-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "WARNING",
            source: "Governance Guard",
            message: `[CRITICAL ESCALATION] Content Quality Score remained at ${finalResult.weightedScore}/100 after 2 corrective prompt iterations. Alerting Redaktion Specialist with Root-Cause report.`
          });
        }
      }

    } catch (err: any) {
      console.error("Multi-agent automation failed:", err);
      onAddLog({
        id: `multi-agent-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Multi-Agent Automation",
        message: `Validation pipeline crashed: ${err.message}. Controlling manual backup routing.`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const triggerMediaSynthesis = () => {
    setIsRendering(true);
    setRenderingProgress(0);
    setVideoRendered(false);

    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
    }

    renderIntervalRef.current = setInterval(() => {
      setRenderingProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 10;
      });
    }, 400);
  };

  const triggerScenario2Approval = async () => {
    if (!currentResult) return;
    
    onAddLog({
      id: `scenario2-trigger-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: "Make.com Scenario 2",
      message: "[Szenario 2 Webhook] Sende asynchrones Human Approval-Signal an den Make.com Empfänger..."
    });

    try {
      const response = await fetch("/api/automation/make-scenario2-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditRecordId: currentResult.approvalWebhookLink?.split("/approval/")[1]?.split("?")[0] || "audit_manual",
          draft: currentResult.draft,
          weightedScore: currentResult.weightedScore,
          channel: channels[0] || "Instagram"
        })
      });

      if (!response.ok) {
        throw new Error("Scenario 2 approval endpoint failed");
      }

      const data = await response.json();
      
      onAddLog({
        id: `scenario2-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Make.com Scenario 2",
        message: `[Szenario 2 Webhook] Signal erfolgreich übermittelt! ${data.downstreamPipeline.statusDetails}`
      });

      // Update local state to APPROVE so the UI updates
      setCurrentResult(prev => prev ? { ...prev, actionTaken: "APPROVE" } : null);
      
      // Start media rendering pipeline
      triggerMediaSynthesis();

    } catch (err: any) {
      console.error("Scenario 2 trigger failed:", err);
      onAddLog({
        id: `scenario2-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Make.com Scenario 2",
        message: `Scenario 2 trigger failed: ${err.message}. Running fallback local synthesis.`
      });
      // Fallback
      setCurrentResult(prev => prev ? { ...prev, actionTaken: "APPROVE" } : null);
      triggerMediaSynthesis();
    }
  };

  const handleCopyJSON = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. JSON-Struktur für Make.com Agenten-Kommunikation
  const makeWorkflowJSON = `{
  "meta": {
    "system": "MiaSanAI Multi-Agent Content Automation Node",
    "version": "1.0.0",
    "timestamp": "${new Date().toISOString()}"
  },
  "pipeline_input": {
    "event_type": "${eventType}",
    "core_data": "${coreData}",
    "target_channels": ${JSON.stringify(channels)},
    "rag_scope": "${ragScope}"
  },
  "make_context": {
    "scenario_1_id": "make-scenario-1-multi-agent-orchestrator",
    "execution_id": "exec_fcb_${Date.now().toString().slice(-6)}",
    "routing_node": "channel_router_weiche",
    "isolated_sub_webhooks": [
      "https://eu1.make.com/webhooks/agent/gpt4o",
      "https://eu1.make.com/webhooks/agent/grok2",
      "https://eu1.make.com/webhooks/agent/gemini"
    ]
  },
  "agent_payload_schemas": {
    "Agent_1_GPT_4o_Audit": {
      "weight": 0.40,
      "role_instructions": "Prüfung auf logische Konsistenz, Struktur und fängt Halluzinationen ab.",
      "input_draft": "{{ $json.primary_draft }}"
    },
    "Agent_2_Grok_2_Fact_Check": {
      "weight": 0.35,
      "role_instructions": "Fokussiert sich auf den harten Faktencheck gegen Club-Statistiken.",
      "input_draft": "{{ $json.primary_draft }}"
    },
    "Agent_3_Gemini_Brand_Guard": {
      "weight": 0.25,
      "role_instructions": "Validiert Konsistenz mit den Marken-Guidelines und der Tonalität.",
      "input_draft": "{{ $json.primary_draft }}"
    }
  }
}`;

  const tsInterfacesCode = `/**
 * @interface QAAgentReview
 * Repräsentiert das detaillierte Review-Ergebnis eines einzelnen Qualitätsagenten.
 */
export interface QAAgentReview {
  agentName: "Fact-Checker" | "Brand-Strategist" | "Perspective-Analyst";
  agentId: string;
  weight: number;         // z.B. 0.40, 0.35, 0.25
  score: number;          // 0 bis 100
  critique: string;       // Begründung / Feedback-Text
  hallucinationsDetected: string[]; // Nur für Fact-Checker relevant
}

/**
 * @interface QAGovernanceRecord
 * Der vollständige historische Datensatz eines Pipeline-Qualitätsaudits.
 */
export interface QAGovernanceRecord {
  auditId: string;
  timestamp: string;
  eventType: string;
  coreData: string;
  targetDraft: string;
  reviews: QAAgentReview[];
  weightedScore: number;  // S = Σ (Score_i * Weight_i)
  
  // Governance outcome:
  // S >= 95 -> APPROVED
  // 80 <= S < 95 -> MANUAL_REVIEW
  // S < 80 -> RE_PROMPT_CYCLE / ESCALATED
  outcome: "APPROVED" | "MANUAL_REVIEW" | "RE_PROMPT_TRIGGERED" | "CRITICAL_ESCALATED";
  
  attemptNumber: number;  // Aktuelle Iterations-Runde (1 bis 3)
  errorLog: {
    code: string;
    rootCause: string;
    analysisMessage: string;
    recommendations: string[];
  } | null;
}`;

  const engineeringPromptsText = `### PROMPT 1: DER CREATOR (CLAUDE)
[Rolle]: Du bist Redakteur des FC Bayern. Deine Tonalität ist professionell, nah am Fan, enthusiastisch, aber stets faktisch korrekt.
[Kontext]: Nutze ausschließlich die bereitgestellten verifizierten Informationen aus der RAG-Datenbank. System-Prompt verbietet das Ergänzen nicht gelieferter Fakten.
[Kanal-Parameter]:
- Kanal: {{KANAL}}
- Zeichenlimit: {{LIMIT}}Z
- Ton: {{TON}}
- Emojis erlaubt: {{EMOJI}}
[RAG-Kontext]: {{TOP_3_CHUNKS}}
[Ereignistyp]: {{EREIGNISTYP}}
[Kerndaten]: {{KERNDATEN}}

[Aufgabe]: Erstelle jetzt den Post basierend auf den Kerndaten und unter strikter Einhaltung des RAG-Kontexts.
[Output-Format]: NUR den fertigen Post ausgeben. Keine Einleitung, keine Metakommentare, keine Anmerkungen.

---

### PROMPT 2: DER AUDITOR (GPT - ISOLIERTES REVIEW)
[Rolle]: Du bist ein kritischer Auditor und Fachexperte.
[Aufgabe]: Analysiere den folgenden Text (erstellt von einer KI) auf logische Konsistenz, sachliche Richtigkeit und Einhaltung der Best Practices. Verschiedene Trainingsdaten bedeuten, dass du Schwächen abdeckst, die andere Modelle übersehen.
[Original-Input]: {{KERNDATEN}}
[KI-Generat]: {{CLAUDE_OUTPUT}}

[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden Format:
## Review-Punkte
* [Kriterium 1]: (Kritik/Lob)
* [Kriterium 2]: (Kritik/Lob)
Fehlerprotokoll: (Falls vorhanden, sonst "Keine Fehler")

---

### PROMPT 3: DER FAKTENCHECKER (GROK - ISOLIERTES REVIEW)
[Rolle]: Du bist ein unbestechlicher Faktencheck-Algorithmus.
[Aufgabe]: Vergleiche den generierten Text strikt mit den bereitgestellten RAG-Fakten. Identifiziere jede Form von Halluzination oder Hinzudichten von Informationen, die Claude übersehen hat.
[RAG-Referenzdaten]: {{TOP_3_CHUNKS}}
[Zu prüfender Text]: {{CLAUDE_OUTPUT}}

[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden JSON-Schema:
{
  "faktentreue_score": 0-100,
  "halluzination_erkannt": true/false,
  "diskrepanzen": ["Abweichung 1"] oder []
}

---

### PROMPT 4: DER EVALUATOR & AGGREGATIONS-GATE (GEMINI)
[Rolle]: Du bist der finale Qualitätsmanager (Quality Gate).
[Aufgabe]: Bewerte das KI-Generat basierend auf dem Original-Input, dem vorliegenden GPT-Review und dem Grok-Faktencheck. Berechne einen mathematischen Quality Score zwischen 0 und 100. Erst am Ende werden alle Scores zu einem Gesamtscore aggregiert.

[Daten]:
- Original-Input: {{KERNDATEN}}
- KI-Generat: {{CLAUDE_OUTPUT}}
- GPT-Review: {{GPT_REVIEW}}
- Grok-Review: {{GROK_REVIEW}}

[Metrik für Score]:
- Relevanz zum Input / Faktentreue (0-40)
- Korrektheit & Logik (0-40)
- Stil, Tonalität & Struktur (0-20)

[Output-Format]: Antworte NUR in JSON:
{
  "quality_score": [Zahl],
  "fakten_score": 0-100,
  "ton_score": 0-100,
  "kanal_score": 0-100,
  "justification": "[Kurze Begründung für den Score]",
  "anmerkungen": "[Detaillierte Anmerkungen]",
  "action_required": "[JA/NEIN - Muss ein Mensch eingreifen?]"
}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 select-none" id="multi-agent-system-panel">
      
      {/* 1. INPUT-LAYER & SETUP (Span 4) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="h-5 w-5 text-fcb-red" />
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">
                1. Input-Layer (Make Ingest)
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Definieren Sie die Ereignismetadaten, die RAG-Suchvorgaben und Zielkanäle. Diese Rohdaten werden in die automatisierte Make-Pipeline geladen.
            </p>

            {/* Event Type */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                Ereignistyp / Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-300 rounded-lg p-2.5 text-xs outline-none transition cursor-pointer"
                disabled={isRunning}
              >
                <option value="Spielday-Sieg (Full-Time Victory)">🏆 Spielday-Sieg (Full-Time Victory)</option>
                <option value="Pressekonferenz (Press Conference)">🎤 Pressekonferenz (Press Conference)</option>
                <option value="Transfer-Verkündung (Transfer Announcement)">⚽ Transfer-Verkündung (Transfer)</option>
                <option value="Sponsoring-Deal (Partnership Release)">🤝 Sponsoring-Deal (Partnership)</option>
              </select>
            </div>

            {/* Core Data */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                Kerndaten / Core Event Data
              </label>
              <textarea
                value={coreData}
                onChange={(e) => setCoreData(e.target.value)}
                className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-200 rounded-lg p-2.5 text-xs outline-none resize-none transition"
                placeholder="Details zum Spielverlauf, Torschützen, Statistiken..."
                disabled={isRunning}
              />
            </div>

            {/* RAG Scope */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                RAG-Scope (Wissens-Quelle)
              </label>
              <input
                type="text"
                value={ragScope}
                onChange={(e) => setRagScope(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-200 rounded-lg p-2.5 text-xs outline-none transition"
                placeholder="Z.B. Squad Statistics & Match Reports"
                disabled={isRunning}
              />
            </div>

            {/* Target Channels */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block mb-1">
                Zielkanäle / Target Channels
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableChannels.map((ch) => {
                  const active = channels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChannelToggle(ch)}
                      className={`py-2 px-2.5 rounded-lg text-[10.5px] border font-semibold transition cursor-pointer text-center ${
                        active
                          ? "bg-fcb-red/10 border-fcb-red text-fcb-red shadow-sm"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300"
                      }`}
                      disabled={isRunning}
                    >
                      {ch === "Instagram" && "📸 Instagram"}
                      {ch === "LinkedIn" && "💼 LinkedIn"}
                      {ch === "YouTube" && "🎥 YouTube"}
                      {ch === "X/Twitter" && "🐦 X/Twitter"}
                      {ch === "TikTok" && "🎵 TikTok"}
                      {ch === "FCB App" && "📱 FCB App"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deterministische Kanal-Routing-Matrix (Make.com) */}
            <div className="space-y-2 bg-slate-950/80 border border-slate-900 rounded-xl p-3 text-left">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider block flex items-center gap-1.5">
                <FileJson className="h-3.5 w-3.5 text-fcb-gold" />
                Make.com Variable Matrix (Kanal-Routing)
              </span>
              
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono mt-1 text-slate-400">
                <div className="border border-slate-900 bg-slate-900/30 p-1.5 rounded">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">Zielkanal</div>
                  <div className="text-white font-bold mt-0.5">{channels[0] || "Instagram"}</div>
                </div>
                <div className="border border-slate-900 bg-slate-900/30 p-1.5 rounded">
                  <div className="text-[8px] text-slate-500 font-bold uppercase">Fokus / Besonderheit</div>
                  <div className="text-emerald-400 font-bold mt-0.5 truncate text-[9px]" title={
                    (channels[0] === "Instagram" && "Visuelle Hook") ||
                    (channels[0] === "LinkedIn" && "Professioneller Stil") ||
                    (channels[0] === "YouTube" && "Hook (0-15s), Script 90s, CTA") ||
                    "Standard Layout"
                  }>
                    {(channels[0] === "Instagram" && "Visuelle Hook") ||
                     (channels[0] === "LinkedIn" && "Professioneller Stil") ||
                     (channels[0] === "YouTube" && "Hook (0-15s), Script 90s, CTA") ||
                     "Standard Layout"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px] text-slate-300 mt-2">
                <div className="border border-slate-900 bg-slate-900/10 p-1.5 rounded flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 font-bold block uppercase mb-0.5">{"{{LIMIT}}"}</span>
                  <span className="text-white font-bold bg-slate-900 px-1 py-0.5 rounded-sm">
                    {(channels[0] === "Instagram" && "150 Zeichen") ||
                     (channels[0] === "LinkedIn" && "700 Zeichen") ||
                     (channels[0] === "YouTube" && "Dynamisch (Skript)") ||
                     "500 Zeichen"}
                  </span>
                </div>
                <div className="border border-slate-900 bg-slate-900/10 p-1.5 rounded flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 font-bold block uppercase mb-0.5">{"{{EMOJI}}"}</span>
                  <span className={`font-bold px-1 py-0.5 rounded-sm ${
                    (channels[0] === "LinkedIn" ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20")
                  }`}>
                    {channels[0] === "LinkedIn" ? "false" : "true"}
                  </span>
                </div>
                <div className="border border-slate-900 bg-slate-900/10 p-1.5 rounded flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 font-bold block uppercase mb-0.5">{"{{HASHTAGS}}"}</span>
                  <span className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded-sm">
                    {(channels[0] === "Instagram" && "2") ||
                     (channels[0] === "LinkedIn" && "0") ||
                     (channels[0] === "YouTube" && "-") ||
                     "3"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel & Trigger */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide block text-left">
                QS-Pfad erzwingen (Simulationstest):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setForcePath("auto")}
                  className={`py-1 rounded text-[9px] font-mono border transition ${
                    forcePath === "auto"
                      ? "bg-slate-800 text-white border-slate-700"
                      : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300"
                  }`}
                >
                  🤖 Auto-AI
                </button>
                <button
                  onClick={() => setForcePath("force_publish")}
                  className={`py-1 rounded text-[9px] font-mono border transition ${
                    forcePath === "force_publish"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300"
                  }`}
                  title="S >= 95: Auto-Freigabe"
                >
                  🟢 S &ge; 95 (Publish)
                </button>
                <button
                  onClick={() => setForcePath("force_stop")}
                  className={`py-1 rounded text-[9px] font-mono border transition ${
                    forcePath === "force_stop"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                      : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300"
                  }`}
                  title="80 <= S < 95: Stopp für Review"
                >
                  🟡 80&le;S&lt;95 (Stop)
                </button>
                <button
                  onClick={() => setForcePath("force_re_prompt")}
                  className={`py-1 rounded text-[9px] font-mono border transition ${
                    forcePath === "force_re_prompt"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                      : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300"
                  }`}
                  title="S < 80: Re-prompt & Eskalation"
                >
                  🔴 S &lt; 80 (Loop Fail)
                </button>
              </div>
            </div>

            <button
              onClick={runQAWorkflow}
              disabled={isRunning || channels.length === 0 || !coreData.trim()}
              className="w-full bg-fcb-red hover:bg-red-700 disabled:bg-slate-950 disabled:border-slate-900 disabled:text-slate-600 border border-transparent text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer uppercase tracking-wider shadow-lg shadow-fcb-red/10"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Pipelines laufen...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Make.com Pipeline starten</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Strategisches Konzept: Multi-Agenten-Qualitätssicherung & Video-Content-Pipeline */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="h-5 w-5 text-fcb-gold" />
            <h3 className="font-bold text-white font-display text-xs uppercase tracking-wide">
              Strategisches Konzept Blueprint
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Offizielles Architektur- und Prompt-Engineering-Konzept für die Multi-Agenten-Qualitätssicherung und automatisierte YouTube-Content-Produktion bei FC Bayern München.
          </p>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-2 text-[10px] text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Dateiname:</span>
              <span className="text-slate-300">Strategisches_Konzept_QA.pdf</span>
            </div>
            <div className="flex justify-between">
              <span>Umfang:</span>
              <span className="text-slate-300">5 Seiten (Kompiliert)</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold">Produktionsbereit</span>
            </div>
          </div>
          <button
            onClick={handleDownloadStrategicConceptPDF}
            className="w-full bg-slate-950 hover:bg-slate-900 text-fcb-gold hover:text-white border border-slate-800 hover:border-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>PDF-Blueprint Herunterladen</span>
          </button>
        </div>
      </div>

      {/* 2. AUTOMATION & MULTI-AGENT-QS VISUALIZER (Span 5) */}
      <div className="xl:col-span-5 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 uppercase font-semibold">
              <Layers className="h-4 w-4 text-cyan-400" /> Multi-Agent Governance Node
            </span>
            <span className="bg-slate-950 border border-slate-850 text-[10px] px-2 py-0.5 rounded-md font-mono text-fcb-gold">
              Make.com Router Active
            </span>
          </div>

          <div className="flex-1 space-y-4">
            {activeStep === -1 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-20">
                <ShieldCheck className="h-10 w-10 mb-3 opacity-30 text-fcb-gold" />
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">QS-Pipeline bereit</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                  Starten Sie den Make-Workflow links, um die vollautomatische Multi-Agenten-Prüfung zu starten.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* Visual Pipeline Steps */}
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-900">
                  {[
                    { label: "Ingest", icon: Send },
                    { label: "RAG", icon: Database },
                    { label: "Draft", icon: Sparkles },
                    { label: "Audit", icon: ShieldCheck },
                    { label: "Outcome", icon: Layers }
                  ].map((step, idx) => {
                    const isDone = activeStep > idx;
                    const isActive = activeStep === idx;
                    
                    let bg = "bg-transparent text-slate-500";
                    if (isDone) bg = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    if (isActive) bg = "bg-fcb-red text-white font-bold animate-pulse";

                    return (
                      <div key={idx} className={`p-1 rounded-lg flex flex-col items-center text-center transition ${bg}`}>
                        <step.icon className="h-3.5 w-3.5 mb-1" />
                        <span className="text-[9px] font-mono uppercase font-bold tracking-tight">{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Animated Loop Tracking Logs */}
                {repromptingLogs.length > 0 && (
                  <div className="space-y-1.5 bg-rose-950/15 border border-rose-900/40 p-2.5 rounded-xl text-[10px] font-mono text-rose-300">
                    <span className="font-bold uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-400" /> Re-Prompting Cycles:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {repromptingLogs.map((log, lIdx) => (
                        <li key={lIdx}>{log}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Make.com Orchestrator Flow Scenario 1 View */}
                {activeStep >= 3 && currentResult && (
                  <div className="space-y-4">
                    
                    {/* Step 1: Input Weiche (Make.com Router) */}
                    <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 font-mono text-[9px] uppercase font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Node 1: Make.com Router (Input-Weiche)
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-bold">SUCCESS</span>
                      </div>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed">
                        {currentResult.makeRouting || `[Make.com Router] Ingested raw event payload. Segmenting by Channel to Insta queue.`}
                      </p>
                    </div>

                    {/* Step 2: Content Generation (Claude 3.5 Sonnet) */}
                    <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-400 font-mono text-[9px] uppercase font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                          Node 2: Claude 3.5 Generation (Asynchron)
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-bold">100% LOADED</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 font-mono text-[9.5px] text-slate-400">
                        <div className="flex justify-between border-b border-slate-900 pb-1">
                          <span>System-Prompt:</span>
                          <span className="text-slate-300 text-right max-w-[170px] truncate">{currentResult.makeGeneration?.systemPrompt || "Insta-Style (Max 150 chars)"}</span>
                        </div>
                        {currentResult.makeChannelRoutingParams && (
                          <div className="border-b border-slate-900 pb-1.5 pt-1 bg-slate-900/10 px-1 rounded flex flex-col gap-1">
                            <span className="text-[8px] uppercase font-bold text-slate-500 text-left">Make.com Injected Metadata Variables:</span>
                            <div className="grid grid-cols-3 gap-1 text-[8.5px] text-slate-300 font-mono text-center">
                              <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-900">LIMIT: {currentResult.makeChannelRoutingParams.limit}</span>
                              <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-900">EMOJI: {currentResult.makeChannelRoutingParams.emoji}</span>
                              <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-900">HASHTAGS: {currentResult.makeChannelRoutingParams.hashtags}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between pt-0.5">
                          <span>RAG Knowledge Source:</span>
                          <span className="text-slate-300 text-right max-w-[170px] truncate">{currentResult.makeGeneration?.ragContextApplied || `Scope: [${ragScope}]`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Parallel / Unabhängiges Review (Cross-Validation) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                          Node 3: Unabhängiges Review (Cross-Validation)
                        </span>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8.5px] font-mono px-2 py-0.5 rounded-md font-bold">
                          Zero-Sharing Rule Active
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Agent 1 (GPT-4o Audit) */}
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-cyan-400 font-bold uppercase flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              {currentResult.agent1.name || "GPT-4o Audit"} (40% Weight)
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              currentResult.agent1.score >= 85 ? "text-green-400 bg-green-500/5" : "text-rose-400 bg-rose-500/5"
                            }`}>
                              Score: {currentResult.agent1.score}/100
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-sans italic">
                            "{currentResult.agent1.reason}"
                          </p>
                        </div>

                        {/* Agent 2 (Grok-2 Fact-Check) */}
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-fcb-gold font-bold uppercase flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-fcb-gold" />
                              {currentResult.agent2.name || "Grok-2 Fact-Check"} (35% Weight)
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              currentResult.agent2.score >= 85 ? "text-green-400 bg-green-500/5" : "text-rose-400 bg-rose-500/5"
                            }`}>
                              Score: {currentResult.agent2.score}/100
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-sans italic">
                            "{currentResult.agent2.reason}"
                          </p>
                        </div>

                        {/* Agent 3 (Gemini Brand Guard) */}
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-violet-400 font-bold uppercase flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                              {currentResult.agent3.name || "Gemini Brand Guard"} (25% Weight)
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              currentResult.agent3.score >= 85 ? "text-green-400 bg-green-500/5" : "text-rose-400 bg-rose-500/5"
                            }`}>
                              Score: {currentResult.agent3.score}/100
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-sans italic">
                            "{currentResult.agent3.reason}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Aggregation & Scoring (Gemini Aggregator Node) */}
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                          Node 4: Gemini Aggregator & Score (S)
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">
                          S = (GPT*0.4) + (Grok*0.35) + (Gemini*0.25)
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black font-mono text-fcb-gold">
                            {currentResult.weightedScore}
                          </span>
                          <span className="text-xs text-slate-500">/ 100</span>
                        </div>

                        {/* Outcome badge */}
                        {currentResult.actionTaken === "APPROVE" && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10.5px] font-mono font-bold px-3 py-1 rounded-lg uppercase flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Auto-Publishing (S &ge; 95)
                          </span>
                        )}
                        {currentResult.actionTaken === "STOP" && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10.5px] font-mono font-bold px-3 py-1 rounded-lg uppercase flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 text-amber-400" />
                            Human-in-the-Loop [80, 95)
                          </span>
                        )}
                        {currentResult.actionTaken === "ESCALATE" && (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10.5px] font-mono font-bold px-3 py-1 rounded-lg uppercase flex items-center gap-1.5">
                            <BadgeAlert className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                            Loop Halt (S &lt; 80)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step 5: Datenbank-Schnittstelle & Webhook Link for Human Approval */}
                    <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl space-y-2 text-[11px]">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-emerald-400 font-mono text-[9px] uppercase font-bold flex items-center gap-1">
                          <Database className="h-3.5 w-3.5 text-emerald-400" />
                          Node 5: Database & Approval Webhook
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-500">Szenario 1 Complete</span>
                      </div>
                      <p className="text-slate-400 text-[10.5px] font-mono leading-relaxed">
                        {currentResult.dbStatus || `[Database Interface] Audit record successfully saved in document store.`}
                      </p>
                      
                      {/* Webhook Button link triggering Scenario 2 */}
                      {currentResult.actionTaken === "STOP" && (
                        <div className="pt-1.5 space-y-2">
                          <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850 flex items-center justify-between text-[10.5px] font-mono">
                            <span className="text-slate-400 truncate max-w-[190px]">
                              {currentResult.approvalWebhookLink || `https://eu1.make.com/webhooks/approval/...`}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(currentResult.approvalWebhookLink || "");
                                onAddLog({
                                  id: `webhook-copy-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "SUCCESS",
                                  source: "Make.com Webhook",
                                  message: "Copied Human Approval Webhook URL to clipboard! Use this to bypass the Make.com 45min limit."
                                });
                              }}
                              className="text-fcb-gold hover:text-white transition px-1.5 py-0.5 rounded border border-slate-800 bg-slate-950 text-[10px] cursor-pointer"
                            >
                              Kopieren
                            </button>
                          </div>

                          <button
                            onClick={triggerScenario2Approval}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Szenario 2 Triggeren (Human Approval Signal senden)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rendered Draft Caption Text Output */}
                    <div className="space-y-1 text-[11px]">
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                        Generierter Social-Media Post:
                      </span>
                      <p className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-slate-200 leading-relaxed italic">
                        "{currentResult.draft}"
                      </p>
                    </div>

                    {/* Escalate / Manual Review Trigger buttons */}
                    {currentResult.actionTaken === "STOP" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={triggerScenario2Approval}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Händisch freigeben (Approve Post)
                        </button>
                        <button
                          onClick={() => {
                            setForcePath("force_re_prompt");
                            runQAWorkflow();
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Fehlerhaftes Re-Prompting
                        </button>
                      </div>
                    )}

                    {/* Error Log Report Viewer (Root-Cause-Analyse) */}
                    {currentResult.errorLog && (
                      <div className="bg-slate-950 border border-rose-950/40 rounded-xl p-3.5 font-mono text-[10.5px] text-left text-rose-300 space-y-2">
                        <div className="flex items-center gap-1 text-xs text-rose-400 font-bold border-b border-rose-950/40 pb-1.5">
                          <Terminal className="h-4 w-4" />
                          <span>FEHLERPROTOKOLL (Root-Cause-Analyse)</span>
                        </div>
                        <pre className="whitespace-pre-wrap leading-relaxed select-text">
                          {currentResult.errorLog}
                        </pre>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. OUTPUT-LAYER: SCHEMAS & SYNTHESIS (Span 3) */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* JSON / Make / Interfaces Tab */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between min-h-[310px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
              <span className="text-[10px] font-mono text-fcb-gold uppercase font-bold flex items-center gap-1">
                <FileJson className="h-3.5 w-3.5 text-fcb-gold" /> Automation Specs
              </span>
              
              <div className="flex gap-1 bg-slate-950 p-0.5 rounded-md border border-slate-900">
                <button
                  onClick={() => setJsonTab("make")}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium transition cursor-pointer uppercase ${
                    jsonTab === "make" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Make JSON
                </button>
                <button
                  onClick={() => setJsonTab("interfaces")}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium transition cursor-pointer uppercase ${
                    jsonTab === "interfaces" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  TS Types
                </button>
                <button
                  onClick={() => setJsonTab("prompts")}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium transition cursor-pointer uppercase ${
                    jsonTab === "prompts" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Prompts
                </button>
              </div>
            </div>
 
            {/* Code Box */}
            <div className="relative bg-slate-950 rounded-lg p-2.5 border border-slate-850 font-mono text-[9px] text-slate-300 leading-normal max-h-[190px] overflow-y-auto text-left select-text scrollbar-thin">
              <button
                onClick={() => handleCopyJSON(
                  jsonTab === "make" 
                    ? makeWorkflowJSON 
                    : jsonTab === "interfaces" 
                    ? tsInterfacesCode 
                    : engineeringPromptsText
                )}
                className="absolute top-1.5 right-1.5 p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Copy Code"
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              </button>
              <pre className="whitespace-pre-wrap">
                {jsonTab === "make" 
                  ? makeWorkflowJSON 
                  : jsonTab === "interfaces" 
                  ? tsInterfacesCode 
                  : engineeringPromptsText}
              </pre>
            </div>
          </div>
 
          <div className="text-[9.5px] text-slate-500 text-left font-sans italic pt-1 border-t border-slate-800/40">
            {jsonTab === "make" && "This JSON is used by the Make.com Scenario 1 router nodes to dispatch tasks to Review Agents."}
            {jsonTab === "interfaces" && "TypeScript interfaces mapping the full historical score records for persistent auditing logs."}
            {jsonTab === "prompts" && "Deterministische Produktions-Prompts für Claude, GPT-4o, Grok-2 und Gemini."}
          </div>
        </div>

        {/* Output rendering & Media Player (MP4 OpenVoice / FFmpeg) */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-cyan-400" />
              <h3 className="font-bold text-white font-display text-[11px] uppercase tracking-wide">
                Output-Layer: Media Pipeline
              </h3>
            </div>
            
            <div className="flex gap-1 bg-slate-950 p-0.5 rounded-md border border-slate-900">
              <button
                onClick={() => setPipelineViewMode("player")}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium transition cursor-pointer uppercase ${
                  pipelineViewMode === "player" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Live Player
              </button>
              <button
                onClick={() => setPipelineViewMode("deepdive")}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium transition cursor-pointer uppercase ${
                  pipelineViewMode === "deepdive" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Deep-Dive
              </button>
            </div>
          </div>

          {pipelineViewMode === "player" ? (
            <>
              <p className="text-[10px] text-slate-400 leading-normal text-left">
                Nach erfolgreicher QS-Freigabe generiert das System eine synthetische Audiospur mit OpenVoice (Deutsch) und rendert den Post in einen MP4-Container für den Zielkanal.
              </p>

              {/* Render State Area */}
              {isRendering ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center space-y-3">
                  <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-mono text-cyan-400 font-bold uppercase block">
                      {renderingProgress < 30 && "ChromaDB RAG Abruf..."}
                      {renderingProgress >= 30 && renderingProgress < 75 && "OpenVoice v2 Synthese..."}
                      {renderingProgress >= 75 && "FFmpeg MP4 Compositing..."}
                    </span>
                    <div className="w-full bg-slate-900 rounded-full h-1">
                      <div className="bg-cyan-400 h-1 rounded-full transition-all duration-300" style={{ width: `${renderingProgress}%` }}></div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{renderingProgress}% abgeschlossen</span>
                  </div>
                </div>
              ) : videoRendered && currentResult ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-3">
                  <div className="aspect-video bg-slate-900 rounded-lg relative overflow-hidden flex flex-col items-center justify-center border border-slate-800">
                    {/* Simulated MP4 Video Player */}
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 filter blur-[1px]" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&auto=format&fit=crop')" }}></div>
                    <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-3 text-center">
                      <AudioLines className={`h-8 w-8 mb-1 text-fcb-gold ${playAudio ? "animate-pulse" : ""}`} />
                      <p className="text-[10px] text-fcb-gold font-bold font-mono uppercase tracking-wider">MiaSanAI Media Renderer</p>
                      <p className="text-[9px] text-slate-300 font-mono mt-0.5 max-w-[160px] truncate">{eventType}</p>
                    </div>
                  </div>

                  {/* Audio visual player controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPlayAudio(!playAudio)}
                      className={`flex-1 py-1.5 px-3 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        playAudio ? "bg-fcb-red text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      <AudioLines className="h-3 w-3" />
                      <span>{playAudio ? "Audio stoppen" : "OpenVoice abspielen"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900 text-center py-6 text-slate-600">
                  <AudioLines className="h-6 w-6 mx-auto opacity-35 mb-2" />
                  <p className="text-[9px] font-mono uppercase font-bold tracking-wider">Rendering wartet...</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Startet nach erfolgreicher automatischer S &ge; 95 Freigabe oder händischem Override.</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block text-left">
                🤖 Automatisierte YouTube-Video-Pipeline (Deep-Dive)
              </span>

              {/* Steps selection */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setExpandedPipelineDetail("rag")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between h-[64px] ${
                    expandedPipelineDetail === "rag"
                      ? "bg-cyan-950/40 border-cyan-500/40 text-white"
                      : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <Database className={`h-3.5 w-3.5 ${expandedPipelineDetail === "rag" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="text-[8.5px] font-bold font-mono uppercase tracking-wide leading-tight mt-1">4.1 RAG Storage</span>
                </button>
                <button
                  onClick={() => setExpandedPipelineDetail("audio")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between h-[64px] ${
                    expandedPipelineDetail === "audio"
                      ? "bg-cyan-950/40 border-cyan-500/40 text-white"
                      : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <AudioLines className={`h-3.5 w-3.5 ${expandedPipelineDetail === "audio" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="text-[8.5px] font-bold font-mono uppercase tracking-wide leading-tight mt-1">4.2 OpenVoice v2</span>
                </button>
                <button
                  onClick={() => setExpandedPipelineDetail("compositing")}
                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between h-[64px] ${
                    expandedPipelineDetail === "compositing"
                      ? "bg-cyan-950/40 border-cyan-500/40 text-white"
                      : "bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  <Video className={`h-3.5 w-3.5 ${expandedPipelineDetail === "compositing" ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="text-[8.5px] font-bold font-mono uppercase tracking-wide leading-tight mt-1">4.3 FFmpeg Engine</span>
                </button>
              </div>

              {/* Step detail details card */}
              <AnimatePresence mode="wait">
                {expandedPipelineDetail === "rag" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-left space-y-2 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[10px]">
                      <Database className="h-3.5 w-3.5" />
                      <span>CHROMADB RAG WISSENSDATENBANK</span>
                    </div>
                    <div className="space-y-1.5 font-sans text-slate-300">
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Infrastruktur:</span>
                        Selbstgehostete, vollständig DSGVO-konforme Vektordatenbank (ChromaDB) zur Minimierung externer Datenlecks.
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Inhalte der Datenbank:</span>
                        Pressemitteilungen, Spielberichte, offizieller Tone-of-Voice Guide und bayerische Sponsoren-Spezifikationen.
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Abruf-Logik:</span>
                        Ereignisgesteuertes Cosine-Similarity Ranking. Extrahiert die Top-3 semantischen Chunks in Echtzeit und übergibt sie an Claude.
                      </div>
                    </div>
                  </motion.div>
                )}

                {expandedPipelineDetail === "audio" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-left space-y-2 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[10px]">
                      <AudioLines className="h-3.5 w-3.5" />
                      <span>AUDIO-SYNTHESE (OPENVOICE V2)</span>
                    </div>
                    <div className="space-y-1.5 font-sans text-slate-300">
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Input Ingest:</span>
                        Das von Claude erstellte YouTube-Skript (aufgeteilt in Hook, Body, CTA) wird an die Text-to-Speech Engine geleitet.
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Voice Cloning:</span>
                        Ein vordefiniertes neuronales Sprachmodell klont die Sprecherstimme unter Beibehaltung natürlicher bayerischer Intonationen.
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● Output-Format:</span>
                        Multilinguales (DE/EN) WAV-Audio in Studioqualität (44.1 kHz, Stereo, 16-Bit) für rauschfreie Medienproduktion.
                      </div>
                    </div>
                  </motion.div>
                )}

                {expandedPipelineDetail === "compositing" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-left space-y-2 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[10px]">
                      <Video className="h-3.5 w-3.5" />
                      <span>VIDEO-COMPOSITING (FFMPEG) & UPLOAD</span>
                    </div>
                    <div className="space-y-1.5 font-sans text-slate-300">
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● FFmpeg-Engine Muxing:</span>
                        Kombiniert die WAV-Audiodatei mit FC-Bayern-Bildern oder Videoclips.
                        <code className="block bg-slate-900 p-1 rounded font-mono text-[8px] mt-1 text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-none">
                          ffmpeg -i audio.wav -i clip.mp4 -c:v libx264 -pix_fmt yuv420p output.mp4
                        </code>
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[9px] uppercase text-slate-400">● YouTube API Auto-Upload:</span>
                        Vollautomatischer Upload der fertigen MP4-Datei via YouTube Data API v3 mit optimiertem Title, Tags und Description.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
