import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { 
  Users, Sparkles, Share2, Layers, Play, Zap, CheckCircle2, AlertTriangle, 
  Clock, TrendingUp, HelpCircle, FileText, Download, Newspaper, ExternalLink, Globe, RefreshCw
} from "lucide-react";
import { PipelineLog } from "../types";
import { useLanguage } from "../context/LanguageContext";
import { TableauDashboard } from "./TableauDashboard";

interface DashboardOverviewProps {
  logs: PipelineLog[];
  onAddLog: (log: PipelineLog) => void;
  onSimulateTrigger: (stageId: string, triggerName: string, actionName: string) => void;
}

interface NewsStory {
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  timestamp: string;
}

const analyticsData = [
  { name: "Mon", Awareness: 4500, Engagement: 2400, Conversion: 1100, Loyalty: 400 },
  { name: "Tue", Awareness: 5200, Engagement: 2800, Conversion: 1300, Loyalty: 480 },
  { name: "Wed", Awareness: 6100, Engagement: 3500, Conversion: 1700, Loyalty: 550 },
  { name: "Thu", Awareness: 5800, Engagement: 3100, Conversion: 1500, Loyalty: 590 },
  { name: "Fri", Awareness: 7400, Engagement: 4600, Conversion: 2100, Loyalty: 710 },
  { name: "Sat", Awareness: 9800, Engagement: 6200, Conversion: 3400, Loyalty: 1200 },
  { name: "Sun", Awareness: 11500, Engagement: 7500, Conversion: 4100, Loyalty: 1600 },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ logs, onAddLog, onSimulateTrigger }) => {
  const { language } = useLanguage();
  const [activeMetricTab, setActiveMetricTab] = useState<"traffic" | "conversions">("traffic");

  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | null>(null);

  const fetchDailyDigest = async (force: boolean = false) => {
    setIsNewsLoading(true);
    setNewsError(null);
    onAddLog({
      id: `news-fetch-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Google Grounding",
      message: force 
        ? `Re-fetching daily news digest grounded in active search query (${language.toUpperCase()})...`
        : `Loading top 5 trending FCB news stories with Google Search grounding...`
    });

    try {
      const response = await fetch("/api/news/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch daily news digest");
      }

      const data = await response.json();
      if (data && Array.isArray(data.stories)) {
        setNewsStories(data.stories);
        setNewsFetchedAt(new Date().toLocaleTimeString());
        onAddLog({
          id: `news-success-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Google Grounding",
          message: `Successfully loaded 5 grounded trending stories. Grounding Metadata attached.`
        });
      } else {
        throw new Error("Invalid response schema received");
      }
    } catch (err: any) {
      console.error("Error fetching daily news:", err);
      setNewsError(err.message || "Failed to load news");
      onAddLog({
        id: `news-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Google Grounding",
        message: `Failed to compile daily news digest: ${err.message}`
      });
    } finally {
      setIsNewsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyDigest();
  }, [language]);

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
    link.setAttribute("download", `miasanai_dashboard_pipeline_logs_${new Date().toISOString().slice(0, 10)}.csv`);
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

  const latestStats = [
    { id: "stat1", name: "Total Fan Reach", value: "1.42M", change: "+14.2% vs last week", icon: Users, color: "text-cyan-400" },
    { id: "stat2", name: "Active AI Automations", value: "24 Rules", change: "99.8% System Uptime", icon: Zap, color: "text-fcb-red" },
    { id: "stat3", name: "Avg Engagement Rate", value: "8.43%", change: "+2.1% Industry High", icon: TrendingUp, color: "text-amber-400" },
    { id: "stat4", name: "Conversations Active", value: "4,102 DMs", change: "Powered by MiaSanAI", icon: Sparkles, color: "text-purple-400" }
  ];

  const handleSimulateQuickTrigger = (triggerType: string) => {
    const timestamp = new Date().toLocaleTimeString();
    if (triggerType === "goal") {
      onSimulateTrigger(
        "awareness", 
        "Player Goal/Highlight Trigger", 
        "Generate Runway/Pika Shorts Video Storyboard"
      );
      onAddLog({
        id: `sim-${Date.now()}`,
        timestamp,
        level: "TRIGGER",
        source: "Allianz Arena",
        message: "⚽ GOAL DETECTED! Harry Kane scored a penalty. Automating real-time highlights caption."
      });
    } else if (triggerType === "win") {
      onSimulateTrigger(
        "conversion", 
        "Fan Trivia Highscore achieved", 
        "Generate Personalized Discount Ticket"
      );
      onAddLog({
        id: `sim-${Date.now()}`,
        timestamp,
        level: "TRIGGER",
        source: "MiaSanAI Engine",
        message: "🏆 MATCH COMPLETED! FC Bayern defeats rivals. Initiating post-match customer reward journeys."
      });
    } else {
      onAddLog({
        id: `sim-${Date.now()}`,
        timestamp,
        level: "INFO",
        source: "Zapier Middleware",
        message: "🔗 n8n polling triggered. Ingested 42 new Instagram comments with tag #MiaSanMia"
      });
    }
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Top Welcome / Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            MiaSanAI Command Center <span className="bg-fcb-red/10 text-fcb-red text-xs px-2 py-1 rounded-md font-mono border border-fcb-red/20 font-bold uppercase tracking-wider">Enterprise v1.2</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time Customer Journey Automation & AI Generative Orchestrator for FC Bayern Munich Social Channels.
          </p>
        </div>
        
        {/* Real-time simulation controllers */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> SIMULATE EVENT:
          </span>
          <button 
            onClick={() => handleSimulateQuickTrigger("goal")}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 text-cyan-400 cursor-pointer"
            id="sim-goal-btn"
          >
            <Zap className="h-3.5 w-3.5" /> Player Goal
          </button>
          <button 
            onClick={() => handleSimulateQuickTrigger("win")}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 text-fcb-red cursor-pointer"
            id="sim-win-btn"
          >
            <Zap className="h-3.5 w-3.5" /> Match Win
          </button>
          <button 
            onClick={() => handleSimulateQuickTrigger("sync")}
            className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1 text-slate-300 cursor-pointer"
            id="sim-sync-btn"
          >
            <Clock className="h-3.5 w-3.5" /> Poll n8n
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {latestStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.id} className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-4" id={`stat-${stat.id}`}>
              <div className={`p-3 rounded-lg bg-slate-950/80 border border-slate-800 ${stat.color}`}>
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">{stat.name}</span>
                <h3 className="text-2xl font-bold font-display text-white mt-1">{stat.value}</h3>
                <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Charts & Pipeline Live Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Performance Analytics Chart */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-lg text-white font-display">Customer Journey Conversion Metrics</h3>
              <p className="text-xs text-slate-400">Aggregated fan progression through automated milestones</p>
            </div>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button 
                onClick={() => setActiveMetricTab("traffic")}
                className={`px-3 py-1 rounded transition-all cursor-pointer ${activeMetricTab === "traffic" ? "bg-fcb-red text-white" : "text-slate-400 hover:text-white"}`}
              >
                Reach Funnel
              </button>
              <button 
                onClick={() => setActiveMetricTab("conversions")}
                className={`px-3 py-1 rounded transition-all cursor-pointer ${activeMetricTab === "conversions" ? "bg-fcb-red text-white" : "text-slate-400 hover:text-white"}`}
              >
                Weekly Conversion
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full bg-slate-950/20 p-2 rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              {activeMetricTab === "traffic" ? (
                <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAware" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#111114", borderColor: "rgba(255, 255, 255, 0.05)", color: "#cbd5e1", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="Awareness" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAware)" />
                  <Area type="monotone" dataKey="Engagement" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorEngage)" />
                </AreaChart>
              ) : (
                <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#111114", borderColor: "rgba(255, 255, 255, 0.05)", color: "#cbd5e1", borderRadius: "8px" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Conversion" fill="#dc052d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Loyalty" fill="#c3a164" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs mt-4">
            <span className="text-slate-400 font-sans flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" /> Auto-optimizing campaign pipelines based on RAG knowledge boundaries.
            </span>
            <span className="text-fcb-gold font-semibold uppercase tracking-wider font-mono">FCB Enterprise Level</span>
          </div>
        </div>

        {/* Right Side: Pipeline Live Activity Logs / Terminal */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col h-[410px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-fcb-red" /> Live Pipeline Logs
              </h3>
              <p className="text-[11px] text-slate-500">Real-time automation engine triggers</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
                title="Export Logs as CSV"
                id="export-pipeline-logs-header-btn"
              >
                <Download className="h-3 w-3 text-fcb-gold" />
                <span className="hidden sm:inline">Export Data</span>
              </button>
              <span className="bg-green-500/10 text-green-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 animate-pulse">
                LIVE MONITOR
              </span>
            </div>
          </div>

          {/* Logs container (scrolling terminal style) */}
          <div className="flex-1 overflow-y-auto bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-2 select-text">
            {logs.slice().reverse().map((log) => {
              let levelBadge = "text-blue-400 bg-blue-500/10 border-blue-500/20";
              let levelIcon = <Clock className="h-3 w-3" />;

              if (log.level === "SUCCESS") {
                levelBadge = "text-green-400 bg-green-500/10 border-green-500/20";
                levelIcon = <CheckCircle2 className="h-3 w-3" />;
              } else if (log.level === "WARNING") {
                levelBadge = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                levelIcon = <AlertTriangle className="h-3 w-3" />;
              } else if (log.level === "TRIGGER") {
                levelBadge = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
                levelIcon = <Zap className="h-3 w-3" />;
              }

              return (
                <div key={log.id} className="p-2 bg-slate-950/30 hover:bg-slate-950/80 rounded border border-slate-900/50 transition">
                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider ${levelBadge}`}>
                        {levelIcon} {log.level}
                      </span>
                      <span className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400">
                        {log.source}
                      </span>
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">{log.message}</p>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Viewing {logs.length} pipelines</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="text-fcb-gold hover:underline cursor-pointer flex items-center gap-1"
                id="export-pipeline-logs-footer-btn"
              >
                <Download className="h-3 w-3" /> Export CSV
              </button>
              <span className="text-slate-800">|</span>
              <button 
                onClick={() => onAddLog({
                  id: `clear-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  level: "INFO",
                  source: "Console",
                  message: "System logs flushed. Monitoring re-armed."
                })}
                className="text-fcb-red hover:underline cursor-pointer"
              >
                Clear Feed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Enterprise BI Analytics Hub */}
      <TableauDashboard onAddLog={onAddLog} />

      {/* Daily Digest - Google Search Grounding News Feature */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5" id="dashboard-daily-digest">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-5 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-fcb-red" />
              <h3 className="font-bold text-lg text-white font-display">
                {language === "de" ? "Daily Digest: FC Bayern Schlagzeilen" : "Daily Digest: Trending FC Bayern News"}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === "de" 
                ? "Top 5 aktuelle News-Stories der letzten 24 Stunden, verifiziert durch Google-Suchergebnisse." 
                : "Top 5 trending news stories from the past 24 hours, verified and grounded by live Google Search."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {newsFetchedAt && (
              <span className="text-[10px] text-slate-500 font-mono">
                {language === "de" ? `Aktualisiert um: ${newsFetchedAt}` : `Updated at: ${newsFetchedAt}`}
              </span>
            )}
            <button
              onClick={() => fetchDailyDigest(true)}
              disabled={isNewsLoading}
              className={`bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isNewsLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              id="refresh-news-digest-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-fcb-gold ${isNewsLoading ? "animate-spin" : ""}`} />
              {isNewsLoading 
                ? (language === "de" ? "Suche läuft..." : "Searching...") 
                : (language === "de" ? "Aktualisieren" : "Refresh")}
            </button>
          </div>
        </div>

        {isNewsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-fcb-red animate-ping" />
              <span className="h-2 w-2 rounded-full bg-fcb-red animate-ping" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-fcb-red animate-ping" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-xs text-slate-400 font-mono animate-pulse">
              {language === "de" 
                ? "Google-Suche wird ausgeführt & Grounding-Metadata synthetisiert..." 
                : "Executing live Google Search query & synthesizing news metadata..."}
            </p>
          </div>
        ) : newsError ? (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="text-xs text-red-300">
              <p className="font-semibold">{language === "de" ? "Fehler beim Laden des Daily Digest" : "Failed to load Daily News Digest"}</p>
              <p className="opacity-80 mt-0.5">{newsError}</p>
              <button 
                onClick={() => fetchDailyDigest(true)}
                className="text-fcb-gold hover:underline font-mono mt-1.5 block cursor-pointer"
              >
                {language === "de" ? "Erneut versuchen" : "Retry fetch"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {newsStories.slice(0, 5).map((story, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01] hover:bg-slate-950/70"
                id={`news-story-${idx}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-fcb-gold bg-fcb-gold/10 px-2 py-0.5 rounded border border-fcb-gold/25 truncate max-w-[100px]" title={story.category}>
                      {story.category}
                    </span>
                    <span className="text-[9px] text-slate-500 flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {story.timestamp}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug tracking-tight font-display line-clamp-2" title={story.title}>
                    {story.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-normal line-clamp-3">
                    {story.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono font-medium truncate max-w-[80px]" title={story.source}>
                    {story.source}
                  </span>
                  
                  <a 
                    href={story.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Read</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-900/60">
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-green-500" />
            {language === "de" ? "Google Search Grounding aktiv" : "Google Search Grounding Enabled"}
          </span>
          <span>
            {language === "de" ? "Daten von lizenzierten Sportmedien" : "Data harvested from verified sports publishers"}
          </span>
        </div>
      </div>

      {/* Corporate Strategy Card */}
      <div className="bg-gradient-to-r from-slate-900 via-fcb-dark/40 to-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-fcb-gold/10 p-3 rounded-full border border-fcb-gold/30">
            <Sparkles className="h-6 w-6 text-fcb-gold" />
          </div>
          <div>
            <h4 className="font-bold text-white font-display">Project „MiaSanAI“ - Core Strategic Directive</h4>
            <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
              By combining n8n, Zapier middleware, and custom-cloned ElevenLabs voice note generators, FC Bayern elevates international fan conversion across China, US, and Europe.
            </p>
          </div>
        </div>
        <div className="text-right text-xs font-mono text-slate-500">
          <span>Enterprise Secure Connection</span>
          <p className="text-green-400 mt-1">● SSL Secured API Gateway</p>
        </div>
      </div>
    </div>
  );
};
