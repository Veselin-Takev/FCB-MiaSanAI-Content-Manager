import React, { useState, useEffect } from "react";
import { 
  Download, Share2, RefreshCw, Layers, ExternalLink, ShieldCheck, 
  Database, Sliders, FileSpreadsheet, FileText, ChevronDown, CheckCircle, Play
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { PipelineLog } from "../types";

interface TableauDashboardProps {
  onAddLog: (log: PipelineLog) => void;
}

// Structured Tableau dataset that reacts to filters
interface KPIData {
  region: string;
  timeRange: string;
  fanReach: number;
  engagementRate: number;
  conversations: number;
  conversions: number;
  revenue: number;
}

const TABLEAU_DATASET: KPIData[] = [
  // Europe
  { region: "Europe", timeRange: "7days", fanReach: 620000, engagementRate: 8.8, conversations: 1850, conversions: 1200, revenue: 14500 },
  { region: "Europe", timeRange: "30days", fanReach: 1420000, engagementRate: 8.4, conversations: 4102, conversions: 3400, revenue: 42000 },
  { region: "Europe", timeRange: "ytd", fanReach: 8500000, engagementRate: 8.2, conversations: 24500, conversions: 19800, revenue: 245000 },
  
  // North America
  { region: "North America", timeRange: "7days", fanReach: 310000, engagementRate: 7.9, conversations: 950, conversions: 510, revenue: 6800 },
  { region: "North America", timeRange: "30days", fanReach: 890000, engagementRate: 7.5, conversations: 2200, conversions: 1800, revenue: 21500 },
  { region: "North America", timeRange: "ytd", fanReach: 4900000, engagementRate: 7.2, conversations: 12800, conversions: 9400, revenue: 115000 },

  // Asia-Pacific
  { region: "Asia-Pacific", timeRange: "7days", fanReach: 420000, engagementRate: 9.1, conversations: 1400, conversions: 850, revenue: 9800 },
  { region: "Asia-Pacific", timeRange: "30days", fanReach: 1150000, engagementRate: 8.9, conversations: 3100, conversions: 2400, revenue: 28000 },
  { region: "Asia-Pacific", timeRange: "ytd", fanReach: 6100000, engagementRate: 8.7, conversations: 18900, conversions: 14200, revenue: 165000 },

  // Latin America
  { region: "Latin America", timeRange: "7days", fanReach: 180000, engagementRate: 8.2, conversations: 620, conversions: 320, revenue: 3900 },
  { region: "Latin America", timeRange: "30days", fanReach: 540000, engagementRate: 8.0, conversations: 1600, conversions: 1100, revenue: 12900 },
  { region: "Latin America", timeRange: "ytd", fanReach: 3200000, engagementRate: 7.8, conversations: 9100, conversions: 6500, revenue: 78000 },
];

export const TableauDashboard: React.FC<TableauDashboardProps> = ({ onAddLog }) => {
  const { language } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("30days");
  const [activeSheet, setActiveSheet] = useState<"kpi" | "wdc">("kpi");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [customWdcQuery, setCustomWdcQuery] = useState<string>("app_analytics");

  // Filter and aggregate data
  const getAggregatedData = (): KPIData => {
    const filtered = TABLEAU_DATASET.filter(d => {
      const matchRegion = selectedRegion === "All" || d.region === selectedRegion;
      const matchTime = d.timeRange === selectedTimeRange;
      return matchRegion && matchTime;
    });

    if (filtered.length === 0) {
      return { region: "None", timeRange: "30days", fanReach: 0, engagementRate: 0, conversations: 0, conversions: 0, revenue: 0 };
    }

    const totalReach = filtered.reduce((sum, d) => sum + d.fanReach, 0);
    const avgEngage = Number((filtered.reduce((sum, d) => sum + d.engagementRate, 0) / filtered.length).toFixed(2));
    const totalConv = filtered.reduce((sum, d) => sum + d.conversations, 0);
    const totalSuccess = filtered.reduce((sum, d) => sum + d.conversions, 0);
    const totalRev = filtered.reduce((sum, d) => sum + d.revenue, 0);

    return {
      region: selectedRegion,
      timeRange: selectedTimeRange,
      fanReach: totalReach,
      engagementRate: avgEngage,
      conversations: totalConv,
      conversions: totalSuccess,
      revenue: totalRev
    };
  };

  const currentStats = getAggregatedData();

  // Handle Refresh simulation
  const handleRefreshViz = () => {
    setIsRefreshing(true);
    onAddLog({
      id: `tableau-refresh-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Tableau Connector",
      message: language === "de"
        ? `Tableau Embedded API: Aktualisiere Arbeitsblatt-Daten für Region '${selectedRegion}' und Zeitraum '${selectedTimeRange}'...`
        : `Tableau Embedded API: Refreshing worksheet data context for Region '${selectedRegion}' and Timeframe '${selectedTimeRange}'...`
    });

    setTimeout(() => {
      setIsRefreshing(false);
      onAddLog({
        id: `tableau-refreshed-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Tableau Connector",
        message: language === "de"
          ? `Tableau-Visualisierung erfolgreich synchronisiert. 4 Datenquellen aktualisiert.`
          : `Tableau visualization successfully synchronized with backend. 4 data sources updated.`
      });
    }, 850);
  };

  // Handle Export simulations
  const handleExportTableau = (type: "PDF" | "CSV") => {
    setIsExporting(true);
    onAddLog({
      id: `tableau-export-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Tableau API",
      message: language === "de"
        ? `Tableau JS API: Exportiere aktuelle Ansicht (${selectedRegion} / ${selectedTimeRange}) als ${type}...`
        : `Tableau JS API: Exporting current view (${selectedRegion} / ${selectedTimeRange}) as ${type}...`
    });

    setTimeout(() => {
      setIsExporting(false);
      
      // Setup dynamic CSV download if CSV is requested
      if (type === "CSV") {
        const headers = ["Metric", "Value"];
        const rows = [
          ["Region", currentStats.region],
          ["Timeframe", currentStats.timeRange],
          ["Fan Reach", currentStats.fanReach.toString()],
          ["Engagement Rate (%)", currentStats.engagementRate.toString()],
          ["Conversations Active", currentStats.conversations.toString()],
          ["Milestone Conversions", currentStats.conversions.toString()],
          ["Estimated Merchandise Revenue ($)", currentStats.revenue.toString()]
        ];
        const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tableau_kpi_${selectedRegion.toLowerCase().replace(/\s+/g, '-')}_${selectedTimeRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Simple mock alert/log for PDF
        onAddLog({
          id: `tableau-pdf-success-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Tableau API",
          message: language === "de"
            ? `PDF-Export erfolgreich generiert: 'tableau_kpi_report_${selectedRegion}_${selectedTimeRange}.pdf'`
            : `PDF export successfully generated: 'tableau_kpi_report_${selectedRegion}_${selectedTimeRange}.pdf'`
        });
      }
    }, 1000);
  };

  const getWdcUrl = () => {
    const host = window.location.origin;
    return `${host}/api/tableau/wdc?query=${customWdcQuery}`;
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col min-h-[460px]" id="tableau-integration-hub">
      {/* Tableau Connected Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          {/* Tableau Style Logo Accent */}
          <div className="h-8 w-8 rounded bg-[#E9762B] flex items-center justify-center font-bold text-white text-xs select-none" title="Tableau Integration">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white font-display">
                {language === "de" ? "Tableau KPI Analytik Hub" : "Tableau KPI Analytics Hub"}
              </h3>
              <span className="flex items-center gap-1 text-[9px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                <ShieldCheck className="h-3 w-3" /> DEMO · SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === "de" 
                ? "Echtzeit-Führungskräfte-Dashboard über n8n/Zapier & Web-Data-Connector (WDC) Schnittstellen."
                : "Real-time executive dashboard synchronized via n8n/Zapier & Web Data Connector (WDC) gateways."}
            </p>
          </div>
        </div>

        {/* Tab Toggle between Active Visual & WDC Config */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 text-[11px] font-mono shrink-0">
          <button
            onClick={() => setActiveSheet("kpi")}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              activeSheet === "kpi" ? "bg-[#E9762B] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {language === "de" ? "📊 Interaktives Dashboard" : "📊 Interactive Dashboard"}
          </button>
          <button
            onClick={() => setActiveSheet("wdc")}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              activeSheet === "wdc" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {language === "de" ? "🔌 Web Data Connector (WDC)" : "🔌 Web Data Connector (WDC)"}
          </button>
        </div>
      </div>

      {activeSheet === "kpi" ? (
        <div className="flex-1 flex flex-col justify-between">
          {/* Tableau Native Toolbar & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-850 mb-4 text-xs font-mono">
            {/* Region Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-500 uppercase font-bold">
                {language === "de" ? "Region filtern" : "Filter Region"}
              </label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 cursor-pointer outline-none appearance-none pr-8 hover:border-slate-700 transition"
                  id="tableau-region-filter"
                >
                  <option value="All">{language === "de" ? "Alle Regionen" : "All Regions"}</option>
                  <option value="Europe">{language === "de" ? "Europa" : "Europe"}</option>
                  <option value="North America">{language === "de" ? "Nordamerika" : "North America"}</option>
                  <option value="Asia-Pacific">{language === "de" ? "Asien-Pazifik" : "Asia-Pacific"}</option>
                  <option value="Latin America">{language === "de" ? "Lateinamerika" : "Latin America"}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Timeframe Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-slate-500 uppercase font-bold">
                {language === "de" ? "Zeitraum" : "Timeframe"}
              </label>
              <div className="relative">
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 cursor-pointer outline-none appearance-none pr-8 hover:border-slate-700 transition"
                  id="tableau-timeframe-filter"
                >
                  <option value="7days">{language === "de" ? "Letzte 7 Tage" : "Last 7 Days"}</option>
                  <option value="30days">{language === "de" ? "Letzte 30 Tage" : "Last 30 Days"}</option>
                  <option value="ytd">{language === "de" ? "Laufendes Jahr (YTD)" : "Year-To-Date (YTD)"}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Simulated Live Connection Status */}
            <div className="flex flex-col justify-center sm:pl-3 border-l border-slate-850/60 sm:col-span-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${isRefreshing ? "bg-amber-400 animate-spin" : "bg-emerald-500"} flex-shrink-0`} />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isRefreshing 
                    ? (language === "de" ? "Aktualisierung läuft..." : "Synchronizing Viz...") 
                    : "Tableau Gateway (Demo)"}
                </span>
              </div>
              <p className="text-[9px] text-slate-600 mt-1 truncate">
                Server: <span className="text-slate-500">Demo-Simulation (keine Live-Verbindung)</span>
              </p>
            </div>
          </div>

          {/* Viz Canvas Container (Styled to match perfect corporate Tableau visuals) */}
          <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row gap-5 relative overflow-hidden">
            {/* Simulated interactive SVG visualization inside Tableau Frame */}
            <div className="flex-1 flex flex-col justify-between min-h-[220px]">
              
              {/* Sheet Header */}
              <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-900 pb-2">
                <span className="font-bold tracking-tight text-white flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-[#E9762B] rounded-full" /> Worksheet: Executive Summary (Fan Performance)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Region: {selectedRegion}</span>
              </div>

              {/* Data Grid Bento layout */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-4">
                {/* Metric Card 1 */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{language === "de" ? "Fankontakte" : "Fan Reach"}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-white">{(currentStats.fanReach / 1000).toLocaleString() + "k"}</span>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">+12.4%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-[#E9762B] h-full rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{language === "de" ? "Engagement-Rate" : "Engagement"}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-white">{currentStats.engagementRate}%</span>
                    <span className="text-[9px] text-[#E9762B] font-mono font-bold">▲ Peak</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${currentStats.engagementRate * 10}%` }} />
                  </div>
                </div>

                {/* Metric Card 3 */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col justify-between col-span-2 md:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{language === "de" ? "Merch Umsatz" : "Merch Revenue"}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-fcb-gold">${currentStats.revenue.toLocaleString()}</span>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">+18.3%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-fcb-gold h-full rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
              </div>

              {/* Graphic Plot representation of Tableau Trend */}
              <div className="flex-1 bg-slate-900/20 rounded-lg p-2.5 border border-slate-900/60 flex flex-col justify-between h-[100px]">
                <div className="text-[9px] text-slate-500 uppercase font-mono font-bold flex items-center justify-between">
                  <span>{language === "de" ? "Umsatz & Interaktions-Trend" : "Revenue & Engagement Performance Trend"}</span>
                  <span className="text-[8px] text-slate-600">Linear Forecast Matrix</span>
                </div>
                
                {/* Bars Chart with Tableau Style */}
                <div className="flex items-end justify-between h-[60px] gap-2 px-1 mt-1">
                  {[25, 45, 38, 62, 55, 78, 92, 85, 96, 115, 125, 140].map((val, idx) => {
                    // Adjust height slightly according to timeframe
                    const mult = selectedTimeRange === "7days" ? 0.4 : selectedTimeRange === "30days" ? 0.75 : 1.1;
                    const heightPercent = Math.min(100, Math.round(val * mult * 0.6));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Hover values tooltip */}
                        <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-800 text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-150 text-white font-mono pointer-events-none whitespace-nowrap z-30">
                          Val: {Math.round(val * mult)}k
                        </div>
                        <div 
                          className="w-full rounded-t-[1px] bg-sky-500/15 group-hover:bg-sky-500/20 transition-all duration-300 relative overflow-hidden" 
                          style={{ height: "45px" }}
                        >
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-[#E9762B] group-hover:bg-[#ff8e42] transition-all duration-300"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[7px] text-slate-600">M{idx+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sidebar with Tableau Parameters and Legend */}
            <div className="w-full md:w-[150px] bg-slate-900/20 p-3 rounded-lg border border-slate-900 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block mb-2 border-b border-slate-800 pb-1">
                  {language === "de" ? "Farblegende" : "Color Legend"}
                </span>
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded bg-[#E9762B]" />
                    <span className="text-slate-300">{language === "de" ? "Fankontakte" : "Reach Pipeline"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded bg-cyan-500" />
                    <span className="text-slate-300">{language === "de" ? "Engagement" : "Engagement"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded bg-fcb-gold" />
                    <span className="text-slate-300">{language === "de" ? "Konversionen" : "Conversions"}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block mb-2 border-b border-slate-800 pb-1">
                  {language === "de" ? "BI Parameter" : "BI Parameters"}
                </span>
                <div className="space-y-1.5 text-[9px] font-mono text-slate-500">
                  <div className="flex justify-between">
                    <span>Active Mark:</span>
                    <span className="text-slate-300">SVG Paths</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source rows:</span>
                    <span className="text-slate-300">14,204</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="text-green-400">99.8%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Tableau Bottom Toolbar (Matched precisely to actual Tableau public status bar) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 text-xs font-mono">
            <div className="flex items-center gap-4 text-slate-500">
              <span className="text-[10px]">Tableau Software © 2026</span>
              <span className="hidden sm:inline">|</span>
              <button 
                onClick={handleRefreshViz}
                className="hover:text-slate-300 flex items-center gap-1 cursor-pointer transition"
                title="Reset/Re-query"
              >
                <RefreshCw className="h-3 w-3" /> Re-Query
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <button 
                onClick={() => handleExportTableau("PDF")}
                disabled={isExporting}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer"
              >
                <FileText className="h-3 w-3 text-red-400" /> Export PDF
              </button>
              <button 
                onClick={() => handleExportTableau("CSV")}
                disabled={isExporting}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer"
              >
                <FileSpreadsheet className="h-3 w-3 text-emerald-400" /> Export CSV
              </button>
              <button 
                onClick={() => {
                  onAddLog({
                    id: `tableau-share-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    level: "INFO",
                    source: "Tableau Share",
                    message: `Tableau JS API: Generated secure workbook sharing URL: 'https://tableau.fcbayern.com/embed/kpis?region=${selectedRegion}&time=${selectedTimeRange}'`
                  });
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition cursor-pointer"
              >
                <Share2 className="h-3 w-3 text-cyan-400" /> Share Link
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-xs text-slate-300 space-y-4">
          <div className="flex items-start gap-3 bg-slate-900/30 p-3.5 rounded-lg border border-slate-800">
            <Database className="h-5 w-5 text-fcb-gold shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">
                {language === "de" ? "Web Data Connector (WDC) Integrations-Schnittstelle" : "Web Data Connector (WDC) Integration Gateway"}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {language === "de"
                  ? "Verbinden Sie Ihr Tableau Desktop direkt mit diesem Live-System. Der WDC ermöglicht das Abrufen sämtlicher Journeys, Engagement-Raten und Export-Preset-Statistiken in strukturierter Form."
                  : "Connect your Tableau Desktop directly to this live instance. The WDC enables retrieving all fan journeys, engagement rates, and export preset telemetry in clean structured format."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">
              {language === "de" ? "WDC Abfrage-Typ" : "WDC QUERY CATEGORY"}
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={customWdcQuery}
                onChange={(e) => setCustomWdcQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-cyan-500/50 flex-1 max-w-[200px]"
                placeholder="app_analytics"
              />
              <span className="text-slate-500 text-[11px]">→ API endpoint dataset</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block">
              {language === "de" ? "Tableau Verbindungs-URL" : "TABLEAU CONNECTOR ENDPOINT URL"}
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded border border-slate-800">
              <input
                type="text"
                readOnly
                value={getWdcUrl()}
                className="bg-transparent text-cyan-400 text-[10px] md:text-xs select-all outline-none flex-1 truncate font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getWdcUrl());
                  onAddLog({
                    id: `tableau-wdc-copy-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    level: "SUCCESS",
                    source: "WDC Panel",
                    message: "Web Data Connector URL successfully copied to clipboard!"
                  });
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] transition cursor-pointer font-bold select-none shrink-0"
              >
                Copy URL
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              {language === "de"
                ? "Öffnen Sie Tableau Desktop, wählen Sie 'Web Data Connector' unter 'Verbinden' und fügen Sie diese URL ein."
                : "Open Tableau Desktop, select 'Web Data Connector' under 'Connect' and paste this URL into the input."}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-900 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              {language === "de" ? "WDC JSON Schema Vorschau" : "WDC JSON Schema Preview"}
            </span>
            <div className="bg-slate-950 p-2.5 rounded border border-slate-900 text-[10px] text-slate-400 overflow-x-auto">
              <pre className="text-[9px] text-slate-500 leading-relaxed font-mono">
{`{
  "tableName": "MiaSanAI_KPIs",
  "cols": [
    { "id": "region", "dataType": "string" },
    { "id": "fan_reach", "dataType": "int" },
    { "id": "engagement_rate", "dataType": "float" },
    { "id": "active_conversations", "dataType": "int" }
  ],
  "connectorVersion": "3.0.0"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
