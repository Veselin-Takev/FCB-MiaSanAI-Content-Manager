import React, { useState } from "react";
import { 
  GitFork, Play, Terminal, ArrowRight, User, Sparkles, Send, 
  Settings2, HelpCircle, Layers, CheckCircle, Smartphone, Globe 
} from "lucide-react";
import { JourneyStage, AutomatedStep } from "../types";
import { JOURNEY_STAGES } from "../data/mockData";

interface JourneyBuilderProps {
  onAddLog: (log: any) => void;
  onTriggerSimulate: (stageId: string, triggerName: string, actionName: string) => void;
  activeSimulation: { stageId: string; triggerName: string; actionName: string } | null;
}

export const JourneyBuilder: React.FC<JourneyBuilderProps> = ({ onAddLog, onTriggerSimulate, activeSimulation }) => {
  const [selectedStage, setSelectedStage] = useState<JourneyStage>(JOURNEY_STAGES[0]);
  const [fanName, setFanName] = useState<string>("Stefan");
  const [selectedTrigger, setSelectedTrigger] = useState<string>(JOURNEY_STAGES[0].triggers[0].name);
  const [selectedAction, setSelectedAction] = useState<string>(JOURNEY_STAGES[0].actions[0].name);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [automationResult, setAutomationResult] = useState<AutomatedStep | null>(null);

  const handleStageSelect = (stage: JourneyStage) => {
    setSelectedStage(stage);
    setSelectedTrigger(stage.triggers[0].name);
    setSelectedAction(stage.actions[0].name);
  };

  const handleRunAutomation = async () => {
    setIsLoading(true);
    setAutomationResult(null);

    // Add log
    onAddLog({
      id: `automation-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: "Journey Engine",
      message: `Running trigger pipeline for fan '${fanName}' in stage: ${selectedStage.name}. Trigger event: '${selectedTrigger}'`
    });

    try {
      const response = await fetch("/api/generate/journey-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: selectedStage.name,
          fanTrigger: selectedTrigger,
          targetAction: selectedAction,
          fanName: fanName
        })
      });

      if (!response.ok) {
        throw new Error("Automation execution failed");
      }

      const data: AutomatedStep = await response.json();
      setAutomationResult(data);

      onAddLog({
        id: `automation-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "n8n / Zapier Middleware",
        message: `Successfully executed automated action: '${data.automatedActionName}'. Payload routed to channels. Fan notified.`
      });
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `automation-fail-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Journey Engine",
        message: `Error executing step automation: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="journey-tab">
      
      {/* Left Columns (Span 2): Visual Stage Mapping & Interactive Config */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Stages Navigation Bento Header */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <GitFork className="h-5 w-5 text-fcb-red" />
            <h3 className="text-lg font-bold font-display text-white">MiaSanAI Fan Lifecycle Journey Mapper</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {JOURNEY_STAGES.map((stage) => {
              const isSelected = selectedStage.id === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageSelect(stage)}
                  className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden cursor-pointer ${
                    isSelected 
                      ? "bg-slate-900 border-fcb-red shadow-lg shadow-fcb-red/5" 
                      : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/20"
                  }`}
                  id={`stage-card-${stage.id}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stage.color}`} />
                  <h4 className="font-bold text-sm text-white mt-1">{stage.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {stage.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Interface */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-md font-bold text-white font-display border-b border-slate-800 pb-3 flex items-center gap-1.5">
            <Settings2 className="h-4 w-4 text-fcb-gold" /> Automation Engine Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input: Fan name */}
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Target Fan Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fcb-red font-sans pl-8"
                  placeholder="Enter fan's name..."
                />
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Used to personalize AI templates dynamically.</p>
            </div>

            {/* Select: Triggers */}
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Active Trigger Condition
              </label>
              <select
                value={selectedTrigger}
                onChange={(e) => setSelectedTrigger(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fcb-red font-sans"
              >
                {selectedStage.triggers.map((trig) => (
                  <option key={trig.id} value={trig.name}>
                    {trig.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Simulated fan actions that wake up n8n/Zapier.</p>
            </div>

            {/* Select: Actions */}
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Target Content Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fcb-red font-sans"
              >
                {selectedStage.actions.map((act) => (
                  <option key={act.id} value={act.name}>
                    {act.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">The Generative AI workflow that executes.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleRunAutomation}
              disabled={isLoading}
              className="bg-fcb-red hover:bg-fcb-red/90 text-white font-semibold text-xs px-5 py-3 rounded-lg flex items-center gap-2 transition shadow-lg shadow-fcb-red/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="run-automation-btn"
            >
              {isLoading ? (
                <>
                  <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating Journey Pipeline...
                </>
              ) : (
                <>
                  <Play className="h-4.5 w-4.5" /> Execute Journey Automation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informative Step visualizer block */}
        <div className="bg-slate-900/10 p-5 rounded-2xl border border-slate-800/50 flex items-start gap-4">
          <div className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg border border-cyan-500/20 mt-1">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm font-display">How the MiaSanAI Middleware Engine operates:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1">Step 1: Fan Signal</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fan completes trigger event (NFC gate pass, high score, or tag). Ingested via Zapier or n8n webhooks.
                </p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1">Step 2: AI Context Grounding</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  MiaSanAI fetches squad statistics and brand safety filters from our internal club knowledge repository (RAG).
                </p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1">Step 3: Delivery Channel</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Generates bespoke copywriting, customized player imagery templates, or voice scripts and delivers instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Simulated Fan Output Terminal */}
      <div className="space-y-6">
        <div className="bg-slate-950 rounded-2xl border border-slate-800 h-full flex flex-col min-h-[500px]">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between rounded-t-2xl">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 uppercase font-semibold">
              <Terminal className="h-4 w-4 text-fcb-red" /> MiaSanAI Terminal Monitor
            </span>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          </div>

          {/* Terminal content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-xs text-slate-300">
            {isLoading && (
              <div className="space-y-3 animate-pulse">
                <p className="text-cyan-400">⚡ [LOG 13:03] Connecting to Gemini LLM orchestrator...</p>
                <p className="text-slate-400">⚡ [LOG 13:03] Grounding response with RAG parameters...</p>
                <p className="text-slate-500">⚡ [LOG 13:03] Parsing structural response schema...</p>
                <div className="h-4 bg-slate-900 rounded w-3/4 mt-4" />
                <div className="h-4 bg-slate-900 rounded w-1/2" />
              </div>
            )}

            {!isLoading && !automationResult && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <GitFork className="h-10 w-10 text-slate-700 animate-bounce" />
                <p className="text-slate-500 font-sans text-xs">
                  Configure the fan details and triggers on the left, then trigger the pipeline execution to watch the AI output.
                </p>
              </div>
            )}

            {automationResult && (
              <div className="space-y-4 font-sans text-slate-300">
                {/* Trigger confirmation */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] font-mono text-green-400 block mb-1">SYSTEM TRIGGER CONFIRMED</span>
                  <p className="text-xs text-white font-medium">{automationResult.triggerDetected}</p>
                </div>

                {/* Simulated Push Notification Preview */}
                <div className="bg-slate-900/20 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5 text-fcb-red" /> Fan Mobile Device Preview
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Just now</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded bg-fcb-red flex items-center justify-center font-bold text-[10px] text-white">
                        FCB
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white flex items-center justify-between">
                          FC Bayern München <span className="text-[10px] font-mono text-fcb-gold">MiaSanAI</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {automationResult.personalizedMessage}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Button CTA */}
                    <button className="w-full bg-gradient-to-r from-fcb-red to-rose-600 hover:from-fcb-red/90 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-md transition-all mt-2 cursor-pointer flex items-center justify-center gap-1.5">
                      {automationResult.interactiveCTA} <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Zapier / n8n Webhook mock payload */}
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 block mb-2 uppercase tracking-wide">
                    🔄 Middleware Webhook Payload (n8n Routing)
                  </span>
                  <pre className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-[10px] font-mono overflow-x-auto text-cyan-300">
                    {JSON.stringify(automationResult.middlewarePayload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
