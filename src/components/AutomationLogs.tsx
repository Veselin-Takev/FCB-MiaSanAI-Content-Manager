import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Workflow, Zap, Play, CheckCircle2, AlertTriangle, RefreshCw, 
  Settings, Key, Link2, Smartphone, Terminal, ToggleLeft, ToggleRight,
  Download, ShieldCheck, Network, Layers
} from "lucide-react";
import { AutomationWorkflow, PipelineLog } from "../types";
import { INITIAL_WORKFLOWS } from "../data/mockData";
import { MultiAgentAutomation } from "./MultiAgentAutomation";

interface AutomationLogsProps {
  logs?: PipelineLog[];
  onAddLog: (log: any) => void;
}

export const AutomationLogs: React.FC<AutomationLogsProps> = ({ logs, onAddLog }) => {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(INITIAL_WORKFLOWS);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"pipelines" | "qa_governance">("qa_governance");

  const handleSyncPipeline = () => {
    setIsSyncing(true);
    onAddLog({
      id: `sync-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Automation Center",
      message: "Syncing status of all external automation pipelines with remote servers (Zapier, n8n, Make.com)..."
    });
    setTimeout(() => {
      setIsSyncing(false);
      onAddLog({
        id: `sync-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Automation Center",
        message: "All 5 external pipelines successfully synchronized. Health check status: 100% operational."
      });
    }, 1200);
  };

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    
    const headers = ["ID", "Timestamp", "Level", "Source", "Message"];
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.level,
      log.source,
      `"${log.message.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `miasanai_automation_pipeline_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onAddLog({
      id: `export-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Exporter",
      message: `Exported ${logs.length} pipeline logs to CSV file successfully.`
    });
  };

  const handleToggleStatus = (id: string) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id === id) {
        const nextStatus = wf.status === "active" ? "inactive" : "active";
        onAddLog({
          id: `wf-toggle-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: wf.connector,
          message: `Workflow '${wf.name}' state toggled to ${nextStatus.toUpperCase()}.`
        });
        return { ...wf, status: nextStatus };
      }
      return wf;
    }));
  };

  const handleTestTrigger = (wf: AutomationWorkflow) => {
    setTestingId(wf.id);
    
    onAddLog({
      id: `test-wf-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: wf.connector,
      message: `Simulating inbound webhook request for '${wf.name}'...`
    });

    setTimeout(() => {
      setWorkflows(prev => prev.map(item => {
        if (item.id === wf.id) {
          return { ...item, executionsCount: item.executionsCount + 1 };
        }
        return item;
      }));

      onAddLog({
        id: `test-wf-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: wf.connector,
        message: `Inbound Webhook payload matching trigger '${wf.triggerEvent}' parsed successfully. AI generated content pushed and logged.`
      });

      setTestingId(null);
    }, 1200);
  };

  return (
    <div className="space-y-6" id="automation-tab">
      
      {/* Sub-navigation tabs */}
      <div className="flex gap-2 bg-slate-900/30 p-1.5 rounded-xl border border-slate-800 max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveSubTab("qa_governance")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold font-mono tracking-wide transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === "qa_governance"
              ? "bg-fcb-red text-white shadow-md shadow-fcb-red/15 animate-fadeIn"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Multi-Agent QA System</span>
        </button>
        <button
          onClick={() => setActiveSubTab("pipelines")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold font-mono tracking-wide transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === "pipelines"
              ? "bg-fcb-red text-white shadow-md shadow-fcb-red/15 animate-fadeIn"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Workflow className="h-4 w-4" />
          <span>Pipelines & Webhooks</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === "qa_governance" ? (
          <motion.div
            key="qa-gov"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <MultiAgentAutomation onAddLog={onAddLog} />
          </motion.div>
        ) : (
          <motion.div
            key="pipelines-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Workflows list (Left column Span 2) */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-fcb-red" />
                    <h3 className="font-bold text-white font-display">Middleware & Automation Pipeline (MiaSanAI n8n / Zapier)</h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleSyncPipeline}
                      disabled={isSyncing}
                      className="text-xs bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium transition cursor-pointer disabled:opacity-50"
                      title="Sync and Refresh Pipelines"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Sync Health</span>
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">5 Active</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage the active API connections and webhook configurations routing FC Bayern Munich events to social channels and messaging systems. Toggle workflows on/off or run mock trigger simulations.
                </p>

                {/* Workflow Cards List */}
                <div className="space-y-3 relative">
                  <AnimatePresence mode="popLayout">
                    {isSyncing ? (
                      <motion.div
                        key="skeleton-container"
                        initial="initial"
                        animate="animate"
                        exit={{ opacity: 0, y: -10 }}
                        variants={{
                          animate: {
                            transition: { staggerChildren: 0.08 }
                          }
                        }}
                        className="space-y-3"
                      >
                        {[1, 2, 3].map((cardId) => (
                          <motion.div
                            key={cardId}
                            variants={{
                              initial: { opacity: 0.3, y: 8 },
                              animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                            }}
                            className="bg-slate-950/20 border border-slate-900/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-2.5 flex-1 w-full">
                              <div className="flex items-center gap-2">
                                <motion.div 
                                  variants={{
                                    initial: { opacity: 0.4 },
                                    animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.1 } }
                                  }}
                                  className="h-4 bg-slate-800/80 rounded w-1/3" 
                                />
                                <motion.div 
                                  variants={{
                                    initial: { opacity: 0.4 },
                                    animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.15 } }
                                  }}
                                  className="h-4 bg-slate-800/40 rounded w-16" 
                                />
                              </div>
                              <motion.div 
                                variants={{
                                  initial: { opacity: 0.4 },
                                  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.2 } }
                                }}
                                className="h-2.5 bg-slate-800/40 rounded w-1/2" 
                              />
                              <motion.div 
                                variants={{
                                  initial: { opacity: 0.4 },
                                  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.25 } }
                                }}
                                className="h-2 bg-slate-800/30 rounded w-1/4" 
                              />
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                              <motion.div 
                                variants={{
                                  initial: { opacity: 0.3 },
                                  animate: { opacity: [0.3, 0.7, 0.3], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.3 } }
                                }}
                                className="h-8 bg-slate-800/40 rounded-lg w-20" 
                              />
                              <motion.div 
                                variants={{
                                  initial: { opacity: 0.3 },
                                  animate: { opacity: [0.3, 0.7, 0.3], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: cardId * 0.35 } }
                                }}
                                className="h-8 bg-slate-800/40 rounded-lg w-24" 
                              />
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="live-workflows"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        {workflows.map((wf) => {
                          const isTesting = testingId === wf.id;
                          const isActive = wf.status === "active";
                          
                          let connectorColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                          if (wf.connector === "n8n") {
                            connectorColor = "bg-red-500/10 text-rose-400 border-rose-500/20";
                          } else if (wf.connector === "Make.com") {
                            connectorColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                          } else if (wf.connector === "Internal") {
                            connectorColor = "bg-fcb-gold/10 text-fcb-gold border-fcb-gold/20";
                          }

                          return (
                            <div key={wf.id} className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-slate-700">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-white">{wf.name}</h4>
                                  <span className={`text-[9.5px] font-mono uppercase font-bold border px-1.5 py-0.5 rounded ${connectorColor}`}>
                                    {wf.connector}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <span className="text-slate-500 font-mono">Trigger:</span> {wf.triggerEvent}
                                </p>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Successful Executions: <span className="text-slate-300 font-bold">{wf.executionsCount}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Toggle Switch status */}
                                <button
                                  onClick={() => handleToggleStatus(wf.id)}
                                  className="text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium bg-slate-950 p-1.5 rounded-lg border border-slate-800"
                                  title={isActive ? "Disable Workflow" : "Enable Workflow"}
                                >
                                  {isActive ? (
                                    <>
                                      <ToggleRight className="h-5 w-5 text-green-400" />
                                      <span className="text-green-400">Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="h-5 w-5 text-slate-500" />
                                      <span className="text-slate-500">Paused</span>
                                    </>
                                  )}
                                </button>

                                {/* Test Trigger Button */}
                                <button
                                  onClick={() => handleTestTrigger(wf)}
                                  disabled={isTesting || !isActive}
                                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  id={`test-wf-btn-${wf.id}`}
                                >
                                  {isTesting ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Testing...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3" /> Test Webhook
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Live Pipeline Logs / Export Panel */}
              {logs && (
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-fcb-red" />
                      <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide flex items-center gap-1.5">
                        Pipeline Execution Logs
                      </h3>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      id="export-automation-logs-btn"
                      title="Export Logs as CSV"
                    >
                      <Download className="h-3.5 w-3.5 text-fcb-gold" />
                      <span>Export Data</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Audit logs generated by automated webhooks, custom API calls, and system triggers. Generate a secure CSV report for external logging systems.
                  </p>

                  <div className="max-h-[220px] overflow-y-auto bg-slate-950/60 p-3 rounded-lg border border-slate-850 font-mono text-xs space-y-2 select-text">
                    {logs.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-4">No automation logs available.</p>
                    ) : (
                      logs.slice().reverse().map((log) => {
                        let levelColor = "text-blue-400";
                        if (log.level === "SUCCESS") levelColor = "text-green-400";
                        else if (log.level === "WARNING") levelColor = "text-amber-400";
                        else if (log.level === "TRIGGER") levelColor = "text-cyan-400";

                        return (
                          <div key={log.id} className="text-[11px] leading-relaxed flex items-start gap-2 py-0.5 border-b border-slate-900/30">
                            <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                            <span className={`font-bold flex-shrink-0 uppercase tracking-wide text-[10px] ${levelColor}`}>[{log.level}]</span>
                            <span className="text-slate-400 font-semibold flex-shrink-0">({log.source}):</span>
                            <span className="text-slate-300 select-text break-words flex-1">{log.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Integration Setup Credentials (Right column 1 span) */}
            <div className="space-y-6">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Key className="h-5 w-5 text-fcb-gold" />
                  <h3 className="font-bold text-white font-display">Credential Vault</h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Zapier Connection */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">Zapier Integration Status</span>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-[10px]">
                      <span className="text-slate-400">API Key: FCB_ZAP_***9812</span>
                      <span className="text-green-400">● SECURE</span>
                    </div>
                  </div>

                  {/* n8n Webhook URL */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">n8n Live Endpoint Link</span>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-[10.5px]">
                      <span className="truncate text-cyan-400">https://n8n.fcb.ai/v1/webhook...</span>
                      <Link2 className="h-3.5 w-3.5 text-slate-500 hover:text-white cursor-pointer flex-shrink-0 ml-1" />
                    </div>
                  </div>

                  {/* Make.com Credential status */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">Make.com Connection Status</span>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between font-mono text-[10px]">
                      <span className="text-slate-400">Client Secret: Verified OAuth2</span>
                      <span className="text-green-400">● ONLINE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise security notice */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-500 font-sans space-y-2">
                <p className="font-semibold text-slate-400 flex items-center gap-1 text-[10px] font-mono">
                  🛡️ ENTERPRISE API COMPLIANCE
                </p>
                <p className="leading-relaxed text-[11px]">
                  All outbound webhook requests are cryptographically signed with SHA256 signatures to guarantee authenticity before reaching any social publisher gateway.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
