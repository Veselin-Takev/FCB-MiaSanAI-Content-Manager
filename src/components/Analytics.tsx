import React, { useState, useEffect } from "react";
import { 
  BarChart3, TrendingUp, Award, Activity, Search, RefreshCw, 
  ExternalLink, Layers, AlertTriangle, CheckCircle, Flame, Plus, Play
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell 
} from "recharts";
import { PipelineLog } from "../types";
import { TableauDashboard } from "./TableauDashboard";

interface AnalyticsProps {
  logs: PipelineLog[];
  onAddLog: (log: PipelineLog) => void;
  presets?: any[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ logs, onAddLog, presets = [] }) => {
  // Tableau configuration state
  const [tableauUrl, setTableauUrl] = useState<string>(
    "https://public.tableau.com/views/FootballInsights/Dashboard"
  );
  const [customTableauInput, setCustomTableauInput] = useState<string>("");
  const [isRefreshingTableau, setIsRefreshingTableau] = useState<boolean>(false);

  // Form state for log injection
  const [logSource, setLogSource] = useState<string>("Marketing Funnel Node");
  const [logLevel, setLogLevel] = useState<"INFO" | "SUCCESS" | "WARNING" | "ERROR">("SUCCESS");
  const [logMessage, setLogMessage] = useState<string>("Social campaign reach exceeded standard index by 14.8%.");

  // Dynamic KPI calculations based on current pipeline logs
  const [reachEfficiency, setReachEfficiency] = useState<number>(88);
  const [qualityScore, setQualityScore] = useState<number>(94);
  const [fidelityScore, setFidelityScore] = useState<number>(91);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [presetDistribution, setPresetDistribution] = useState<any[]>([]);

  useEffect(() => {
    const draftCount = presets.filter(p => p.status === "Draft" || !p.status).length;
    const needsWorkCount = presets.filter(p => p.status === "Needs Work").length;
    const approvedCount = presets.filter(p => p.status === "Approved").length;
    
    setPresetDistribution([
      { name: "Draft", value: draftCount, color: "#94a3b8" },
      { name: "Needs Work", value: needsWorkCount, color: "#f59e0b" },
      { name: "Approved", value: approvedCount, color: "#10b981" }
    ]);
  }, [presets]);

  useEffect(() => {
    // 1. Calculate Post Reach Efficiency:
    // Success logs are weighted 1.0, warning logs are weighted 0.4.
    const successCount = logs.filter(l => l.level === "SUCCESS").length;
    const warningCount = logs.filter(l => l.level === "WARNING").length;
    const totalCount = logs.length || 1;
    
    // Scale efficiency to be realistic (between 65% and 99%)
    const rawEfficiency = ((successCount * 1.0 + warningCount * 0.4) / totalCount) * 100;
    const computedEfficiency = Math.round(Math.max(62, Math.min(99, rawEfficiency)));
    setReachEfficiency(computedEfficiency);

    // 2. Calculate Content Quality Score:
    // Decreased for every warning (-4%) and error (-12%) in logs
    const errorCount = logs.filter(l => l.level === "ERROR").length;
    const computedQuality = Math.round(Math.max(45, 100 - (warningCount * 5) - (errorCount * 12)));
    setQualityScore(computedQuality);

    // 3. Audio / Video Fidelity Quotient
    // Synthesized score based on the source metadata in logs
    const generatorLogsCount = logs.filter(l => l.source.toLowerCase().includes("generator") || l.source.toLowerCase().includes("video")).length;
    const computedFidelity = Math.round(Math.max(70, Math.min(98, 85 + (generatorLogsCount * 1.5))));
    setFidelityScore(computedFidelity);

    // 4. Generate historical data nodes for Recharts
    const dataNodes = [];
    for (let i = 5; i >= 0; i--) {
      // Simulate historical trends leading up to current calculated metrics
      const offsetFactor = i * 2.2;
      dataNodes.push({
        name: `T-${i}h`,
        efficiency: Math.round(Math.max(60, computedEfficiency - offsetFactor + (Math.sin(i) * 3))),
        quality: Math.round(Math.max(55, computedQuality + offsetFactor - (Math.cos(i) * 2))),
        fidelity: Math.round(Math.max(65, computedFidelity - (i * 1.2))),
      });
    }
    setHistoricalData(dataNodes);

  }, [logs]);

  // Construct standard embedded Tableau safe URL
  const getEmbeddedTableauUrl = () => {
    // Add embed parameters to avoid full redirect
    const cleanBase = tableauUrl.split("?")[0];
    return `${cleanBase}?:embed=y&:showVizHome=no&:host_url=https%3A%2F%2Fpublic.tableau.com%2F&:embed_code_version=3&:tabs=yes&:toolbar=no&:animate_transition=yes&:display_static_image=no`;
  };

  const handleApplyCustomTableau = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTableauInput.trim()) return;

    setIsRefreshingTableau(true);
    setTableauUrl(customTableauInput.trim());
    
    onAddLog({
      id: `tableau-url-update-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Analytics Studio",
      message: `Tableau workbook reference modified to custom source: "${customTableauInput}"`
    });

    setTimeout(() => {
      setIsRefreshingTableau(false);
    }, 800);
  };

  const handleInjectMockLog = () => {
    if (!logMessage.trim()) return;

    onAddLog({
      id: `injected-kpi-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: logLevel,
      source: logSource,
      message: logMessage.trim()
    });

    // Clear message input
    setLogMessage("");
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn" id="analytics-workspace-container">
      
      {/* Upper Grid: Real-time Mapped KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="analytics-kpi-widgets">
        {/* KPI 1: Post Reach Efficiency */}
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Post Reach Efficiency</span>
            <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display text-white tracking-tight">{reachEfficiency}%</span>
            <span className="text-xs text-cyan-400 font-mono font-semibold">Live Metric</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${reachEfficiency}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Dynamically derived from pipeline success nodes. Indicates optimized distribution health.
            </p>
          </div>
        </div>

        {/* KPI 2: Content Quality Score */}
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Content Quality Score</span>
            <Award className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display text-white tracking-tight">{qualityScore}/100</span>
            <span className="text-xs text-rose-400 font-mono font-semibold">Active Brand Guard</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${qualityScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Penalized by warning and error events in log pipelines. Correlates to brand policy compliance.
            </p>
          </div>
        </div>

        {/* KPI 3: Audio/Video Fidelity Quotient */}
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Acoustic Fidelity Quotient</span>
            <Activity className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-display text-white tracking-tight">{fidelityScore}%</span>
            <span className="text-xs text-amber-400 font-mono font-semibold">DSP Signal Guard</span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${fidelityScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Computed based on high-frequency voice synthesizers and video timelines parsed through active workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Main Column Grid: Tableau Visualization & Live Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="analytics-main-workspace-layout">
        
        {/* Left 8 Spans: Tableau Interactive Embed Dashboard */}
        <div className="lg:col-span-8">
          <TableauDashboard onAddLog={onAddLog} />
        </div>

        {/* Right 4 Spans: Live Trend Mapper & Control Console */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Preset Status Distribution Donut Chart */}
          <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Content Pipeline</span>
              <span className="text-xs text-white font-semibold">Preset Status Distribution</span>
            </div>

            <div className="h-[160px] w-full text-xs flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={presetDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {presetDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020205", borderColor: "#333", fontSize: "10px", borderRadius: "8px" }}
                    itemStyle={{ fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] font-mono font-bold text-slate-400 border-t border-white/5 pt-3">
              {presetDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}: <span className="text-white">{entry.value}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend chart card */}
          <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Historical Trend Indexing</span>
              <span className="text-xs text-white font-semibold">Mapped KPI Progress</span>
            </div>

            <div className="h-[140px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#555" fontSize={9} />
                  <YAxis stroke="#555" fontSize={9} domain={[40, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020205", borderColor: "#333", fontSize: "10px" }}
                    labelStyle={{ color: "#aaa", fontWeight: "bold" }}
                  />
                  <Line type="monotone" dataKey="efficiency" stroke="#06b6d4" strokeWidth={2} name="Reach Eff." />
                  <Line type="monotone" dataKey="quality" stroke="#f43f5e" strokeWidth={2} name="Quality Score" />
                  <Line type="monotone" dataKey="fidelity" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 3" name="Fidelity" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 border-t border-white/5 pt-2">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Reach Efficiency</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Quality Guard</span>
            </div>
          </div>

          {/* Interactive KPI Control & Injection Console */}
          <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-mono text-fcb-gold font-bold uppercase tracking-wider block">KPI Control Center</span>
              <span className="text-xs text-white font-semibold">Inject Real-time Event</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Event Source */}
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Source Node</label>
                <select
                  value={logSource}
                  onChange={(e) => setLogSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded px-2.5 py-1 text-xs text-white outline-none font-mono cursor-pointer"
                >
                  <option value="Marketing Funnel Node">Marketing Funnel Node</option>
                  <option value="Social Dispatch Agent">Social Dispatch Agent</option>
                  <option value="Brand Guard Checker">Brand Guard Checker</option>
                  <option value="Synthesis Middleware">Synthesis Middleware</option>
                </select>
              </div>

              {/* Event Severity */}
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Event Severity</label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px] font-bold">
                  {(["INFO", "SUCCESS", "WARNING", "ERROR"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setLogLevel(level)}
                      className={`py-1 rounded text-center cursor-pointer transition border ${
                        logLevel === level
                          ? level === "SUCCESS"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                            : level === "ERROR"
                            ? "bg-rose-500/10 border-rose-500 text-rose-400"
                            : level === "WARNING"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                          : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Message */}
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">Telemetry Message</label>
                <textarea
                  rows={2}
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  placeholder="Describe the pipeline state node event..."
                  className="w-full bg-slate-950 border border-slate-900 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-850"
                />
              </div>

              {/* Inject Button */}
              <button
                type="button"
                onClick={handleInjectMockLog}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2 rounded flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Inject Event & Shift KPIs
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
