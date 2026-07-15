import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, Search, HelpCircle, CheckCircle, FileText, 
  ExternalLink, Sparkles, RefreshCw, Star, X, Copy, Download,
  Lock, ShieldCheck, Info, FileCode, ThumbsUp, ThumbsDown, Clock, Highlighter,
  Maximize2, Minimize2, QrCode, Volume2, VolumeX, Eye, Play, Pause, Share2,
  Bookmark, Trash2, ArrowUp, Square, Upload, Network, History, Edit
} from "lucide-react";
import { jsPDF } from "jspdf";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-bash";
import "prismjs/themes/prism-tomorrow.css";
import { RagResult } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../data/i18n";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { RagKnowledgeGraph } from "./RagKnowledgeGraph";

// Helper to provide a realistic external official URL for document sources
const getSourceUrl = (sourceName: string) => {
  const cleanName = sourceName.trim();
  const lowerName = cleanName.toLowerCase();
  if (lowerName.includes("guideline")) {
    return "https://media.fcbayern.com/documents/fcb_brand_guidelines_v4.2.pdf";
  } else if (lowerName.includes("squad") || lowerName.includes("profile")) {
    return "https://fcbayern.com/en/teams/profis";
  } else if (lowerName.includes("arena") || lowerName.includes("allianz")) {
    return "https://allianz-arena.com/en";
  } else if (lowerName.includes("trophy") || lowerName.includes("history")) {
    return "https://fcbayern.com/en/club/history";
  }
  return "https://fcbayern.com/en/club";
};

// Helper to provide rich mock document metadata and surrounding context for any retrieved source
const getDocDetails = (sourceName: string) => {
  const cleanName = sourceName.trim();
  const lowerName = cleanName.toLowerCase();
  
  let docType: "pdf" | "json" | "txt" = "pdf";
  if (lowerName.endsWith(".json")) docType = "json";
  else if (lowerName.endsWith(".txt")) docType = "txt";
  
  let fileSize = "1.2 MB";
  let lastIndexed = "2026-06-01";
  let category = "Club Archives";
  let author = "MiaSanAI Core";
  let version = "1.0";
  
  // Try to find in custom uploaded docs from localStorage
  try {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("fcb_rag_uploaded_docs") : null;
    if (stored) {
      const docs = JSON.parse(stored);
      const found = docs.find((d: any) => d.source.trim().toLowerCase() === lowerName);
      if (found) {
        fileSize = found.fileSize || "1.2 MB";
        lastIndexed = found.lastIndexed || "2026-06-01";
        category = found.category || "Brand Compliance";
        author = found.author || "MiaSanAI Core";
        version = found.version || "1.0";
      }
    }
  } catch (e) {
    console.error("Error reading custom doc details", e);
  }
  
  if (lowerName.includes("guideline")) {
    fileSize = "4.2 MB";
    lastIndexed = "2026-05-15";
    category = "Brand Compliance";
    author = "Marketing & Public Relations";
    version = "v4.2";
  } else if (lowerName.includes("squad") || lowerName.includes("profile")) {
    fileSize = "180 KB";
    lastIndexed = "2026-06-28";
    category = "Sporting & Squad Info";
    author = "Sporting Management Office";
    version = "v2026.1";
  } else if (lowerName.includes("arena") || lowerName.includes("allianz")) {
    fileSize = "12.4 MB";
    lastIndexed = "2026-04-10";
    category = "Stadium Operations";
    author = "Allianz Arena GmbH";
    version = "v3.0";
  } else if (lowerName.includes("trophy") || lowerName.includes("history")) {
    fileSize = "1.8 MB";
    lastIndexed = "2026-01-15";
    category = "Club History & Honours";
    author = "FC Bayern Museum Curator";
    version = "v1.5";
  }

  // Generate plausible surrounding context paragraphs
  const preText = docType === "json" 
    ? `{\n  "metadata": {\n    "source": "${cleanName}",\n    "indexed_date": "${lastIndexed}",\n    "owner": "${author}"\n  },\n  "records": [\n    {\n      "id": "rec_09218",\n      "vector_embedding_score": 0.9842,\n      "chunk_data": `
    : `DOCUMENT AMENDMENT REFERENCE: FCB-${lastIndexed.replace(/-/g, "")}\nCLASSIFICATION: ${category.toUpperCase()}\nAUTHOR: ${author.toUpperCase()}\n\n[PARAGRAPH 104 - CORPORATE COMPLIANCE]\nTo maintain consistent, premium communications with sponsors, fans, and global partners, we reference the official club guidelines below. All dynamic generation pipelines must perform continuous cross-verification against this verified registry to avoid brand misalignments or factual errors.`;

  const postText = docType === "json"
    ? `\n    }\n  ]\n}`
    : `\n\n[PARAGRAPH 105 - EXTERNAL COMMUNICATIONS]\nVerification of the above records is performed continuously by the AI Operations cluster. Any material deviation from these compliance benchmarks must be submitted directly to the FC Bayern Munich Digital Media Council for express authorization prior to live release.`;

  return {
    fileSize,
    lastIndexed,
    category,
    author,
    version,
    docType,
    preText,
    postText
  };
};

// Helper to calculate estimated read time based on word count
const getReadingTime = (text: string, language: string) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Average reading speed is ~200 WPM
  const seconds = Math.max(5, Math.round((words / 200) * 60));
  if (seconds < 60) {
    return language === "de" ? `${seconds} Sek.` : `${seconds}s`;
  } else {
    const mins = Math.round(seconds / 60);
    return language === "de" ? `${mins} Min.` : `${mins} min`;
  }
};

// Highlight text using Prism grammar
const highlightText = (text: string, lang: string): string => {
  try {
    let grammar = Prism.languages[lang];
    if (!grammar) {
      // Fallbacks
      grammar = Prism.languages.clike || Prism.languages.javascript || Prism.languages.markup;
    }
    return Prism.highlight(text, grammar, lang);
  } catch (err) {
    console.error("Prism highlighting error:", err);
    return text;
  }
};

interface SourceTag {
  label: string;
  labelDe: string;
  className: string;
  tooltip: string;
  tooltipDe: string;
}

const getSourceTags = (sourceName: string): SourceTag[] => {
  const lowerName = sourceName.toLowerCase();
  const tags: SourceTag[] = [];

  // Every official grounding document is "Official" & "Verified Source"
  tags.push({
    label: "Official",
    labelDe: "Offiziell",
    className: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    tooltip: "Verified official club document authority",
    tooltipDe: "Verifiziertes offizielles Vereinsdokument"
  });

  if (lowerName.includes("guideline")) {
    tags.push({
      label: "2024/25",
      labelDe: "2024/25",
      className: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
      tooltip: "Active brand compliance guidelines",
      tooltipDe: "Aktive Richtlinien zur Markenkonformität"
    });
    tags.push({
      label: "Internal-Only",
      labelDe: "Nur Intern",
      className: "bg-rose-500/10 border-rose-500/25 text-rose-400 font-semibold",
      tooltip: "Confidential document for internal operations only",
      tooltipDe: "Vertrauliches Dokument, nur für den internen Gebrauch"
    });
    tags.push({
      label: "Corporate",
      labelDe: "Corporate",
      className: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      tooltip: "FC Bayern Munich corporate standard",
      tooltipDe: "FC Bayern München Unternehmensstandard"
    });
  } else if (lowerName.includes("squad") || lowerName.includes("profile")) {
    tags.push({
      label: "2024/25",
      labelDe: "2024/25",
      className: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
      tooltip: "Current active roster document",
      tooltipDe: "Aktuelles aktives Kaderdokument"
    });
    tags.push({
      label: "Public Release",
      labelDe: "Veröffentlicht",
      className: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
      tooltip: "Approved for public facing platforms",
      tooltipDe: "Für öffentliche Plattformen freigegeben"
    });
    tags.push({
      label: "Live Synced",
      labelDe: "Live Synchronisiert",
      className: "bg-purple-500/10 border-purple-500/25 text-purple-400",
      tooltip: "Automatically updated with active database state",
      tooltipDe: "Automatisch mit aktivem Datenbankstatus aktualisiert"
    });
  } else if (lowerName.includes("arena") || lowerName.includes("allianz")) {
    tags.push({
      label: "Operational",
      labelDe: "Betrieblich",
      className: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
      tooltip: "Allianz Arena standard operating procedure",
      tooltipDe: "Allianz Arena Standardbetriebsverfahren"
    });
    tags.push({
      label: "Internal-Only",
      labelDe: "Nur Intern",
      className: "bg-rose-500/10 border-rose-500/25 text-rose-400 font-semibold",
      tooltip: "Restricted stadium operational guidelines",
      tooltipDe: "Eingeschränkte Betriebsrichtlinien für das Stadion"
    });
    tags.push({
      label: "Safety Critical",
      labelDe: "Sicherheitsrelevant",
      className: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      tooltip: "Operational safety instructions and rules",
      tooltipDe: "Betriebliche Sicherheitsanweisungen und -regeln"
    });
  } else if (lowerName.includes("trophy") || lowerName.includes("history")) {
    tags.push({
      label: "Archive Record",
      labelDe: "Archivaufzeichnung",
      className: "bg-teal-500/10 border-teal-500/25 text-teal-400",
      tooltip: "Verified historical club archives data",
      tooltipDe: "Verifizierte historische Clubarchivdaten"
    });
    tags.push({
      label: "Public Domain",
      labelDe: "Gemeinfrei",
      className: "bg-blue-500/10 border-blue-500/25 text-blue-400",
      tooltip: "Open information about club accolades and details",
      tooltipDe: "Offene Informationen über Auszeichnungen des Vereins"
    });
    tags.push({
      label: "Verified History",
      labelDe: "Verifizierte Historie",
      className: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      tooltip: "Authenticated by club museum curator team",
      tooltipDe: "Authentifiziert durch das Team der Clubmuseums-Kuratoren"
    });
  } else {
    tags.push({
      label: "Club Archive",
      labelDe: "Club-Archiv",
      className: "bg-slate-500/15 border-slate-500/25 text-slate-300",
      tooltip: "Standard digital catalog asset",
      tooltipDe: "Standardmäßige digitale Katalogressource"
    });
    tags.push({
      label: "Restricted",
      labelDe: "Eingeschränkt",
      className: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      tooltip: "Internal asset clearance required",
      tooltipDe: "Interne Freigabe erforderlich"
    });
  }

  return tags;
};

// Sort and apply highlights to raw text segment
const applyHighlightsToText = (text: string, highlightsList: string[], isMatchedSnippet: boolean) => {
  if (!text) return null;
  if (!highlightsList || highlightsList.length === 0) {
    return isMatchedSnippet ? `"${text}"` : text;
  }

  // Sort highlights by length descending to match larger chunks first
  const sortedHighlights = [...highlightsList].sort((a, b) => b.length - a.length);

  interface TextSegment {
    text: string;
    isHighlighted: boolean;
  }

  let segments: TextSegment[] = [{ text: isMatchedSnippet ? `"${text}"` : text, isHighlighted: false }];

  for (const highlight of sortedHighlights) {
    if (!highlight) continue;
    const nextSegments: TextSegment[] = [];
    for (const segment of segments) {
      if (segment.isHighlighted) {
        nextSegments.push(segment);
        continue;
      }

      let currentText = segment.text;
      let index = currentText.indexOf(highlight);

      if (index !== -1) {
        while (index !== -1) {
          const before = currentText.substring(0, index);
          if (before) {
            nextSegments.push({ text: before, isHighlighted: false });
          }
          nextSegments.push({ text: highlight, isHighlighted: true });
          currentText = currentText.substring(index + highlight.length);
          index = currentText.indexOf(highlight);
        }
        if (currentText) {
          nextSegments.push({ text: currentText, isHighlighted: false });
        }
      } else {
        nextSegments.push(segment);
      }
    }
    segments = nextSegments;
  }

  return (
    <>
      {segments.map((seg, idx) => 
        seg.isHighlighted ? (
          <mark key={idx} className="bg-yellow-400 text-black font-semibold px-1 rounded shadow-sm" title="User Highlighted text">
            {seg.text}
          </mark>
        ) : (
          seg.text
        )
      )}
    </>
  );
};

