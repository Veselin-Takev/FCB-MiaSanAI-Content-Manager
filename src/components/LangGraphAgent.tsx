import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Network, Play, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Sparkles, Database, ShieldAlert, ChevronRight, Terminal, ArrowRight, UserCheck, Eye
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface LangGraphStep {
  node: string;
  state: {
    topic: string;
    platform: string;
    creativeTone: string;
    draft: string;
    creativeNotes: string;
    complianceScore: number;
    complianceFeedback: string[];
    approved: boolean;
    iteration: number;
    finalApprovedDraft: string;
  };
  timestamp: string;
  durationMs?: number;
  message: string;
}

interface LangGraphAgentProps {
  onAddLog: (log: any) => void;
  onAddDraft?: (draft: any) => void;
}

export const LangGraphAgent: React.FC<LangGraphAgentProps> = ({ onAddLog, onAddDraft }) => {
  const { language, t } = useLanguage();
  const isDe = language === "de";

  // Inputs state
  const [topic, setTopic] = useState<string>("");
  const [platform, setPlatform] = useState<string>("Instagram");
  const [creativeTone, setCreativeTone] = useState<string>("Mia San Mia / Passionate");

  // Run states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [steps, setSteps] = useState<LangGraphStep[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<string | null>(null);

  // Suggested Topics
  const suggestedTopics = isDe ? [
    { title: "Thomas Müller's 710. Pflichtspiel-Jubiläum", desc: "Vereinslegende feiert historischen Meilenstein unter großem Fan-Jubel" },
    { title: "Säbener Straße Trainingsstart", desc: "Hohe Trainingsintensität vor dem Bundesliga-Saisonauftakt" },
    { title: "Harry Kanes Dreierpack in der Königsklasse", desc: "Sensationeller Sieg in der Allianz Arena unter Flutlicht" }
  ] : [
    { title: "Thomas Müller's 710th Match Anniversary", desc: "Club legend celebrates historic milestone to massive fan applause" },
    { title: "Pre-Season Training Kickoff at Säbener Straße", desc: "Lads undergo high-intensity drills ahead of Bundesliga opener" },
    { title: "Harry Kane's Champions League Hat-Trick", desc: "Sensational night under the lights at the red-glowing Allianz Arena" }
  ];

  // Run LangGraph execution
  const runWorkflow = async () => {
    if (!topic.trim()) return;
    setIsRunning(true);
    setCurrentStepIdx(-1);
    setSteps([]);
    setSelectedNodeDetails(null);

    onAddLog({
      id: `langgraph-init-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: "LangGraph",
      message: isDe 
        ? `Auslösen des multi-agenten LangGraph-Workflows für Thema: "${topic}"` 
        : `Triggered multi-agent LangGraph workflow for topic: "${topic}"`
    });

    try {
      const response = await fetch("/api/langgraph/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          language,
          creativeTone
        })
      });

      if (!response.ok) {
        throw new Error("LangGraph service responded with an error");
      }

      const data = await response.json();
      const traceSteps: LangGraphStep[] = data.trace || [];
      
      setSteps(traceSteps);

      // Animate execution step-by-step
      for (let i = 0; i < traceSteps.length; i++) {
        setCurrentStepIdx(i);
        // Dispatch individual step logs to the main system
        const s = traceSteps[i];
        onAddLog({
          id: `langgraph-step-${i}-${Date.now()}`,
          timestamp: s.timestamp,
          level: s.node === "END" ? "SUCCESS" : s.node === "compliance_agent" && !s.state.approved ? "WARNING" : "INFO",
          source: `Agent: ${s.node}`,
          message: s.message
        });
        
        // Pause to simulate real-time multi-agent thinking/processing
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error: any) {
      console.error("LangGraph processing failed:", error);
      onAddLog({
        id: `langgraph-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "LangGraph",
        message: `LangGraph agent cycle failed: ${error.message}. Running fallback recovery.`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToQueue = () => {
    if (steps.length === 0 || currentStepIdx < 0) return;
    const finalState = steps[steps.length - 1].state;
    if (!finalState.finalApprovedDraft) return;

    if (onAddDraft) {
      onAddDraft({
        id: `langgraph-draft-${Date.now()}`,
        platform,
        player: topic.includes("Müller") ? "Thomas Müller" : topic.includes("Kane") ? "Harry Kane" : "Team",
        headline: topic.slice(0, 40) + "...",
        caption: finalState.finalApprovedDraft,
        addedAt: new Date().toLocaleTimeString()
      });

      onAddLog({
        id: `langgraph-push-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "LangGraph",
        message: isDe 
          ? "Freigegebener LangGraph-Entwurf erfolgreich in die Kampagnen-Warteschlange verschoben." 
          : "Approved LangGraph draft pushed into Campaign Draft Queue successfully."
      });
    }
  };

  const activeStep = currentStepIdx >= 0 ? steps[currentStepIdx] : null;
  const activeNode = activeStep ? activeStep.node : null;
  const latestState = activeStep ? activeStep.state : null;

  // Render SVG Node positions
  const nodes = [
    { id: "START", label: isDe ? "START" : "START", x: 10, y: 50, color: "text-slate-400 border-slate-700 bg-slate-900" },
    { id: "creative_agent", label: isDe ? "Kreativ-Agent" : "Creative Agent", x: 32, y: 50, color: "text-cyan-400 border-cyan-800/80 bg-cyan-950/20" },
    { id: "compliance_agent", label: isDe ? "Compliance-Agent" : "Compliance Agent", x: 65, y: 50, color: "text-amber-400 border-amber-800/80 bg-amber-950/20" },
    { id: "editor_agent", label: isDe ? "Editor-Agent" : "Editor Agent", x: 48, y: 15, color: "text-violet-400 border-violet-800/80 bg-violet-950/20" },
    { id: "END", label: isDe ? "ENDE" : "END", x: 90, y: 50, color: "text-emerald-400 border-emerald-800/80 bg-emerald-950/20" }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-none" id="langgraph-tab">
      
      {/* Left Columns - Workflow Setup and Visual Graph */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Workflow Setup panel */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Network className="h-5 w-5 text-fcb-red animate-pulse" />
            <h3 className="font-bold text-white font-display">
              {isDe ? "LangGraph Multi-Agenten-Orchestrierung" : "LangGraph Multi-Agent Orchestration Center"}
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isDe 
              ? "Starten Sie einen automatisierten LangGraph-Zustandsgraphen mit mehreren Spezialagenten. Der Kreativ-Agent entwirft Inhalte, der Compliance-Agent prüft Richtlinien und der Editor überarbeitet Entwürfe in einer selbstkorrigierenden Schleife."
              : "Execute an automated LangGraph stateful workflow powered by specialized agents. The Creative Agent writes copy, the Compliance Agent audits brand guidelines, and the Editor Agent self-corrects drafts in a loops until approved."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Topic Input */}
            <div className="sm:col-span-3 space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                {isDe ? "Inhalts-Thema / News-Fokus" : "Content Topic / News Focus"}
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isDe ? "Z.B. Thomas Müller feiert Meilenstein..." : "E.g. Thomas Müller anniversary..."}
                className="w-full bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-200 rounded-lg p-2.5 text-xs outline-none transition"
                disabled={isRunning}
              />
            </div>

            {/* Platform Selector */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                {isDe ? "Ziel-Plattform" : "Target Platform"}
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-300 rounded-lg p-2.5 text-xs outline-none transition cursor-pointer"
                disabled={isRunning}
              >
                <option value="Instagram">Instagram</option>
                <option value="X/Twitter">X/Twitter (Concise)</option>
                <option value="TikTok">TikTok (Youthful)</option>
                <option value="FCB App">FCB App (Editorial)</option>
              </select>
            </div>

            {/* Creative Tone Selector */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                {isDe ? "Kreativer Tonfall" : "Creative Tone"}
              </label>
              <select
                value={creativeTone}
                onChange={(e) => setCreativeTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-fcb-red text-slate-300 rounded-lg p-2.5 text-xs outline-none transition cursor-pointer"
                disabled={isRunning}
              >
                <option value="Mia San Mia / Passionate">Mia San Mia / Passionate</option>
                <option value="Witty / Humorous (Müller Style)">Witty / Humorous</option>
                <option value="Analytical & Focused">Analytical & Focused</option>
              </select>
            </div>

            {/* Action Trigger */}
            <div className="flex items-end">
              <button
                onClick={runWorkflow}
                disabled={isRunning || !topic.trim()}
                className="w-full bg-fcb-red hover:bg-red-700 disabled:bg-slate-900 disabled:border-slate-850 border border-transparent disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed uppercase tracking-wide shadow-lg shadow-fcb-red/10"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{isDe ? "Orchestriere..." : "Orchestrating..."}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>{isDe ? "LangGraph starten" : "Run LangGraph Workflow"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Topics */}
          {!isRunning && (
            <div className="space-y-2 pt-1">
              <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block text-left">
                {isDe ? "Oder wählen Sie ein vorgeschlagenes Thema:" : "Or load a suggested topic:"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {suggestedTopics.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTopic(item.title)}
                    className="p-2 bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-left rounded-lg transition text-xs cursor-pointer group"
                  >
                    <span className="font-bold text-slate-200 group-hover:text-fcb-gold block truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-1 block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stateful Graph Visualizer */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono font-bold text-fcb-gold uppercase tracking-wider block">
              {isDe ? "Zustandsgraph-Visualisierung (StateGraph)" : "Stateful Graph Visualizer (StateGraph)"}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{isDe ? "Echtzeit-Graph" : "Live Agent Graph"}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed text-left">
            {isDe 
              ? "Verfolgen Sie den Zustandstransfer durch die Agentenknoten. Die Kanten beschreiben den Kontrollfluss, während die gestrichelten Linien bedingte Übergänge markieren."
              : "Track the active state transfer through the agent node coordinates. Nodes represent specific compliance and writing actions."}
          </p>

          {/* Interactive SVG Node-Graph Canvas */}
          <div className="relative bg-slate-950 border border-slate-850 rounded-xl h-[220px] w-full overflow-hidden select-none">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b" />
                </marker>
                <marker id="arrow-active-forward" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
                </marker>
                <marker id="arrow-active-violet" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" />
                </marker>
                <marker id="arrow-active-amber" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Edge 1: START -> creative_agent */}
              <line
                x1="10%" y1="50%" x2="32%" y2="50%"
                stroke={activeNode === "START" || activeNode === "creative_agent" ? "#06b6d4" : "#1e293b"}
                strokeWidth={activeNode === "START" || activeNode === "creative_agent" ? "2.5" : "1.5"}
                strokeDasharray={activeNode === "START" ? "4 4" : undefined}
                markerEnd="url(#arrow-active-forward)"
              />

              {/* Edge 2: creative_agent -> compliance_agent */}
              <line
                x1="32%" y1="50%" x2="65%" y2="50%"
                stroke={activeNode === "creative_agent" || (activeNode === "compliance_agent" && latestState?.iteration === 0) ? "#f59e0b" : "#1e293b"}
                strokeWidth={activeNode === "creative_agent" ? "2.5" : "1.5"}
                markerEnd="url(#arrow-active-amber)"
              />

              {/* Edge 3: compliance_agent -> END */}
              <line
                x1="65%" y1="50%" x2="90%" y2="50%"
                stroke={activeNode === "compliance_agent" && latestState?.approved ? "#10b981" : "#1e293b"}
                strokeWidth={activeNode === "compliance_agent" && latestState?.approved ? "2.5" : "1.5"}
                markerEnd="url(#arrow)"
              />

              {/* Loop Edges (Conditional) */}
              {/* compliance_agent -> editor_agent */}
              <path
                d="M 65% 50% Q 56.5% 25% 48% 15%"
                fill="none"
                stroke={activeNode === "compliance_agent" && !latestState?.approved && latestState?.iteration !== undefined && latestState.iteration > 0 ? "#8b5cf6" : "#1e293b"}
                strokeWidth={activeNode === "compliance_agent" && !latestState?.approved ? "2.5" : "1.5"}
                strokeDasharray="4 3"
                markerEnd="url(#arrow-active-violet)"
              />

              {/* editor_agent -> compliance_agent */}
              <path
                d="M 48% 15% Q 56.5% 25% 65% 50%"
                fill="none"
                stroke={activeNode === "editor_agent" ? "#f59e0b" : "#1e293b"}
                strokeWidth={activeNode === "editor_agent" ? "2.5" : "1.5"}
                markerEnd="url(#arrow-active-amber)"
              />

              {/* Interactive flow tracker points */}
              {isRunning && activeNode === "START" && (
                <circle cx="15%" cy="50%" r="4" fill="#06b6d4" className="animate-ping" />
              )}
            </svg>

            {/* Absolute Placed Nodes (HTML buttons for rich interaction/tooltips) */}
            {nodes.map((node) => {
              const isActive = activeNode === node.id;
              
              // Node styling based on current workflow position
              let ringColor = "ring-transparent";
              let shadowStyle = {};
              if (isActive) {
                ringColor = "ring-2 ring-fcb-gold animate-pulse";
                shadowStyle = { boxShadow: "0 0 15px rgba(245, 158, 11, 0.4)" };
              }

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeDetails(node.id)}
                  style={{
                    position: "absolute",
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono transition-all duration-300 cursor-pointer flex items-center gap-1 ${node.color} ${ringColor}`}
                >
                  <span>{node.label}</span>
                  {node.id === "creative_agent" && <Sparkles className="h-3 w-3 text-cyan-400" />}
                  {node.id === "compliance_agent" && <Eye className="h-3 w-3 text-amber-400" />}
                  {node.id === "editor_agent" && <RefreshCw className="h-3 w-3 text-violet-400" />}
                </button>
              );
            })}
          </div>

          {/* Node Inspect Details Card */}
          <AnimatePresence mode="wait">
            {selectedNodeDetails && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-left text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                  <span className="font-bold text-fcb-gold uppercase tracking-wide text-[10px] font-mono">
                    {isDe ? "Knoten-Inspektor:" : "Node Inspector:"} {selectedNodeDetails}
                  </span>
                  <button 
                    onClick={() => setSelectedNodeDetails(null)}
                    className="text-[10px] text-slate-500 hover:text-white cursor-pointer font-mono"
                  >
                    [X] Dismiss
                  </button>
                </div>
                
                {selectedNodeDetails === "START" && (
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    {isDe 
                      ? "Der Start-Knoten initialisiert den Workflow-Zustand und lädt das Inhalts-Thema sowie die Ziel-Plattform-Anforderungen."
                      : "The START node initializes the shared graph state structure and prepares metadata schemas for target publishers."}
                  </p>
                )}

                {selectedNodeDetails === "creative_agent" && (
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    {isDe 
                      ? "Der Kreativ-Agent analysiert das Thema und erstellt einen ersten textuellen Entwurf, optimiert auf das Format der Zielplattform."
                      : "The Creative Agent parses raw input parameters and produces initial copywriting drafts using generative LLM techniques."}
                  </p>
                )}

                {selectedNodeDetails === "compliance_agent" && (
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    {isDe 
                      ? "Der Compliance-Prüfer auditiert den Entwurf auf Vereins-Slogans (Mia San Mia), korrekte Farbbezeichnungen, Hashtags und Längenbeschränkungen."
                      : "The Compliance Auditor reviews drafts against corporate marketing criteria. Ensures presence of 'Mia San Mia' motto."}
                  </p>
                )}

                {selectedNodeDetails === "editor_agent" && (
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    {isDe 
                      ? "Der Editor-Knoten empfängt das strukturierte Feedback des Prüfers und bearbeitet den Text so, dass alle Richtlinien lückenlos erfüllt werden."
                      : "The Copy Editor intercept rejects, rewrite and restructure phrasing to align with the compliance feedback list."}
                  </p>
                )}

                {selectedNodeDetails === "END" && (
                  <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
                    {isDe 
                      ? "Das Workflow-Ende. Gibt den endgültig freigegebenen Text an das Frontend zur Freigabe oder Veröffentlichung zurück."
                      : "The END node commits final state updates, returning the brand-cleared post copy safely to the creator interface."}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Column - Terminal Console & Trace Logs */}
      <div className="space-y-6">
        
        {/* Live Multi-Agent Dialogue Panel */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between min-h-[300px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wider">
                {isDe ? "Agenten-Konsole & Tracing" : "Agent Console & Trace"}
              </h3>
            </div>

            {/* Output terminal interface */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 font-mono text-xs text-left h-[260px] overflow-y-auto space-y-3 select-text scrollbar-thin">
              {steps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600">
                  <Network className="h-8 w-8 mb-2 opacity-40 animate-pulse" />
                  <p className="text-[10px] uppercase font-bold tracking-wider">
                    {isDe ? "Kein Workflow aktiv" : "No active workflow trace"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">
                    {isDe ? "Starten Sie den Workflow, um die Agenten-Schleifen live zu beobachten." : "Run the LangGraph workflow to view agent execution steps."}
                  </p>
                </div>
              ) : (
                steps.slice(0, currentStepIdx + 1).map((s, idx) => {
                  let badgeColor = "text-slate-500 border-slate-800";
                  let prefix = "[System]";

                  if (s.node === "creative_agent") {
                    badgeColor = "text-cyan-400 border-cyan-900 bg-cyan-950/25";
                    prefix = "[Creative Agent]";
                  } else if (s.node === "compliance_agent") {
                    badgeColor = s.state.approved 
                      ? "text-green-400 border-green-900 bg-green-950/25" 
                      : "text-amber-400 border-amber-900 bg-amber-950/25";
                    prefix = "[Compliance Checker]";
                  } else if (s.node === "editor_agent") {
                    badgeColor = "text-violet-400 border-violet-900 bg-violet-950/25";
                    prefix = "[Copy Editor]";
                  } else if (s.node === "END") {
                    badgeColor = "text-emerald-400 border-emerald-900 bg-emerald-950/25";
                    prefix = "[Workflow Engine]";
                  }

                  return (
                    <div key={idx} className="space-y-1.5 border-b border-slate-900 pb-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border uppercase text-[8px] font-bold ${badgeColor}`}>
                          {prefix}
                        </span>
                        <span className="text-slate-600 text-[9px]">{s.timestamp}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed select-text">{s.message}</p>
                      
                      {/* Rich Node State inspections */}
                      {s.node === "creative_agent" && s.state.draft && (
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-900 text-[10px] text-slate-400 mt-1 space-y-1">
                          <span className="font-bold text-[9px] text-cyan-400 block uppercase tracking-wider">Initial Post Draft:</span>
                          <p className="italic text-slate-300">"{s.state.draft}"</p>
                        </div>
                      )}

                      {s.node === "compliance_agent" && (
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-900 text-[10px] text-slate-400 mt-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[9px] text-amber-400 block uppercase tracking-wider">Audit Score: {s.state.complianceScore}/100</span>
                            <span className={s.state.approved ? "text-green-400 font-bold" : "text-rose-400 font-bold"}>
                              {s.state.approved ? "APPROVED" : "REJECTED"}
                            </span>
                          </div>
                          {s.state.complianceFeedback.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-[9.5px]">
                              {s.state.complianceFeedback.map((fb, fIdx) => (
                                <li key={fIdx} className="text-rose-300">{fb}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {s.node === "editor_agent" && s.state.draft && (
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-900 text-[10px] text-slate-400 mt-1 space-y-1">
                          <span className="font-bold text-[9px] text-violet-400 block uppercase tracking-wider">Revised Output:</span>
                          <p className="italic text-slate-300">"{s.state.draft}"</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action on Final State Output */}
          {latestState?.finalApprovedDraft && currentStepIdx === steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-emerald-950/50 text-left space-y-3 shadow-lg shadow-emerald-950/10"
            >
              <div className="flex items-center justify-between border-b border-emerald-950 pb-1.5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {isDe ? "Brand-Geprüft & Freigegeben" : "Cleared Brand Post"}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  {latestState.complianceScore}% Compliance
                </span>
              </div>

              <p className="text-slate-300 text-[11px] font-mono leading-relaxed bg-slate-900/50 p-2.5 rounded border border-slate-900 select-text">
                {latestState.finalApprovedDraft}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(latestState.finalApprovedDraft)}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      <span>{isDe ? "Kopiert!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{isDe ? "Kopieren" : "Copy"}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSendToQueue}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isDe ? "Zur Warteschlange" : "Push to Queue"}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Informational Guidelines Card */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs text-slate-500 font-sans text-left space-y-2">
          <p className="font-semibold text-slate-400 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
            🛡️ LangGraph State-Safety & Correction
          </p>
          <p className="leading-relaxed text-[10.5px]">
            {isDe 
              ? "LangGraph garantiert, dass Textentwürfe so lange die Redaktionsschleife durchlaufen, bis sie alle formellen Markenrichtlinien erfüllen. Dadurch wird sichergestellt, dass kein Post ohne das Clubmotto 'Mia San Mia' veröffentlicht wird."
              : "LangGraph guarantees that text drafts undergo automated revision cycles until they fully satisfy brand regulations. This ensures no post leaves the pipeline without 'Mia San Mia'."}
          </p>
        </div>
      </div>
    </div>
  );
};