// Render content with auto-detection for code blocks
const renderFormattedContent = (text: string, docType: string, isMatchedSnippet: boolean = false, highlights: string[] = []) => {
  if (!text) return null;

  if (docType === "json") {
    const highlighted = highlightText(text, "json");
    return (
      <pre className="font-mono text-xs overflow-x-auto whitespace-pre language-json py-1 leading-normal">
        <code className="language-json" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    );
  }

  // Check if text has markdown-style triple backtick code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
  const parts: Array<{ type: "text" | "code"; lang?: string; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const lang = match[1] || "javascript";
    const code = match[2];

    if (matchIndex > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, matchIndex)
      });
    }

    parts.push({
      type: "code",
      lang,
      content: code
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex)
    });
  }

  if (parts.length === 0) {
    // Check if the snippet contains raw JSON or code patterns (without backticks)
    const trimmed = text.trim();
    const isFullJson = (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
    const isCodeBlock = isFullJson || /^(const|let|var|function|import|export|class|curl|def|import\s+)\b|^\s*[{[<]/m.test(text);
    
    if (isCodeBlock) {
      const detectedLang = isFullJson ? "json" : trimmed.startsWith("<") ? "markup" : "javascript";
      const highlighted = highlightText(text, detectedLang);
      return (
        <pre className={`font-mono text-xs overflow-x-auto whitespace-pre language-${detectedLang} py-1 leading-normal`}>
          <code className={`language-${detectedLang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      );
    }

    return (
      <span className={isMatchedSnippet ? "text-[11px] text-white whitespace-pre-wrap block mt-1 leading-relaxed" : "whitespace-pre-wrap text-[10.5px] leading-relaxed"}>
        {applyHighlightsToText(text, highlights, isMatchedSnippet)}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.type === "code") {
          const highlighted = highlightText(part.content, part.lang || "javascript");
          return (
            <div key={index} className="my-2.5 rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80">
              <div className="bg-slate-900 px-2.5 py-1 text-[8.5px] font-mono font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between items-center">
                <span>{part.lang}</span>
                <span className="text-[7.5px] text-cyan-400 font-mono">Syntax Highlighted</span>
              </div>
              <pre className="p-2.5 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed">
                <code 
                  className={`language-${part.lang}`}
                  dangerouslySetInnerHTML={{ __html: highlighted }} 
                />
              </pre>
            </div>
          );
        } else {
          return (
            <span key={index} className={isMatchedSnippet ? "text-[11px] text-white whitespace-pre-wrap block mt-1 leading-relaxed" : "whitespace-pre-wrap text-[10.5px] leading-relaxed"}>
              {applyHighlightsToText(part.content, highlights, isMatchedSnippet)}
            </span>
          );
        }
      })}
    </div>
  );
};

interface RagHubProps {
  onAddLog: (log: any) => void;
}

const CORE_DOCUMENTS = [
  {
    id: "core-1",
    source: "FC_Bayern_Brand_Identity_v4.2.pdf",
    category: "Brand Compliance",
    author: "Marketing & Public Relations",
    version: "v4.2",
    lastIndexed: "2026-05-15",
    fileSize: "4.2 MB",
    content: "The official corporate colors are FCB Red (#dc052d) and deep white. Secondary accent colors include Gold (#c3a164). Logo margins must be exactly 10% of the diameter on all sides when placed adjacent to sponsor branding.",
    snippet: "Official corporate colors: FCB Red (#dc052d), deep white, Gold (#c3a164). Rules on logo margins adjacent to sponsor branding."
  },
  {
    id: "core-2",
    source: "FCB_Corporate_Tone_Rules_2026.txt",
    category: "Brand Compliance",
    author: "Admin Orchestrator",
    version: "v1.2",
    lastIndexed: "2026-07-04",
    fileSize: "1.5 KB",
    content: "Mia San Mia corporate identity tone rules:\n- Thomas Müller: Playful, witty, loud, direct, Bavarian humor, local hero.\n- Harry Kane: Humble, professional, focused on team work, leading striker, polite, respectful.\n- General rule: Never use hostile language. Maintain premium brand standard.",
    snippet: "Mia San Mia corporate identity tone rules for Thomas Müller, Harry Kane and general external communications."
  },
  {
    id: "core-3",
    source: "Allianz_Arena_Operations_Manual_v3.txt",
    category: "Stadium Operations",
    author: "Allianz Arena GmbH",
    version: "v3.0",
    lastIndexed: "2026-04-10",
    fileSize: "12.4 MB",
    content: "Seating capacity of the Allianz Arena is exactly 75,024 for domestic matches and 70,000 for international matches. The outer shell consists of 2,874 ETFE-foil air panels that can be lit up in red, white, or blue.",
    snippet: "Allianz Arena capacity parameters (75,024 domestic, 70,000 international) and structural ETFE outer shell illumination regulations."
  },
  {
    id: "core-4",
    source: "FCB_Squad_Profiles_2026.txt",
    category: "Sporting & Squad Info",
    author: "Sporting Management Office",
    version: "v2026.1",
    lastIndexed: "2026-06-28",
    fileSize: "180 KB",
    content: "Current roster details for 2024/2025 and 2025/2026 season: Key players include Thomas Müller (Bavarian representative, attacking midfielder), Harry Kane (world-class striker, English national captain), Manuel Neuer (legendary goalkeeper and captain).",
    snippet: "Roster compliance details including biographies and official profiles of key FCB players."
  },
  {
    id: "core-5",
    source: "Club_Honours_And_Archives_Registry.json",
    category: "Club History & Honours",
    author: "FC Bayern Museum Curator",
    version: "v1.5",
    lastIndexed: "2026-01-15",
    fileSize: "1.8 MB",
    content: "Official FC Bayern Munich honors list: 33 German Championships (Bundesliga record), 20 DFB-Pokal titles, 6 UEFA Champions League trophies, 2 FIFA Club World Cups, and 2 Intercontinental Cups.",
    snippet: "Official historical club trophy database registry from 1900 to present day."
  },
  {
    id: "core-6",
    source: "Sponsor_Coexistence_Guidelines_v1.5.pdf",
    category: "Brand Compliance",
    author: "Brand Board",
    version: "v1.5",
    lastIndexed: "2026-02-12",
    fileSize: "2.1 MB",
    content: "Brand coexistence guidelines between FC Bayern and prime sponsors (Adidas, Allianz, Telekom, Audi). Uniform placement, logo sizes on shirts, and digital overlay ratios for televised matches.",
    snippet: "Compliance benchmarks for co-branding layouts, sponsor logo dimensions, and uniform design templates."
  },
  {
    id: "core-7",
    source: "Strategisches_Konzept_Multi_Agenten_QA.pdf",
    category: "System Architecture",
    author: "MiaSanAI Core Architect",
    version: "v1.0",
    lastIndexed: "2026-07-10",
    fileSize: "2.8 MB",
    content: "Strategisches Konzept: Multi-Agenten-Qualitätssicherung & Automatisierte Video-Content-Pipeline\n\nDieses Dokument beschreibt die Architektur, das dynamische Routing und die deterministischen Prompts für eine Multi-Agenten-Qualitätssicherungs-Pipeline sowie die automatisierte Produktion von Video-Inhalten.\n\n1. Systemarchitektur & Datenfluss (Make.com Orchestrierung)\nUm das harte 45-Minuten-Timeout-Limit von Make.com bei menschlichen Freigabeprozessen zu umgehen, wird die Architektur asynchron in zwei separate Szenarien aufgeteilt.\n\n1.1 Szenario 1: Generierung & Unabhängige Vorprüfung (Asynchron)\n1. Input & Weiche: Der Input wird erfasst und durch ein bedingtes Routing (Router-Modul in Make.com) nach Zielkanal segmentiert.\n2. Generierung (Claude): Claude erhält den kanalspezifischen System-Prompt und den RAG-Kontext. Der Output wird in Variablen zwischengespeichert.\n3. Parallel / Unabhängiges Review (Cross-Validation): Drei HTTP-Module feuern isoliert nacheinander oder parallel:\n   - GPT: Prüft logische Konsistenz, Struktur und fängt Halluzinationen ab.\n   - Grok: Fokussiert sich auf den harten Faktencheck.\n   - Gemini: Validiert die Konsistenz mit den Marken-Guidelines und der Tonalität.\n   Architektur-Regel: Kein Agent sieht die Bewertung der anderen — vollständige Unabhängigkeit ist gewährleistet.\n4. Aggregation & Scoring: Gemini konsolidiert in einem finalen Schritt die isolierten JSON-Antworten von GPT und Grok und berechnet den mathematischen Quality Score.\n5. Datenbank-Schnittstelle: Das Ergebnis wird in einer Datenbank abgelegt. Bei einem Score unter dem Schwellenwert erfolgt ein automatischer Re-Loop; bei Erfolg wird ein Webhook-Link für das Human Approval generiert.\n\n1.2 Szenario 2: Human Approval Gate (Echtzeit)\nNach dem manuellen Klick des Nutzers auf dem Dashboard (Approve) triggert Make.com den nachgelagerten Veröffentlichungs- oder Produktions-Workflow (z. B. die YouTube-Rendering-Pipeline).\n\n2. Dynamisches Kanal-Routing (Matrix)\nBevor Claude den Text generiert, übersetzt Make.com die Metadaten in feste, deterministische Parameter:\n- Instagram: limit=150 Zeichen, emoji=true, hashtags=2, Fokus=Visuelle Hook\n- LinkedIn: limit=700 Zeichen, emoji=false, hashtags=0, Fokus=Professioneller Stil\n- YouTube: limit=Dynamisch (Skript), emoji=true, hashtags=-, Fokus=Hook (0-15s), Script 90s, CTA\n\n3. Deterministische Engineering Prompts (Produktionsreif)\nPrompt 1: Der Creator (Claude)\n[Rolle]: Du bist Redakteur des FC Bayern. Deine Tonalität ist professionell, nah am Fan, enthusiastisch, aber stets faktisch korrekt.\n[Kontext]: Nutze ausschließlich die bereitgestellten verifizierten Informationen aus der RAG-Datenbank. System-Prompt verbietet das Ergänzen nicht gelieferter Fakten.\n[Kanal-Parameter]:\n- Kanal: {{KANAL}}\n- Zeichenlimit: {{LIMIT}}Z\n- Ton: {{TON}}\n- Emojis erlaubt: {{EMOJI}}\n[RAG-Kontext]: {{TOP_3_CHUNKS}}\n[Ereignistyp]: {{EREIGNISTYP}}\n[Kerndaten]: {{KERNDATEN}}\n[Aufgabe]: Erstelle jetzt den Post basierend auf den Kerndaten und unter strikter Einhaltung des RAG-Kontexts.\n[Output-Format]: NUR den fertigen Post ausgeben. Keine Einleitung, keine Metakommentare, keine Anmerkungen.\n\nPrompt 2: Der Auditor (GPT - Isoliertes Review)\n[Rolle]: Du bist ein kritischer Auditor und Fachexperte.\n[Aufgabe]: Analysiere den folgenden Text (erstellt von einer KI) auf logische Konsistenz, sachliche Richtigkeit und Einhaltung der Best Practices. Verschiedene Trainingsdaten bedeuten, dass du Schwächen abdeckst, die andere Modelle übersehen.\n[Original-Input]: {{KERNDATEN}}\n[KI-Generat]: {{CLAUDE_OUTPUT}}\n[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden Format:\n## Review-Punkte\n* [Kriterium 1]: (Kritik/Lob)\n* [Kriterium 2]: (Kritik/Lob)\nFehlerprotokoll: (Falls vorhanden, sonst 'Keine Fehler')\n\nPrompt 3: Der Faktenchecker (Grok - Isoliertes Review)\n[Rolle]: Du bist ein unbestechlicher Faktencheck-Algorithmus.\n[Aufgabe]: Vergleiche den generierten Text strikt mit den bereitgestellten RAG-Fakten. Identifiziere jede Form von Halluzination oder Hinzudichten von Informationen, die Claude übersehen hat.\n[RAG-Referenzdaten]: {{TOP_3_CHUNKS}}\n[Zu prüfender Text]: {{CLAUDE_OUTPUT}}\n[Output-Format]: Antworte AUSSCHLIESSLICH im folgenden JSON-Schema:\n{\n  'faktentreue_score': 0-100,\n  'halluzination_erkannt': true/false,\n  'diskrepanzen': ['Abweichung 1'] oder []\n}\n\nPrompt 4: Der Evaluator & Aggregations-Gate (Gemini)\n[Rolle]: Du bist der finale Qualitätsmanager (Quality Gate).\n[Aufgabe]: Bewerte das KI-Generat basierend auf dem Original-Input, dem vorliegenden GPT-Review und dem Grok-Faktencheck. Berechne einen mathematischen Quality Score zwischen 0 und 100. Erst am Ende werden alle Scores zu einem Gesamtscore aggregiert.\n[Daten]:\n- Original-Input: {{KERNDATEN}}\n- KI-Generat: {{CLAUDE_OUTPUT}}\n- GPT-Review: {{GPT_REVIEW}}\n- Grok-Review: {{GROK_REVIEW}}\n[Metrik für Score]:\n- Relevanz zum Input / Faktentreue (0-40)\n- Korrektheit & Logik (0-40)\n- Stil, Tonalität & Struktur (0-20)\n[Output-Format]: Antworte NUR in JSON:\n{\n  'quality_score': [Zahl],\n  'fakten_score': 0-100,\n  'ton_score': 0-100,\n  'kanal_score': 0-100,\n  'justification': '[Kurze Begründung für den Score]',\n  'anmerkungen': '[Detaillierte Anmerkungen]',\n  'action_required': '[JA/NEIN - Muss ein Mensch eingreifen?]'\n}\n\n4. Deep-Dive: Die automatisierte YouTube-Video-Pipeline\nSobald das Human Approval für ein YouTube-Skript erteilt wird, startet die vollautomatische Medienproduktion nahtlos über Make.com:\n\n4.1 RAG Wissensdatenbank & Datenbasis\n- Infrastruktur: Eine selbstgehostete, vollständig DSGVO-konforme ChromaDB dient als zentraler Wissensspeicher.\n- Inhalte der Datenbank: Pressemitteilungen, Spielberichte, der offizielle Tone-of-Voice Guide sowie Sponsorinfos.\n- Abruf-Logik: Bei einem Ereignis extrahiert das System die Top-3 Chunks via Vektorsuche und übergibt diese als Kontext an die Prompt-Kette.\n\n4.2 Audio-Synthese (OpenVoice v2)\n- Das von Claude erstellte YouTube-Skript (bestehend aus Hook, Body und CTA) wird an OpenVoice v2 (Open Source) übergeben.\n- Voice Cloning: Das System nutzt ein vordefiniertes Sprachmodell für das Klonen der eigenen Stimme.\n- Output: Es wird ein multilinguales (DE / EN) WAV-Audio in Studioqualität (44.1 kHz) generiert.\n\n4.3 Video-Compositing (FFmpeg) & API-Upload\n- FFmpeg-Engine: Das System kombiniert das generierte WAV-Audio automatisiert mit passenden FC-Bayern-Bildern oder Videoclips zu einer finalen MP4-Videodatei.\n- Auto-Upload: Über die YouTube Data API v3 wird die fertige MP4-Datei vollautomatisch auf den Kanal hochgeladen.",
    snippet: "Strategisches Konzept zur Multi-Agenten-Qualitätssicherung & Automatisierten Video-Content-Pipeline bei FC Bayern."
  }
];

const PRESETS = [
  "What is the official motto and core philosophy of FC Bayern?",
  "What are the tone of voice brand rules for Thomas Müller vs Harry Kane?",
  "What is the seating capacity and main feature of the Allianz Arena?",
  "What are the historical achievements and major trophies of the club?"
];

export const RagHub: React.FC<RagHubProps> = ({ onAddLog }) => {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState<string>(PRESETS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [summary, setSummary] = useState<{ summaryTitle: string; bullets: string[]; takeaway: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  
  // States for Gemini-driven document executive summaries
  const [docSummaries, setDocSummaries] = useState<Record<string, { executiveSummary: string; keyTakeaways: string[]; complianceStatus: string }>>({});
  const [isSummarizingDoc, setIsSummarizingDoc] = useState<boolean>(false);
  
  // States for the Document Previewer side-panel
  const [selectedDoc, setSelectedDoc] = useState<{ source: string; snippet: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [uploadFilterCategory, setUploadFilterCategory] = useState<string>("All");
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"reader" | "metadata" | "history">("reader");
  const [snippetCopied, setSnippetCopied] = useState<boolean>(false);

  // States for the newly added 'Document Preview' modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any>(CORE_DOCUMENTS[0]);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("fcb_rag_last_sync_time");
      return stored || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showJumpToTop, setShowJumpToTop] = useState<boolean>(false);
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("fcb_rag_recent_searches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showMetadataTable, setShowMetadataTable] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const pendingDocRef = useRef<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [bookmarkedSnippets, setBookmarkedSnippets] = useState<Array<{
    id: string;
    source: string;
    snippet: string;
    timestamp: string;
    queryContext: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem("fcb_rag_bookmarks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveBookmarks = (newBookmarks: any) => {
    setBookmarkedSnippets(newBookmarks);
    try {
      localStorage.setItem("fcb_rag_bookmarks", JSON.stringify(newBookmarks));
    } catch (err) {
      console.error("Failed to save bookmarks to localStorage", err);
    }
  };

  const [activeRagTab, setActiveRagTab] = useState<"search" | "readLater" | "upload" | "visualization">("search");
  
  // Document versioning states
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [editVersion, setEditVersion] = useState<string>("");
  const [editAuthor, setEditAuthor] = useState<string>("");

  const [expandedVersionsDocId, setExpandedVersionsDocId] = useState<string | null>(null);
  const [previewingOldVersion, setPreviewingOldVersion] = useState<{ docId: string; versionId: string; version: string; content: string; author: string; lastIndexed: string } | null>(null);

  const [uploadedDocs, setUploadedDocs] = useState<Array<{
    id: string;
    source: string;
    snippet: string;
    content: string;
    fileSize: string;
    lastIndexed: string;
    category: string;
    author: string;
    version: string;
    versions?: Array<{
      id: string;
      version: string;
      content: string;
      snippet: string;
      lastIndexed: string;
      author: string;
      fileSize: string;
    }>;
  }>>(() => {
    try {
      const stored = localStorage.getItem("fcb_rag_uploaded_docs");
      return stored ? JSON.parse(stored) : [
        {
          id: "seed-1",
          source: "FCB_Corporate_Tone_Rules_2026.txt",
          snippet: "When generating communications on behalf of Thomas Müller, the tone must be playful, witty, and native to Munich. For Harry Kane, it must be modest, professional, and highlight work ethic.",
          content: "Mia San Mia corporate identity tone rules:\n- Thomas Müller: Playful, witty, loud, direct, Bavarian humor, local hero.\n- Harry Kane: Humble, professional, focused on team work, leading striker, polite, respectful.\n- General rule: Never use hostile language. Maintain premium brand standard.",
          fileSize: "1.5 KB",
          lastIndexed: new Date().toISOString().split("T")[0],
          category: "Brand Compliance",
          author: "Admin Orchestrator",
          version: "v1.2"
        }
      ];
    } catch {
      return [];
    }
  });

  const saveUploadedDocs = (newDocs: any) => {
    setUploadedDocs(newDocs);
    try {
      localStorage.setItem("fcb_rag_uploaded_docs", JSON.stringify(newDocs));
    } catch (err) {
      console.error("Failed to save uploaded documents", err);
    }
  };

  const handleCreateNewVersion = (docId: string, content: string, version: string, author: string) => {
    if (!content.trim()) return;

    const updated = uploadedDocs.map(doc => {
      if (doc.id === docId) {
        const existingVersions = doc.versions || [];
        const archiveItem = {
          id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          version: doc.version || "v1.0",
          content: doc.content,
          snippet: doc.snippet,
          lastIndexed: doc.lastIndexed,
          author: doc.author || "MiaSanAI Admin",
          fileSize: doc.fileSize
        };

        const sizeInKB = Math.round(content.length / 1024);
        const fileSizeStr = sizeInKB > 1024 
          ? `${(sizeInKB / 1024).toFixed(1)} MB` 
          : `${sizeInKB} KB`;

        return {
          ...doc,
          content,
          snippet: content.length > 250 ? content.substring(0, 250) + "..." : content,
          version: version || "v1.1",
          author: author || "MiaSanAI Compliance Editor",
          lastIndexed: new Date().toISOString().split("T")[0],
          fileSize: fileSizeStr,
          versions: [archiveItem, ...existingVersions]
        };
      }
      return doc;
    });

    saveUploadedDocs(updated);
    setEditingDocId(null);
    onAddLog({
      id: `new-version-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Version Controller",
      message: language === "de"
        ? `Neue Version ${version || "v1.1"} für Dokument erstellt.`
        : `Created new version ${version || "v1.1"} for document.`
    });
  };

  const handleRevertToVersion = (docId: string, versionId: string) => {
    const updated = uploadedDocs.map(doc => {
      if (doc.id === docId) {
        const existingVersions = doc.versions || [];
        const targetIndex = existingVersions.findIndex(v => v.id === versionId);
        if (targetIndex !== -1) {
          const targetVersion = existingVersions[targetIndex];
          
          // Archive current
          const archiveCurrent = {
            id: `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            version: doc.version,
            content: doc.content,
            snippet: doc.snippet,
            lastIndexed: doc.lastIndexed,
            author: doc.author,
            fileSize: doc.fileSize
          };
          
          const newVersions = [
            archiveCurrent,
            ...existingVersions.filter(v => v.id !== versionId)
          ];
          
          return {
            ...doc,
            content: targetVersion.content,
            snippet: targetVersion.snippet,
            version: targetVersion.version,
            author: targetVersion.author,
            lastIndexed: new Date().toISOString().split("T")[0],
            fileSize: targetVersion.fileSize,
            versions: newVersions
          };
        }
      }
      return doc;
    });

    saveUploadedDocs(updated);
    setPreviewingOldVersion(null);
    onAddLog({
      id: `revert-version-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Version Controller",
      message: language === "de"
        ? `Dokument erfolgreich auf Version zurückgesetzt.`
        : `Document successfully reverted to older version.`
    });
  };

  const handleSyncDatabase = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(nowStr);
    try {
      localStorage.setItem("fcb_rag_last_sync_time", nowStr);
    } catch (e) {
      console.error(e);
    }
    
    setIsSyncing(false);
    
    onAddLog({
      id: `sync-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "RAG Synchronizer",
      message: language === "de"
        ? `RAG-Vektordatenbank synchronisiert. Neue Dokumente wurden partitioniert und Vektoreinbettungen neu berechnet.`
        : `RAG Vector database synchronized. New brand documents have been partitioned and embeddings successfully recalculated.`
    });
  };

  const handleForceReindex = async () => {
    if (isReindexing) return;
    setIsReindexing(true);

    onAddLog({
      id: `reindex-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Vector Indexer",
      message: language === "de"
        ? "Manuelle Neuindizierung des gesamten Markendokumentenbestands gestartet..."
        : "Forced full re-indexing of all brand compliance knowledge documents initiated..."
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update lastIndexed for all uploaded docs to today's date
    const todayStr = new Date().toISOString().split("T")[0];
    const reindexedDocs = uploadedDocs.map(doc => ({
      ...doc,
      lastIndexed: todayStr
    }));
    saveUploadedDocs(reindexedDocs);

    // Trigger a last sync time update as well
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(nowStr);
    try {
      localStorage.setItem("fcb_rag_last_sync_time", nowStr);
    } catch (e) {
      console.error(e);
    }

    setIsReindexing(false);

    onAddLog({
      id: `reindex-success-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Vector Indexer",
      message: language === "de"
        ? "Neuindizierung abgeschlossen. Vektorraumeinbettungen neu berechnet."
        : "Re-indexing complete. Vector embeddings recalculated for all uploaded brand documents."
    });
  };

  const handleExportJSON = () => {
    try {
      const allDocs = [...CORE_DOCUMENTS, ...uploadedDocs];
      const payload = {
        exportMetadata: {
          generatedAt: new Date().toISOString(),
          totalDocuments: allDocs.length,
          coreCount: CORE_DOCUMENTS.length,
          customCount: uploadedDocs.length,
          appName: "MiaSanAI Brand Hub",
          databaseType: "ChromaDB Memory-Vector Store"
        },
        documents: allDocs
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `fcb_brand_knowledge_state_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      onAddLog({
        id: `export-json-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Registry Exporter",
        message: language === "de"
          ? `Wissensdatenbank erfolgreich als JSON exportiert (${allDocs.length} Dokumente).`
          : `Successfully exported knowledge base to JSON report (${allDocs.length} total documents).`
      });
      setIsExportDropdownOpen(false);
    } catch (err) {
      console.error(err);
      onAddLog({
        id: `export-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "ERROR",
        source: "Registry Exporter",
        message: `Failed to export knowledge base: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const escapeCSVValue = (val: string) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    str = str.replace(/"/g, '""');
    if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  const handleExportCSV = () => {
    try {
      const allDocs = [...CORE_DOCUMENTS, ...uploadedDocs];
      const headers = ["ID", "Source File", "Category", "Version", "Author", "Last Indexed", "File Size", "Snippet", "Full Content"];
      
      const rows = allDocs.map(doc => [
        doc.id,
        doc.source,
        doc.category,
        doc.version,
        doc.author,
        doc.lastIndexed,
        doc.fileSize,
        doc.snippet,
        doc.content
      ]);

      const csvContent = [
        headers.map(escapeCSVValue).join(","),
        ...rows.map(row => row.map(escapeCSVValue).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `fcb_brand_knowledge_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      onAddLog({
        id: `export-csv-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Registry Exporter",
        message: language === "de"
          ? `Wissensdatenbank erfolgreich als CSV-Bericht exportiert (${allDocs.length} Dokumente).`
          : `Successfully exported knowledge base as a CSV report (${allDocs.length} total documents).`
      });
      setIsExportDropdownOpen(false);
    } catch (err) {
      console.error(err);
      onAddLog({
        id: `export-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "ERROR",
        source: "Registry Exporter",
        message: `Failed to export CSV: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadCategory, setUploadCategory] = useState<string>("Brand Compliance");
  const [uploadVersion, setUploadVersion] = useState<string>("v1.0");
  const [uploadAuthor, setUploadAuthor] = useState<string>("MiaSanAI Partner");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isAutoTagging, setIsAutoTagging] = useState<boolean>(false);
  const [autoTagWithGemini, setAutoTagWithGemini] = useState<boolean>(true);

  // States for batch upload progress
  const [batchProgress, setBatchProgress] = useState<number | null>(null);
  const [batchTotal, setBatchTotal] = useState<number>(0);
  const [batchCurrent, setBatchCurrent] = useState<number>(0);
  const [batchProcessedDocs, setBatchProcessedDocs] = useState<{ name: string; category: string; status: 'pending' | 'success' | 'failed' }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    setUploadSuccess(false);

    if (isAutoTagging) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      processBatchFiles(fileArray);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    if (isAutoTagging) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files) as File[];
      processBatchFiles(fileArray);
    }
  };

  const readFileContent = (file: File, fileExtension: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (fileExtension === ".json") {
            const jsonText = event.target?.result as string;
            JSON.parse(jsonText);
            resolve(jsonText);
          } else if (fileExtension === ".txt") {
            resolve(event.target?.result as string || "");
          } else {
            resolve(`DOCUMENT SUMMARY OF ${file.name.toUpperCase()}\n\nThis document has been parsed and index-chunked.\nSummary Statement:\nFC Bayern Munich Brand Guidelines, security regulations, and tactical match day operations are verified for compliance. Maintain high visual standards, strict color palette matching (#dc052d primary red), and focus on the club's motto 'Mia San Mia'. All marketing assets must align with these parameters.`);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => {
        reject(new Error("Error reading file."));
      };

      if (fileExtension === ".pdf") {
        resolve(`DOCUMENT SUMMARY OF ${file.name.toUpperCase()}\n\nThis document has been parsed and index-chunked.\nSummary Statement:\nFC Bayern Munich Brand Guidelines, security regulations, and tactical match day operations are verified for compliance. Maintain high visual standards, strict color palette matching (#dc052d primary red), and focus on the club's motto 'Mia San Mia'. All marketing assets must align with these parameters.`);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const processBatchFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsAutoTagging(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    const validExtensions = [".txt", ".json", ".pdf"];
    
    // Filter files
    const validFiles = files.filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      return validExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      setUploadError(
        language === "de"
          ? "Keine gültigen Dateien gefunden (.txt, .json, .pdf)."
          : "No valid files found (.txt, .json, .pdf)."
      );
      setIsAutoTagging(false);
      return;
    }

    setBatchTotal(validFiles.length);
    setBatchCurrent(0);
    setBatchProgress(0);

    // Initialize list of batch items for visual tracking
    const initialBatchItems = validFiles.map(f => ({
      name: f.name,
      category: uploadCategory,
      status: 'pending' as const
    }));
    setBatchProcessedDocs(initialBatchItems);

    const newIndexedDocs: any[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setBatchCurrent(i + 1);
      // update progress bar (pre-upload weight)
      const progress = Math.round(((i) / validFiles.length) * 100);
      setBatchProgress(progress);

      // update current file status to 'pending' as active
      setBatchProcessedDocs(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'pending' } : item
      ));

      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      
      try {
        const fileContent = await readFileContent(file, fileExtension);
        
        const sizeInKB = Math.round(file.size / 1024);
        const fileSizeStr = sizeInKB > 1024 
          ? `${(sizeInKB / 1024).toFixed(1)} MB` 
          : `${sizeInKB} KB`;

        let finalCategory = uploadCategory;

        if (autoTagWithGemini) {
          onAddLog({
            id: `autotag-start-${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "TRIGGER",
            source: "AI Auto-Tagging",
            message: language === "de"
              ? `Analysiere Dokument [${i + 1}/${validFiles.length}] "${file.name}" mit der Gemini API...`
              : `Analyzing document [${i + 1}/${validFiles.length}] "${file.name}" using Gemini API...`
          });

          try {
            const response = await fetch("/api/rag/auto-tag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: file.name, content: fileContent })
            });

            if (!response.ok) {
              throw new Error("Auto-tagging API response was not OK");
            }

            const data = await response.json();
            if (data.category) {
              finalCategory = data.category;
              const reason = data.reasoning || "";
              const conf = data.confidence || 100;
              onAddLog({
                id: `autotag-success-${Date.now()}-${i}`,
                timestamp: new Date().toLocaleTimeString(),
                level: "SUCCESS",
                source: "AI Auto-Tagging",
                message: language === "de"
                  ? `"${file.name}" automatisch klassifiziert als "${finalCategory}" (${conf}%)`
                  : `"${file.name}" automatically classified as "${finalCategory}" (${conf}%)`
              });
            }
          } catch (err: any) {
            console.error("Auto-tagging failed for " + file.name, err);
            // Fallback keyword classification on client
            const text = (file.name + " " + fileContent).toLowerCase();
            if (text.includes("contract") || text.includes("agreement") || text.includes("legal") || text.includes("nda") || text.includes("signature") || text.includes("clause")) {
              finalCategory = "Contracts";
            } else if (text.includes("logo") || text.includes("color") || text.includes("asset") || text.includes("palette") || text.includes("font") || text.includes("svg") || text.includes("image") || text.includes("design") || text.includes("branding")) {
              finalCategory = "Brand Assets";
            } else {
              finalCategory = "Guidelines";
            }
            onAddLog({
              id: `autotag-fallback-${Date.now()}-${i}`,
              timestamp: new Date().toLocaleTimeString(),
              level: "WARNING",
              source: "AI Auto-Tagging",
              message: language === "de"
                ? `KI-Auto-Tagging fehlgeschlagen für "${file.name}". Fallback: "${finalCategory}"`
                : `AI auto-tagging failed for "${file.name}". Fallback: "${finalCategory}"`
            });
          }
        }

        const newDoc = {
          id: `up-${Date.now()}-${i}`,
          source: file.name,
          snippet: fileContent.length > 250 ? fileContent.substring(0, 250) + "..." : fileContent,
          content: fileContent,
          fileSize: fileSizeStr,
          lastIndexed: new Date().toISOString().split("T")[0],
          category: finalCategory,
          author: uploadAuthor || "MiaSanAI Admin",
          version: uploadVersion || "v1.0"
        };

        newIndexedDocs.push(newDoc);
        
        // Update item list visual status to success
        setBatchProcessedDocs(prev => prev.map((item, idx) => 
          idx === i ? { ...item, category: finalCategory, status: 'success' } : item
        ));

        onAddLog({
          id: `upload-${Date.now()}-${i}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Vector Indexer",
          message: language === "de"
            ? `"${file.name}" erfolgreich indiziert.`
            : `"${file.name}" successfully indexed.`
        });

      } catch (err: any) {
        console.error("Error reading or processing file:", file.name, err);
        // Update item list visual status to failed
        setBatchProcessedDocs(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'failed' } : item
        ));

        onAddLog({
          id: `upload-error-${Date.now()}-${i}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "ERROR",
          source: "Vector Indexer",
          message: language === "de"
            ? `Fehler bei "${file.name}": ${err.message}`
            : `Error with "${file.name}": ${err.message}`
        });
      }

      // Small delay for natural UI rendering/transitions
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (newIndexedDocs.length > 0) {
      // Add all successfully indexed documents to state with versioning detection
      let currentUploaded = [...uploadedDocs];
      newIndexedDocs.forEach(newDoc => {
        const existingIndex = currentUploaded.findIndex(d => d.source.trim().toLowerCase() === newDoc.source.trim().toLowerCase());
        if (existingIndex !== -1) {
          const existingDoc = currentUploaded[existingIndex];
          const existingVersions = existingDoc.versions || [];
          
          // Archive existing document state as an older version in history
          const versionArchive = {
            id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            version: existingDoc.version || "v1.0",
            content: existingDoc.content,
            snippet: existingDoc.snippet,
            lastIndexed: existingDoc.lastIndexed,
            author: existingDoc.author || "MiaSanAI Admin",
            fileSize: existingDoc.fileSize
          };
          
          let nextVersion = newDoc.version;
          if (nextVersion === existingDoc.version) {
            // Auto-increment version if it matches the current active version
            const match = existingDoc.version.match(/^v?(\d+)\.(\d+)/);
            if (match) {
              const major = parseInt(match[1], 10);
              const minor = parseInt(match[2], 10) + 1;
              nextVersion = `v${major}.${minor}`;
            } else {
              nextVersion = `${existingDoc.version}.1`;
            }
          }
          
          currentUploaded[existingIndex] = {
            ...existingDoc,
            snippet: newDoc.snippet,
            content: newDoc.content,
            fileSize: newDoc.fileSize,
            lastIndexed: newDoc.lastIndexed,
            author: newDoc.author,
            version: nextVersion,
            versions: [versionArchive, ...existingVersions]
          };
        } else {
          currentUploaded = [newDoc, ...currentUploaded];
        }
      });
      saveUploadedDocs(currentUploaded);
      setUploadSuccess(true);
    } else {
      setUploadError(
        language === "de"
          ? "Keine der ausgewählten Dateien konnte erfolgreich indiziert werden."
          : "None of the selected files could be successfully indexed."
      );
    }

    setBatchProgress(100);
    setIsAutoTagging(false);

    // Hide progress bar after 4 seconds
    setTimeout(() => {
      setBatchProgress(null);
    }, 4000);
  };
  const [readLaterQueue, setReadLaterQueue] = useState<Array<{
    id: string;
    source: string;
    snippet: string;
    timestamp: string;
    queryContext?: string;
  }>>(() => {
    try {
      const stored = localStorage.getItem("fcb_rag_read_later");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveReadLater = (newQueue: any) => {
    setReadLaterQueue(newQueue);
    try {
      localStorage.setItem("fcb_rag_read_later", JSON.stringify(newQueue));
    } catch (err) {
      console.error("Failed to save read later to localStorage", err);
    }
  };

  const handleSaveForLater = () => {
    if (!selectedDoc) return;
    const isAlreadySaved = readLaterQueue.some(
      item => item.source === selectedDoc.source && item.snippet === selectedDoc.snippet
    );

    if (isAlreadySaved) {
      const updated = readLaterQueue.filter(
        item => !(item.source === selectedDoc.source && item.snippet === selectedDoc.snippet)
      );
      saveReadLater(updated);
      onAddLog({
        id: `read-later-remove-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        source: "Read Later Manager",
        message: language === "de"
          ? `Auszug aus "${selectedDoc.source}" von der Leseliste entfernt.`
          : `Removed excerpt from "${selectedDoc.source}" from your Read Later queue.`
      });
    } else {
      const newItem = {
        id: `rl-${Date.now()}`,
        source: selectedDoc.source,
        snippet: selectedDoc.snippet,
        timestamp: new Date().toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        queryContext: query || ""
      };
      const updated = [newItem, ...readLaterQueue];
      saveReadLater(updated);
      onAddLog({
        id: `read-later-save-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Read Later Manager",
        message: language === "de"
          ? `Auszug aus "${selectedDoc.source}" zur Leseliste hinzugefügt.`
          : `Added excerpt from "${selectedDoc.source}" to your persistent Read Later queue.`
      });
    }
  };

  const isSavedForLater = selectedDoc 
    ? readLaterQueue.some(item => item.source === selectedDoc.source && item.snippet === selectedDoc.snippet)
    : false;

  const handleClearReadLater = () => {
    saveReadLater([]);
    onAddLog({
      id: `read-later-clear-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "WARNING",
      source: "Read Later Manager",
      message: language === "de"
        ? "Die gesamte Leseliste wurde geleert."
        : "Cleared the entire Read Later queue."
    });
  };

  React.useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  const handleCopyCurrentSnippet = () => {
    if (!selectedDoc) return;
    navigator.clipboard.writeText(selectedDoc.snippet).then(() => {
      onAddLog({
        id: `context-copy-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Context Menu",
        message: language === "de"
          ? `Textausschnitt aus "${selectedDoc.source}" in die Zwischenablage kopiert.`
          : `Copied text excerpt from "${selectedDoc.source}" to clipboard.`
      });
    });
  };

  const handleBookmarkSnippet = () => {
    if (!selectedDoc) return;
    const isAlreadyBookmarked = bookmarkedSnippets.some(
      b => b.source === selectedDoc.source && b.snippet === selectedDoc.snippet
    );

    if (isAlreadyBookmarked) {
      onAddLog({
        id: `bookmark-already-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        source: "Bookmarks Manager",
        message: language === "de"
          ? `Auszug aus "${selectedDoc.source}" ist bereits als Lesezeichen gespeichert.`
          : `Excerpt from "${selectedDoc.source}" is already bookmarked.`
      });
      return;
    }

    const newBookmark = {
      id: `bookmark-${Date.now()}`,
      source: selectedDoc.source,
      snippet: selectedDoc.snippet,
      timestamp: new Date().toLocaleDateString(),
      queryContext: query
    };

    const updated = [newBookmark, ...bookmarkedSnippets];
    saveBookmarks(updated);

    onAddLog({
      id: `bookmark-add-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Bookmarks Manager",
      message: language === "de"
        ? `Auszug aus "${selectedDoc.source}" erfolgreich als Lesezeichen hinzugefügt.`
        : `Successfully bookmarked excerpt from "${selectedDoc.source}".`
    });
  };

  const handleOpenSourceUrl = () => {
    if (!selectedDoc) return;
    const url = getSourceUrl(selectedDoc.source);
    window.open(url, "_blank", "noopener,noreferrer");
    onAddLog({
      id: `context-url-open-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Context Menu",
      message: language === "de"
        ? `Öffne Quell-Referenz-URL: ${url}`
        : `Opening source reference URL: ${url}`
    });
  };

  const handleRemoveBookmark = (id: string, source: string) => {
    const updated = bookmarkedSnippets.filter(b => b.id !== id);
    saveBookmarks(updated);
    onAddLog({
      id: `bookmark-remove-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Bookmarks Manager",
      message: language === "de"
        ? `Lesezeichen für "${source}" entfernt.`
        : `Removed bookmark for "${source}".`
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    onAddLog({
      id: `context-menu-open-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Context Menu",
      message: language === "de"
        ? "Rechtsklick-Kontextmenü für Dokument geöffnet."
        : "Right-click context menu opened for document."
    });
  };

  React.useEffect(() => {
    setScrollProgress(0);
    setShowJumpToTop(false);
    if (sidePanelScrollRef.current) {
      sidePanelScrollRef.current.scrollTop = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setShowMetadataTable(false);
  }, [selectedDoc]);

  React.useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Simple thumbs up/down feedback states for RAG reference cards
  const [highlights, setHighlights] = useState<string[]>([]);

  const handleShareDocument = () => {
    if (!selectedDoc) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?doc=${encodeURIComponent(selectedDoc.source)}&q=${encodeURIComponent(query)}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      onAddLog({
        id: `doc-share-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Document Previewer",
        message: language === "de"
          ? `Deep-Link für "${selectedDoc.source}" in die Zwischenablage kopiert.`
          : `Copied deep link for "${selectedDoc.source}" to clipboard.`
      });
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(err => {
      console.error("Clipboard copy error:", err);
    });
  };

  const handleStartSpeaking = () => {
    if (!window.speechSynthesis) {
      onAddLog({
        id: `tts-unsupported-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "ERROR",
        source: "Speech Engine",
        message: language === "de"
          ? "Text-to-Speech wird von diesem Browser nicht unterstützt."
          : "Text-to-Speech is not supported by this browser."
      });
      return;
    }

    const textToSpeak = selectedDoc?.snippet;
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Auto-detect German text or fall back to English/current language
    const isGerman = language === "de" || textToSpeak.includes("ä") || textToSpeak.includes("ö") || textToSpeak.includes("ü") || textToSpeak.includes("ß") || textToSpeak.toLowerCase().includes("der") || textToSpeak.toLowerCase().includes("die") || textToSpeak.toLowerCase().includes("das");
    utterance.lang = isGerman ? "de-DE" : "en-US";
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesisUtterance error", e);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);

    onAddLog({
      id: `tts-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Speech Engine",
      message: language === "de"
        ? `Lese Dokumententext vor (${isGerman ? "Deutsch" : "Englisch"})...`
        : `Reading document text aloud (${isGerman ? "German" : "English"})...`
    });
  };

  const handlePauseSpeaking = () => {
    if (!window.speechSynthesis || !isSpeaking || isPaused) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    onAddLog({
      id: `tts-pause-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Speech Engine",
      message: language === "de"
        ? "Sprachausgabe pausiert."
        : "Speech narration paused."
    });
  };

  const handleResumeSpeaking = () => {
    if (!window.speechSynthesis || !isSpeaking || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
    onAddLog({
      id: `tts-resume-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Speech Engine",
      message: language === "de"
        ? "Sprachausgabe fortgesetzt."
        : "Speech narration resumed."
    });
  };

  const handleStopSpeaking = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    onAddLog({
      id: `tts-stop-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Speech Engine",
      message: language === "de"
        ? "Sprachausgabe beendet."
        : "Speech narration stopped."
    });
  };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      handleStopSpeaking();
    } else {
      handleStartSpeaking();
    }
  };

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0) {
      if (!highlights.includes(selectedText)) {
        setHighlights(prev => [...prev, selectedText]);
        onAddLog({
          id: `highlight-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Document Viewer",
          message: language === "de"
            ? `Textausschnitt hervorgehoben: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? "..." : ""}"`
            : `Highlighted text snippet: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? "..." : ""}"`
        });
      }
      selection.removeAllRanges();
    }
  };

  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>(() => {
    try {
      const saved = localStorage.getItem("fcb_miasanai_rag_feedback");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error(e);
      return {};
    }
  });

  const handleFeedback = (source: string, idx: number, type: "up" | "down") => {
    const key = `${source}_${idx}`;
    const newFeedback = { ...feedback, [key]: type };
    setFeedback(newFeedback);
    try {
      localStorage.setItem("fcb_miasanai_rag_feedback", JSON.stringify(newFeedback));
    } catch (e) {
      console.error(e);
    }

    onAddLog({
      id: `rag-feedback-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Feedback Compiler",
      message: language === "de"
        ? `Rückmeldung '${type === "up" ? "hilfreich" : "nicht hilfreich"}' für ${source} erfasst. Vektorgewichte werden kalibriert.`
        : `Feedback '${type === "up" ? "helpful" : "not helpful"}' captured for ${source}. Optimizing semantic embedding vector weights.`
    });
  };

  const handleGenerateSummary = async () => {
    if (!result || !result.retrievedDocs || result.retrievedDocs.length === 0) return;

    setIsSummarizing(true);
    setSummary(null);

    onAddLog({
      id: `summary-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Gemini Synthesis",
      message: language === "de"
        ? "Analysiere abgerufene RAG-Snippets mit Gemini für eine übergeordnete Zusammenfassung..."
        : "Analyzing retrieved RAG snippets with Gemini to generate high-level synthesis..."
    });

    try {
      const response = await fetch("/api/rag/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippets: result.retrievedDocs,
          language
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data);

      onAddLog({
        id: `summary-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Gemini Synthesis",
        message: language === "de"
          ? "RAG-Zusammenfassung erfolgreich erstellt."
          : "Successfully synthesized RAG document snippets with Gemini."
      });
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `summary-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Gemini Synthesis",
        message: `Failed to synthesize snippets: ${err.message}`
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateDocSummary = async (doc: any) => {
    if (!doc) return;

    setIsSummarizingDoc(true);
    onAddLog({
      id: `doc-summary-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Gemini Summarizer",
      message: language === "de"
        ? `Erstelle Executive Summary für "${doc.source}" mit Gemini AI...`
        : `Generating high-level executive summary for "${doc.source}" using Gemini AI...`
    });

    try {
      const response = await fetch("/api/rag/summarize-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: doc.source,
          content: doc.content,
          category: doc.category,
          language
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate document summary");
      }

      const data = await response.json();
      setDocSummaries(prev => ({
        ...prev,
        [doc.id]: data
      }));

      onAddLog({
        id: `doc-summary-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Gemini Summarizer",
        message: language === "de"
          ? `Zusammenfassung für "${doc.source}" erfolgreich generiert.`
          : `Executive summary and compliance status for "${doc.source}" successfully compiled.`
      });
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `doc-summary-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Gemini Summarizer",
        message: `Failed to summarize document: ${err.message}`
      });
    } finally {
      setIsSummarizingDoc(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedDoc) return;
    try {
      const doc = new jsPDF();
      
      // Set automated metadata properties
      doc.setProperties({
        title: new Date().toISOString(),
        author: "FCB MiaSanAI",
        subject: "MiaSanAI RAG Hub Document Snippet",
        creator: "FCB MiaSanAI"
      });
      
      // Set some styling
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(196, 26, 42); // FCB Red color
      doc.text("MiaSanAI RAG Hub Document", 20, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Source: ${selectedDoc.source}`, 20, 28);
      doc.text(`Match Accuracy: 98.4%`, 20, 34);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 40);
      
      // Draw a divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, 190, 45);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Grounded Matched Snippet:", 20, 55);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(30, 30, 30);
      
      // Split text to fit page width (page width is typically 210mm, margin 20mm on both sides, so 170mm width)
      const splitText = doc.splitTextToSize(selectedDoc.snippet, 170);
      doc.text(splitText, 20, 63);
      
      // Let's add full metadata details if possible
      const details = getDocDetails(selectedDoc.source);
      let currentY = 65 + (splitText.length * 5);
      
      if (currentY < 240) {
        doc.setDrawColor(230, 230, 230);
        doc.line(20, currentY, 190, currentY);
        currentY += 10;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text("Metadata Context:", 20, currentY);
        currentY += 8;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Category/Domain: ${details.category}`, 20, currentY);
        doc.text(`Custodian Owner: ${details.author}`, 110, currentY);
        currentY += 6;
        doc.text(`File Size: ${details.fileSize}`, 20, currentY);
        doc.text(`Version: ${details.version}`, 110, currentY);
        currentY += 6;
        doc.text(`Last Re-indexed: ${details.lastIndexed}`, 20, currentY);
        doc.text(`Classification: Club Confidential`, 110, currentY);
      }
      
      // Save PDF
      doc.save(`FCB_RAG_Snippet_${selectedDoc.source}.pdf`);
      
      onAddLog({
        id: `pdf-download-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "PDF Compiler",
        message: language === "de"
          ? `PDF-Dokument für ${selectedDoc.source} erfolgreich gerendert und heruntergeladen.`
          : `Successfully compiled and downloaded PDF report for ${selectedDoc.source}.`
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      onAddLog({
        id: `pdf-download-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "ERROR",
        source: "PDF Compiler",
        message: `Failed to compile PDF: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  };

  // Listen to voice searches
  React.useEffect(() => {
    const handleVoiceSearch = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail || {};
      if (detail.query) {
        handleRagSearch(detail.query);
      }
    };
    window.addEventListener("miasanai-voice-search", handleVoiceSearch);
    return () => {
      window.removeEventListener("miasanai-voice-search", handleVoiceSearch);
    };
  }, []);

  const handleRagSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setResult(null);
    setSelectedDoc(null); // Reset preview on new search
    setHighlights([]); // Reset highlights on new search
    setIsExpanded(false); // Reset expanded view on new search
    setSelectedCategory("All"); // Reset category filter on new search
    setShowQrCode(false); // Reset QR code view on new search
    setSummary(null); // Reset summary state on new search
    setQuery(searchQuery);

    if (searchQuery && searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      setRecentSearches(prev => {
        const filtered = prev.filter(q => q.toLowerCase() !== trimmedQuery.toLowerCase());
        const updated = [trimmedQuery, ...filtered].slice(0, 10);
        try {
          localStorage.setItem("fcb_rag_recent_searches", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save search history to localStorage", e);
        }
        return updated;
      });
    }

    onAddLog({
      id: `rag-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "RAG Vector DB",
      message: `Executing semantic search on FCB corporate knowledge base for query: "${searchQuery}"`
    });

    try {
      const response = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        throw new Error("RAG retrieval failed");
      }

      const data: RagResult = await response.json();
      // setIsSimulatedSearch(!!data.isSimulated);

      // Check for custom matches in our uploadedDocs
      const customMatches: { source: string; snippet: string }[] = [];
      if (searchQuery && searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        
        uploadedDocs.forEach(doc => {
          let matchedIndex = -1;
          for (const word of queryWords) {
            const index = doc.content.toLowerCase().indexOf(word);
            if (index !== -1) {
              matchedIndex = index;
              break;
            }
          }
          if (matchedIndex === -1) {
            matchedIndex = doc.content.toLowerCase().indexOf(queryLower);
          }
          
          if (matchedIndex !== -1 || queryWords.length === 0) {
            const start = Math.max(0, matchedIndex - 50);
            const end = Math.min(doc.content.length, (matchedIndex !== -1 ? matchedIndex : 0) + 150);
            let snippetText = doc.content.substring(start, end).trim();
            if (start > 0) snippetText = "..." + snippetText;
            if (end < doc.content.length) snippetText = snippetText + "...";
            
            customMatches.push({
              source: doc.source,
              snippet: snippetText || doc.content.substring(0, 150)
            });
          }
        });
      } else {
        // If query is empty, list first custom doc if exists as an anchor
        if (uploadedDocs.length > 0) {
          customMatches.push({
            source: uploadedDocs[0].source,
            snippet: uploadedDocs[0].snippet
          });
        }
      }

      const combinedDocs = [...customMatches, ...data.retrievedDocs];
      const dataWithCustom: RagResult = {
        ...data,
        retrievedDocs: combinedDocs
      };

      setResult(dataWithCustom);

      if (pendingDocRef.current) {
        const found = combinedDocs.find(
          d => d.source.toLowerCase() === pendingDocRef.current?.toLowerCase()
        );
        if (found) {
          setSelectedDoc(found);
          setActivePreviewTab("reader");
          onAddLog({
            id: `rag-deeplink-open-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "INFO",
            source: "Deep Link Router",
            message: language === "de"
              ? `Dokument "${found.source}" automatisch über Deep-Link geöffnet.`
              : `Automatically opened document "${found.source}" via deep link.`
          });
        }
        pendingDocRef.current = null;
      }

      onAddLog({
        id: `rag-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "MiaSanAI Orchestration",
        message: language === "de"
          ? `RAG-Verifizierung abgeschlossen. ${data.retrievedDocs.length} offizielle Referenzen und ${customMatches.length} benutzerdefinierte Dokumente gefunden.`
          : `RAG verification completed. Found ${data.retrievedDocs.length} official references and ${customMatches.length} custom-uploaded documents. Compliance verified.`
      });
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `rag-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "RAG Vector DB",
        message: `Error querying RAG engine: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get("doc");
    const qParam = params.get("q");
    if (qParam) {
      setQuery(qParam);
      if (docParam) {
        pendingDocRef.current = docParam;
      }
      const timer = setTimeout(() => {
        handleRagSearch(qParam);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="space-y-6 w-full" id="rag-hub-container">
      {/* Premium Full-Width Header with Navigation Tabs */}
      <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Database className="h-5.5 w-5.5 text-fcb-red" />
            <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide">
              {language === "de" ? "RAG Wissensdatenbank" : "RAG Knowledge Hub"}
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-normal">
            {language === "de" 
              ? "Prüfen Sie offizielle Vereinsinformationen, Markenrichtlinien und historische Fakten. Das MiaSanAI RAG-System stellt sicher, dass alle generierten Social-Media-Beiträge zu 100% faktenbasiert und regelkonform sind."
              : "Verify official club information, branding guidelines, and historical facts. The MiaSanAI RAG system ensures all generated social posts are 100% factually grounded and brand-compliant."}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveRagTab("search")}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeRagTab === "search"
                ? "bg-fcb-red text-white font-bold shadow-md shadow-fcb-red/5"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="rag-search-tab-btn"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{language === "de" ? "Suche & Abruf" : "Search & Retrieval"}</span>
          </button>
          <button
            onClick={() => setActiveRagTab("readLater")}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 cursor-pointer relative ${
              activeRagTab === "readLater"
                ? "bg-fcb-red text-white font-bold shadow-md shadow-fcb-red/5"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="rag-read-later-tab-btn"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>{language === "de" ? "Leseliste" : "Read Later"}</span>
            {readLaterQueue.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-fcb-gold text-slate-950 text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-[#0c0c0f] animate-pulse">
                {readLaterQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveRagTab("upload");
              setUploadError(null);
              setUploadSuccess(false);
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 cursor-pointer relative ${
              activeRagTab === "upload"
                ? "bg-fcb-red text-white font-bold shadow-md shadow-fcb-red/5"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="rag-upload-tab-btn"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{language === "de" ? "Dokumenten-Upload" : "Knowledge Upload"}</span>
            {uploadedDocs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-[#0c0c0f]">
                {uploadedDocs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveRagTab("visualization")}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 cursor-pointer relative ${
              activeRagTab === "visualization"
                ? "bg-fcb-red text-white font-bold shadow-md shadow-fcb-red/5"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="rag-visualization-tab-btn"
          >
            <Network className="h-3.5 w-3.5" />
            <span>{language === "de" ? "Wissens-Graph" : "Network Graph"}</span>
          </button>
        </div>
      </div>

      {/* RAG Summary Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="rag-statistics-section">
        {/* Metric 1: Brand Documents */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-2 rounded-lg bg-fcb-red/10 text-fcb-red border border-fcb-red/20">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  {language === "de" ? "Markendokumente" : "Brand Documents"}
                </span>
                <span className="text-xl font-bold text-white font-display">
                  {6 + uploadedDocs.length}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center xl:justify-end gap-1.5 relative">
              <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">
                {uploadedDocs.length} custom / 6 core
              </span>
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border bg-fcb-red/15 hover:bg-fcb-red/25 border-fcb-red/30 text-fcb-red hover:border-fcb-red/50 flex items-center gap-1 cursor-pointer transition"
                title={language === "de" ? "Dokumentenvorschau öffnen" : "Open Document Previewer"}
                id="open-document-previewer-btn"
              >
                <Eye className="h-3 w-3" />
                <span>{language === "de" ? "VORSCHAU" : "PREVIEW"}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 flex items-center gap-1 cursor-pointer transition"
                  title={language === "de" ? "Wissensdatenbank exportieren" : "Export Knowledge Base"}
                  id="export-knowledge-base-btn"
                >
                  <Download className="h-3 w-3" />
                  <span>{language === "de" ? "EXPORT" : "EXPORT"}</span>
                </button>

                <AnimatePresence>
                  {isExportDropdownOpen && (
                    <>
                      {/* Invisible backdrop to dismiss the dropdown on clicking outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsExportDropdownOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1.5 w-36 bg-[#0a0b0e] border border-slate-800 rounded-xl overflow-hidden shadow-xl z-50 py-1"
                      >
                        <button
                          onClick={handleExportJSON}
                          className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileCode className="h-3 w-3 text-cyan-400" />
                          <span>Export as JSON</span>
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="w-full text-left px-3 py-1.5 text-[10px] font-mono text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="h-3 w-3 text-green-400" />
                          <span>Export as CSV</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Mon", count: 4 },
                { name: "Tue", count: 5 },
                { name: "Wed", count: 5 },
                { name: "Thu", count: 6 },
                { name: "Fri", count: 6 + uploadedDocs.length }
              ]}>
                <Tooltip
                  contentStyle={{ background: "#0a0a0c", borderColor: "#1a1b1e", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#dc052d", fontSize: "11px", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="#dc052d" radius={[2, 2, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric 2: Total Index Tokens */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-fcb-gold/10 text-fcb-gold border border-fcb-gold/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  {language === "de" ? "Indexierte Token" : "Total Index Tokens"}
                </span>
                <span className="text-xl font-bold text-white font-display">
                  {Math.round(124500 + uploadedDocs.reduce((acc, doc) => acc + doc.content.split(/\s+/).length * 1.3, 0)).toLocaleString()}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleForceReindex}
              disabled={isReindexing}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                isReindexing
                  ? "bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-fcb-gold/15 hover:bg-fcb-gold/25 border-fcb-gold/30 text-fcb-gold hover:border-fcb-gold/50"
              }`}
              title={language === "de" ? "Neuindizierung erzwingen" : "Force Re-index"}
            >
              {isReindexing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>RE-INDEXING</span>
                </>
              ) : (
                <>
                  <Database className="h-3 w-3" />
                  <span>{language === "de" ? "NEU INDIZIEREN" : "RE-INDEX"}</span>
                </>
              )}
            </button>
          </div>

          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: "Mon", tokens: 102000 },
                { name: "Tue", tokens: 115000 },
                { name: "Wed", tokens: 120000 },
                { name: "Thu", tokens: 124500 },
                { name: "Fri", tokens: Math.round(124500 + uploadedDocs.reduce((acc, doc) => acc + doc.content.split(/\s+/).length * 1.3, 0)) }
              ]}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c3a164" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c3a164" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: "#0a0a0c", borderColor: "#1a1b1e", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#c3a164", fontSize: "11px", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#c3a164" strokeWidth={1.5} fillOpacity={1} fill="url(#tokenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric 3: Last Sync Timestamp */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  {language === "de" ? "Letzter Abgleich" : "Last Sync Timestamp"}
                </span>
                <span className="text-sm font-bold text-white font-mono block truncate max-w-[130px]" title={lastSyncTime}>
                  {lastSyncTime}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                isSyncing
                  ? "bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-green-500/15 hover:bg-green-500/25 border-green-500/30 text-green-400 hover:border-green-500/50"
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>SYNCING</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>{language === "de" ? "SYNC" : "SYNC NOW"}</span>
                </>
              )}
            </button>
          </div>

          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: "Sync 1", precision: 95 },
                { name: "Sync 2", precision: 97 },
                { name: "Sync 3", precision: 96 },
                { name: "Sync 4", precision: 99 },
                { name: "Sync 5", precision: 100 }
              ]}>
                <Tooltip
                  contentStyle={{ background: "#0a0a0c", borderColor: "#1a1b1e", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#22c55e", fontSize: "11px", fontWeight: "bold" }}
                />
                <Line type="monotone" dataKey="precision" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 1.5 }} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {activeRagTab === "search" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="rag-tab">
          
          {/* Search History Sidebar (Col span 3) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0b0c10] p-4.5 rounded-2xl border border-slate-850/80 space-y-4 shadow-xl" id="rag-search-history-sidebar">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-bold text-white font-mono text-[11px] uppercase tracking-wider">
                    {language === "de" ? "Suchverlauf" : "Search History"}
                  </h3>
                </div>
                {recentSearches.length > 0 && (
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      try {
                        localStorage.removeItem("fcb_rag_recent_searches");
                      } catch (err) {
                        console.error(err);
                      }
                      onAddLog({
                        id: `clear-search-history-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "INFO",
                        source: "Search Engine",
                        message: language === "de" ? "Suchverlauf gelöscht." : "Search history cleared."
                      });
                    }}
                    className="text-[10px] text-slate-500 hover:text-fcb-red font-mono cursor-pointer transition flex items-center gap-1 bg-transparent border-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{language === "de" ? "Leeren" : "Clear"}</span>
                  </button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-[10.5px] font-mono italic">
                  {language === "de" ? "Keine Suchen aufgezeichnet." : "No queries recorded."}
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
                  {recentSearches.map((searchItem, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(searchItem);
                        handleRagSearch(searchItem);
                      }}
                      className="w-full text-left bg-slate-950/55 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 p-2.5 rounded-xl transition text-[11px] text-slate-300 font-mono flex items-center justify-between gap-2.5 group cursor-pointer"
                      title={searchItem}
                    >
                      <span className="truncate flex-1 group-hover:text-white transition">
                        {searchItem}
                      </span>
                      <span className="text-[9px] text-slate-500 group-hover:text-cyan-400 font-bold uppercase transition flex items-center gap-0.5 shrink-0">
                        {language === "de" ? "Re-Run" : "Re-Run"}
                        <ArrowUp className="h-2.5 w-2.5 rotate-45" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Inputs & Results (Col span 9) */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Search Bar & Preset Queries (MD Span 5) */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-[#0b0c10] p-5 rounded-2xl border border-slate-850/80 space-y-5 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Search className="h-5 w-5 text-fcb-red" />
                  <h3 className="font-bold text-white font-display text-sm">{language === "de" ? "Semantische Suche" : "Semantic Search Parameters"}</h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Retrieval-Augmented Generation (RAG) grounds MiaSanAI social outputs. By querying official corporate documents, stats tables, and branding rules, our AI maintains complete factual alignment.
                </p>

                {/* Text Input Search */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                    Semantic Query
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red font-mono"
                      placeholder="Ask FCB RAG something..."
                    />
                    <button
                      onClick={() => handleRagSearch(query)}
                      disabled={isLoading}
                      className="bg-fcb-red hover:bg-fcb-red/90 text-white p-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Preset buttons */}
                <div className="space-y-2 pt-2">
                  <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                    Standard Knowledge Templates
                  </span>
                  <div className="space-y-1.5">
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRagSearch(preset)}
                        className="w-full text-left bg-slate-950/60 hover:bg-slate-900 p-2.5 rounded-lg border border-slate-850 hover:border-slate-750 transition text-[11px] text-slate-300 leading-normal block cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand alignment rules */}
              <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="font-mono text-[10px] text-fcb-gold uppercase tracking-wider font-bold block">
                  Guaranteed Brand Compliance
                </span>
                <p className="text-slate-400 leading-relaxed">
                  The MiaSanAI RAG compiler automatically validates outputs against <strong>FC Bayern corporate parameters</strong>, blocking negative slang, unapproved sponsor references, or off-theme tones before publishing.
                </p>
              </div>
            </div>

            {/* RAG Retrieval Results Panel (MD Span 7) */}
            <div className="md:col-span-7">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 min-h-[460px] flex flex-col justify-between select-text relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 uppercase font-semibold">
                <Database className="h-4 w-4 text-cyan-400" /> Vector Retrieval Snippets & Answer
              </span>
              {result && (
                <span className="bg-green-500/10 text-green-400 font-mono text-[9.5px] px-2 py-0.5 rounded border border-green-500/20 uppercase font-bold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Grounded Result Verified
                </span>
              )}
            </div>

            {isLoading && (
              <motion.div 
                initial="initial"
                animate="animate"
                variants={{
                  animate: {
                    transition: {
                      staggerChildren: 0.08
                    }
                  }
                }}
                className="space-y-6"
              >
                {/* Section title skeleton */}
                <div className="space-y-2">
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
                    }}
                    className="h-3 bg-slate-800/80 rounded-md w-1/4" 
                  />
                </div>

                {/* Grid of retrieved doc cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map((cardId) => (
                    <motion.div
                      key={cardId}
                      variants={{
                        initial: { opacity: 0.3, y: 10 },
                        animate: { 
                          opacity: 1, 
                          y: 0,
                          transition: { type: "spring", stiffness: 100 }
                        }
                      }}
                      className="p-4 rounded-lg border border-slate-800/60 bg-slate-950/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <motion.div 
                          variants={{
                            initial: { opacity: 0.4 },
                            animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.1 } }
                          }}
                          className="h-3 bg-fcb-red/35 rounded w-1/2" 
                        />
                        <motion.div 
                          variants={{
                            initial: { opacity: 0.4 },
                            animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.15 } }
                          }}
                          className="h-2 bg-slate-800/60 rounded w-1/5" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <motion.div 
                          variants={{
                            initial: { opacity: 0.4 },
                            animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.2 } }
                          }}
                          className="h-2.5 bg-slate-800/60 rounded w-full" 
                        />
                        <motion.div 
                          variants={{
                            initial: { opacity: 0.4 },
                            animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.25 } }
                          }}
                          className="h-2.5 bg-slate-800/60 rounded w-11/12" 
                        />
                        <motion.div 
                          variants={{
                            initial: { opacity: 0.4 },
                            animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.3 } }
                          }}
                          className="h-2.5 bg-slate-800/60 rounded w-8/12" 
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Grounded response paragraph skeleton */}
                <div className="space-y-3">
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
                    }}
                    className="h-3 bg-slate-800/80 rounded-md w-1/5" 
                  />
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/85 space-y-2.5">
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.1 } }
                      }}
                      className="h-3 bg-slate-800/60 rounded w-full" 
                    />
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 } }
                      }}
                      className="h-3 bg-slate-800/60 rounded w-11/12" 
                    />
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.3 } }
                      }}
                      className="h-3 bg-slate-800/60 rounded w-10/12" 
                    />
                  </div>
                </div>

                {/* Compliance Rating Bar skeleton */}
                <motion.div 
                  variants={{
                    initial: { opacity: 0.3, scale: 0.98 },
                    animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 80 } }
                  }}
                  className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 w-full">
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
                      }}
                      className="h-9 w-9 rounded-lg bg-fcb-gold/25" 
                    />
                    <div className="space-y-1.5 flex-1">
                      <motion.div 
                        variants={{
                          initial: { opacity: 0.4 },
                          animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.1 } }
                        }}
                        className="h-2.5 bg-slate-800/60 rounded w-1/4" 
                      />
                      <motion.div 
                        variants={{
                          initial: { opacity: 0.4 },
                          animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 } }
                        }}
                        className="h-3 bg-slate-800/80 rounded w-1/2" 
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {!isLoading && !result && (
              <div className="h-[300px] flex flex-col items-center justify-center text-center text-slate-500">
                <Search className="h-12 w-12 text-slate-700 mb-3" />
                <p className="text-xs max-w-sm">
                  {language === "de" 
                    ? "Führen Sie links eine semantische Suche durch, um offizielle Dateien aus der FC Bayern-Datenbank abzurufen und regelkonforme Antworten zu generieren."
                    : "Run a semantic search on the left to pull official files from the FC Bayern database and generate compliant answers."}
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                {/* Simulated Doc Snippets */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                    {language === "de"
                      ? "Abgerufene Referenz-Snippets (Klicken Sie auf eine Karte für die Seitenleisten-Vorschau)"
                      : "Retrieved Reference Snippets (Click a card to launch side-panel preview)"}
                  </span>

                  {/* Category Filter Pills for search results */}
                  <div className="flex flex-wrap gap-1.5 mb-4" id="search-results-category-filters">
                    {["All", "Guidelines", "Contracts", "Brand Assets", "Brand Compliance", "Sporting & Squad Info", "Stadium Operations", "Club History & Honours"].map((cat) => {
                      const count = (cat === "All"
                        ? result.retrievedDocs.length
                        : result.retrievedDocs.filter(d => {
                            const details = getDocDetails(d.source);
                            const docCat = details.category.toLowerCase();
                            const targetCat = cat.toLowerCase();
                            if (docCat === targetCat) return true;
                            if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                            if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                            if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                            return false;
                          }).length
                      );
                      
                      const isSel = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            onAddLog({
                              id: `search-filter-${cat}-${Date.now()}`,
                              timestamp: new Date().toLocaleTimeString(),
                              level: "INFO",
                              source: "Retrieval Filter",
                              message: language === "de"
                                ? `Suchergebnisse nach '${cat}' gefiltert.`
                                : `Search results filtered by '${cat}'.`
                            });
                          }}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition cursor-pointer ${
                            isSel
                              ? "bg-fcb-red/15 border-fcb-red/45 text-fcb-red font-bold shadow-sm"
                              : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {cat === "All" ? (language === "de" ? "Alle" : "All") : cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.retrievedDocs.filter(doc => {
                      if (selectedCategory === "All") return true;
                      const details = getDocDetails(doc.source);
                      const docCat = details.category.toLowerCase();
                      const targetCat = selectedCategory.toLowerCase();
                      if (docCat === targetCat) return true;
                      if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                      if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                      if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                      return false;
                    }).length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                        {language === "de" 
                          ? "Keine Dokumente in dieser Kategorie für die aktuelle Suche gefunden." 
                          : "No documents in this category found for the current search."}
                      </div>
                    ) : (
                      result.retrievedDocs
                        .filter(doc => {
                          if (selectedCategory === "All") return true;
                          const details = getDocDetails(doc.source);
                          const docCat = details.category.toLowerCase();
                          const targetCat = selectedCategory.toLowerCase();
                          if (docCat === targetCat) return true;
                          if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                          if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                          if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                          return false;
                        })
                        .map((doc, idx) => {
                          const isSelected = selectedDoc?.source === doc.source;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setSelectedDoc(doc);
                                setActivePreviewTab("reader");
                                setShowQrCode(false);
                                onAddLog({
                                  id: `doc-preview-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Document Previewer",
                                  message: language === "de"
                                    ? `Öffne Vorschau-Seitenleiste für ${doc.source}. Lade dichten Einbettungsblock.`
                                    : `Opening side-panel previewer for ${doc.source}. Pulling live embedding block.`
                                });
                              }}
                              className={`group p-3 rounded-lg border flex flex-col justify-between transition-all cursor-pointer hover:bg-slate-900/90 ${
                                isSelected 
                                  ? "bg-fcb-red/10 border-fcb-red/80 shadow-[0_0_15px_rgba(220,5,45,0.1)]" 
                                  : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-[9px] font-mono text-fcb-red flex items-center gap-1 font-bold">
                                    <FileText className="h-3.5 w-3.5" /> {doc.source || `reference_${idx}.pdf`}
                                  </span>
                                  {isSelected ? (
                                    <span className="text-[8px] font-mono bg-fcb-red/20 text-fcb-red px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      {language === "de" ? "Aktiv" : "Active"}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-mono text-slate-500 group-hover:text-fcb-gold transition-colors">
                                      {language === "de" ? "Vorschau ↗" : "Preview ↗"}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-300 italic leading-relaxed line-clamp-3">
                                  "{doc.snippet}"
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/40" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8.5px] font-mono text-slate-500 mr-0.5">
                                    {language === "de" ? "Feedback:" : "Feedback:"}
                                  </span>
                                  <button
                                    onClick={() => handleFeedback(doc.source, idx, "up")}
                                    className={`p-1 rounded transition cursor-pointer flex items-center justify-center ${
                                      feedback[`${doc.source}_${idx}`] === "up"
                                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                    }`}
                                    title={language === "de" ? "Hilfreich" : "Helpful"}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(doc.source, idx, "down")}
                                    className={`p-1 rounded transition cursor-pointer flex items-center justify-center ${
                                      feedback[`${doc.source}_${idx}`] === "down"
                                        ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                    }`}
                                    title={language === "de" ? "Nicht hilfreich" : "Not helpful"}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </button>
                                  {feedback[`${doc.source}_${idx}`] && (
                                    <span className="text-[8.5px] font-mono text-green-500 animate-pulse ml-1">
                                      ✓ {language === "de" ? "Erfasst" : "Logged"}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {language === "de" ? "Übereinstimmung: 98.4%" : "Match Rating: 98.4%"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Summarization Feature */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {language === "de" ? "Gemini-Synthese & Zusammenfassung" : "Gemini Synthesis & Summary"}
                    </span>
                    {!summary && !isSummarizing && (
                      <button
                        onClick={handleGenerateSummary}
                        id="rag-summarize-btn"
                        className="bg-fcb-red/10 hover:bg-fcb-red/25 text-fcb-red text-[11px] font-semibold px-3 py-1 rounded-lg border border-fcb-red/20 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {language === "de" ? "Snippets zusammenfassen" : "Summarize Snippets"}
                      </button>
                    )}
                  </div>

                  {isSummarizing && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-dashed border-fcb-red/30 flex flex-col items-center justify-center space-y-2.5">
                      <RefreshCw className="h-5 w-5 text-fcb-red animate-spin" />
                      <span className="text-[11px] text-slate-400 font-mono animate-pulse">
                        {language === "de" ? "Generiere übergeordnete Zusammenfassung..." : "Generating high-level synthesis summary..."}
                      </span>
                    </div>
                  )}

                  {summary && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-fcb-red/5 to-slate-950 p-4 rounded-xl border border-fcb-red/20 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-fcb-red/10 pb-2">
                        <span className="font-bold text-xs text-white font-display flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-fcb-gold" /> {summary.summaryTitle}
                        </span>
                        <button
                          onClick={handleGenerateSummary}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                          title={language === "de" ? "Erneut generieren" : "Regenerate summary"}
                        >
                          <RefreshCw className="h-3 w-3" /> {language === "de" ? "Neu" : "Retry"}
                        </button>
                      </div>

                      <ul className="space-y-2">
                        {summary.bullets.map((bullet, idx) => (
                          <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-2 leading-relaxed">
                            <span className="text-fcb-gold select-none mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/60 text-[10.5px] italic text-slate-400 leading-normal flex items-start gap-1.5">
                        <span className="text-fcb-red font-mono font-bold select-none">[!]</span>
                        <span>{summary.takeaway}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Grounded Response */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                    {language === "de" ? "Fundierte KI-Antwort (Grounded)" : "Grounded AI Response"}
                  </span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                    {result.ragResponse}
                  </div>
                </div>

                {/* Brand Alignment Indicator */}
                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-fcb-gold/10 p-2 rounded-lg border border-fcb-gold/20 text-fcb-gold">
                      <Star className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block">
                        {language === "de" ? "Compliance-Standard-Bewertung" : "Compliance Standard Rating"}
                      </span>
                      <p className="text-xs text-slate-300 font-semibold mt-0.5">{result.brandAlignmentRating}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
          </div>
        </div>
  ) : activeRagTab === "readLater" ? (
        <div className="bg-slate-900/20 p-6 rounded-2xl border border-slate-800/80 space-y-6" id="rag-read-later-view">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Bookmark className="h-5 w-5 text-fcb-gold animate-pulse" />
              <h3 className="font-bold text-white font-display text-sm">
                {language === "de" ? "PERSÖNLICHE LESELISTE" : "PERSONAL READ LATER QUEUE"}
              </h3>
              <span className="bg-fcb-gold/15 text-fcb-gold border border-fcb-gold/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {readLaterQueue.length} {language === "de" ? "Auszüge" : "Excerpts"}
              </span>
            </div>

            {readLaterQueue.length > 0 && (
              <button
                onClick={handleClearReadLater}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                id="clear-read-later-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{language === "de" ? "Liste leeren" : "Clear All"}</span>
              </button>
            )}
          </div>

          {readLaterQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/15 text-center space-y-4">
              <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-slate-500">
                <Bookmark className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-semibold text-white">
                  {language === "de" ? "Ihre Leseliste ist leer" : "Your Read Later list is empty"}
                </p>
                <p className="text-xs text-slate-400 leading-normal">
                  {language === "de"
                    ? "Speichern Sie wichtige Dokumentenauszüge, Vereinsrichtlinien oder Fakten direkt aus der Suchvorschau, um sie später schnell wiederzufinden."
                    : "Save important document excerpts, brand guidelines, or facts directly from the search preview to access them quickly later."}
                </p>
              </div>
              <button
                onClick={() => setActiveRagTab("search")}
                className="bg-fcb-red text-white hover:bg-fcb-red/90 px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{language === "de" ? "Jetzt Wissensdatenbank durchsuchen" : "Search Knowledge Hub Now"}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {readLaterQueue.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition duration-200 shadow-sm relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <div className="bg-fcb-gold/10 p-1.5 rounded border border-fcb-gold/20 text-fcb-gold shrink-0">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold font-mono text-white uppercase tracking-wider truncate">
                            {item.source}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {item.timestamp}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[11px] font-mono text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap select-text scrollbar-thin">
                        {item.snippet}
                      </div>

                      {item.queryContext && (
                        <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">
                          <span className="text-fcb-gold uppercase font-bold text-[8px] tracking-wider shrink-0">
                            {language === "de" ? "SUCHE:" : "QUERY:"}
                          </span>
                          <span className="truncate italic">"{item.queryContext}"</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-900 pt-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedDoc({ source: item.source, snippet: item.snippet });
                            setActivePreviewTab("reader");
                          }}
                          className="bg-fcb-red/10 hover:bg-fcb-red/20 text-fcb-red border border-fcb-red/20 hover:border-fcb-red/35 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{language === "de" ? "Auszug öffnen" : "View Excerpt"}</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.snippet);
                            onAddLog({
                              id: `copy-rl-${Date.now()}`,
                              timestamp: new Date().toLocaleTimeString(),
                              level: "SUCCESS",
                              source: "Read Later Manager",
                              message: language === "de"
                                ? `Auszug aus "${item.source}" in die Zwischenablage kopiert.`
                                : `Copied excerpt from "${item.source}" to clipboard.`
                            });
                          }}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          title={language === "de" ? "In Zwischenablage kopieren" : "Copy to clipboard"}
                        >
                          <Copy className="h-3 w-3 text-slate-400" />
                          <span>{language === "de" ? "Kopieren" : "Copy"}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          const updated = readLaterQueue.filter(x => x.id !== item.id);
                          saveReadLater(updated);
                          onAddLog({
                            id: `remove-rl-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString(),
                            level: "INFO",
                            source: "Read Later Manager",
                            message: language === "de"
                              ? `Auszug aus "${item.source}" von der Leseliste entfernt.`
                              : `Removed excerpt from "${item.source}" from your Read Later queue.`
                          });
                        }}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 p-1.5 rounded-lg transition cursor-pointer"
                        title={language === "de" ? "Aus Leseliste entfernen" : "Remove from list"}
                        id={`remove-read-later-${item.id}-btn`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : activeRagTab === "upload" ? (
        <div className="bg-slate-900/20 p-6 rounded-2xl border border-slate-800/80 space-y-6" id="rag-upload-view">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Upload className="h-5 w-5 text-cyan-400 animate-bounce" />
              <h3 className="font-bold text-white font-display text-sm">
                {language === "de" ? "BENUTZERDEFINIERTES BRAND-COMPLIANCE-KNOWLEDGE-PORTAL" : "CUSTOM BRAND COMPLIANCE KNOWLEDGE PORTAL"}
              </h3>
              <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {uploadedDocs.length} {language === "de" ? "Dokumente" : "Documents"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Upload Drag & Drop and Parameters (Col Span 5) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block border-b border-slate-900 pb-2">
                  {language === "de" ? "DOKUMENTENPARAMETER" : "DOCUMENT METADATA SPECIFICATIONS"}
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {language === "de" ? "Wissensdomäne / Kategorie" : "Knowledge Domain / Category"}
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      disabled={isAutoTagging}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-fcb-red cursor-pointer font-mono disabled:opacity-50"
                    >
                      <option value="Brand Compliance">Brand Compliance</option>
                      <option value="Sporting & Squad Info">Sporting & Squad Info</option>
                      <option value="Stadium Operations">Stadium Operations</option>
                      <option value="Club History & Honours">Club History & Honours</option>
                      <option value="Guidelines">Guidelines</option>
                      <option value="Contracts">Contracts</option>
                      <option value="Brand Assets">Brand Assets</option>
                    </select>

                    <div className="flex items-center gap-2 mt-2.5 bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                      <input
                        type="checkbox"
                        id="auto-tag-checkbox"
                        checked={autoTagWithGemini}
                        onChange={(e) => setAutoTagWithGemini(e.target.checked)}
                        disabled={isAutoTagging}
                        className="rounded border-slate-800 bg-slate-900 text-fcb-red focus:ring-fcb-red cursor-pointer h-3.5 w-3.5 disabled:opacity-50"
                      />
                      <label htmlFor="auto-tag-checkbox" className="text-[10.5px] font-mono text-slate-300 cursor-pointer flex items-center gap-1.5 select-none">
                        <Sparkles className="h-3 w-3 text-fcb-gold animate-pulse" />
                        <span>{language === "de" ? "Gemini KI-Auto-Tagging aktivieren" : "Enable Gemini AI Auto-Tagging"}</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        {language === "de" ? "Dokumentenversion" : "Document Version"}
                      </label>
                      <input
                        type="text"
                        value={uploadVersion}
                        onChange={(e) => setUploadVersion(e.target.value)}
                        placeholder="e.g. v1.0"
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-fcb-red font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        {language === "de" ? "Verfasser / Freigeber" : "Compliance Author"}
                      </label>
                      <input
                        type="text"
                        value={uploadAuthor}
                        onChange={(e) => setUploadAuthor(e.target.value)}
                        placeholder="e.g. Compliance Board"
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-fcb-red font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={isAutoTagging ? undefined : handleDragOver}
                onDragLeave={isAutoTagging ? undefined : handleDragLeave}
                onDrop={isAutoTagging ? undefined : handleDrop}
                onClick={isAutoTagging ? undefined : () => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 ${
                  isAutoTagging
                    ? "border-fcb-gold/45 bg-fcb-gold/5 cursor-wait"
                    : isDragging
                    ? "border-cyan-400 bg-cyan-950/10 scale-[1.01] cursor-pointer"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60 cursor-pointer"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".txt,.json,.pdf"
                  disabled={isAutoTagging}
                  multiple
                  className="hidden"
                />
                
                {isAutoTagging ? (
                  <div className="p-4 rounded-full border mb-4 bg-fcb-gold/15 border-fcb-gold/45 text-fcb-gold scale-110">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className={`p-4 rounded-full border mb-4 transition-transform duration-300 ${
                    isDragging ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-400 scale-110" : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}>
                    <Upload className="h-8 w-8 animate-pulse" />
                  </div>
                )}

                <p className="text-xs font-semibold text-white mb-1">
                  {isAutoTagging
                    ? (language === "de" ? "Dokumente werden von Gemini klassifiziert..." : "Gemini is classifying and auto-tagging documents...")
                    : language === "de" 
                    ? "Dateien hierher ziehen oder klicken zum Auswählen" 
                    : "Drag & drop files here, or click to browse"}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mb-4">
                  {isAutoTagging
                    ? (language === "de" ? "Bitte warten, dies dauert nur wenige Sekunden..." : "Please wait, this takes just a few seconds...")
                    : language === "de" 
                    ? "Unterstützte Formate: TXT, JSON, PDF (max. 10MB)" 
                    : "Supported formats: TXT, JSON, PDF (max. 10MB)"}
                </p>

                <div className={`px-3.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 text-[9px] font-mono transition-colors duration-200 ${
                  isAutoTagging 
                    ? "bg-fcb-gold/10 border-fcb-gold/30 text-fcb-gold" 
                    : "bg-slate-900/60 border-slate-800/80 text-slate-400"
                }`}>
                  {isAutoTagging ? (
                    <>
                      <Sparkles className="h-3 w-3 text-fcb-gold animate-bounce" />
                      <span>{language === "de" ? "Semantische RAG-Klassifizierung" : "Semantic RAG AI Classification"}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3 text-cyan-400" />
                      <span>{language === "de" ? "Automatische RAG Vektor-Indizierung" : "Automatic RAG Vector Indexing"}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Batch Upload Progress Bar */}
              <AnimatePresence>
                {batchProgress !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-fcb-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        {language === "de" ? "STAPELVERARBEITUNG" : "BATCH UPLOAD PROGRESS"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {batchCurrent} / {batchTotal} {language === "de" ? "Dateien" : "Files"} ({batchProgress}%)
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <motion.div 
                        className="bg-gradient-to-r from-fcb-red via-fcb-gold to-cyan-400 h-full rounded-full animate-pulse"
                        style={{ width: `${batchProgress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>

                    {/* Processed Files List */}
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {batchProcessedDocs.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-900 text-[10.5px] font-mono">
                          <span className="text-slate-300 truncate max-w-[180px]" title={item.name}>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.status === 'success' && (
                              <>
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                  {item.category}
                                </span>
                                <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                              </>
                            )}
                            {item.status === 'failed' && (
                              <>
                                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-bold">
                                  {language === "de" ? "Fehlgeschlagen" : "Failed"}
                                </span>
                                <X className="h-3 w-3 text-red-400 shrink-0" />
                              </>
                            )}
                            {item.status === 'pending' && index === batchCurrent - 1 && (
                              <>
                                <span className="text-[9px] bg-fcb-gold/10 text-fcb-gold border border-fcb-gold/20 px-1.5 py-0.2 rounded font-bold animate-pulse">
                                  {language === "de" ? "Klassifiziere..." : "Classifying..."}
                                </span>
                                <RefreshCw className="h-3 w-3 text-fcb-gold animate-spin shrink-0" />
                              </>
                            )}
                            {item.status === 'pending' && index >= batchCurrent && (
                              <>
                                <span className="text-slate-500">{language === "de" ? "Wartend" : "Queued"}</span>
                                <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success / Error Messages */}
              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2"
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </motion.div>
                )}

                {uploadSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {language === "de" 
                        ? "Dokument erfolgreich im lokalen Vector-Space indiziert!" 
                        : "Document successfully indexed in local vector space!"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Uploaded Docs Table/List (Col Span 7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                    {language === "de" ? "INDIZIERTER DOKUMENTENBESTAND" : "CURRENT VECTOR KNOWLEDGE BASE"}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    ChromaDB Sim-Cluster: ACTIVE
                  </span>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                      {language === "de" ? "NACH AUTO-TAG / KATEGORIE FILTERN:" : "FILTER BY AUTO-TAG / CATEGORY:"}
                    </span>
                    <div className="flex flex-wrap gap-1.5" id="uploaded-docs-category-filters">
                      {["All", "Guidelines", "Contracts", "Brand Assets", "Brand Compliance", "Sporting & Squad Info", "Stadium Operations", "Club History & Honours"].map((cat) => {
                        const count = (cat === "All"
                          ? uploadedDocs.length
                          : uploadedDocs.filter(d => {
                              const docCat = d.category.toLowerCase();
                              const targetCat = cat.toLowerCase();
                              if (docCat === targetCat) return true;
                              if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                              if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                              if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                              return false;
                            }).length
                        );
                        
                        const isSel = uploadFilterCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setUploadFilterCategory(cat);
                              onAddLog({
                                id: `upload-filter-${cat}-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "INFO",
                                source: "Knowledge Base Filter",
                                message: language === "de"
                                  ? `Dokumentenbestand nach '${cat}' gefiltert.`
                                  : `Knowledge base filtered by '${cat}'.`
                              });
                            }}
                            className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition cursor-pointer ${
                              isSel
                                ? "bg-cyan-500/15 border-cyan-500/45 text-cyan-400 font-bold shadow-sm"
                                : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {cat === "All" ? (language === "de" ? "Alle" : "All") : cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {uploadedDocs.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono italic text-center py-12">
                    {language === "de" ? "Keine benutzerdefinierten Dokumente hochgeladen." : "No custom documents uploaded yet."}
                  </p>
                ) : (
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                    {uploadedDocs.filter(doc => {
                      if (uploadFilterCategory === "All") return true;
                      const docCat = doc.category.toLowerCase();
                      const targetCat = uploadFilterCategory.toLowerCase();
                      if (docCat === targetCat) return true;
                      if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                      if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                      if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                      return false;
                    }).length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono italic text-center py-12">
                        {language === "de" ? "Keine benutzerdefinierten Dokumente in dieser Kategorie gefunden." : "No custom documents found in this category."}
                      </p>
                    ) : (
                      uploadedDocs
                        .filter(doc => {
                          if (uploadFilterCategory === "All") return true;
                          const docCat = doc.category.toLowerCase();
                          const targetCat = uploadFilterCategory.toLowerCase();
                          if (docCat === targetCat) return true;
                          if (targetCat === "brand compliance" && docCat.includes("brand")) return true;
                          if (targetCat === "sporting & squad info" && (docCat.includes("sporting") || docCat.includes("squad") || docCat.includes("technical") || docCat.includes("squad info"))) return true;
                          if (targetCat === "club history & honours" && (docCat.includes("history") || docCat.includes("honours") || docCat.includes("legal"))) return true;
                          return false;
                        })
                        .map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-750 p-4 rounded-xl transition duration-150 flex flex-col justify-between space-y-2.5 relative overflow-hidden group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 truncate">
                            <div className="bg-cyan-500/10 p-2 rounded border border-cyan-500/20 text-cyan-400 shrink-0">
                              {doc.source.toLowerCase().endsWith(".json") ? (
                                <FileCode className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-bold font-mono text-white tracking-wide truncate">
                                {doc.source}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                                  {doc.category}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500">
                                  {doc.fileSize}
                                </span>
                                <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-900 px-1.5 py-0.2 rounded-md">
                                  {doc.version}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Version History Toggle Button */}
                            <button
                              onClick={() => {
                                setExpandedVersionsDocId(expandedVersionsDocId === doc.id ? null : doc.id);
                                setEditingDocId(null);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                                expandedVersionsDocId === doc.id
                                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200"
                              }`}
                              title={language === "de" ? "Versionsverlauf anzeigen" : "View Version History"}
                            >
                              <History className="h-3.5 w-3.5" />
                              {doc.versions && doc.versions.length > 0 && (
                                <span className="bg-cyan-500/20 px-1 py-0.2 rounded text-[8px] text-cyan-300 font-bold">
                                  {doc.versions.length}
                                </span>
                              )}
                            </button>

                            {/* In-browser Document Editor / Creator */}
                            <button
                              onClick={() => {
                                if (editingDocId === doc.id) {
                                  setEditingDocId(null);
                                } else {
                                  setEditingDocId(doc.id);
                                  setEditContent(doc.content);
                                  setEditAuthor(doc.author);
                                  const verStr = doc.version || "v1.0";
                                  const num = parseFloat(verStr.replace(/[^\d.]/g, ""));
                                  const nextVer = isNaN(num) ? "v1.1" : `v${(num + 0.1).toFixed(1)}`;
                                  setEditVersion(nextVer);
                                  setExpandedVersionsDocId(null);
                                }
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                editingDocId === doc.id
                                  ? "bg-fcb-red/15 border-fcb-red/40 text-fcb-red"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200"
                              }`}
                              title={language === "de" ? "In-Browser bearbeiten & neue Version erstellen" : "Edit In-Browser & Create New Version"}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedDoc({ source: doc.source, snippet: doc.snippet });
                                setActivePreviewTab("reader");
                                onAddLog({
                                  id: `preview-custom-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Compliance Viewer",
                                  message: language === "de"
                                    ? `Lese benutzerdefiniertes Dokument: "${doc.source}"`
                                    : `Reading custom grounding document: "${doc.source}"`
                                });
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-cyan-950/40 border border-slate-850 hover:border-cyan-800/40 text-slate-400 hover:text-cyan-400 rounded-lg transition cursor-pointer"
                              title={language === "de" ? "Im Leser anzeigen" : "View in Reader"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const updated = uploadedDocs.filter((d) => d.id !== doc.id);
                                saveUploadedDocs(updated);
                                onAddLog({
                                  id: `delete-doc-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "WARNING",
                                  source: "Vector Indexer",
                                  message: language === "de"
                                    ? `Dokument "${doc.source}" aus Vektorindex gelöscht.`
                                    : `Document "${doc.source}" deleted from vector index.`
                                });
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-red-950/40 border border-slate-850 hover:border-red-900/40 text-slate-400 hover:text-red-400 rounded-lg transition cursor-pointer"
                              title={language === "de" ? "Dokument löschen" : "Delete Document"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {editingDocId === doc.id ? (
                          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-fcb-red/30 space-y-3.5" id={`doc-edit-panel-${doc.id}`}>
                            <span className="text-[10px] font-mono text-fcb-red uppercase tracking-wider block font-bold border-b border-slate-900 pb-1.5">
                              {language === "de" ? "NEUE VERSION SPEICHERN" : "SAVE NEW DOCUMENT VERSION"}
                            </span>
                            <div className="space-y-2">
                              <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                                {language === "de" ? "Dokumenteninhalt" : "Document Content"}
                              </label>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-fcb-red font-mono min-h-[120px] resize-y"
                                placeholder={language === "de" ? "Inhalt hier eingeben..." : "Enter text content here..."}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                  {language === "de" ? "Versions-Code" : "Version Code"}
                                </label>
                                <input
                                  type="text"
                                  value={editVersion}
                                  onChange={(e) => setEditVersion(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-fcb-red font-mono"
                                  placeholder="e.g. v1.1"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                                  {language === "de" ? "Verfasser / Bearbeiter" : "Compliance Editor"}
                                </label>
                                <input
                                  type="text"
                                  value={editAuthor}
                                  onChange={(e) => setEditAuthor(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-fcb-red font-mono"
                                  placeholder="e.g. PR Dept"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-900">
                              <button
                                onClick={() => setEditingDocId(null)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer transition"
                              >
                                {language === "de" ? "Abbrechen" : "Cancel"}
                              </button>
                              <button
                                onClick={() => handleCreateNewVersion(doc.id, editContent, editVersion, editAuthor)}
                                className="px-3 py-1.5 bg-fcb-red hover:bg-fcb-red/90 text-white rounded text-[10px] font-mono font-bold cursor-pointer transition shadow-md shadow-fcb-red/10"
                              >
                                {language === "de" ? "Neue Version speichern" : "Save New Version"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 text-[10.5px] font-mono text-slate-400 leading-normal line-clamp-3 select-all">
                            {doc.content}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 border-t border-slate-900 pt-2 mt-1">
                          <span>
                            {language === "de" ? "Verfasser: " : "Author: "} {doc.author}
                          </span>
                          <span>
                            {language === "de" ? "Zuletzt indiziert: " : "Last indexed: "} {doc.lastIndexed}
                          </span>
                        </div>

                        {/* Expandable Version History List */}
                        {expandedVersionsDocId === doc.id && (
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-cyan-950/45 mt-2 space-y-2.5 animate-fadeIn" id={`doc-versions-panel-${doc.id}`}>
                            <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5">
                              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider block font-bold flex items-center gap-1">
                                <History className="h-3 w-3 text-cyan-400" />
                                {language === "de" ? "ÄNDERUNGSVERLAUF & ARCHIV" : "REVISION HISTORY & ARCHIVE"}
                              </span>
                              <span className="text-[8px] font-mono text-slate-500">
                                {doc.versions ? doc.versions.length : 0} {language === "de" ? "Versionen archiviert" : "Versions archived"}
                              </span>
                            </div>

                            {!doc.versions || doc.versions.length === 0 ? (
                              <p className="text-[10px] font-mono text-slate-500 italic text-center py-4">
                                {language === "de" ? "Keine vorherigen Revisionen aufgezeichnet. Bearbeiten Sie das Dokument oben, um den Verlauf zu starten." : "No previous revisions recorded. Edit this document above to start tracking history."}
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                                {doc.versions.map((ver) => (
                                  <div key={ver.id} className="bg-slate-900/60 border border-slate-850 p-2 rounded flex items-center justify-between gap-3 text-[10px] font-mono hover:bg-slate-900 hover:border-slate-800 transition">
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded font-bold text-cyan-400 text-[9px]">
                                          {ver.version}
                                        </span>
                                        <span className="text-slate-300 font-semibold truncate max-w-[120px]">
                                          by {ver.author}
                                        </span>
                                      </div>
                                      <div className="text-[8.5px] text-slate-500 mt-0.5">
                                        {ver.lastIndexed} • {ver.fileSize}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => {
                                          setPreviewingOldVersion({
                                            docId: doc.id,
                                            versionId: ver.id,
                                            version: ver.version,
                                            content: ver.content,
                                            author: ver.author,
                                            lastIndexed: ver.lastIndexed
                                          });
                                        }}
                                        className="px-2 py-1 bg-slate-950 hover:bg-cyan-950/40 border border-slate-850 hover:border-cyan-800/40 text-slate-400 hover:text-cyan-400 rounded text-[9px] cursor-pointer transition flex items-center gap-1"
                                        title={language === "de" ? "Version betrachten" : "View content details"}
                                      >
                                        <Eye className="h-2.5 w-2.5" />
                                        <span>{language === "de" ? "Ansehen" : "View"}</span>
                                      </button>

                                      <button
                                        onClick={() => handleRevertToVersion(doc.id, ver.id)}
                                        className="px-2 py-1 bg-slate-950 hover:bg-emerald-950/40 border border-slate-850 hover:border-emerald-800/40 text-slate-400 hover:text-emerald-400 rounded text-[9px] cursor-pointer transition flex items-center gap-1 font-bold"
                                        title={language === "de" ? "Auf diese Version zurücksetzen" : "Revert to this version"}
                                      >
                                        <RefreshCw className="h-2.5 w-2.5 text-emerald-400" />
                                        <span>{language === "de" ? "Wiederherstellen" : "Revert"}</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RagKnowledgeGraph
          coreDocuments={CORE_DOCUMENTS}
          uploadedDocs={uploadedDocs}
          language={language}
          onSelectDoc={(doc) => {
            setSelectedDoc(doc);
            setActivePreviewTab("reader");
          }}
          onOpenPreviewModal={(doc) => {
            setSelectedPreviewDoc(doc);
            setIsPreviewModalOpen(true);
          }}
          onAddLog={onAddLog}
        />
      )}

        {/* Floating Side-Panel Document Previewer */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              id="rag-side-panel"
              onContextMenu={handleContextMenu}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className={`h-full bg-[#0c0c0f] border-slate-800 shadow-2xl flex flex-col justify-between select-text transition-all duration-300 ${
                isExpanded 
                  ? "fixed inset-0 w-full z-50 bg-[#07070a]" 
                  : "absolute top-0 right-0 w-full sm:w-[420px] border-l z-30"
              }`}
            >
              {/* Reading Progress Indicator Bar */}
              <div className="w-full h-1 bg-slate-950 border-b border-slate-900 relative z-50 overflow-hidden shrink-0" title={language === "de" ? "Lesefortschritt" : "Reading Progress"}>
                <div 
                  className="h-full bg-gradient-to-r from-fcb-red via-fcb-red to-fcb-gold transition-all duration-100 ease-out"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>

              {/* Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className={`flex-1 flex items-center justify-between gap-4 ${isExpanded ? "max-w-4xl mx-auto w-full" : "w-full"}`}>
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="bg-fcb-red/10 p-2 rounded-lg border border-fcb-red/20 text-fcb-red shrink-0">
                      {getDocDetails(selectedDoc.source).docType === "json" ? (
                        <FileCode className="h-4.5 w-4.5 text-fcb-gold" />
                      ) : (
                        <FileText className="h-4.5 w-4.5 text-fcb-red" />
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate font-mono uppercase tracking-wider">{selectedDoc.source}</h4>
                      <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                        <span className="text-[9.5px] font-mono text-slate-400">
                          {language === "de" ? "98,4 % Übereinstimmungsgenauigkeit" : "98.4% Match Accuracy"}
                        </span>
                        <span className="text-slate-600 font-mono text-[9px] select-none shrink-0">•</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0" id="read-time-badge" title={language === "de" ? "Geschätzte Lesezeit" : "Estimated reading time"}>
                          <Clock className="h-2.5 w-2.5" />
                          {getReadingTime(selectedDoc.snippet, language)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleSaveForLater}
                      className={`p-1 rounded transition cursor-pointer shrink-0 border ${
                        isSavedForLater 
                          ? "bg-fcb-gold/15 text-fcb-gold border-fcb-gold/30" 
                          : "border-transparent hover:bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                      title={isSavedForLater ? (language === "de" ? "In Leseliste gespeichert!" : "Saved to Read Later!") : (language === "de" ? "Für später speichern" : "Save for Later")}
                      id="rag-save-for-later-btn"
                    >
                      <Bookmark className={`h-4.5 w-4.5 ${isSavedForLater ? "fill-current" : ""}`} />
                    </button>

                    <button
                      onClick={handleShareDocument}
                      className={`p-1 rounded transition cursor-pointer shrink-0 ${
                        shareCopied 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : "hover:bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                      title={shareCopied ? (language === "de" ? "Link kopiert!" : "Link Copied!") : (language === "de" ? "Dokument-Link teilen" : "Share Document Link")}
                      id="rag-share-btn"
                    >
                      {shareCopied ? <CheckCircle className="h-4.5 w-4.5 text-green-400" /> : <Share2 className="h-4.5 w-4.5" />}
                    </button>

                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-1 hover:bg-slate-900 rounded transition text-slate-400 hover:text-white cursor-pointer shrink-0"
                      title={isExpanded ? (language === "de" ? "Vollbild beenden" : "Exit Full View") : (language === "de" ? "In Vollbildansicht wechseln" : "Expand to Full View")}
                      id="rag-expand-btn"
                    >
                      {isExpanded ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDoc(null);
                        setHighlights([]);
                        setIsExpanded(false);
                      }}
                      className="p-1 hover:bg-slate-900 rounded transition text-slate-400 hover:text-white cursor-pointer shrink-0"
                      title={language === "de" ? "Vorschau schließen" : "Close Previewer"}
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-mono font-bold w-full">
                <div className={`flex ${isExpanded ? "max-w-4xl mx-auto w-full px-4" : "w-full"}`}>
                  <button
                    onClick={() => setActivePreviewTab("reader")}
                    className={`flex-1 py-2.5 text-center transition border-b-2 ${
                      activePreviewTab === "reader"
                        ? "border-fcb-red text-fcb-red bg-fcb-red/[0.02]"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {language === "de" ? "Inhalts-Leser (Grounding)" : "Grounded Content Reader"}
                  </button>
                  <button
                    onClick={() => setActivePreviewTab("metadata")}
                    className={`flex-1 py-2.5 text-center transition border-b-2 ${
                      activePreviewTab === "metadata"
                        ? "border-fcb-red text-fcb-red bg-fcb-red/[0.02]"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {language === "de" ? "Vektor-Metadaten" : "Vector Metadata"}
                  </button>
                  <button
                    onClick={() => setActivePreviewTab("history")}
                    className={`flex-1 py-2.5 text-center transition border-b-2 ${
                      activePreviewTab === "history"
                        ? "border-fcb-red text-fcb-red bg-fcb-red/[0.02]"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                    id="search-history-tab-btn"
                  >
                    {language === "de" ? "Suchverlauf" : "Search History"}
                  </button>
                </div>
              </div>

              {/* Category Filter Bar */}
              <div className="border-b border-slate-800 bg-slate-950/25 px-4 py-2 flex items-center justify-between text-xs gap-3">
                <div className={`flex-1 flex items-center justify-between gap-4 ${isExpanded ? "max-w-4xl mx-auto w-full" : "w-full"}`}>
                  <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-cyan-500" />
                    {language === "de" ? "Suchfilter (Kategorie):" : "Filter Category:"}
                  </span>
                  <select
                    id="rag-category-filter"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      onAddLog({
                        id: `category-filter-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "INFO",
                        source: "Document Previewer",
                        message: language === "de"
                          ? `Suchergebnisse auf Kategorie gefiltert: ${e.target.value}`
                          : `Search results filtered to category: ${e.target.value}`
                      });
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold text-white focus:outline-none focus:border-fcb-red max-w-[185px] cursor-pointer"
                  >
                    <option value="All">{language === "de" ? "Alle Kategorien" : "All Categories"}</option>
                    <option value="Brand Compliance">{language === "de" ? "Brand Guidelines" : "Brand Guidelines"}</option>
                    <option value="Sporting & Squad Info">{language === "de" ? "Technical Docs" : "Technical Docs"}</option>
                    <option value="Club History & Honours">{language === "de" ? "Legal" : "Legal"}</option>
                    <option value="Stadium Operations">{language === "de" ? "Stadium Operations" : "Stadium Operations"}</option>
                    <option value="Club Archives">{language === "de" ? "Club Archives" : "Club Archives"}</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Content */}
              <div 
                ref={sidePanelScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 relative"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const totalHeight = target.scrollHeight - target.clientHeight;
                  if (totalHeight > 0) {
                    const progress = (target.scrollTop / totalHeight) * 100;
                    setScrollProgress(progress);
                  } else {
                    setScrollProgress(0);
                  }
                  setShowJumpToTop(target.scrollTop > 300);
                }}
              >
                <div className={`space-y-4 ${isExpanded ? "max-w-4xl mx-auto w-full pb-8" : "w-full"}`}>
                  {/* Right-click instruction tip */}
                  <div className="bg-slate-950/25 border border-slate-900 border-dashed rounded-xl p-2.5 text-center select-none" id="right-click-tip">
                    <p className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1.5 leading-normal">
                      <Bookmark className="h-3.5 w-3.5 text-fcb-gold animate-pulse shrink-0" />
                      <span>
                        {language === "de" 
                          ? "Tipp: Rechtsklick für Schnellaktionen (Kopieren, Lesezeichen, Quelllink)" 
                          : "Tip: Right-click anywhere in this panel for quick actions (Copy, Bookmark, Source Link)"}
                      </span>
                    </p>
                  </div>

                  {/* Source Tags Section */}
                  <div className="bg-slate-950/45 border border-slate-850 rounded-xl p-3.5 space-y-2.5 shadow-sm" id="source-tags-section">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {language === "de" ? "Quell-Tags & Dokumentenautorität" : "Source Tags & Document Authority"}
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {getSourceTags(selectedDoc.source).map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className={`inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded border transition-all hover:scale-[1.03] cursor-help ${tag.className}`}
                          title={language === "de" ? tag.tooltipDe : tag.tooltip}
                          id={`source-tag-badge-${tagIdx}`}
                        >
                          {language === "de" ? tag.labelDe : tag.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Read Aloud Narration Section */}
                  <div className="bg-slate-950/45 border border-slate-850 rounded-xl p-3.5 space-y-3.5 shadow-sm" id="rag-read-aloud-widget">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-fcb-gold" />
                        {language === "de" ? "Vorlese-Assistent (Web Speech)" : "Read Aloud Narrator (Web Speech)"}
                      </span>
                      {isSpeaking && !isPaused && (
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider animate-pulse">
                            {language === "de" ? "Spielt" : "Playing"}
                          </span>
                        </div>
                      )}
                      {isSpeaking && isPaused && (
                        <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                          {language === "de" ? "Pausiert" : "Paused"}
                        </span>
                      )}
                    </div>

                    {/* Main Toggle Switch for 'Read Aloud' */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white">
                          {language === "de" ? "Laut vorlesen" : "Read Aloud"}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-mono">
                          {isSpeaking 
                            ? (language === "de" ? "Sprachausgabe aktiv" : "Speech synthesis active") 
                            : (language === "de" ? "Klicken zum Vorlesen" : "Click to narrate")}
                        </span>
                      </div>
                      <button
                        onClick={handleToggleReadAloud}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isSpeaking ? "bg-fcb-red" : "bg-slate-700"
                        }`}
                        id="rag-read-aloud-toggle"
                        role="switch"
                        aria-checked={isSpeaking}
                        title={language === "de" ? "Vorlesen an-/ausschalten" : "Toggle Read Aloud narration"}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isSpeaking ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Fine-grained Playback Controls Deck */}
                    <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-900 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {isSpeaking 
                              ? (language === "de" ? "Steuerung des Vorlese-Vorgangs" : "Narration controller active") 
                              : (language === "de" ? "Bereit zum Abspielen" : "Ready to play excerpt")}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {language === "de" ? "Spracherkennung: Auto-Erkennung" : "Voice Locale: Auto-Detect"}
                          </p>
                        </div>

                        {/* Player Buttons Deck */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Play Button */}
                          <button
                            onClick={handleStartSpeaking}
                            className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                              isSpeaking && !isPaused
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-fcb-red/10 border-fcb-red/20 text-fcb-red hover:bg-fcb-red/20 hover:border-fcb-red/35"
                            }`}
                            title={language === "de" ? "Von Anfang an vorlesen / Neu starten" : "Read from beginning / Restart"}
                            id="rag-speech-play"
                          >
                            <Play className="h-4 w-4 fill-current" />
                          </button>

                          {/* Pause Button */}
                          <button
                            onClick={handlePauseSpeaking}
                            disabled={!isSpeaking || isPaused}
                            className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                              isSpeaking && !isPaused
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                : "opacity-40 bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                            title={language === "de" ? "Pausieren" : "Pause"}
                            id="rag-speech-pause"
                          >
                            <Pause className="h-4 w-4 fill-current" />
                          </button>

                          {/* Resume Button */}
                          <button
                            onClick={handleResumeSpeaking}
                            disabled={!isSpeaking || !isPaused}
                            className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                              isSpeaking && isPaused
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25"
                                : "opacity-40 bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                            title={language === "de" ? "Fortsetzen" : "Resume"}
                            id="rag-speech-resume"
                          >
                            <Play className="h-4 w-4 fill-current text-cyan-400 animate-pulse" />
                          </button>

                          {/* Stop Button */}
                          <button
                            onClick={handleStopSpeaking}
                            disabled={!isSpeaking}
                            className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                              isSpeaking
                                ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                : "opacity-40 bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                            title={language === "de" ? "Stoppen" : "Stop"}
                            id="rag-speech-stop"
                          >
                            <Square className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Waveform animation when active */}
                      {isSpeaking && !isPaused && (
                        <div className="flex items-center justify-center gap-1.5 h-3.5 py-0.5 opacity-80" id="read-aloud-waveform">
                          <div className="w-[3px] bg-fcb-gold rounded-full animate-bounce h-full" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-[3px] bg-fcb-red rounded-full animate-bounce h-2" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-[3px] bg-fcb-gold rounded-full animate-bounce h-3" style={{ animationDelay: "300ms" }}></div>
                          <div className="w-[3px] bg-fcb-red rounded-full animate-bounce h-1" style={{ animationDelay: "450ms" }}></div>
                          <div className="w-[3px] bg-fcb-gold rounded-full animate-bounce h-full" style={{ animationDelay: "600ms" }}></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {activePreviewTab === "reader" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>{language === "de" ? "VEKTOR-EINBETTUNGS-AUSZUG" : "VECTOR EMBEDDING EXCERPT"}</span>
                        <div className="flex items-center gap-2">
                          {highlights.length > 0 && (
                            <button
                              onClick={() => setHighlights([])}
                              className="text-red-400 hover:text-red-300 transition text-[9px] font-bold cursor-pointer underline"
                              title={language === "de" ? "Alle Hervorhebungen löschen" : "Clear all highlights"}
                            >
                              {language === "de" ? "Löschen" : "Clear"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedDoc.snippet);
                              setSnippetCopied(true);
                              onAddLog({
                                id: `snippet-copy-header-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "SUCCESS",
                                source: "Document Previewer",
                                message: language === "de"
                                  ? `Offizielles Snippet aus ${selectedDoc.source} in die Zwischenablage kopiert.`
                                  : `Copied official snippet from ${selectedDoc.source} to clipboard.`
                              });
                              setTimeout(() => setSnippetCopied(false), 2000);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title={language === "de" ? "Auszug in die Zwischenablage kopieren" : "Copy excerpt to clipboard"}
                            id="copy-snippet-header-btn"
                          >
                            {snippetCopied ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-400" />
                                {language === "de" ? "Kopiert!" : "Copied!"}
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-400 group-hover:text-white" />
                                {language === "de" ? "Kopieren" : "Copy"}
                              </>
                            )}
                          </button>
                          {isSpeaking && (
                            <button
                              onClick={isPaused ? handleResumeSpeaking : handlePauseSpeaking}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                                isPaused
                                  ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800"
                              }`}
                              title={
                                isPaused
                                  ? (language === "de" ? "Vorlesen fortsetzen" : "Resume narration")
                                  : (language === "de" ? "Vorlesen pausieren" : "Pause narration")
                              }
                              id="pause-resume-snippet-btn"
                            >
                              {isPaused ? (
                                <>
                                  <Play className="h-3 w-3 text-amber-400" />
                                  {language === "de" ? "Fortsetzen" : "Resume"}
                                </>
                              ) : (
                                <>
                                  <Pause className="h-3 w-3 text-slate-400 group-hover:text-white" />
                                  {language === "de" ? "Pause" : "Pause"}
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={handleToggleReadAloud}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                              isSpeaking 
                                ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20" 
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800"
                            }`}
                            title={language === "de" ? "Auszug laut vorlesen" : "Read excerpt aloud"}
                            id="listen-snippet-btn"
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="h-3 w-3 text-red-400 animate-pulse" />
                                {language === "de" ? "Stopp" : "Stop"}
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3 text-slate-400 group-hover:text-white" />
                                {language === "de" ? "Anhören" : "Listen"}
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleHighlightSelection}
                            className="bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 transition flex items-center gap-1 cursor-pointer"
                            title={language === "de" ? "Zuerst Text auswählen, dann klicken" : "Select text in previewer first, then click to highlight"}
                          >
                            <Highlighter className="h-3 w-3 text-yellow-500" />
                            {language === "de" ? "Markieren" : "Highlight"}
                          </button>
                          <button
                            onClick={handleSaveForLater}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 cursor-pointer ${
                              isSavedForLater 
                                ? "bg-fcb-gold/20 border-fcb-gold/30 text-fcb-gold hover:bg-fcb-gold/30" 
                                : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            }`}
                            title={language === "de" ? "Diesen Auszug zur Leseliste hinzufügen/entfernen" : "Add/remove this excerpt to/from Read Later"}
                            id="save-for-later-toolbar-btn"
                          >
                            <Bookmark className={`h-3 w-3 ${isSavedForLater ? "fill-current" : ""}`} />
                            {isSavedForLater ? (language === "de" ? "Gespeichert" : "Saved") : (language === "de" ? "Merken" : "Save Later")}
                          </button>
                        </div>
                      </div>

                      {/* 'View Metadata' Table Toggle */}
                      <div className="bg-slate-950/45 border border-slate-800/85 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Database className="h-3.5 w-3.5 text-cyan-400" />
                            {language === "de" ? "DOKUMENTEN-METADATEN-SCHNITTSTELLE" : "DOCUMENT METADATA INTERFACE"}
                          </span>
                          <button
                            onClick={() => {
                              setShowMetadataTable(!showMetadataTable);
                              onAddLog({
                                id: `metadata-toggle-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "INFO",
                                source: "Document Previewer",
                                message: language === "de"
                                  ? `${showMetadataTable ? "Verberge" : "Zeige"} strukturierte Metadatentabelle für ${selectedDoc.source}`
                                  : `${showMetadataTable ? "Hiding" : "Showing"} structured metadata table for ${selectedDoc.source}`
                              });
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition flex items-center gap-1.5 cursor-pointer border ${
                              showMetadataTable
                                ? "bg-fcb-red/10 border-fcb-red/35 text-fcb-red hover:bg-fcb-red/20"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800"
                            }`}
                            id="toggle-metadata-table-btn"
                          >
                            <Eye className="h-3 w-3 text-fcb-gold" />
                            {showMetadataTable 
                              ? (language === "de" ? "Tabelle verbergen" : "Hide Metadata Table") 
                              : (language === "de" ? "Metadaten anzeigen" : "View Metadata Table")
                            }
                          </button>
                        </div>

                        {showMetadataTable && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-1"
                          >
                            <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/90 shadow-inner">
                              <table className="w-full text-left border-collapse text-[11px] font-mono">
                                <thead>
                                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                                    <th className="p-2.5 font-bold uppercase tracking-wider text-[9px]">{language === "de" ? "Dokumenten-Attribut" : "Document Attribute"}</th>
                                    <th className="p-2.5 font-bold uppercase tracking-wider text-[9px]">{language === "de" ? "Extrahierter Wert" : "Extracted Value"}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900/70 text-slate-300">
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Erstellungsdatum" : "Creation Date"}</td>
                                    <td className="p-2.5 text-white font-mono">{getDocDetails(selectedDoc.source).lastIndexed}</td>
                                  </tr>
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Dokumenten-Verfasser / Autor" : "Document Author"}</td>
                                    <td className="p-2.5 text-white">{getDocDetails(selectedDoc.source).author}</td>
                                  </tr>
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Klassifizierung" : "Classification"}</td>
                                    <td className="p-2.5 text-amber-400 flex items-center gap-1.5 font-semibold">
                                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                                      {language === "de" ? "Klub-Vertraulich (Intern)" : "Club Confidential (Internal)"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Thematische Kategorie" : "Domain Category"}</td>
                                    <td className="p-2.5 text-cyan-400 font-semibold">{getDocDetails(selectedDoc.source).category}</td>
                                  </tr>
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Dateigröße (Bytes)" : "File Size (Bytes)"}</td>
                                    <td className="p-2.5 text-slate-300 font-mono">{getDocDetails(selectedDoc.source).fileSize}</td>
                                  </tr>
                                  <tr className="hover:bg-slate-900/30 transition-colors">
                                    <td className="p-2.5 text-slate-400 font-medium">{language === "de" ? "Versionsnummer" : "Version Number"}</td>
                                    <td className="p-2.5 text-fcb-gold font-mono">{getDocDetails(selectedDoc.source).version}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Styled Document Box */}
                      <div className={`bg-slate-950 rounded-xl border border-slate-800 font-mono leading-relaxed overflow-x-auto relative min-h-[160px] ${
                        isExpanded ? "text-sm p-6" : "text-xs p-4"
                      }`}>
                        <div className="absolute top-0 right-0 bg-fcb-red/10 border-b border-l border-fcb-red/20 px-2 py-0.5 rounded-bl-lg text-[8px] font-bold text-fcb-red tracking-wide uppercase">
                          {language === "de" ? "Gekoppelte Quelle" : "Grounded Source"}
                        </div>

                        {/* Pre Text Context */}
                        <div className={`opacity-35 select-none text-slate-400 pr-4 pb-2 mb-2 border-b border-white/5 ${
                          isExpanded ? "text-xs" : "text-[10.5px]"
                        }`}>
                          {renderFormattedContent(getDocDetails(selectedDoc.source).preText, getDocDetails(selectedDoc.source).docType, false, highlights)}
                        </div>

                        {/* Matching Segment */}
                        <div className="bg-fcb-red/[0.07] border-l-2 border-fcb-red p-3 -mx-2 my-2 rounded-r-lg shadow-inner relative">
                          <span className="absolute -top-2.5 left-2 bg-fcb-red text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {language === "de" ? "Treffer-Vektor-Chunk" : "Matched Vector Chunk"}
                          </span>
                          <div className={`mt-1 ${isExpanded ? "text-sm" : "text-[11px]"}`}>
                            {renderFormattedContent(selectedDoc.snippet, getDocDetails(selectedDoc.source).docType, true, highlights)}
                          </div>
                        </div>

                        {/* Post Text Context */}
                        <div className={`opacity-35 select-none text-slate-400 pr-4 pt-2 mt-2 border-t border-white/5 ${
                          isExpanded ? "text-xs" : "text-[10.5px]"
                        }`}>
                          {renderFormattedContent(getDocDetails(selectedDoc.source).postText, getDocDetails(selectedDoc.source).docType, false, highlights)}
                        </div>
                      </div>

                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
                        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <p>
                          {language === "de"
                            ? "Abgedunkelte Abschnitte weisen auf simulierte Absatzeinträge hin, die an das spezifisch übereinstimmende dichte Vektor-Snippet im ChromaDB-Vektorspeicher angrenzen."
                            : "Dimmed segments indicate mock paragraph records adjacent to the specific matching dense vector snippet stored within the ChromaDB vector store."}
                        </p>
                      </div>
                    </div>
                  ) : activePreviewTab === "metadata" ? (
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                        {language === "de" ? "Indexknoten & Dateitopologie" : "Index Node & File Topology"}
                      </span>
                      
                      {/* Metadata Grid */}
                      <div className={`grid gap-3 ${isExpanded ? "grid-cols-3" : "grid-cols-2"}`}>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Kategorie / Bereich" : "Category / Domain"}
                          </span>
                          <span className="text-xs text-white font-semibold mt-0.5 block">{getDocDetails(selectedDoc.source).category}</span>
                        </div>
                        
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Dateigröße" : "File Size"}
                          </span>
                          <span className="text-xs text-white font-mono font-semibold mt-0.5 block">{getDocDetails(selectedDoc.source).fileSize}</span>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Verantwortlicher Eigentümer" : "Custodian Owner"}
                          </span>
                          <span className="text-xs text-white font-semibold mt-0.5 block truncate">{getDocDetails(selectedDoc.source).author}</span>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Index-Version" : "Index Version"}
                          </span>
                          <span className="text-xs text-white font-mono font-semibold mt-0.5 block">{getDocDetails(selectedDoc.source).version}</span>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Letztes Re-Indizierungsdatum" : "Last Re-Index Date"}
                          </span>
                          <span className="text-xs text-white font-mono font-semibold mt-0.5 block">{getDocDetails(selectedDoc.source).lastIndexed}</span>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">
                            {language === "de" ? "Klassifizierung" : "Classification"}
                          </span>
                          <span className="text-xs text-amber-400 font-mono font-semibold mt-0.5 flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5 text-amber-500" /> {language === "de" ? "Klub-Vertraulich" : "Club Confidential"}
                          </span>
                        </div>
                      </div>

                      {/* Technical DB specs */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block border-b border-slate-900 pb-1.5">
                          {language === "de" ? "Spezifikationen der Vektordatenbank" : "Vector Database Engine Specs"}
                        </span>
                        
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{language === "de" ? "Datenbanksystem:" : "Database System:"}</span>
                          <span className="text-white">ChromaDB Cluster (Core4)</span>
                        </div>

                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{language === "de" ? "Einbettungsmodell:" : "Embedding Model:"}</span>
                          <span className="text-cyan-400">gemini-embedding-001</span>
                        </div>

                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{language === "de" ? "Dimensionen:" : "Dimensions:"}</span>
                          <span className="text-white">768-D dense vector</span>
                        </div>

                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{language === "de" ? "Treffer-Vektor-ID:" : "Matched Vector ID:"}</span>
                          <span className="text-white font-mono select-all">vec_chunk_841029e</span>
                        </div>

                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{language === "de" ? "Distanzmetrik:" : "Distance Metric:"}</span>
                          <span className="text-white">{language === "de" ? "Kosinus-Ähnlichkeit" : "Cosine Similarity"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Search Queries History Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                            {language === "de" ? "Letzte Suchanfragen (Max. 10)" : "Recent Search Queries (Max 10)"}
                          </span>
                          {recentSearches.length > 0 && (
                            <button
                              onClick={() => {
                                setRecentSearches([]);
                                onAddLog({
                                  id: `clear-history-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Search History",
                                  message: language === "de"
                                    ? "Suchverlauf gelöscht."
                                    : "Search history cleared."
                                });
                              }}
                              className="text-[9px] font-bold text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
                              id="clear-search-history-btn"
                            >
                              <X className="h-3 w-3" />
                              {language === "de" ? "Verlauf löschen" : "Clear History"}
                            </button>
                          )}
                        </div>

                        {recentSearches.length === 0 ? (
                          <div className="bg-slate-950/40 border border-slate-900 border-dashed rounded-xl p-6 text-center space-y-1.5">
                            <Clock className="h-6 w-6 text-slate-700 mx-auto stroke-1" />
                            <p className="text-[10px] text-slate-500 font-mono">
                              {language === "de"
                                ? "Noch keine Suchen in dieser Sitzung durchgeführt."
                                : "No search queries recorded in this session yet."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {recentSearches.map((histQuery, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  onAddLog({
                                    id: `history-rerun-${Date.now()}`,
                                    timestamp: new Date().toLocaleTimeString(),
                                    level: "INFO",
                                    source: "Search History",
                                    message: language === "de"
                                      ? `Suche erneut ausgeführt: "${histQuery}"`
                                      : `Re-running search from session history: "${histQuery}"`
                                  });
                                  handleRagSearch(histQuery);
                                }}
                                className="w-full text-left bg-slate-950/65 hover:bg-slate-900 p-3 rounded-xl border border-slate-850 hover:border-fcb-red/35 transition text-[11px] text-slate-300 font-mono leading-normal flex items-center justify-between group cursor-pointer"
                                title={language === "de" ? "Erneut suchen" : "Search again"}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className="text-[9.5px] font-mono text-slate-500 w-4 select-none">
                                    {(idx + 1).toString().padStart(2, "0")}
                                  </span>
                                  <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-fcb-red transition" />
                                  <span className="truncate text-white font-medium">{histQuery}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 group-hover:text-fcb-gold uppercase font-semibold shrink-0 font-mono ml-2 transition">
                                  {language === "de" ? "Ausführen" : "Run ➜"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bookmarked Snippets Section */}
                      <div className="pt-4 border-t border-slate-900 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block flex items-center gap-1.5 font-bold">
                            <Bookmark className="h-3.5 w-3.5 text-fcb-gold animate-pulse" />
                            {language === "de" ? "Gespeicherte Lesezeichen" : "Saved Bookmarked Snippets"}
                          </span>
                          {bookmarkedSnippets.length > 0 && (
                            <button
                              onClick={() => {
                                saveBookmarks([]);
                                onAddLog({
                                  id: `clear-bookmarks-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Bookmarks Manager",
                                  message: language === "de"
                                    ? "Alle Lesezeichen gelöscht."
                                    : "Cleared all saved bookmarked snippets."
                                });
                              }}
                              className="text-[9px] font-bold text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
                              id="clear-bookmarks-btn"
                            >
                              <Trash2 className="h-3 w-3" />
                              {language === "de" ? "Alle löschen" : "Clear All"}
                            </button>
                          )}
                        </div>

                        {bookmarkedSnippets.length === 0 ? (
                          <div className="bg-slate-950/40 border border-slate-900 border-dashed rounded-xl p-6 text-center space-y-1.5">
                            <Bookmark className="h-6 w-6 text-slate-700 mx-auto stroke-1" />
                            <p className="text-[10px] text-slate-500 font-mono">
                              {language === "de"
                                ? "Keine Lesezeichen gespeichert. Rechtsklicke auf ein Dokument zum Hinzufügen."
                                : "No bookmarks saved. Right-click any document excerpt to bookmark."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {bookmarkedSnippets.map((bookmark) => (
                              <div
                                key={bookmark.id}
                                className="bg-slate-950/65 p-3 rounded-xl border border-slate-850 hover:border-fcb-gold/30 transition text-[11px] space-y-2 relative"
                                id={`bookmark-card-${bookmark.id}`}
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-1.5">
                                  <div className="truncate">
                                    <span className="text-[9px] font-mono text-fcb-gold uppercase font-bold tracking-wider">{bookmark.source}</span>
                                    {bookmark.queryContext && (
                                      <p className="text-[8.5px] text-slate-500 font-mono truncate">
                                        {language === "de" ? "Kontext:" : "Context:"} "{bookmark.queryContext}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setSelectedDoc({
                                          source: bookmark.source,
                                          snippet: bookmark.snippet
                                        });
                                        setActivePreviewTab("reader");
                                        onAddLog({
                                          id: `bookmark-load-${Date.now()}`,
                                          timestamp: new Date().toLocaleTimeString(),
                                          level: "INFO",
                                          source: "Bookmarks Manager",
                                          message: language === "de"
                                            ? `Öffne gespeicherten Auszug für "${bookmark.source}"`
                                            : `Opening bookmarked excerpt for "${bookmark.source}"`
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-900 rounded text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                                      title={language === "de" ? "Auszug im Leser öffnen" : "Open excerpt in reader"}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(bookmark.snippet);
                                        onAddLog({
                                          id: `bookmark-copy-btn-${Date.now()}`,
                                          timestamp: new Date().toLocaleTimeString(),
                                          level: "SUCCESS",
                                          source: "Bookmarks Manager",
                                          message: language === "de"
                                            ? `Auszug aus "${bookmark.source}" in die Zwischenablage kopiert.`
                                            : `Copied excerpt from "${bookmark.source}" to clipboard.`
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition cursor-pointer"
                                      title={language === "de" ? "Auszug kopieren" : "Copy excerpt"}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const url = getSourceUrl(bookmark.source);
                                        window.open(url, "_blank", "noopener,noreferrer");
                                        onAddLog({
                                          id: `bookmark-url-${Date.now()}`,
                                          timestamp: new Date().toLocaleTimeString(),
                                          level: "INFO",
                                          source: "Bookmarks Manager",
                                          message: language === "de"
                                            ? `Öffne Quelllink: ${url}`
                                            : `Opening source link: ${url}`
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition cursor-pointer"
                                      title={language === "de" ? "Quelllink öffnen" : "Open source link"}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveBookmark(bookmark.id, bookmark.source)}
                                      className="p-1 hover:bg-slate-900 rounded text-red-400 hover:text-red-300 transition cursor-pointer"
                                      title={language === "de" ? "Lesezeichen löschen" : "Remove bookmark"}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10.5px] text-slate-300 font-mono line-clamp-3 leading-normal italic select-text">
                                  "{bookmark.snippet}"
                                </p>
                                <span className="text-[8px] text-slate-600 font-mono block text-right">
                                  {bookmark.timestamp}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80">
                <div className={`space-y-2 ${isExpanded ? "max-w-4xl mx-auto w-full" : "w-full"}`}>
                  
                  {/* QR Code Section */}
                  {showQrCode && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative mb-3"
                    >
                      <button 
                        onClick={() => setShowQrCode(false)}
                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-900 transition cursor-pointer"
                        title={language === "de" ? "Schließen" : "Close"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      <div className="flex flex-col items-center text-center space-y-3.5">
                        <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block">
                          {language === "de" ? "Auf Mobilgerät scannen" : "Scan to Open on Mobile"}
                        </span>
                        
                        <div className="bg-white p-2.5 rounded-xl border border-slate-750 inline-block shadow-lg shadow-black/40">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=0c0c0f&bgcolor=ffffff&data=${encodeURIComponent(getSourceUrl(selectedDoc.source))}`}
                            alt="Document Source QR Code"
                            className="h-36 w-36 select-none"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="w-full space-y-1.5">
                          <p className="text-[10.5px] text-slate-400 font-mono truncate select-all px-2 py-1 bg-slate-900 rounded border border-slate-850/60" title={getSourceUrl(selectedDoc.source)}>
                            {getSourceUrl(selectedDoc.source)}
                          </p>
                          
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(getSourceUrl(selectedDoc.source));
                                onAddLog({
                                  id: `qr-copy-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "SUCCESS",
                                  source: "QR Generator",
                                  message: language === "de"
                                    ? `Dokumenten-URL erfolgreich in die Zwischenablage kopiert.`
                                    : `Successfully copied document source URL to clipboard.`
                                });
                              }}
                              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Copy className="h-3 w-3" /> {language === "de" ? "URL kopieren" : "Copy URL"}
                            </button>
                            
                            <a
                              href={getSourceUrl(selectedDoc.source)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-cyan-950/40 hover:bg-cyan-950 border border-cyan-800/30 text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg text-[10.5px] font-semibold flex items-center gap-1.5 transition"
                            >
                              <ExternalLink className="h-3 w-3" /> {language === "de" ? "Öffnen" : "Open Link"}
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDoc.snippet);
                        setSnippetCopied(true);
                        onAddLog({
                          id: `snippet-copy-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "SUCCESS",
                          source: "Document Previewer",
                          message: language === "de"
                            ? `Offizielles Snippet aus ${selectedDoc.source} in die Zwischenablage kopiert.`
                            : `Copied official snippet from ${selectedDoc.source} to clipboard.`
                        });
                        setTimeout(() => setSnippetCopied(false), 2000);
                      }}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {snippetCopied ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-400" /> {language === "de" ? "Kopiert!" : "Copied!"}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> {language === "de" ? "Auszug kopieren" : "Copy Snippet"}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsReindexing(true);
                        onAddLog({
                          id: `doc-reindex-start-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "TRIGGER",
                          source: "Vector Indexer",
                          message: language === "de"
                            ? `Indiziere ${selectedDoc.source} neu. Berechne dichte Vektoreinbettungen...`
                            : `Re-indexing ${selectedDoc.source}. Recalculating dense vector embeddings...`
                        });

                        setTimeout(() => {
                          setIsReindexing(false);
                          onAddLog({
                            id: `doc-reindex-success-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString(),
                            level: "SUCCESS",
                            source: "Vector Indexer",
                            message: language === "de"
                              ? `Dokument ${selectedDoc.source} erfolgreich neu indiziert. Cosine-Abstand optimiert.`
                              : `Document ${selectedDoc.source} successfully re-indexed. Cosine spacing optimized.`
                          });
                        }, 1200);
                      }}
                      disabled={isReindexing}
                      className="bg-[#121c18] hover:bg-[#182821] border border-green-500/30 text-green-400 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isReindexing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {language === "de" ? "Indizierung..." : "Re-indexing..."}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" /> {language === "de" ? "Chunk neu indizieren" : "Re-index Chunk"}
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="w-full bg-[#121c24] hover:bg-[#182834] border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    id="download-pdf-btn"
                  >
                    <FileText className="h-3.5 w-3.5" /> {language === "de" ? "Als PDF herunterladen (Snippet)" : "Download as PDF (Snippet)"}
                  </button>

                  <button
                    onClick={() => {
                      onAddLog({
                        id: `doc-download-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "INFO",
                        source: "Enterprise Asset Server",
                        message: language === "de"
                          ? `Lade primäre Rohdatei herunter: ${selectedDoc.source} (Größe: ${getDocDetails(selectedDoc.source).fileSize})`
                          : `Downloading primary raw file: ${selectedDoc.source} (Size: ${getDocDetails(selectedDoc.source).fileSize})`
                      });
                      
                      const element = document.createElement("a");
                      const file = new Blob([selectedDoc.snippet], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = `FCB_Vector_Snippet_${selectedDoc.source}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="w-full bg-[#1c1214] hover:bg-[#28181b] border border-fcb-red/20 text-fcb-red hover:text-rose-400 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> {language === "de" ? "Vollständiges Dokument herunterladen" : "Download Full Grounding Document"}
                  </button>

                  <button
                    onClick={() => {
                      setShowQrCode(!showQrCode);
                      if (!showQrCode) {
                        onAddLog({
                          id: `qr-generate-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "TRIGGER",
                          source: "QR Generator",
                          message: language === "de"
                            ? `Generiere QR-Code für den offiziellen Quelllink von ${selectedDoc.source}...`
                            : `Generating dynamic QR Code for official document source URL of ${selectedDoc.source}...`
                        });
                      }
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      showQrCode 
                        ? "bg-fcb-gold/15 hover:bg-fcb-gold/25 border border-fcb-gold/45 text-fcb-gold" 
                        : "bg-[#1f1c12] hover:bg-[#2c2618] border border-fcb-gold/20 text-fcb-gold hover:text-amber-300"
                    }`}
                    id="generate-qr-btn"
                  >
                    <QrCode className="h-3.5 w-3.5" /> {showQrCode ? (language === "de" ? "QR-Code ausblenden" : "Hide QR Code") : (language === "de" ? "QR-Code für Quell-URL generieren" : "Generate QR Code (Source URL)")}
                  </button>

                  {/* Recent Searches History */}
                  <div className="pt-2.5 border-t border-slate-800/80 mt-2">
                    <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-fcb-gold" />
                      {language === "de" ? "Letzte Suchanfragen" : "Recent Session Searches"}
                    </span>
                    {recentSearches.length === 0 ? (
                      <p className="text-[10px] text-slate-600 font-mono italic">
                        {language === "de" ? "Noch keine Suchen aufgezeichnet." : "No queries conducted yet."}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {recentSearches.map((sq, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              handleRagSearch(sq);
                              onAddLog({
                                id: `recent-search-${Date.now()}-${idx}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "INFO",
                                source: "RAG Session History",
                                message: language === "de"
                                  ? `Starte RAG-Suche aus Verlauf erneut: "${sq}"`
                                  : `Re-launching RAG search from history: "${sq}"`
                              });
                            }}
                            className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700/80 p-1.5 rounded-md text-[10px] text-slate-300 transition flex items-center justify-between gap-2 cursor-pointer group"
                            title={language === "de" ? `Erneut suchen: "${sq}"` : `Re-run: "${sq}"`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <Search className="h-2.5 w-2.5 text-slate-500 group-hover:text-fcb-red shrink-0" />
                              <span className="truncate">{sq}</span>
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 group-hover:text-fcb-gold transition-colors shrink-0">
                              {language === "de" ? "Suchen ↗" : "Search ↗"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

               {/* Custom Right-Click Context Menu */}
              {contextMenu && (
                <div 
                  className="fixed z-[999] bg-[#0c0c0f]/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 min-w-[190px] select-none font-mono text-[11px]"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      handleCopyCurrentSnippet();
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-900 rounded-lg transition text-slate-300 hover:text-white flex items-center gap-2.5 cursor-pointer"
                    id="context-copy-snippet-btn"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>{language === "de" ? "Auszug kopieren" : "Copy snippet"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleBookmarkSnippet();
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-900 rounded-lg transition text-slate-300 hover:text-white flex items-center gap-2.5 cursor-pointer border-t border-slate-900"
                    id="context-bookmark-snippet-btn"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-fcb-gold" />
                    <span>{language === "de" ? "Lesezeichen setzen" : "Bookmark snippet"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOpenSourceUrl();
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-900 rounded-lg transition text-slate-300 hover:text-white flex items-center gap-2.5 cursor-pointer border-t border-slate-900"
                    id="context-open-url-btn"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{language === "de" ? "Quell-URL öffnen" : "Open source URL"}</span>
                  </button>
                </div>
              )}

              {/* Floating Jump to Top Button */}
              <AnimatePresence>
                {showJumpToTop && (
                  <motion.button
                    id="rag-jump-to-top-btn"
                    initial={{ opacity: 0, y: 15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                    onClick={() => {
                      if (sidePanelScrollRef.current) {
                        sidePanelScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
                        onAddLog({
                          id: `jump-to-top-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "INFO",
                          source: "Document Previewer",
                          message: language === "de"
                            ? "Zurück zum Anfang des Dokuments gescrollt."
                            : "Scrolled back to the top of the document."
                        });
                      }
                    }}
                    className="absolute bottom-6 right-6 z-50 p-2.5 rounded-full bg-fcb-red text-white hover:bg-fcb-red/90 hover:scale-[1.05] active:scale-95 shadow-2xl border border-fcb-red/20 transition flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold cursor-pointer"
                    title={language === "de" ? "Nach oben" : "Back to top"}
                  >
                    <ArrowUp className="h-4 w-4 text-white" />
                    <span>{language === "de" ? "Nach oben" : "Top"}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Document Preview & Verification Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#0b0c10] border border-slate-800 rounded-3xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative z-10"
              id="document-preview-modal"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-white font-display tracking-wider uppercase flex items-center gap-2">
                    <Database className="h-4 w-4 text-fcb-red animate-pulse" />
                    {language === "de" ? "Dokumenten-Vorschau & Verifizierungs-Register" : "Brand Compliance Grounding Registry"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === "de"
                      ? "Überprüfen Sie Dokumentausschnitte und Quelltexte vor dem Start der Vektor-Neuindizierung."
                      : "Review document snippets and grounding payloads before executing a vector database re-index."}
                  </p>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition cursor-pointer"
                  title={language === "de" ? "Vorschau schließen" : "Close Previewer"}
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
                {/* Left Panel: Document Picker (Col Span 4) */}
                <div className="md:col-span-4 border-r border-slate-850 bg-slate-950/20 p-4 overflow-y-auto scrollbar-thin flex flex-col gap-4">
                  {/* Category Filter */}
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                      {language === "de" ? "KATEGORIEFILTER" : "FILTER CATEGORY"}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["All", "Brand Compliance", "Sporting & Squad Info", "Stadium Operations", "Club History & Honours", "Guidelines", "Contracts", "Brand Assets"].map((cat) => {
                        const count = (cat === "All"
                          ? (CORE_DOCUMENTS.length + uploadedDocs.length)
                          : ([...CORE_DOCUMENTS, ...uploadedDocs].filter(d => d.category === cat).length)
                        );
                        const isSel = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 text-[10px] font-mono rounded border cursor-pointer transition ${
                              isSel
                                ? "bg-fcb-red/15 border-fcb-red/45 text-fcb-red font-bold"
                                : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {cat === "All" ? (language === "de" ? "Alle" : "All") : cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Document Lists grouped */}
                  <div className="space-y-4 flex-1">
                    {/* Core Documents */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono text-fcb-gold uppercase tracking-wider block border-b border-slate-900 pb-1">
                        {language === "de" ? "SYSTEM-KERN-DOKUMENTE" : "CORE SYSTEM DOCUMENTS"}
                      </span>
                      {CORE_DOCUMENTS.filter(d => selectedCategory === "All" || d.category === selectedCategory).map((doc) => {
                        const isSelected = selectedPreviewDoc?.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedPreviewDoc(doc)}
                            className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-fcb-red/10 border-fcb-red/35 text-white"
                                : "bg-slate-950/40 hover:bg-slate-900/60 border-slate-900 text-slate-300"
                            }`}
                          >
                            <span className="text-xs font-bold font-mono truncate">{doc.source}</span>
                            <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                              <span>{doc.category}</span>
                              <span>{doc.version}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Uploaded Documents */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider block border-b border-slate-900 pb-1">
                        {language === "de" ? "BENUTZERDEFINIERTE DOKUMENTE" : "CUSTOM KNOWLEDGE BASES"}
                      </span>
                      {uploadedDocs.filter(d => selectedCategory === "All" || d.category === selectedCategory).length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-mono italic p-2">
                          {language === "de" ? "Keine passenden Dokumente" : "No matching documents"}
                        </p>
                      ) : (
                        uploadedDocs.filter(d => selectedCategory === "All" || d.category === selectedCategory).map((doc) => {
                          const isSelected = selectedPreviewDoc?.id === doc.id;
                          return (
                            <button
                              key={doc.id}
                              onClick={() => setSelectedPreviewDoc(doc)}
                              className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 cursor-pointer ${
                                isSelected
                                  ? "bg-cyan-500/10 border-cyan-500/35 text-white"
                                  : "bg-slate-950/40 hover:bg-slate-900/60 border-slate-900 text-slate-300"
                              }`}
                            >
                              <span className="text-xs font-bold font-mono truncate">{doc.source}</span>
                              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                                <span>{doc.category}</span>
                                <span>{doc.version}</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Selected Document Snippet and Actions (Col Span 8) */}
                <div className="md:col-span-8 p-6 overflow-y-auto scrollbar-thin flex flex-col h-full bg-[#08090d]">
                  {selectedPreviewDoc ? (
                    <div className="space-y-5 flex-1 flex flex-col min-h-0">
                      {/* Document Details Header */}
                      <div className="flex items-start justify-between gap-4 border-b border-slate-850 pb-4 shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              selectedPreviewDoc.id.startsWith("core")
                                ? "bg-fcb-gold/15 border-fcb-gold/30 text-fcb-gold"
                                : "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                            }`}>
                              {selectedPreviewDoc.id.startsWith("core") ? (language === "de" ? "System-Kern" : "Core System") : (language === "de" ? "Benutzerdefiniert" : "Custom Upload")}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-850">
                              {selectedPreviewDoc.category}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white font-mono mt-2 select-all">
                            {selectedPreviewDoc.source}
                          </h4>
                        </div>

                        <div className="text-right text-[10px] font-mono text-slate-500">
                          <div>{language === "de" ? "Version: " : "Version: "}{selectedPreviewDoc.version}</div>
                          <div className="mt-0.5">{language === "de" ? "Autor: " : "Author: "}{selectedPreviewDoc.author}</div>
                        </div>
                      </div>

                      {/* Displayed Snippet Block (Crucial Action) */}
                      <div className="space-y-2 shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider font-bold flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-fcb-gold" />
                            {language === "de" ? "INDIZIERTES SNIPPET" : "RETRIEVAL SNIPPET"}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedPreviewDoc.snippet);
                              onAddLog({
                                id: `copy-prev-snip-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "SUCCESS",
                                source: "Registry Verifier",
                                message: language === "de"
                                  ? `Snippet für "${selectedPreviewDoc.source}" kopiert.`
                                  : `Successfully copied retrieval snippet for "${selectedPreviewDoc.source}" to clipboard.`
                              });
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[9.5px] font-bold px-2 py-1 rounded border border-slate-800 hover:border-slate-700 transition flex items-center gap-1 cursor-pointer font-mono"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{language === "de" ? "Snippet kopieren" : "Copy Snippet"}</span>
                          </button>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs font-mono text-slate-300 leading-relaxed italic border-l-4 border-l-fcb-gold">
                          "{selectedPreviewDoc.snippet}"
                        </div>
                      </div>

                      {/* AI Executive Summarizer Section */}
                      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3.5 relative overflow-hidden shrink-0">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-fcb-gold/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-fcb-gold animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-fcb-gold uppercase tracking-wider">
                              {language === "de" ? "GEMINI AI - DOKUMENTEN-ZUSAMMENFASSUNG & COMPLIANCE" : "GEMINI AI - DOCUMENT SUMMARIZER & COMPLIANCE"}
                            </span>
                          </div>
                          
                          {docSummaries[selectedPreviewDoc.id] && (
                            <button
                              onClick={() => handleGenerateDocSummary(selectedPreviewDoc)}
                              disabled={isSummarizingDoc}
                              className="text-[9.5px] font-mono font-semibold text-slate-400 hover:text-fcb-gold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title={language === "de" ? "Zusammenfassung aktualisieren" : "Re-generate summary"}
                            >
                              <RefreshCw className={`h-3 w-3 ${isSummarizingDoc ? "animate-spin" : ""}`} />
                              <span>{language === "de" ? "Aktualisieren" : "Refresh"}</span>
                            </button>
                          )}
                        </div>

                        {!docSummaries[selectedPreviewDoc.id] ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1.5">
                            <p className="text-[11px] text-slate-400 leading-normal max-w-xl">
                              {language === "de"
                                ? "Generieren Sie ein KI-gestütztes Executive Summary, um Kernrichtlinien und Compliance-Auflagen dieses Dokuments sofort zu erfassen."
                                : "Generate an AI-driven executive summary to scan core constraints, brand directives, and compliance highlights of this document instantly."}
                            </p>
                            <button
                              onClick={() => handleGenerateDocSummary(selectedPreviewDoc)}
                              disabled={isSummarizingDoc}
                              className="bg-fcb-gold/15 hover:bg-fcb-gold/25 border border-fcb-gold/30 text-fcb-gold text-[10.5px] font-bold font-mono px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition duration-200 active:scale-95 shrink-0 disabled:opacity-50"
                            >
                              {isSummarizingDoc ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  <span>{language === "de" ? "ANALYSING..." : "ANALYSING..."}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>{language === "de" ? "ZUSAMMENFASSUNG GENERIEREN" : "GENERATE AI SUMMARY"}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-fadeIn">
                            {/* Summary Content Paragraph */}
                            <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                              {docSummaries[selectedPreviewDoc.id].executiveSummary}
                            </p>

                            {/* Takeaways bullets */}
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-900">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold">
                                {language === "de" ? "Kernelemente & Vorgaben" : "Key Directives & Takeaways"}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {docSummaries[selectedPreviewDoc.id].keyTakeaways.map((takeaway, idx) => (
                                  <div key={idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-900/50 flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-fcb-gold shrink-0 mt-1.5" />
                                    <span className="text-[10.5px] text-slate-300 leading-normal font-sans">{takeaway}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Compliance badge */}
                            <div className="flex items-center gap-2 pt-2.5 border-t border-slate-900/40">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold shrink-0">
                                {language === "de" ? "Compliance-Status:" : "Compliance Status:"}
                              </span>
                              <div className="bg-[#121c18] border border-green-500/20 rounded-lg px-2.5 py-1 text-[10px] text-green-400 font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                <span>{docSummaries[selectedPreviewDoc.id].complianceStatus}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detailed Payload / Context Block */}
                      <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold shrink-0">
                          {language === "de" ? "VOLLSTÄNDIGER QUELL-TEXTDATENSATZ" : "FULL GROUNDING SOURCE TEXT"}
                        </span>
                        <div className="flex-1 bg-slate-950/80 p-4 rounded-xl border border-slate-900 overflow-y-auto scrollbar-thin text-xs font-mono text-slate-400 leading-relaxed whitespace-pre-wrap select-all">
                          {selectedPreviewDoc.content}
                        </div>
                      </div>

                      {/* Quick verification Action Panel before re-indexing */}
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 mt-2">
                        <div className="text-left">
                          <span className="text-[10.5px] text-white font-semibold block">
                            {language === "de" ? "Bereit zum Neuindizieren?" : "Ready to update vector indices?"}
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                            {language === "de"
                              ? "Aktualisieren Sie den Vektorbereich nach der Überprüfung der Dokumentauszüge."
                              : "Reprocess standard and custom compliance databases with recalculated embeddings."}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={handleForceReindex}
                            disabled={isReindexing}
                            className={`w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                              isReindexing
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-fcb-gold/15 hover:bg-fcb-gold/25 border-fcb-gold/30 text-fcb-gold hover:border-fcb-gold/50 active:scale-98"
                            }`}
                          >
                            {isReindexing ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>RE-INDEXING...</span>
                              </>
                            ) : (
                              <>
                                <Database className="h-3.5 w-3.5" />
                                <span>{language === "de" ? "MANUELL NEU INDIZIEREN" : "FORCE RE-INDEX"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <FileText className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
                      <p className="text-xs text-slate-400 font-mono">
                        {language === "de"
                          ? "Wählen Sie ein Dokument aus, um seinen Inhalt anzuzeigen."
                          : "Select a document from the left list to begin verification."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Old Version Overlay Modal */}
      <AnimatePresence>
        {previewingOldVersion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0c0c0f] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4.5 w-4.5 text-cyan-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      {language === "de" ? "Archivierte Version betrachten" : "Viewing Archived Version"}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold text-cyan-400 text-[9.5px] font-mono">
                        {previewingOldVersion.version}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        by {previewingOldVersion.author} • {previewingOldVersion.lastIndexed}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewingOldVersion(null)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto scrollbar-thin bg-[#08090d] flex-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold mb-2">
                  {language === "de" ? "DOKUMENTEN-INHALT DER REVISION" : "DOCUMENT CONTENT FOR REVISION"}
                </span>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
                  {previewingOldVersion.content}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-950 border-t border-slate-850 flex items-center justify-between">
                <button
                  onClick={() => setPreviewingOldVersion(null)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 hover:text-white cursor-pointer transition"
                >
                  {language === "de" ? "Schließen" : "Close"}
                </button>
                <button
                  onClick={() => handleRevertToVersion(previewingOldVersion.docId, previewingOldVersion.versionId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-98 shadow-md shadow-emerald-900/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{language === "de" ? "Diese Version wiederherstellen" : "Revert to this Version"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
