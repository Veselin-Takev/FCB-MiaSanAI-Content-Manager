import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, GitFork, Sparkles, Clapperboard, Database, Workflow, 
  Settings, Bell, AlertCircle, ShieldAlert, Shield, Cpu, CheckCircle2, Globe,
  Mic, MicOff, Volume2, History, Play, Scissors, Check, Download, RotateCcw, Keyboard, X,
  Sliders, Undo, Redo, Lock, Unlock, Info, Network, Save, Trash2, Copy,
  Folder, FolderOpen, FolderPlus, FolderSync, ChevronDown, ChevronRight, Plus, GripVertical, Search, BarChart3, Activity,
  LayoutGrid, Edit2, Calendar, Tag, Filter, Columns, Rows, Eye, EyeOff, ArrowUpDown, Clock, SortAsc, ListChecks, Circle, Zap, HelpCircle, BarChart2, FileJson
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";

import { DashboardOverview } from "./components/DashboardOverview";
const JourneyBuilder = lazy(() => import("./components/JourneyBuilder").then(m => ({ default: m.JourneyBuilder })));
const ContentGenerator = lazy(() => import("./components/ContentGenerator").then(m => ({ default: m.ContentGenerator })));
const VideoStudio = lazy(() => import("./components/VideoStudio").then(m => ({ default: m.VideoStudio })));
const RagHub = lazy(() => import("./components/RagHub").then(m => ({ default: m.RagHub })));
const SecretManagerQA = lazy(() => import("./components/SecretManagerQA").then(m => ({ default: m.SecretManagerQA })));
const AutomationLogs = lazy(() => import("./components/AutomationLogs").then(m => ({ default: m.AutomationLogs })));
const LangGraphAgent = lazy(() => import("./components/LangGraphAgent").then(m => ({ default: m.LangGraphAgent })));
const SettingsPanel = lazy(() => import("./components/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const Analytics = lazy(() => import("./components/Analytics").then(m => ({ default: m.Analytics })));
const ModerationPanel = lazy(() => import("./components/ModerationPanel").then(m => ({ default: m.ModerationPanel })));

import { PipelineLog, DraftSocialPost } from "./types";
import { INITIAL_LOGS, FCB_BRAND_RULES } from "./data/mockData";
import { useLanguage } from "./context/LanguageContext";
import { translations, Language } from "./data/i18n";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { AUTOMATION_PRESETS } from "./utils/presets";
import { handleExportReportToCsv } from "./utils/csvExporter";
import { startServerTranscription, ServerTranscriptionController } from "./utils/transcription";
interface TreeNode {
  name: string;
  fullPath: string;
  subfolders: Record<string, TreeNode>;
  presets: any[];
}

const buildPresetTree = (presetsToBuild: any[], customPaths: string[]): TreeNode => {
  const root: TreeNode = { name: "Root", fullPath: "", subfolders: {}, presets: [] };
  customPaths.forEach(path => {
    const parts = path.split("/").map(p => p.trim()).filter(Boolean);
    let current = root;
    let currentPath = "";
    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current.subfolders[part]) {
        current.subfolders[part] = { name: part, fullPath: currentPath, subfolders: {}, presets: [] };
      }
      current = current.subfolders[part];
    });
  });
  presetsToBuild.forEach(preset => {
    const category = preset.category || "General";
    const parts = category.split("/").map(p => p.trim()).filter(Boolean);
    let current = root;
    let currentPath = "";
    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!current.subfolders[part]) {
        current.subfolders[part] = { name: part, fullPath: currentPath, subfolders: {}, presets: [] };
      }
      current = current.subfolders[part];
    });
    if (!current.presets.some(p => p.id === preset.id)) {
      current.presets.push(preset);
    }
  });
  return root;
};


const findSubNode = (root: TreeNode, targetPath: string): TreeNode | null => {
  if (targetPath === "All") return root;
  const parts = targetPath.split("/").map(p => p.trim()).filter(Boolean);
  let current = root;
  for (const part of parts) {
    if (current.subfolders[part]) {
      current = current.subfolders[part];
    } else {
      return null;
    }
  }
  return current;
};

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [logs, setLogs] = useState<PipelineLog[]>(INITIAL_LOGS);
  const [trendTemporalRange, setTrendTemporalRange] = useState<"Daily" | "Weekly" | "Monthly">("Daily");

  // Dynamic Custom Statuses
  const [customStatuses, setCustomStatuses] = useState<{ name: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem("media_san_custom_statuses");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCustomStatusName, setNewCustomStatusName] = useState<string>("");
  const [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]);
  const [customBenchmark, setCustomBenchmark] = useState<number | null>(null);
  const [legendSearchQuery, setLegendSearchQuery] = useState<string>("");
  const [showRegressionProjection, setShowRegressionProjection] = useState<boolean>(false);
  const [showMilestones, setShowMilestones] = useState<boolean>(true);
  const [legendLayoutMode, setLegendLayoutMode] = useState<"stacked" | "side">("stacked");
  const [showCompletionTrendline, setShowCompletionTrendline] = useState<boolean>(false);
  const [legendTrendRange, setLegendTrendRange] = useState<"7D" | "30D" | "YTD">("30D");
  const [legendNewCategoryName, setLegendNewCategoryName] = useState<string>("");
  const [showManageStatusesPanel, setShowManageStatusesPanel] = useState<boolean>(false);
  const [tempCustomStatuses, setTempCustomStatuses] = useState<{ name: string; color: string; originalName: string }[]>([]);
  const [hoveredTrendDate, setHoveredTrendDate] = useState<string | null>(null);

  const handleCreateCustomStatus = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = ["Draft", "Needs Work", "Approved", ...customStatuses.map(s => s.name)];
    if (existing.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) return;

    const colors = ["#c084fc", "#22d3ee", "#f472b6", "#818cf8", "#e879f9", "#34d399", "#f43f5e", "#fb7185"];
    const chosenColor = colors[customStatuses.length % colors.length];

    const updated = [...customStatuses, { name: trimmed, color: chosenColor }];
    setCustomStatuses(updated);
    try {
      localStorage.setItem("media_san_custom_statuses", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCustomStatusColor = (name: string, color: string) => {
    const updated = customStatuses.map(cs => cs.name === name ? { ...cs, color } : cs);
    setCustomStatuses(updated);
    try {
      localStorage.setItem("media_san_custom_statuses", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };


  const handleExportReport = () => { handleExportReportToCsv(exportPresets, customStatuses, language, trendTemporalRange); };

  // Shared Campaign Drafts State
  const [drafts, setDrafts] = useLocalStorage<DraftSocialPost[]>("fcb_miasanai_drafts", []);

  // Sync drafts to localStorage
  

  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>("All");

  // Export Presets State
  const [exportPresetCategoryFilter, setExportPresetCategoryFilter] = useState<string>("All");
  const [exportPresetStatusFilter, setExportPresetStatusFilter] = useState<string>("All");
  const [exportPresetSearchQuery, setExportPresetSearchQuery] = useState<string>("");
  const [batchApplyPresetId, setBatchApplyPresetId] = useState<string>("");
  const [batchPresetSearchQuery, setBatchPresetSearchQuery] = useState<string>("");
  const [batchShowNeedsWorkDraftOnly, setBatchShowNeedsWorkDraftOnly] = useState<boolean>(false);
  
  // Hierarchical category states
  const [customCategoryPaths, setCustomCategoryPaths] = useLocalStorage<string[]>("fcb_miasanai_custom_categories", []);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "Technical": true,
    "Creative": true
  });
  const [inTreeCategoryCreatePath, setInTreeCategoryCreatePath] = useState<string | null>(null);
  const [inTreeCategoryInputValue, setInTreeCategoryInputValue] = useState<string>("");
  const [editingCategoryPath, setEditingCategoryPath] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>("");
  const [sidebarCategoryCreateOpen, setSidebarCategoryCreateOpen] = useState<boolean>(false);
  const [sidebarCategoryCreateValue, setSidebarCategoryCreateValue] = useState<string>("");
  const [presetSaveParentCategory, setPresetSaveParentCategory] = useState<string>("Technical");
  const [presetCategorySearchQuery, setPresetCategorySearchQuery] = useState<string>("");
  const [clonePresetSearchQuery, setClonePresetSearchQuery] = useState<string>("");
  const [presetSaveNewSubcategory, setPresetSaveNewSubcategory] = useState<string>("");
  const [showInlineCategoryCreate, setShowInlineCategoryCreate] = useState<boolean>(false);
  const [inlineCategoryCreateValue, setInlineCategoryCreateValue] = useState<string>("");
  const [presetCategoryQuickFilterActive, setPresetCategoryQuickFilterActive] = useState<boolean>(false);
  const [showCategorySparklines, setShowCategorySparklines] = useState<boolean>(false);
  const [showCategoryStatsModal, setShowCategoryStatsModal] = useState<boolean>(false);
  const [presetCategorySortMethod, setPresetCategorySortMethod] = useState<"alpha" | "recent">("alpha");
  const [showCompressionEfficiencyModal, setShowCompressionEfficiencyModal] = useState<boolean>(false);
  const [showSaveCompressionEfficiencyPopover, setShowSaveCompressionEfficiencyPopover] = useState<boolean>(false);
  const [livePreviewPreset, setLivePreviewPreset] = useState<boolean>(false);
  const [presetSaveSeason, setPresetSaveSeason] = useState<string>("");
  const [presetSaveMatchday, setPresetSaveMatchday] = useState<string>("");
  const [presetSaveSeasons, setPresetSaveSeasons] = useState<string[]>([]);
  const [presetSaveMatchdays, setPresetSaveMatchdays] = useState<string[]>([]);
  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [customMatchdays, setCustomMatchdays] = useState<string[]>([]);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState<boolean>(false);
  const [matchdayDropdownOpen, setMatchdayDropdownOpen] = useState<boolean>(false);
  const [newSeasonInput, setNewSeasonInput] = useState<string>("");
  const [newMatchdayInput, setNewMatchdayInput] = useState<string>("");
  const [presetSaveError, setPresetSaveError] = useState<string | null>(null);
  const [presetSaveStatus, setPresetSaveStatus] = useState<string>("Draft");
  const [isSuggestingCategory, setIsSuggestingCategory] = useState<boolean>(false);
  const [aiCategorySuggestions, setAiCategorySuggestions] = useState<any[]>([]);
  const [showStatusLegend, setShowStatusLegend] = useState<boolean>(false);
  const [showBatchStatsPopover, setShowBatchStatsPopover] = useState<boolean>(false);
  const [isSchemaEditorOpen, setIsSchemaEditorOpen] = useState<boolean>(false);
  const [schemaRules, setSchemaRules] = useState<any[]>([]);
  const [showWorkflowLegendModal, setShowWorkflowLegendModal] = useState<boolean>(false);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [presetListFilter, setPresetListFilter] = useState<string>("");
  const [batchSelectedPresets, setBatchSelectedPresets] = useState<string[]>([]);
  const [batchRenamePattern, setBatchRenamePattern] = useState<string>("");
  const [batchSyncToCloud, setBatchSyncToCloud] = useState<boolean>(false);
  const [realtimeSparklineData, setRealtimeSparklineData] = useState<{time: number, gr: number}[]>([]);
  const [showDSPFeedbackPopover, setShowDSPFeedbackPopover] = useState<boolean>(false);
  const [showSidebarStatusLegend, setShowSidebarStatusLegend] = useState<boolean>(false);
  const [showSeasonMatchdaySidebar, setShowSeasonMatchdaySidebar] = useState<boolean>(true);
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<string | null>(null);
  const [activeMatchdayFilter, setActiveMatchdayFilter] = useState<string | null>(null);
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null);
  const [dragOverPresetId, setDragOverPresetId] = useState<string | null>(null);
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [dragHandleActiveId, setDragHandleActiveId] = useState<string | null>(null);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null);
  const [exportPresets, setExportPresets] = useLocalStorage<any[]>("fcb_miasanai_export_presets", AUTOMATION_PRESETS);

  const [newPresetName, setNewPresetName] = useState<string>("");
  const [newPresetDescription, setNewPresetDescription] = useState<string>("");
  const [newPresetNotes, setNewPresetNotes] = useState<string>("");
  const [presetFormNewCategory, setPresetFormNewCategory] = useState<string>("");

  const [theme, setTheme] = useLocalStorage<"dark" | "classic">("fcb_miasanai_theme", "dark");

  const [speechEnabled, setSpeechEnabled] = useLocalStorage<boolean>("fcb_miasanai_speech_enabled", false);



  // Toggle body class and persist theme
  React.useEffect(() => {
    if (theme === "classic") {
      document.body.classList.add("theme-classic");
    } else {
      document.body.classList.remove("theme-classic");
    }
  }, [theme]);

  // Persist speech status
  

  const [notification, setNotification] = useState<string | null>(null);

  // Synchronize language selection with online notification
  React.useEffect(() => {
    setNotification(t("notificationOnline"));
  }, [language]);

  // Active simulated workflow triggers
  const [activeSimulation, setActiveSimulation] = useState<{
    stageId: string;
    triggerName: string;
    actionName: string;
  } | null>(null);

  const handleAddLog = (newLog: PipelineLog) => {
    setLogs(prev => {
      let uniqueId = newLog.id;
      let counter = 1;
      while (prev.some(log => log.id === uniqueId)) {
        uniqueId = `${newLog.id}-${counter++}`;
      }
      return [...prev, { ...newLog, id: uniqueId }];
    });
    if (newLog.level === "SUCCESS") {
      setNotification(`✅ ${t("automationSuccess")}${newLog.message}`);
    } else if (newLog.level === "TRIGGER") {
      setNotification(`⚡ ${t("workflowTriggered")}${newLog.message}`);
    }
  };

  const handleUpdatePresetStatus = (presetId: string, status: string | undefined) => {
    const updated = exportPresets.map(p => {
      if (p.id === presetId) {
        return { ...p, status };
      }
      return p;
    });
    setExportPresets(updated);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    const affected = updated.find(p => p.id === presetId);
    if (affected) {
      handleAddLog({
        id: `export-preset-status-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: "Preset Manager",
        level: "INFO",
        message: language === "de"
          ? `Status für '${affected.nameDe}' auf '${status || "Keine"}' aktualisiert.`
          : `Status for '${affected.name}' updated to '${status || "None"}'.`
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Approved") {
      return {
        label: language === "de" ? "Freigegeben" : "Approved",
        classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        dot: "bg-emerald-400"
      };
    }
    if (status === "Draft") {
      return {
        label: language === "de" ? "Entwurf" : "Draft",
        classes: "bg-slate-500/10 border-slate-500/20 text-slate-400",
        dot: "bg-slate-400"
      };
    }
    if (status === "Needs Work") {
      return {
        label: language === "de" ? "Überarbeiten" : "Needs Work",
        classes: "bg-amber-500/10 border-amber-500/20 text-amber-400",
        dot: "bg-amber-400"
      };
    }
    const match = customStatuses.find(cs => cs.name === status);
    if (match) {
      return {
        label: status,
        classes: "border-[0.5px]",
        style: {
          backgroundColor: `${match.color}15`,
          borderColor: `${match.color}40`,
          color: match.color
        },
        dotStyle: {
          backgroundColor: match.color
        }
      };
    }
    return null;
  };

  const handleSimulateTrigger = (stageId: string, triggerName: string, actionName: string) => {
    setActiveSimulation({ stageId, triggerName, actionName });
    setActiveTab("journey");
    setNotification(`⚡ ${t("simulatedTrigger")}`);
  };

  // Voice Command Assistant states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [showAssistantPanel, setShowAssistantPanel] = useState<boolean>(false);
  const [voiceLog, setVoiceLog] = useState<string | null>(null);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [showExportSummaryModal, setShowExportSummaryModal] = useState<boolean>(false);
  const [hoveredWaveformBarIdx, setHoveredWaveformBarIdx] = useState<number | null>(null);

  // Audio trimming & visualization states
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playheadProgress, setPlayheadProgress] = useState<number>(0);
  const [croppedSuccessfully, setCroppedSuccessfully] = useState<boolean>(false);
  const [fadeInDuration, setFadeInDuration] = useState<number>(1.0);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(1.0);
  const [silenceThreshold, setSilenceThreshold] = useState<number>(25);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState<number>(15);
  const [isNormalized, setIsNormalized] = useState<boolean>(false);
  const [isTrimLocked, setIsTrimLocked] = useState<boolean>(false);

  // Trimmer History Undo / Redo states
  interface TrimmerHistoryState {
    trimStart: number;
    trimEnd: number;
    fadeInDuration: number;
    fadeOutDuration: number;
  }
  const [trimmerHistory, setTrimmerHistory] = useState<TrimmerHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isRollingBackRef = React.useRef<boolean>(false);

  const handleUndo = React.useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const targetState = trimmerHistory[prevIdx];
      if (targetState) {
        isRollingBackRef.current = true;
        setTrimStart(targetState.trimStart);
        setTrimEnd(targetState.trimEnd);
        setFadeInDuration(targetState.fadeInDuration);
        setFadeOutDuration(targetState.fadeOutDuration);
        setHistoryIndex(prevIdx);
        setPlayheadProgress(targetState.trimStart);
        
        handleAddLog({
          id: `undo-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Audio Trimmer",
          message: `Undo action applied. Reverted to trim range [${targetState.trimStart.toFixed(1)}s - ${targetState.trimEnd.toFixed(1)}s] and fade [In: ${targetState.fadeInDuration.toFixed(1)}s, Out: ${targetState.fadeOutDuration.toFixed(1)}s].`
        });
      }
    }
  }, [historyIndex, trimmerHistory]);

  const handleRedo = React.useCallback(() => {
    if (historyIndex < trimmerHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetState = trimmerHistory[nextIdx];
      if (targetState) {
        isRollingBackRef.current = true;
        setTrimStart(targetState.trimStart);
        setTrimEnd(targetState.trimEnd);
        setFadeInDuration(targetState.fadeInDuration);
        setFadeOutDuration(targetState.fadeOutDuration);
        setHistoryIndex(nextIdx);
        setPlayheadProgress(targetState.trimStart);
        
        handleAddLog({
          id: `redo-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Audio Trimmer",
          message: `Redo action applied. Re-applied trim range [${targetState.trimStart.toFixed(1)}s - ${targetState.trimEnd.toFixed(1)}s] and fade [In: ${targetState.fadeInDuration.toFixed(1)}s, Out: ${targetState.fadeOutDuration.toFixed(1)}s].`
        });
      }
    }
  }, [historyIndex, trimmerHistory]);

  // Sync / Record state changes with debounce
  React.useEffect(() => {
    if (audioDuration <= 0) return;

    if (isRollingBackRef.current) {
      isRollingBackRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const current = { trimStart, trimEnd, fadeInDuration, fadeOutDuration };
      
      setTrimmerHistory(prev => {
        if (prev.length === 0) {
          setHistoryIndex(0);
          return [current];
        }
        
        const activeState = prev[historyIndex];
        if (
          activeState &&
          activeState.trimStart === current.trimStart &&
          activeState.trimEnd === current.trimEnd &&
          activeState.fadeInDuration === current.fadeInDuration &&
          activeState.fadeOutDuration === current.fadeOutDuration
        ) {
          return prev;
        }
        
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(current);
        setHistoryIndex(newHistory.length - 1);
        return newHistory;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [trimStart, trimEnd, fadeInDuration, fadeOutDuration, audioDuration, historyIndex]);

  // Multi-band Dynamic Range Compressor States
  const [compressorEnabled, setCompressorEnabled] = useState<boolean>(true);
  const [compressorActiveBand, setCompressorActiveBand] = useState<"low" | "mid" | "high">("mid");

  // Audio Trimmer Draggable Handles logic
  const visualizerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingStartRef = React.useRef<boolean>(false);
  const isDraggingEndRef = React.useRef<boolean>(false);

  const [activeDragHandle, setActiveDragHandle] = useState<"start" | "end" | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [isHoveringWaveform, setIsHoveringWaveform] = useState<boolean>(false);

  interface CapturedFrame {
    timecode: string;
    frameNo: number;
    title: string;
    subtitle: string;
    imageUrl: string;
    iconType: string;
    description: string;
    cameraInfo: string;
  }

  const getCapturedFrame = (time: number, duration: number): CapturedFrame => {
    const d = duration || 30;
    const ratio = Math.max(0, Math.min(1, time / d));
    const progressSec = Math.max(0, Math.min(time, d));
    const mins = Math.floor(progressSec / 60);
    const secs = Math.floor(progressSec % 60);
    const ms = Math.floor((progressSec % 1) * 10);
    const timecode = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
    const frameNo = Math.floor(progressSec * 25); // 25 fps
    
    if (ratio < 0.15) {
      return {
        timecode,
        frameNo,
        title: language === "de" ? "Südkurve Allianz Arena" : "Südkurve Allianz Arena",
        subtitle: language === "de" ? "Vorrunden-Fan-Choreo" : "Pre-Match Fan Choreo",
        imageUrl: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&auto=format&fit=crop&q=80",
        iconType: "cheer",
        description: language === "de" ? "Fans schwenken tiefrote Fahnen und riesige Choreo-Tafeln in der Südkurve." : "Fans waving crimson red flags & giant choreography panels in the south stand.",
        cameraInfo: "CAM A - RED MONSTRO 8K"
      };
    } else if (ratio < 0.35) {
      return {
        timecode,
        frameNo,
        title: "Thomas Müller Close-up",
        subtitle: language === "de" ? "Live-Interview-Sitzung" : "Live Interview Session",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
        iconType: "interview",
        description: language === "de" ? "Müller spricht über das taktische Setup und die 'Mia San Mia'-Siegermentalität." : "Müller discussing tactical setup and the 'Mia San Mia' winning mentality.",
        cameraInfo: "CAM B - ARRI ALEXA LF"
      };
    } else if (ratio < 0.55) {
      return {
        timecode,
        frameNo,
        title: "Harry Kane Training",
        subtitle: language === "de" ? "Taktische Schussübung" : "Tactical Shooting Drill",
        imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
        iconType: "action",
        description: language === "de" ? "Kane schießt einen platzierten Flachschuss an den Trainingshütchen an der Säbener Straße vorbei." : "Kane strikes a clinical low drive past the training cones at Säbener Straße.",
        cameraInfo: "CAM C - PHANTOM FLEX 4K"
      };
    } else if (ratio < 0.75) {
      return {
        timecode,
        frameNo,
        title: "Jamal Musiala Skill-Cam",
        subtitle: language === "de" ? "Hochgeschwindigkeits-Slalomdribbling" : "High-Speed Slalom Dribble",
        imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
        iconType: "hype",
        description: language === "de" ? "Musiala zeigt rasante Geschwindigkeit und schnelle Beinarbeit um die Slalomstangen." : "Musiala showing blistering speed and quick feet around slalom cones.",
        cameraInfo: "CAM D - GOPRO HERO 12 PRO"
      };
    } else if (ratio < 0.90) {
      return {
        timecode,
        frameNo,
        title: language === "de" ? "Taktische Entwurfsansicht" : "Tactical Blueprint Screen",
        subtitle: language === "de" ? "Virtuelles interaktives Board" : "Virtual Interactive Board",
        imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
        iconType: "tactics",
        description: language === "de" ? "Visuelle Analyse von Abwehrlinien und schnellen Umschalt-Passwegen." : "Visual analysis of defensive lines and quick transition passing lanes.",
        cameraInfo: "DIGITAL OVERLAY RENDER"
      };
    } else {
      return {
        timecode,
        frameNo,
        title: "Mia San Mia Trophy Lift",
        subtitle: language === "de" ? "Meisterschafts-Outro-Feier" : "Victory Celebration Outro",
        imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&auto=format&fit=crop&q=80",
        iconType: "hype",
        description: language === "de" ? "Goldener Konfettiregen geht auf die Mannschaft nieder, während die Stadionlichter blitzen." : "Gold confetti raining down on the squad as the stadium lights flash.",
        cameraInfo: "CAM E - RONIN DJI PRO"
      };
    }
  };

  const trimStartRef = React.useRef<number>(trimStart);
  const trimEndRef = React.useRef<number>(trimEnd);
  const audioDurationRef = React.useRef<number>(audioDuration);

  React.useEffect(() => {
    trimStartRef.current = trimStart;
  }, [trimStart]);

  React.useEffect(() => {
    trimEndRef.current = trimEnd;
  }, [trimEnd]);

  React.useEffect(() => {
    audioDurationRef.current = audioDuration;
  }, [audioDuration]);

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (isTrimLocked) return;
    e.preventDefault();
    isDraggingStartRef.current = true;
    setActiveDragHandle("start");
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingStartRef.current || !visualizerRef.current) return;
      const rect = visualizerRef.current.getBoundingClientRect();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const relativeX = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, relativeX / rect.width));
      let newTime = pct * audioDurationRef.current;
      
      // Enforce boundaries (at least 0.5s from end, and >= 0)
      newTime = Math.max(0, Math.min(newTime, trimEndRef.current - 0.5));
      newTime = parseFloat(newTime.toFixed(1));
      
      setTrimStart(newTime);
      setCroppedSuccessfully(false);
    };

    const handleEnd = () => {
      isDraggingStartRef.current = false;
      setActiveDragHandle(null);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  const handleEndDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (isTrimLocked) return;
    e.preventDefault();
    isDraggingEndRef.current = true;
    setActiveDragHandle("end");

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingEndRef.current || !visualizerRef.current) return;
      const rect = visualizerRef.current.getBoundingClientRect();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const relativeX = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, relativeX / rect.width));
      let newTime = pct * audioDurationRef.current;
      
      // Enforce boundaries (at least 0.5s from start, and <= audioDuration)
      newTime = Math.max(trimStartRef.current + 0.5, Math.min(newTime, audioDurationRef.current));
      newTime = parseFloat(newTime.toFixed(1));
      
      setTrimEnd(newTime);
      setCroppedSuccessfully(false);
    };

    const handleEnd = () => {
      isDraggingEndRef.current = false;
      setActiveDragHandle(null);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!visualizerRef.current) return;
    const rect = visualizerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, relativeX / rect.width));
    const time = pct * audioDuration;
    setHoveredTime(parseFloat(time.toFixed(1)));
  };

  const handleWaveformMouseLeave = () => {
    setIsHoveringWaveform(false);
    setHoveredTime(null);
  };

  const handleWaveformMouseEnter = () => {
    setIsHoveringWaveform(true);
  };

  // Low band settings (Bass / Plosives filter)
  const [compLowThreshold, setCompLowThreshold] = useState<number>(-24);
  const [compLowRatio, setCompLowRatio] = useState<number>(2.5);
  const [compLowAttack, setCompLowAttack] = useState<number>(30);
  const [compLowRelease, setCompLowRelease] = useState<number>(150);
  const [compLowMakeup, setCompLowMakeup] = useState<number>(2);

  // Mid band settings (Speech Body / Presence)
  const [compMidThreshold, setCompMidThreshold] = useState<number>(-16);
  const [compMidRatio, setCompMidRatio] = useState<number>(4.0);
  const [compMidAttack, setCompMidAttack] = useState<number>(15);
  const [compMidRelease, setCompMidRelease] = useState<number>(100);
  const [compMidMakeup, setCompMidMakeup] = useState<number>(3);

  // High band settings (Sibilance / Air)
  const [compHighThreshold, setCompHighThreshold] = useState<number>(-20);
  const [compHighRatio, setCompHighRatio] = useState<number>(3.0);
  const [compHighAttack, setCompHighAttack] = useState<number>(8);
  const [compHighRelease, setCompHighRelease] = useState<number>(80);
  const [compHighMakeup, setCompHighMakeup] = useState<number>(1);

  // Helper to determine mini visual waveform sparkline heights
  const getWaveformBars = (preset: any) => {
    const fIn = preset.fadeInDuration ?? 0.5;
    const fOut = preset.fadeOutDuration ?? 0.8;
    const gate = preset.noiseGateThreshold ?? 10;
    const comp = preset.compressorEnabled ?? false;
    
    const lowThresh = preset.compLowThreshold ?? -24;
    const lowMakeup = preset.compLowMakeup ?? 0;
    
    const midThresh = preset.compMidThreshold ?? -16;
    const midMakeup = preset.compMidMakeup ?? 0;
    
    const highThresh = preset.compHighThreshold ?? -20;
    const highMakeup = preset.compHighMakeup ?? 0;

    const h1 = Math.max(15, Math.min(85, 80 - (fIn * 25) - (gate * 1.2)));
    const h2 = Math.max(25, Math.min(95, 55 + (lowMakeup * 5) - (comp ? Math.abs(lowThresh) * 0.7 : 0)));
    const h3 = Math.max(35, Math.min(100, 70 + (midMakeup * 5) - (comp ? Math.abs(midThresh) * 0.8 : 0)));
    const h4 = Math.max(25, Math.min(95, 60 + (highMakeup * 5) - (comp ? Math.abs(highThresh) * 0.7 : 0)));
    const h5 = Math.max(15, Math.min(85, 80 - (fOut * 15)));

    return [h1, h2, h3, h4, h5];
  };

  // Helper to determine detailed mini visual waveform sparkline heights & compression threshold line
  const getPresetSparklineData = (preset: any) => {
    const fadeIn = preset.fadeInDuration ?? 0.5;
    const fadeOut = preset.fadeOutDuration ?? 0.8;
    const isComp = preset.compressorEnabled ?? false;
    const isNorm = preset.isNormalized ?? false;

    // A beautiful baseline audio wave peak envelope (16 points of diverse levels)
    const RAW_WAVE = [35, 75, 48, 85, 42, 92, 58, 38, 96, 52, 78, 54, 88, 34, 72, 38];
    const barsCount = RAW_WAVE.length;

    // Map compMidThreshold (-36 to 0 dB) to peak scale (20 to 85)
    // -36 dB -> 25 peak threshold
    // 0 dB -> 85 peak threshold
    const midThresh = preset.compMidThreshold ?? -16;
    const thresholdPeak = Math.max(20, Math.min(85, 85 + (midThresh * 1.67)));
    const ratio = preset.compMidRatio ?? 3.0;
    const makeup = preset.compMidMakeup ?? 0;

    const bars = RAW_WAVE.map((rawPeak, idx) => {
      let p = rawPeak;

      // 1. Normalization adjustment to standard base level
      if (isNorm) {
        p = p * 1.15; // boost slightly for normalized signals
      }

      // 2. Apply Compression
      if (isComp) {
        if (p > thresholdPeak) {
          const excess = p - thresholdPeak;
          const compressedExcess = excess / ratio;
          p = thresholdPeak + compressedExcess;
        }
        // Apply makeup gain (each dB adds ~3.5% amplitude)
        p = p + (makeup * 3.5);
      }

      // Clamp peak before fade
      p = Math.max(8, Math.min(98, p));

      // 3. Apply Fade-In (first 40% of the timeline)
      // Representing 16 bars as a 5-second window
      // Let's assume index 0 to 15 is t = 0 to 5 seconds (each index is 0.3125s)
      const t = idx * 0.3125;
      let fadeInFactor = 1.0;
      if (fadeIn > 0) {
        if (t < fadeIn) {
          fadeInFactor = t / fadeIn;
          // Smooth sine curve fade-in
          fadeInFactor = Math.sin(fadeInFactor * Math.PI / 2);
        }
      }

      // 4. Apply Fade-Out (last 40% of the timeline)
      const tFromEnd = (barsCount - 1 - idx) * 0.3125;
      let fadeOutFactor = 1.0;
      if (fadeOut > 0) {
        if (tFromEnd < fadeOut) {
          fadeOutFactor = tFromEnd / fadeOut;
          // Smooth sine curve fade-out
          fadeOutFactor = Math.sin(fadeOutFactor * Math.PI / 2);
        }
      }

      return Math.max(3, Math.round(p * fadeInFactor * fadeOutFactor));
    });

    // Map thresholdPeak to Y-coordinate on a 28px tall canvas
    // 0 peak is Y=26, 100 peak is Y=2.
    const thresholdY = isComp ? Math.round(26 - (thresholdPeak / 100) * 24) : null;

    return {
      bars,
      thresholdY,
      hasCompression: isComp,
      fadeIn,
      fadeOut
    };
  };

  // Helper to determine larger high-resolution sparkline data points for hover expansion
  const getHighResPresetData = (preset: any, pointsCount = 60) => {
    const fadeIn = preset.fadeInDuration ?? 0.5;
    const fadeOut = preset.fadeOutDuration ?? 0.8;
    const isComp = preset.compressorEnabled ?? false;
    const isNorm = preset.isNormalized ?? false;

    const midThresh = preset.compMidThreshold ?? -16;
    const thresholdPeak = Math.max(20, Math.min(85, 85 + (midThresh * 1.67)));
    const ratio = preset.compMidRatio ?? 3.0;
    const makeup = preset.compMidMakeup ?? 0;

    // Beautiful high-res baseline wave modeling
    const points = Array.from({ length: pointsCount }, (_, idx) => {
      // Compound sine & cosine wave to simulate professional complex audio peaks
      const angle1 = (idx / pointsCount) * Math.PI * 5;
      const angle2 = (idx / pointsCount) * Math.PI * 12;
      const angle3 = (idx / pointsCount) * Math.PI * 2.2;
      
      let rawPeak = 50 + Math.sin(angle1) * 22 + Math.cos(angle2) * 12 + Math.sin(angle3) * 8;
      rawPeak = Math.max(12, Math.min(94, rawPeak));

      let p = rawPeak;

      // 1. Normalization
      if (isNorm) {
        p = p * 1.15;
      }

      let originalPBeforeCompression = p;

      // 2. Apply Compression
      if (isComp) {
        if (p > thresholdPeak) {
          const excess = p - thresholdPeak;
          const compressedExcess = excess / ratio;
          p = thresholdPeak + compressedExcess;
        }
        p = p + (makeup * 3.5);
      }

      p = Math.max(6, Math.min(98, p));

      // 3. Apply Fade-In
      const t = (idx / (pointsCount - 1)) * 5.0; // Assume 5-second window
      let fadeInFactor = 1.0;
      if (fadeIn > 0 && t < fadeIn) {
        fadeInFactor = Math.sin((t / fadeIn) * Math.PI / 2);
      }

      // 4. Apply Fade-Out
      const tFromEnd = 5.0 - t;
      let fadeOutFactor = 1.0;
      if (fadeOut > 0 && tFromEnd < fadeOut) {
        fadeOutFactor = Math.sin((tFromEnd / fadeOut) * Math.PI / 2);
      }

      const finalVal = p * fadeInFactor * fadeOutFactor;
      const rawVal = originalPBeforeCompression * fadeInFactor * fadeOutFactor;

      return {
        x: (idx / (pointsCount - 1)) * 100, // horizontal percent
        y: 100 - finalVal, // inverted for SVG coordinates (0 is top)
        yRaw: 100 - rawVal, // inverted original peak for SVG background comparison
      };
    });

    return {
      points,
      thresholdY: isComp ? 100 - thresholdPeak : null,
      hasCompression: isComp,
      fadeIn,
      fadeOut,
      ratio,
      makeup,
      midThresh
    };
  };

  // Helper to duplicate an existing preset with a new unique custom ID and name
  const handleDuplicatePreset = (e: React.MouseEvent, preset: any) => {
    e.stopPropagation(); // Avoid triggering any click handlers on parent components
    const presetId = `preset-custom-${Date.now()}`;
    const newName = language === "de" ? `${preset.nameDe || preset.name} Kopie` : `${preset.name} Copy`;
    const newNameDe = language === "de" ? `${preset.nameDe || preset.name} Kopie` : `${preset.nameDe || preset.name} Copy`;
    
    const newPreset = {
      ...preset,
      id: presetId,
      name: newName,
      nameDe: newNameDe,
    };

    const updated = [...exportPresets, newPreset];
    setExportPresets(updated);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    handleAddLog({
      id: `export-preset-duplicate-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Preset '${preset.nameDe || preset.name}' dupliziert als '${newNameDe}'.`
        : `Preset '${preset.name}' duplicated as '${newName}'.`
    });
  };

  // Helper to add a custom category directly from the preset creation form
  const handleCreateCategoryFromPresetForm = () => {
    const cleanCategoryName = presetFormNewCategory.trim();
    if (!cleanCategoryName) return;

    if (!customCategoryPaths.includes(cleanCategoryName)) {
      const updated = [...customCategoryPaths, cleanCategoryName];
      setCustomCategoryPaths(updated);
      try {
        localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    // Select the newly created category as parent category, so the user can immediately save presets in it
    setPresetSaveParentCategory(cleanCategoryName);
    setPresetFormNewCategory(""); // clear the input

    setExpandedFolders(prev => ({
      ...prev,
      [cleanCategoryName]: true
    }));

    handleAddLog({
      id: `export-category-create-form-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Kategorie '${cleanCategoryName}' direkt über das Formular erstellt und ausgewählt.`
        : `Category '${cleanCategoryName}' created directly via the form and selected.`
    });
  };

  const handleFetchCategorySuggestions = async () => {
    const name = newPresetName.trim();
    const description = newPresetDescription.trim();
    if (!name) return;

    setIsSuggestingCategory(true);
    setAiCategorySuggestions([]);

    try {
      const uniqueCats = Array.from(new Set([
        "Technical",
        "Creative",
        ...customCategoryPaths,
        ...exportPresets.map(p => p.category)
      ])).filter(Boolean);

      const response = await fetch("/api/presets/suggest-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          presetName: name,
          presetDescription: description,
          existingCategories: uniqueCats,
          language
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      if (data && Array.isArray(data.suggestions)) {
        setAiCategorySuggestions(data.suggestions);
        
        handleAddLog({
          id: `preset-ai-suggest-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          source: "AI Category Recommender",
          level: "SUCCESS",
          message: language === "de"
            ? `AI-Kategorievorschläge für '${name}' erfolgreich geladen.`
            : `Successfully loaded AI category suggestions for '${name}'.`
        });
      }
    } catch (err: any) {
      console.error("AI preset categorization suggestion failed:", err);
      handleAddLog({
        id: `preset-ai-suggest-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: "AI Category Recommender",
        level: "WARNING",
        message: language === "de"
          ? `Fehler beim Laden der AI-Kategorievorschläge: ${err.message || err}`
          : `Failed to load AI category suggestions: ${err.message || err}`
      });
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  const handleSelectCategorySuggestion = (suggestion: any) => {
    const catName = suggestion.name;
    const uniqueCats = Array.from(new Set([
      "Technical",
      "Creative",
      ...customCategoryPaths,
      ...exportPresets.map(p => p.category)
    ])).filter(Boolean);

    if (uniqueCats.includes(catName)) {
      setPresetSaveParentCategory(catName);
      setPresetSaveNewSubcategory("");
    } else {
      setPresetSaveParentCategory("");
      setPresetSaveNewSubcategory(catName);
    }
  };

  // Helper to save current preset configurations with hierarchical categories
  const handleSaveExportPreset = () => {
    const cleanName = newPresetName.trim();
    if (!cleanName) {
      setPresetSaveError(language === "de" ? "Name ist erforderlich" : "Name is required");
      return;
    }
    setPresetSaveError(null);
    const presetId = `preset-custom-${Date.now()}`;
    const customCount = exportPresets.filter(p => p.id.startsWith("preset-custom-")).length + 1;
    const defaultName = `Custom Preset ${customCount}`;
    const defaultNameDe = `Eigenes Preset ${customCount}`;
    
    let resolvedCategory = presetSaveParentCategory;
    const subName = presetSaveNewSubcategory.trim();
    if (subName) {
      resolvedCategory = resolvedCategory ? `${resolvedCategory}/${subName}` : subName;
      // Register this new category folder and all intermediate paths
      const parts = resolvedCategory.split("/").map(p => p.trim()).filter(Boolean);
      let currentPath = "";
      const pathsToAdd: string[] = [];
      
      parts.forEach(part => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!customCategoryPaths.includes(currentPath)) {
          pathsToAdd.push(currentPath);
        }
      });

      if (pathsToAdd.length > 0) {
        const updatedPaths = [...customCategoryPaths, ...pathsToAdd];
        setCustomCategoryPaths(updatedPaths);
        try {
          localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updatedPaths));
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!resolvedCategory) {
      resolvedCategory = "General";
    }

    const newPreset = {
      id: presetId,
      name: cleanName || defaultName,
      nameDe: cleanName || defaultNameDe,
      category: resolvedCategory,
      season: presetSaveSeasons.join(", ") || undefined,
      matchday: presetSaveMatchdays.join(", ") || undefined,
      seasons: presetSaveSeasons,
      matchdays: presetSaveMatchdays,
      description: newPresetDescription.trim() || undefined,
      notes: newPresetNotes.trim() || undefined,
      status: presetSaveStatus,
      compressorEnabled,
      isNormalized,
      fadeInDuration,
      fadeOutDuration,
      noiseGateThreshold,
      compLowThreshold,
      compLowRatio,
      compLowMakeup,
      compMidThreshold,
      compMidRatio,
      compMidMakeup,
      compHighThreshold,
      compHighRatio,
      compHighMakeup
    };
    
    const updated = [...exportPresets, newPreset];
    setExportPresets(updated);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setNewPresetName("");
    setPresetSaveNewSubcategory("");
    setPresetSaveSeason("");
    setPresetSaveMatchday("");
    setPresetSaveSeasons([]);
    setPresetSaveMatchdays([]);
    setNewPresetDescription("");
    setNewPresetNotes("");
    setPresetSaveStatus("Draft");
    setAiCategorySuggestions([]);
    
    // Automatically make sure the category is expanded in the folder tree
    setExpandedFolders(prev => ({
      ...prev,
      [resolvedCategory]: true
    }));

    const lastPart = resolvedCategory.split("/").pop() || resolvedCategory;
    const translatedCategory = language === "de"
      ? (lastPart === "Technical" ? "Technisch" : lastPart === "Creative" ? "Kreativ" : lastPart)
      : lastPart;

    handleAddLog({
      id: `export-preset-save-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Export-Preset '${newPreset.nameDe}' (${translatedCategory}) erfolgreich gespeichert.`
        : `Export preset '${newPreset.name}' (${translatedCategory}) saved successfully.`
    });
  };

  // Helper to create a category from the folder tree interface directly
  const handleCreateInTreeCategory = (parentPath: string) => {
    const name = inTreeCategoryInputValue.trim();
    if (!name) {
      setInTreeCategoryCreatePath(null);
      return;
    }
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    
    const parts = newPath.split("/").map(p => p.trim()).filter(Boolean);
    let currentPath = "";
    const pathsToAdd: string[] = [];
    
    parts.forEach(part => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!customCategoryPaths.includes(currentPath)) {
        pathsToAdd.push(currentPath);
      }
    });

    if (pathsToAdd.length > 0) {
      const updated = [...customCategoryPaths, ...pathsToAdd];
      setCustomCategoryPaths(updated);
      try {
        localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }
    
    setInTreeCategoryCreatePath(null);
    setInTreeCategoryInputValue("");
    
    // Expand all intermediate folders
    const expands: Record<string, boolean> = {};
    let expandPath = "";
    parts.forEach(part => {
      expandPath = expandPath ? `${expandPath}/${part}` : part;
      expands[expandPath] = true;
    });

    setExpandedFolders(prev => ({
      ...prev,
      ...expands
    }));

    handleAddLog({
      id: `export-category-create-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Kategorie-Ordner '${name}' erstellt.`
        : `Category folder '${name}' created.`
    });
  };

  // Helper to delete a top-level or any category from the system
  const handleDeleteCustomCategory = (pathToDelete: string) => {
    const updatedPaths = customCategoryPaths.filter(p => p !== pathToDelete && !p.startsWith(pathToDelete + "/"));
    setCustomCategoryPaths(updatedPaths);
    try {
      localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updatedPaths));
    } catch (err) {
      console.error(err);
    }
    
    // Also remove the presets from the deleted category or subfolders
    const updatedPresets = exportPresets.filter(p => p.category !== pathToDelete && !p.category.startsWith(pathToDelete + "/"));
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    if (exportPresetCategoryFilter === pathToDelete || exportPresetCategoryFilter.startsWith(pathToDelete + "/")) {
      setExportPresetCategoryFilter("All");
    }

    handleAddLog({
      id: `export-category-delete-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Kategorie-Verzeichnis '${pathToDelete.split("/").pop()}' gelöscht.`
        : `Category directory '${pathToDelete.split("/").pop()}' deleted.`
    });
  };

  // Helper to rename a custom category path
  const handleRenameCustomCategory = (oldPath: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName || cleanName === oldPath.split("/").pop()) {
      setEditingCategoryPath(null);
      return;
    }

    const segments = oldPath.split("/");
    segments[segments.length - 1] = cleanName;
    const newPath = segments.join("/");

    // Update category paths
    const updatedPaths = customCategoryPaths.map(p => {
      if (p === oldPath) return newPath;
      if (p.startsWith(oldPath + "/")) {
        return p.replace(oldPath + "/", newPath + "/");
      }
      return p;
    });

    setCustomCategoryPaths(updatedPaths);
    try {
      localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updatedPaths));
    } catch (err) {
      console.error(err);
    }

    // Update presets in this category
    const updatedPresets = exportPresets.map(p => {
      if (p.category === oldPath) {
        return { ...p, category: newPath };
      }
      if (p.category && p.category.startsWith(oldPath + "/")) {
        return { ...p, category: p.category.replace(oldPath + "/", newPath + "/") };
      }
      return p;
    });

    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    if (exportPresetCategoryFilter === oldPath) {
      setExportPresetCategoryFilter(newPath);
    } else if (exportPresetCategoryFilter.startsWith(oldPath + "/")) {
      setExportPresetCategoryFilter(exportPresetCategoryFilter.replace(oldPath + "/", newPath + "/"));
    }

    setEditingCategoryPath(null);

    handleAddLog({
      id: `export-category-rename-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Kategorie von '${oldPath.split("/").pop()}' in '${cleanName}' umbenannt.`
        : `Category renamed from '${oldPath.split("/").pop()}' to '${cleanName}'.`
    });
  };

  // Helper to create a custom top-level folder category from the sidebar
  const handleCreateCustomTopLevelCategory = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    if (!customCategoryPaths.includes(cleanName)) {
      const updated = [...customCategoryPaths, cleanName];
      setCustomCategoryPaths(updated);
      try {
        localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    setSidebarCategoryCreateOpen(false);
    setSidebarCategoryCreateValue("");

    setExpandedFolders(prev => ({
      ...prev,
      [cleanName]: true
    }));

    handleAddLog({
      id: `export-category-create-top-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Hauptkategorie '${cleanName}' erstellt.`
        : `Root category '${cleanName}' created.`
    });
  };

  // Reset all audio settings to their default factory presets
  const handleResetAudioSettings = () => {
    setTrimStart(0);
    setTrimEnd(audioDuration);
    setPlayheadProgress(0);
    setFadeInDuration(1.0);
    setFadeOutDuration(1.0);
    setSilenceThreshold(25);
    setNoiseGateThreshold(15);
    setIsNormalized(false);
    setIsTrimLocked(false);
    setCompressorEnabled(true);

    // Low band settings
    setCompLowThreshold(-24);
    setCompLowRatio(2.5);
    setCompLowAttack(30);
    setCompLowRelease(150);
    setCompLowMakeup(2);

    // Mid band settings
    setCompMidThreshold(-16);
    setCompMidRatio(4.0);
    setCompMidAttack(15);
    setCompMidRelease(100);
    setCompMidMakeup(3);

    // High band settings
    setCompHighThreshold(-20);
    setCompHighRatio(3.0);
    setCompHighAttack(8);
    setCompHighRelease(80);
    setCompHighMakeup(1);

    setCroppedSuccessfully(false);

    handleAddLog({
      id: `audio-reset-all-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Audio Trimmer",
      message: language === "de"
        ? "Alle Trimmer-, Fading- und Kompressionseinstellungen wurden auf die Werkseinstellungen zurückgesetzt."
        : "All trimmer, fading, and compression settings have been restored to default factory presets."
    });
  };

  // Helper to count presets recursively in nested subfolders
  const countAllPresets = (node: TreeNode): number => {
    let count = 0;
    Object.values(node.subfolders).forEach(sub => {
      count += sub.presets.length + countAllPresets(sub);
    });
    return count;
  };

  // Helper to count presets belonging to a category or its subcategories
  const getCategoryPresetCount = (categoryPath: string) => {
    if (categoryPath === "All") return exportPresets.length;
    return exportPresets.filter(p => p.category === categoryPath || p.category.startsWith(categoryPath + "/")).length;
  };

  const handleAutoSortPresets = () => {
    let newPathsToAdd: string[] = [];
    const updatedPresets = exportPresets.map(preset => {
      const seasons = Array.isArray(preset.seasons) 
        ? preset.seasons 
        : (preset.season ? preset.season.split(",").map((s: string) => s.trim()) : []);
      const matchdays = Array.isArray(preset.matchdays) 
        ? preset.matchdays 
        : (preset.matchday ? preset.matchday.split(",").map((m: string) => m.trim()) : []);
      
      const season = seasons.length > 0 ? seasons[0] : null;
      const matchday = matchdays.length > 0 ? matchdays[0] : null;
      
      let newCategory = preset.category;
      if (season && matchday) {
        newCategory = `${season}/${matchday}`;
      } else if (season) {
        newCategory = season;
      } else if (matchday) {
        newCategory = matchday;
      }
      
      if (newCategory !== preset.category) {
        const parts = newCategory.split("/");
        let currentPath = "";
        parts.forEach(part => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (!customCategoryPaths.includes(currentPath) && !newPathsToAdd.includes(currentPath)) {
            newPathsToAdd.push(currentPath);
          }
        });
      }

      return {
        ...preset,
        category: newCategory
      };
    });

    if (newPathsToAdd.length > 0) {
      const updatedPaths = [...customCategoryPaths, ...newPathsToAdd];
      setCustomCategoryPaths(updatedPaths);
      try {
        localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updatedPaths));
      } catch (err) {
        console.error(err);
      }
    }

    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }
    
    handleAddLog({
      id: `export-presets-autosorted-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Preset Manager",
      message: language === "de" ? "Presets wurden automatisch sortiert." : "Presets auto-sorted successfully."
    });
  };

  const handleBulkMovePresets = (presetIds: string[], targetCategory: string) => {
    const updatedPresets = exportPresets.map(preset => {
      if (presetIds.includes(preset.id)) {
        return {
          ...preset,
          category: targetCategory
        };
      }
      return preset;
    });

    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    setSelectedPresetIds([]);
    setDraggedPresetId(null);
    setDragOverFolder(null);

    const presetNames = exportPresets
      .filter(p => presetIds.includes(p.id))
      .map(p => language === "de" ? p.nameDe || p.name : p.name)
      .join(", ");

    handleAddLog({
      id: `export-presets-bulk-move-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `${presetIds.length} Preset(s) (${presetNames}) in Kategorie '${targetCategory.split("/").pop()}' verschoben.`
        : `Moved ${presetIds.length} preset(s) (${presetNames}) to category '${targetCategory.split("/").pop()}'.`
    });
  };

  const handleMoveFolder = (sourceFolderPath: string, targetFolderPath: string) => {
    // Can't move a folder into itself or its own subfolders
    if (targetFolderPath === sourceFolderPath || targetFolderPath.startsWith(sourceFolderPath + "/")) {
      return;
    }

    const folderName = sourceFolderPath.split("/").pop() || "";
    const newFolderPath = targetFolderPath === "" ? folderName : `${targetFolderPath}/${folderName}`;

    // Update customCategoryPaths
    const newPaths = customCategoryPaths.map(p => {
      if (p === sourceFolderPath) return newFolderPath;
      if (p.startsWith(sourceFolderPath + "/")) {
        return p.replace(sourceFolderPath, newFolderPath);
      }
      return p;
    });

    // Avoid duplicates
    const uniquePaths = Array.from(new Set(newPaths));
    setCustomCategoryPaths(uniquePaths);
    try {
      localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(uniquePaths));
    } catch (err) {
      console.error(err);
    }

    // Update exportPresets categories
    const updatedPresets = exportPresets.map(preset => {
      if (preset.category === sourceFolderPath) {
        return { ...preset, category: newFolderPath };
      }
      if (preset.category.startsWith(sourceFolderPath + "/")) {
        return { ...preset, category: preset.category.replace(sourceFolderPath, newFolderPath) };
      }
      return preset;
    });

    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    setDraggedFolderPath(null);
    setDragOverFolder(null);
  };

  // Drag & drop handlers for presets reordering and folder re-assignment
  const handlePresetDragStart = (e: React.DragEvent, presetId: string) => {
    setDraggedPresetId(presetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", presetId);
  };

  const handlePresetDragOver = (e: React.DragEvent, presetId: string) => {
    e.preventDefault();
    if (draggedPresetId && draggedPresetId !== presetId) {
      setDragOverPresetId(presetId);
    }
  };

  const handlePresetDrop = (e: React.DragEvent, targetPresetId: string) => {
    e.preventDefault();
    if (!draggedPresetId || draggedPresetId === targetPresetId) {
      setDraggedPresetId(null);
      setDragOverPresetId(null);
      return;
    }

    const sourceIndex = exportPresets.findIndex(p => p.id === draggedPresetId);
    const targetIndex = exportPresets.findIndex(p => p.id === targetPresetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedPresets = [...exportPresets];
      const [draggedItem] = updatedPresets.splice(sourceIndex, 1);
      
      // Smart move: if dragged to a preset in a different folder, update the category of the dragged item
      const targetPreset = exportPresets[targetIndex];
      if (draggedItem.category !== targetPreset.category) {
        draggedItem.category = targetPreset.category;
      }
      
      updatedPresets.splice(targetIndex, 0, draggedItem);
      setExportPresets(updatedPresets);
      try {
        localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
      } catch (err) {
        console.error(err);
      }

      handleAddLog({
        id: `export-preset-reorder-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        source: "Preset Manager",
        level: "SUCCESS",
        message: language === "de"
          ? `Preset '${draggedItem.nameDe || draggedItem.name}' neu angeordnet.`
          : `Preset '${draggedItem.name}' reordered.`
      });
    }

    setDraggedPresetId(null);
    setDragOverPresetId(null);
  };

  // Helper to retrieve the current list of presets filtered by active queries and tags
  const getFilteredPresets = useCallback(() => {
    return exportPresets.filter(p => {
      if (activeSeasonFilter) {
        const seasons = Array.isArray(p.seasons)
          ? p.seasons
          : (p.season ? p.season.split(",").map((s: string) => s.trim()) : []);
        if (!seasons.includes(activeSeasonFilter)) return false;
      }
      if (activeMatchdayFilter) {
        const matchdays = Array.isArray(p.matchdays)
          ? p.matchdays
          : (p.matchday ? p.matchday.split(",").map((m: string) => m.trim()) : []);
        if (!matchdays.includes(activeMatchdayFilter)) return false;
      }
      if (exportPresetStatusFilter !== "All" && p.status !== exportPresetStatusFilter) return false;

      if (!exportPresetSearchQuery) return true;
      const q = exportPresetSearchQuery.toLowerCase().trim();
      
      // 1. Name & category search
      if (p.name?.toLowerCase().includes(q)) return true;
      if (p.nameDe?.toLowerCase().includes(q)) return true;
      if (p.category?.toLowerCase().includes(q)) return true;
      if (p.season?.toLowerCase().includes(q)) return true;
      if (p.matchday?.toLowerCase().includes(q)) return true;

      // 2. Compressor enabled / disabled
      if ((q === "comp" || q === "compressor" || q === "kompressor" || q === "active" || q === "aktiv" || q === "enabled") && p.compressorEnabled) return true;
      if ((q === "bypass" || q === "disabled" || q === "deaktiviert" || q === "passiv" || q === "uncompressed") && !p.compressorEnabled) return true;

      // 3. Normalization enabled / disabled
      if ((q === "norm" || q === "normalize" || q === "normalized" || q === "normalisiert") && p.isNormalized) return true;
      if ((q === "dry" || q === "unnormalized") && !p.isNormalized) return true;

      // 4. Fade & noise gate features
      if ((q === "fade" || q === "blende" || q === "einblenden" || q === "ausblenden") && (p.fadeInDuration > 0 || p.fadeOutDuration > 0)) return true;
      if (q === "fadein" && p.fadeInDuration > 0) return true;
      if (q === "fadeout" && p.fadeOutDuration > 0) return true;
      if ((q === "gate" || q === "noise" || q === "noise gate" || q === "noise-gate" || q === "rauschsperre") && p.noiseGateThreshold > 0) return true;

      // 5. Numeric parameter exact/partial match
      const numVal = parseFloat(q);
      if (!isNaN(numVal)) {
        if (p.noiseGateThreshold === numVal) return true;
        if (Math.abs(p.fadeInDuration - numVal) < 0.05) return true;
        if (Math.abs(p.fadeOutDuration - numVal) < 0.05) return true;
        if (p.compLowThreshold === numVal || p.compMidThreshold === numVal || p.compHighThreshold === numVal) return true;
        if (Math.abs(p.compLowRatio - numVal) < 0.1 || Math.abs(p.compMidRatio - numVal) < 0.1 || Math.abs(p.compHighRatio - numVal) < 0.1) return true;
        if (p.compLowMakeup === numVal || p.compMidMakeup === numVal || p.compHighMakeup === numVal) return true;
      }

      return false;
    });
  }, [exportPresets, activeSeasonFilter, activeMatchdayFilter, exportPresetSearchQuery, exportPresetStatusFilter]);

  // Helper to set status of all selected presets in a single action
  const handleBulkSetStatus = (status: string) => {
    if (selectedPresetIds.length === 0) return;
    const updatedPresets = exportPresets.map(preset => {
      if (selectedPresetIds.includes(preset.id)) {
        return {
          ...preset,
          status: status
        };
      }
      return preset;
    });
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }
    
    handleAddLog({
      id: `bulk-status-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Massenbearbeitung: Status von ${selectedPresetIds.length} Presets auf '${status}' gesetzt.`
        : `Bulk Action: Set status of ${selectedPresetIds.length} presets to '${status}'.`
    });
  };

  // Helper to enable or disable compressor of all selected presets in a single action
  const handleBulkSetCompressorEnabled = (enabled: boolean) => {
    if (selectedPresetIds.length === 0) return;
    const updatedPresets = exportPresets.map(preset => {
      if (selectedPresetIds.includes(preset.id)) {
        return {
          ...preset,
          compressorEnabled: enabled
        };
      }
      return preset;
    });
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    handleAddLog({
      id: `bulk-comp-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Massenbearbeitung: Kompressor für ${selectedPresetIds.length} Presets ${enabled ? "aktiviert" : "umgangen"}.`
        : `Bulk Action: ${enabled ? "Enabled" : "Bypassed"} compressor for ${selectedPresetIds.length} presets.`
    });
  };

  // Helper to copy current active workspace DSP/compression settings onto all selected presets in a single action
  const handleBulkApplyActiveDsp = () => {
    if (selectedPresetIds.length === 0) return;
    const updatedPresets = exportPresets.map(preset => {
      if (selectedPresetIds.includes(preset.id)) {
        return {
          ...preset,
          compressorEnabled,
          isNormalized,
          fadeInDuration,
          fadeOutDuration,
          noiseGateThreshold,
          compLowThreshold,
          compLowRatio,
          compLowMakeup,
          compMidThreshold,
          compMidRatio,
          compMidMakeup,
          compHighThreshold,
          compHighRatio,
          compHighMakeup
        };
      }
      return preset;
    });
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }

    handleAddLog({
      id: `bulk-dsp-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Massenbearbeitung: Aktive DSP-Einstellungen auf ${selectedPresetIds.length} Presets übertragen.`
        : `Bulk Action: Applied active DSP settings to ${selectedPresetIds.length} presets.`
    });
  };

  // Helper to change the category of all selected presets in a single action
  const handleBulkSetCategory = (newCategory: string) => {
    if (selectedPresetIds.length === 0 || !newCategory.trim()) return;
    const updatedPresets = exportPresets.map(preset => {
      if (selectedPresetIds.includes(preset.id)) {
        return {
          ...preset,
          category: newCategory.trim()
        };
      }
      return preset;
    });
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }
    
    handleAddLog({
      id: `bulk-category-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Massenbearbeitung: ${selectedPresetIds.length} Presets in Kategorie '${newCategory}' verschoben.`
        : `Bulk Action: Moved ${selectedPresetIds.length} presets to category '${newCategory}'.`
    });
  };

  // Helper to apply a selected DSP preset's settings (including status & compression) to all filtered presets
  const handleBatchApplyPreset = () => {
    if (!batchApplyPresetId) return;
    
    const sourcePreset = exportPresets.find(p => p.id === batchApplyPresetId);
    if (!sourcePreset) return;

    const visiblePresets = getFilteredPresets();
    const visibleIds = visiblePresets.map(p => p.id);
    if (visibleIds.length === 0) return;

    const updatedPresets = exportPresets.map(preset => {
      if (visibleIds.includes(preset.id) && preset.id !== batchApplyPresetId) {
        return {
          ...preset,
          status: sourcePreset.status,
          compressorEnabled: sourcePreset.compressorEnabled,
          isNormalized: sourcePreset.isNormalized,
          fadeInDuration: sourcePreset.fadeInDuration,
          fadeOutDuration: sourcePreset.fadeOutDuration,
          noiseGateThreshold: sourcePreset.noiseGateThreshold,
          compLowThreshold: sourcePreset.compLowThreshold,
          compLowRatio: sourcePreset.compLowRatio,
          compLowMakeup: sourcePreset.compLowMakeup,
          compMidThreshold: sourcePreset.compMidThreshold,
          compMidRatio: sourcePreset.compMidRatio,
          compMidMakeup: sourcePreset.compMidMakeup,
          compHighThreshold: sourcePreset.compHighThreshold,
          compHighRatio: sourcePreset.compHighRatio,
          compHighMakeup: sourcePreset.compHighMakeup
        };
      }
      return preset;
    });
    setExportPresets(updatedPresets);
    try {
      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
    } catch (err) {
      console.error(err);
    }
    handleAddLog({
      id: `batch-apply-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      source: "Preset Manager",
      level: "SUCCESS",
      message: language === "de"
        ? `Batch Apply: Preset '${sourcePreset.name}' auf ${visibleIds.length} gefilterte Presets angewendet.`
        : `Batch Apply: Applied preset '${sourcePreset.name}' to ${visibleIds.length} filtered presets.`
    });
    setBatchApplyPresetId("");
  };

  // Real-time DSP feedback simulation
  useEffect(() => {
    if (showDSPFeedbackPopover) {
      const interval = setInterval(() => {
        const T = compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold;
        const R = compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio;
        const maxGR = Math.max(0, Math.abs(T) * (1 - 1/Math.max(1, R)));
        
        setRealtimeSparklineData(prev => {
          const newData = [...prev];
          if (newData.length >= 20) newData.shift();
          newData.push({
            time: Date.now(),
            gr: Math.max(0, Math.sin(Date.now() / 400) * maxGR * (0.5 + Math.random() * 0.5))
          });
          return newData;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showDSPFeedbackPopover, compressorActiveBand, compLowThreshold, compMidThreshold, compHighThreshold, compLowRatio, compMidRatio, compHighRatio]);  // Helper to render individual preset cards with full sparkline, drag & drop, and deletion functionality
  const renderPresetCard = (preset: any) => {
    const isActive = 
      compressorEnabled === preset.compressorEnabled &&
      isNormalized === preset.isNormalized &&
      Math.abs(fadeInDuration - preset.fadeInDuration) < 0.05 &&
      Math.abs(fadeOutDuration - preset.fadeOutDuration) < 0.05 &&
      noiseGateThreshold === preset.noiseGateThreshold &&
      compLowThreshold === preset.compLowThreshold &&
      Math.abs(compLowRatio - preset.compLowRatio) < 0.05 &&
      compLowMakeup === preset.compLowMakeup &&
      compMidThreshold === preset.compMidThreshold &&
      Math.abs(compMidRatio - preset.compMidRatio) < 0.05 &&
      compMidMakeup === preset.compMidMakeup &&
      compHighThreshold === preset.compHighThreshold &&
      Math.abs(compHighRatio - preset.compHighRatio) < 0.05 &&
      compHighMakeup === preset.compHighMakeup;

    const translatedCategory = preset.category.split("/").pop() || preset.category;
    const isHovered = hoveredPresetId === preset.id;

    return (
      <motion.div 
        layout
        key={preset.id}
        draggable={dragHandleActiveId === preset.id}
        onDragStart={(e) => handlePresetDragStart(e as any, preset.id)}
        onDragOver={(e) => handlePresetDragOver(e, preset.id)}
        onDrop={(e) => handlePresetDrop(e, preset.id)}
        onDragEnd={() => {
          setDraggedPresetId(null);
          setDragOverPresetId(null);
          setDragHandleActiveId(null);
        }}
        onMouseEnter={() => setHoveredPresetId(preset.id)}
        onMouseLeave={() => setHoveredPresetId(null)}
        className={`rounded text-[8.5px] font-mono border flex transition-all duration-300 group ${dragHandleActiveId === preset.id ? "cursor-grabbing" : "cursor-default"} ${
          isHovered 
            ? `p-1.5 h-[196px] bg-slate-900 border-fcb-gold/50 shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex-col items-stretch` 
            : "p-1 h-[44px] flex-row items-center justify-between " + 
              (dragOverPresetId === preset.id 
                ? "border-cyan-400 bg-cyan-950/40 scale-[1.02] shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
                : isActive 
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold" 
                  : "bg-slate-950/80 hover:bg-slate-900 border-slate-900 text-slate-400 hover:text-slate-200")
        } ${
          draggedPresetId === preset.id ? "opacity-30 border-slate-800 scale-95" : ""
        }`}
        title={
          language === "de"
            ? "Ziehen am Grip zum Neuordnen / Ablegen in anderem Ordner"
            : "Drag handle to reorder / Drop in another folder"
        }
      >
        <div className="flex items-center justify-between w-full h-[32px] shrink-0">
          <div className="flex items-center gap-1 flex-1 min-w-0 h-full">
            {/* Mini Grip Handle */}
            <div 
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-slate-800/50"
              onPointerDown={() => setDragHandleActiveId(preset.id)}
              onPointerUp={() => setDragHandleActiveId(null)}
              onPointerLeave={() => {
                if (!draggedPresetId) setDragHandleActiveId(null);
              }}
            >
              <GripVertical className="h-3 w-3 text-slate-600 group-hover:text-cyan-400/75 shrink-0 transition" />
            </div>
            
            {/* Selection Checkbox for bulk assignments */}
            <input
              type="checkbox"
              checked={selectedPresetIds.includes(preset.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectedPresetIds(prev => 
                  checked ? [...prev, preset.id] : prev.filter(id => id !== preset.id)
                );
              }}
              className="h-3 w-3 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 cursor-pointer shrink-0 accent-cyan-500"
              title={language === "de" ? "Preset für Massen-Zuweisung auswählen" : "Select preset for bulk assignment"}
            />
            
            <button
              type="button"
              onClick={() => {
                setCompressorEnabled(preset.compressorEnabled);
                setIsNormalized(preset.isNormalized);
                setFadeInDuration(preset.fadeInDuration);
                setFadeOutDuration(preset.fadeOutDuration);
                setNoiseGateThreshold(preset.noiseGateThreshold);
                
                setCompLowThreshold(preset.compLowThreshold);
                setCompLowRatio(preset.compLowRatio);
                setCompLowMakeup(preset.compLowMakeup);
                
                setCompMidThreshold(preset.compMidThreshold);
                setCompMidRatio(preset.compMidRatio);
                setCompMidMakeup(preset.compMidMakeup);
                
                setCompHighThreshold(preset.compHighThreshold);
                setCompHighRatio(preset.compHighRatio);
                setCompHighMakeup(preset.compHighMakeup);

                handleAddLog({
                  id: `export-preset-apply-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  source: "Preset Manager",
                  level: "SUCCESS",
                  message: language === "de"
                    ? `Export-Preset '${preset.nameDe}' (${translatedCategory}) angewendet.`
                    : `Export preset '${preset.name}' (${translatedCategory}) applied.`
                });
              }}
              className="flex-1 text-left truncate flex items-center gap-1.5 h-full cursor-pointer min-w-0"
              title={language === "de" ? `Klicken zum Laden von '${preset.nameDe}'` : `Click to load '${preset.name}'`}
            >
              {(() => {
                const { bars, thresholdY, hasCompression, fadeIn, fadeOut } = getPresetSparklineData(preset);
                return (
                  <div 
                    className="relative h-[26px] w-[46px] bg-slate-950 p-[1px] rounded border border-slate-900 flex-shrink-0 flex items-end justify-between overflow-hidden"
                    title={
                      language === "de"
                        ? `Einp.: ${fadeIn}s • Ausp.: ${fadeOut}s • Komp.: ${hasCompression ? "Aktiv" : "Umgangen"}`
                        : `Fade In: ${fadeIn}s • Fade Out: ${fadeOut}s • Comp: ${hasCompression ? "Active" : "Bypassed"}`
                    }
                  >
                    {hasCompression && thresholdY !== null && (
                      <div 
                        className="absolute left-0 right-0 border-t border-rose-500/35 border-dashed z-0 pointer-events-none"
                        style={{ top: `${thresholdY * 0.8}px` }}
                      />
                    )}
                    
                    <div className="flex items-end gap-[1px] w-full h-full z-10">
                      {bars.map((barHeight, idx) => (
                        <div 
                          key={idx} 
                          className={`flex-1 rounded-t-[1px] transition-all duration-300 ${
                            isActive 
                              ? "bg-cyan-400" 
                              : preset.category.startsWith("Technical") 
                                ? "bg-violet-500/75 group-hover:bg-violet-400" 
                                : "bg-emerald-500/75 group-hover:bg-emerald-400"
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 truncate flex flex-col justify-center leading-none min-w-0">
                <span className="truncate block font-bold text-[8.5px] flex items-center gap-1.5 flex-wrap">
                  <span>{language === "de" ? preset.nameDe : preset.name}</span>
                  {preset.season && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-[0.5px] rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[6px] font-mono leading-none shrink-0" title={`${language === "de" ? "Saison" : "Season"}: ${preset.season}`}>
                      <Calendar className="h-1.5 w-1.5 shrink-0" />
                      <span>{preset.season}</span>
                    </span>
                  )}
                  {preset.matchday && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-[0.5px] rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[6px] font-mono leading-none shrink-0" title={`${language === "de" ? "Spieltag" : "Matchday"}: ${preset.matchday}`}>
                      <Tag className="h-1.5 w-1.5 shrink-0" />
                      <span>{preset.matchday}</span>
                    </span>
                  )}
                  {preset.status && (() => {
                    const statusInfo = getStatusBadge(preset.status);
                    if (!statusInfo) return null;
                    return (
                      <span className={`inline-flex items-center gap-1 px-1 py-[0.5px] rounded border text-[6px] font-mono leading-none shrink-0 ${statusInfo.classes || ""}`} style={statusInfo.style} title={`${language === "de" ? "Status" : "Status"}: ${statusInfo.label}`}>
                        <span className={`h-1 w-1 rounded-full ${statusInfo.dot || ""}`} style={statusInfo.dotStyle} />
                        <span>{statusInfo.label}</span>
                      </span>
                    );
                  })()}
                </span>
                <span className="text-[6.5px] text-slate-500 group-hover:text-slate-400 truncate mt-0.5">
                  {preset.compressorEnabled ? "Comp" : "Bypass"} • {preset.isNormalized ? "Norm" : "Dry"}
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={(e) => handleDuplicatePreset(e, preset)}
              className="p-1 text-slate-500 hover:text-cyan-400 transition cursor-pointer shrink-0"
              title={language === "de" ? "Preset duplizieren (Kopie erstellen)" : "Duplicate preset (create a copy)"}
            >
              <Copy className="h-2.5 w-2.5" />
            </button>

            {preset.id.startsWith("preset-custom-") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const updated = exportPresets.filter(p => p.id !== preset.id);
                  setExportPresets(updated);
                  try {
                    localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updated));
                  } catch (err) {
                    console.error(err);
                  }
                  handleAddLog({
                    id: `export-preset-delete-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    source: "Preset Manager",
                    level: "SUCCESS",
                    message: language === "de"
                      ? `Preset '${preset.nameDe}' gelöscht.`
                      : `Preset '${preset.name}' deleted.`
                  });
                }}
                className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer shrink-0"
                title={language === "de" ? "Preset löschen" : "Delete preset"}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Detailed High-Resolution Sparkline & Envelope Curves displayed on Hover Expanded state */}
        {isHovered && (() => {
          const { points, thresholdY, hasCompression, fadeIn, fadeOut, ratio, makeup, midThresh } = getHighResPresetData(preset, 80);
          
          const finalPathPoints = points.map(p => `${p.x},${p.y * 0.5 + 5}`).join(" ");
          
          // Render area polygons
          const finalAreaPath = `M 0,55 L ${points.map(p => `${p.x},${p.y * 0.5 + 5}`).join(" L ")} L 100,55 Z`;
          const rawAreaPath = `M 0,55 L ${points.map(p => `${p.x},${p.yRaw * 0.5 + 5}`).join(" L ")} L 100,55 Z`;

          const fadeInWidth = fadeIn * 20; 
          const fadeOutWidth = fadeOut * 20;

          // Unique gradient ID per preset to avoid visual bleed in lists
          const pId = preset.id.replace(/[^a-zA-Z0-9]/g, "");

          return (
            <div className="mt-1 pt-1 border-t border-slate-900/60 flex flex-col gap-1 w-full text-[7.5px] text-slate-400 select-none pointer-events-none" id={`preset-expanded-view-${preset.id}`}>
              {/* Detailed visualization panel */}
              <div className="relative w-full h-[55px] bg-slate-950 rounded border border-slate-900/80 overflow-hidden flex flex-col justify-between p-1">
                {/* SVG canvas */}
                <svg viewBox="0 0 100 55" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id={`fadeInGrad-${pId}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`fadeOutGrad-${pId}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity="0" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                    <linearGradient id={`waveGrad-${pId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={preset.category.startsWith("Technical") ? "#8b5cf6" : "#10b981"} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={preset.category.startsWith("Technical") ? "#8b5cf6" : "#10b981"} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="0" y1="13.75" x2="100" y2="13.75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="27.5" x2="100" y2="27.5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="41.25" x2="100" y2="41.25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="25" y1="0" x2="25" y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="50" y1="0" x2="50" y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="75" y1="0" x2="75" y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                  {/* Fade-In Envelope Shading */}
                  {fadeInWidth > 0 && (
                    <rect x="0" y="0" width={fadeInWidth} height="55" fill={`url(#fadeInGrad-${pId})`} opacity="0.12" />
                  )}

                  {/* Fade-Out Envelope Shading */}
                  {fadeOutWidth > 0 && (
                    <rect x={100 - fadeOutWidth} y="0" width={fadeOutWidth} height="55" fill={`url(#fadeOutGrad-${pId})`} opacity="0.12" />
                  )}

                  {/* Raw uncompressed wave (Subtle background path) */}
                  {hasCompression && (
                    <path d={rawAreaPath} fill="rgba(255, 255, 255, 0.015)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.5" strokeDasharray="1,1" />
                  )}

                  {/* Final processed wave path & area */}
                  <path d={finalAreaPath} fill={`url(#waveGrad-${pId})`} />
                  <path d={`M ${finalPathPoints}`} fill="none" stroke={preset.category.startsWith("Technical") ? "#a78bfa" : "#34d399"} strokeWidth="0.8" />

                  {/* Compression threshold line */}
                  {hasCompression && thresholdY !== null && (
                    <line x1="0" y1={thresholdY * 0.5 + 5} x2="100" y2={thresholdY * 0.5 + 5} stroke="#f43f5e" strokeWidth="0.65" strokeDasharray="2,2" opacity="0.7" />
                  )}
                </svg>

                {/* Compression Indicator Label */}
                {hasCompression && thresholdY !== null && (
                  <div className="absolute right-1 top-[2px] bg-slate-950/80 px-1 py-[1.5px] rounded border border-rose-500/20 text-[6px] font-mono text-rose-400 scale-[0.85] origin-top-right z-20">
                    {language === "de" ? "Schwelle" : "Thresh"}: {midThresh} dB
                  </div>
                )}

                {/* Left/Right envelope marks */}
                <div className="absolute bottom-0.5 left-1 flex items-center gap-1.5 z-20 scale-[0.8] origin-bottom-left">
                  {fadeIn > 0 && (
                    <span className="text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-1 py-[0.5px] rounded text-[6px]">
                      In: {fadeIn}s
                    </span>
                  )}
                  {fadeOut > 0 && (
                    <span className="text-rose-400 bg-rose-950/40 border border-rose-500/20 px-1 py-[0.5px] rounded text-[6px]">
                      Out: {fadeOut}s
                    </span>
                  )}
                </div>
              </div>

              {/* Summary metadata row */}
              <div className="grid grid-cols-2 gap-1 text-[6.5px] bg-slate-950/50 p-1 rounded border border-slate-900/60 leading-none">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">{language === "de" ? "KATEGORIE:" : "CATEGORY:"}</span>
                  <span className="text-slate-300 truncate font-semibold">{translatedCategory}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-slate-500">{language === "de" ? "KOMPRESSION:" : "COMPRESSION:"}</span>
                  <span className="text-slate-300 font-semibold">
                    {hasCompression ? `Ratio ${ratio}:1 • Makeup +${makeup}dB` : (language === "de" ? "Umgangen" : "Bypassed")}
                  </span>
                </div>
              </div>

              {/* Editable Description / Info snippet */}
              <div className="flex flex-col gap-0.5 mt-0.5 pointer-events-auto shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-[6px] font-bold text-slate-500">{language === "de" ? "BESCHREIBUNG:" : "DESCRIPTION:"}</span>
                <input
                  type="text"
                  value={preset.description || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (preset.id === "live-preview-mock-id") {
                      setNewPresetDescription(val);
                    } else {
                      const updated = exportPresets.map(p => p.id === preset.id ? { ...p, description: val } : p);
                      setExportPresets(updated);
                    }
                  }}
                  onBlur={() => {
                    if (preset.id !== "live-preview-mock-id") {
                      try {
                        localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(exportPresets));
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  placeholder={language === "de" ? "Keine Beschreibung..." : "No description..."}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-700/50 hover:border-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded text-[6.5px] font-mono outline-none transition-colors placeholder:text-slate-600/50"
                />
              </div>

              {/* Editable Internal Notes */}
              <div className="flex flex-col gap-0.5 mt-0.5 pointer-events-auto shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-[6px] font-bold text-slate-500">{language === "de" ? "INTERNE NOTIZEN:" : "INTERNAL NOTES:"}</span>
                <input
                  type="text"
                  value={preset.notes || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (preset.id === "live-preview-mock-id") {
                      setNewPresetNotes(val);
                    } else {
                      const updated = exportPresets.map(p => p.id === preset.id ? { ...p, notes: val } : p);
                      setExportPresets(updated);
                    }
                  }}
                  onBlur={() => {
                    if (preset.id !== "live-preview-mock-id") {
                      try {
                        localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(exportPresets));
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  placeholder={language === "de" ? "Keine Notizen..." : "No notes..."}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-700/50 hover:border-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded text-[6.5px] font-mono outline-none transition-colors placeholder:text-slate-600/50"
                />
              </div>

              {/* Status Tagging Buttons Row */}
              <div 
                className="flex items-center justify-between gap-1 text-[6.5px] bg-slate-950/50 p-1 rounded border border-slate-900/60 leading-none pointer-events-auto shrink-0 mt-0.5" 
                onClick={(e) => e.stopPropagation()}
                id={`status-tagging-row-${preset.id}`}
              >
                <span className="text-slate-500 font-bold">{language === "de" ? "STATUS:" : "STATUS:"}</span>
                <div className="flex gap-1 shrink-0">
                  {(["Draft", "Needs Work", "Approved"] as const).map((statusVal) => {
                    const isCurrent = preset.status === statusVal;
                    let colorClasses = "";
                    let activeColorClasses = "";
                    
                    if (statusVal === "Approved") {
                      colorClasses = "text-emerald-500 hover:text-emerald-400 bg-slate-950/40 border-slate-900/60 hover:bg-emerald-500/5 hover:border-emerald-500/20";
                      activeColorClasses = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                    } else if (statusVal === "Draft") {
                      colorClasses = "text-slate-400 hover:text-slate-300 bg-slate-950/40 border-slate-900/60 hover:bg-slate-800/10 hover:border-slate-700/35";
                      activeColorClasses = "bg-slate-500/20 border-slate-500/50 text-slate-200 font-bold shadow-[0_0_8px_rgba(100,116,139,0.15)]";
                    } else {
                      colorClasses = "text-amber-500 hover:text-amber-400 bg-slate-950/40 border-slate-900/60 hover:bg-amber-500/5 hover:border-amber-500/20";
                      activeColorClasses = "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.15)]";
                    }

                    const labelText = 
                      statusVal === "Approved" ? (language === "de" ? "Freigegeben" : "Approved") :
                      statusVal === "Draft" ? (language === "de" ? "Entwurf" : "Draft") :
                      (language === "de" ? "Überarbeiten" : "Needs Work");

                    return (
                      <button
                        key={statusVal}
                        type="button"
                        onClick={() => handleUpdatePresetStatus(preset.id, isCurrent ? undefined : statusVal)}
                        className={`px-1.5 py-[2px] rounded border text-[6px] font-mono leading-none transition cursor-pointer select-none ${
                          isCurrent ? activeColorClasses : colorClasses
                        }`}
                        title={language === "de" ? `Als '${labelText}' markieren` : `Mark as '${labelText}'`}
                      >
                        {labelText}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </motion.div>
    );
  };

  // Helper to render folders recursively
  // Helper to render folders recursively in the sidebar
  const renderSidebarFolderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    return Object.values(node.subfolders).map((subfolder) => {
      const cat = subfolder.fullPath;
      const isSel = exportPresetCategoryFilter === cat;
      const count = subfolder.presets.length + countAllPresets(subfolder);
      const isEditing = editingCategoryPath === cat;
      const isExpanded = expandedFolders[cat] !== false;
      const isCreatingSub = inTreeCategoryCreatePath === cat;

      return (
        <div key={cat} className="w-full flex flex-col gap-0.5">
          {isEditing ? (
            <div 
              className="flex items-center gap-1 p-1 w-full rounded border border-slate-800 bg-slate-950 mt-0.5 mb-0.5"
              style={{ marginLeft: `${depth * 6}px`, width: `calc(100% - ${depth * 6}px)` }}
            >
              <input
                type="text"
                value={editingCategoryValue}
                onChange={(e) => setEditingCategoryValue(e.target.value)}
                className="flex-1 bg-transparent text-slate-300 text-[8px] outline-none font-mono"
                maxLength={18}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameCustomCategory(cat, editingCategoryValue);
                  } else if (e.key === "Escape") {
                    setEditingCategoryPath(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameCustomCategory(cat, editingCategoryValue);
                }}
                className="text-emerald-400 p-0.5 hover:bg-slate-900 rounded cursor-pointer shrink-0"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategoryPath(null);
                }}
                className="text-rose-400 p-0.5 hover:bg-slate-900 rounded cursor-pointer shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              className={`group/sidebar-item flex items-center justify-between px-1.5 py-1 rounded text-[7.5px] font-mono font-bold border transition duration-150 cursor-pointer select-none ${
                isSel
                  ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                  : "bg-slate-950/60 border-transparent hover:border-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-900/60"
              }`}
              style={{ marginLeft: `${depth * 6}px`, width: `calc(100% - ${depth * 6}px)` }}
              onClick={() => setExportPresetCategoryFilter(cat)}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div
                  className="p-0.5 rounded hover:bg-slate-800/50 transition cursor-pointer shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedFolders(prev => ({
                      ...prev,
                      [cat]: !isExpanded
                    }));
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-2.5 w-2.5 text-cyan-500" />
                  ) : (
                    <ChevronRight className="h-2.5 w-2.5 text-slate-500" />
                  )}
                </div>
                <Folder className={`h-3 w-3 shrink-0 ${isSel ? "text-cyan-400 fill-cyan-400/20" : "text-cyan-500/70"}`} />
                <span className="truncate">{subfolder.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className={`text-[6px] px-1 py-[0.5px] rounded font-bold group-hover/sidebar-item:hidden ${
                  isSel ? "bg-cyan-500/30 text-cyan-200" : "bg-slate-900 text-slate-600"
                }`}>
                  {count}
                </span>
                
                {/* Action Buttons (visible on hover) */}
                <div className="hidden group-hover/sidebar-item:flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInTreeCategoryCreatePath(cat);
                      setInTreeCategoryInputValue("");
                      setExpandedFolders(prev => ({ ...prev, [cat]: true }));
                    }}
                    className="text-slate-500 hover:text-cyan-400 p-0.5 transition cursor-pointer"
                    title={language === "de" ? "Unterordner erstellen" : "Create subfolder"}
                  >
                    <FolderPlus className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryPath(cat);
                      setEditingCategoryValue(cat.split("/").pop() || cat);
                    }}
                    className="text-slate-500 hover:text-cyan-400 p-0.5 transition cursor-pointer"
                    title={language === "de" ? "Bereich umbenennen" : "Rename category"}
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </button>
                  {(customCategoryPaths.includes(cat) || (!["Technical", "Creative"].includes(cat) && !cat.includes("/"))) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(language === "de" ? `Kategorie "${cat}" und alle zugehörigen Presets wirklich löschen?` : `Really delete category "${cat}" and all its presets?`)) {
                          handleDeleteCustomCategory(cat);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                      title={language === "de" ? "Bereich löschen" : "Delete category"}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inline Subfolder Creation */}
          {isCreatingSub && (
            <div 
              className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-900/40 border border-slate-800 rounded mt-0.5"
              style={{ marginLeft: `${(depth + 1) * 6}px`, width: `calc(100% - ${(depth + 1) * 6}px)` }}
            >
              <input
                type="text"
                value={inTreeCategoryInputValue}
                onChange={(e) => setInTreeCategoryInputValue(e.target.value)}
                placeholder={language === "de" ? "Name..." : "Name..."}
                className="flex-1 bg-transparent border-none text-slate-300 text-[8px] font-mono outline-none"
                maxLength={18}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateInTreeCategory(cat);
                  } else if (e.key === "Escape") {
                    setInTreeCategoryCreatePath(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleCreateInTreeCategory(cat)}
                className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded cursor-pointer"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setInTreeCategoryCreatePath(null)}
                className="p-0.5 text-rose-400 hover:bg-slate-800 rounded cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Render contents of expanded folder */}
          {isExpanded && Object.keys(subfolder.subfolders).length > 0 && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {renderSidebarFolderNode(subfolder, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const getFolderSparklineData = (folderName: string, presetCount: number) => {
    const data = [];
    const seed = folderName.length + presetCount;
    for (let i = 0; i < 30; i++) {
      const val = Math.max(0, Math.sin(i * 0.5 + seed) * 10 + 10 + (i * 0.2 * (seed % 3)));
      data.push({ day: i, velocity: val });
    }
    return data;
  };

  const renderFolderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    return Object.values(node.subfolders).map((subfolder) => {
      const isExpanded = expandedFolders[subfolder.fullPath] !== false; // default to expanded if not set
      const isCreatingSub = inTreeCategoryCreatePath === subfolder.fullPath;
      const isSel = exportPresetCategoryFilter === subfolder.fullPath;

      return (
        <div key={subfolder.fullPath} className="space-y-1">
          {/* Folder row */}
          <div 
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setDraggedFolderPath(subfolder.fullPath);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", subfolder.fullPath);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              setDraggedFolderPath(null);
              setDragOverFolder(null);
            }}
            className={`group flex items-center justify-between py-1 px-1.5 rounded border transition select-none text-[8.5px] font-mono font-semibold ${
              isSel
                ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : dragOverFolder === subfolder.fullPath
                  ? "bg-cyan-950/60 border-cyan-400/80 text-cyan-300 scale-[1.01] shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                  : "hover:bg-slate-900/60 border-transparent hover:border-slate-800/40 text-slate-300"
            } ${draggedFolderPath === subfolder.fullPath ? "opacity-50" : ""}`}
            style={{ paddingLeft: `${depth * 10 + 6}px` }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedPresetId || (draggedFolderPath && draggedFolderPath !== subfolder.fullPath && !subfolder.fullPath.startsWith(draggedFolderPath + "/"))) {
                setDragOverFolder(subfolder.fullPath);
              }
            }}
            onDragLeave={() => {
              setDragOverFolder(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverFolder(null);
              if (draggedPresetId) {
                const targetFolder = subfolder.fullPath;
                const movingIds = selectedPresetIds.includes(draggedPresetId)
                  ? selectedPresetIds
                  : [draggedPresetId];
                handleBulkMovePresets(movingIds, targetFolder);
              } else if (draggedFolderPath && draggedFolderPath !== subfolder.fullPath && !subfolder.fullPath.startsWith(draggedFolderPath + "/")) {
                handleMoveFolder(draggedFolderPath, subfolder.fullPath);
              }
            }}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0 truncate">
              {/* Chevron toggler button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedFolders(prev => ({
                    ...prev,
                    [subfolder.fullPath]: !isExpanded
                  }));
                }}
                className="p-0.5 rounded hover:bg-slate-800/50 transition cursor-pointer shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-cyan-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-500" />
                )}
              </button>

              {/* Select folder clickable row */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setExportPresetCategoryFilter(subfolder.fullPath);
                }}
                className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0 truncate"
              >
                <Folder className={`h-3 w-3 shrink-0 ${isSel ? "text-cyan-400 fill-cyan-400/10" : "text-amber-500 fill-amber-500/10"}`} />
                <span className={`truncate ${isSel ? "text-cyan-300 font-bold" : "text-slate-200"}`}>
                  {subfolder.name}
                </span>
                <span className="text-[7px] text-slate-500 font-normal ml-0.5">
                  ({subfolder.presets.length + countAllPresets(subfolder)})
                </span>
              </div>
            {showCategorySparklines && (
              <div className="h-[12px] w-[30px] shrink-0 opacity-70 ml-2" title={language === "de" ? "30-Tage Velocity" : "30-Day Velocity"}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getFolderSparklineData(subfolder.name, subfolder.presets.length + countAllPresets(subfolder))}>
                    <Area type="monotone" dataKey="velocity" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} strokeWidth={1} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInTreeCategoryCreatePath(subfolder.fullPath);
                  setInTreeCategoryInputValue("");
                  setExpandedFolders(prev => ({ ...prev, [subfolder.fullPath]: true }));
                }}
                className="p-0.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition cursor-pointer"
                title={language === "de" ? "Unterkategorie hinzufügen" : "Add subcategory"}
              >
                <FolderPlus className="h-3 w-3" />
              </button>
              
              {customCategoryPaths.includes(subfolder.fullPath) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updatedPaths = customCategoryPaths.filter(p => p !== subfolder.fullPath && !p.startsWith(subfolder.fullPath + "/"));
                    setCustomCategoryPaths(updatedPaths);
                    try {
                      localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(updatedPaths));
                    } catch (err) {
                      console.error(err);
                    }
                    
                    const updatedPresets = exportPresets.filter(p => p.category !== subfolder.fullPath && !p.category.startsWith(subfolder.fullPath + "/"));
                    setExportPresets(updatedPresets);
                    try {
                      localStorage.setItem("fcb_miasanai_export_presets", JSON.stringify(updatedPresets));
                    } catch (err) {
                      console.error(err);
                    }

                    handleAddLog({
                      id: `export-category-delete-${Date.now()}`,
                      timestamp: new Date().toLocaleTimeString(),
                      source: "Preset Manager",
                      level: "SUCCESS",
                      message: language === "de"
                        ? `Kategorie-Ordner '${subfolder.name}' gelöscht.`
                        : `Category folder '${subfolder.name}' deleted.`
                    });
                  }}
                  className="p-0.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                  title={language === "de" ? "Ordner löschen" : "Delete folder"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Inline Subfolder Creation */}
          {isCreatingSub && (
            <div 
              className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-900/40 border border-slate-800/60 rounded"
              style={{ marginLeft: `${(depth + 1) * 10 + 6}px` }}
            >
              <input
                type="text"
                value={inTreeCategoryInputValue}
                onChange={(e) => setInTreeCategoryInputValue(e.target.value)}
                placeholder={language === "de" ? "Name..." : "Name..."}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 text-[8px] rounded px-1.5 py-0.5 font-mono outline-none"
                maxLength={18}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateInTreeCategory(subfolder.fullPath);
                  } else if (e.key === "Escape") {
                    setInTreeCategoryCreatePath(null);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleCreateInTreeCategory(subfolder.fullPath)}
                className="p-0.5 text-emerald-400 hover:bg-slate-800 rounded cursor-pointer"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setInTreeCategoryCreatePath(null)}
                className="p-0.5 text-rose-400 hover:bg-slate-800 rounded cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Render contents of expanded folder recursively (WITH inline presets) */}
          {isExpanded && (
            <div className="space-y-1">
              {renderFolderNode(subfolder, depth + 1)}
              {subfolder.presets.map((preset) => {
                const isActive = 
                  compressorEnabled === preset.compressorEnabled &&
                  isNormalized === preset.isNormalized &&
                  Math.abs(fadeInDuration - preset.fadeInDuration) < 0.05 &&
                  Math.abs(fadeOutDuration - preset.fadeOutDuration) < 0.05 &&
                  noiseGateThreshold === preset.noiseGateThreshold &&
                  compLowThreshold === preset.compLowThreshold &&
                  Math.abs(compLowRatio - preset.compLowRatio) < 0.05 &&
                  compLowMakeup === preset.compLowMakeup &&
                  compMidThreshold === preset.compMidThreshold &&
                  Math.abs(compMidRatio - preset.compMidRatio) < 0.05 &&
                  compMidMakeup === preset.compMidMakeup &&
                  compHighThreshold === preset.compHighThreshold &&
                  Math.abs(compHighRatio - preset.compHighRatio) < 0.05 &&
                  compHighMakeup === preset.compHighMakeup;

                return (
                  <div
                    key={preset.id}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handlePresetDragStart(e, preset.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setDraggedPresetId(null);
                      setDragOverPresetId(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompressorEnabled(preset.compressorEnabled);
                      setIsNormalized(preset.isNormalized);
                      setFadeInDuration(preset.fadeInDuration);
                      setFadeOutDuration(preset.fadeOutDuration);
                      setNoiseGateThreshold(preset.noiseGateThreshold);
                      setCompLowThreshold(preset.compLowThreshold);
                      setCompLowRatio(preset.compLowRatio);
                      setCompLowMakeup(preset.compLowMakeup);
                      setCompMidThreshold(preset.compMidThreshold);
                      setCompMidRatio(preset.compMidRatio);
                      setCompMidMakeup(preset.compMidMakeup);
                      setCompHighThreshold(preset.compHighThreshold);
                      setCompHighRatio(preset.compHighRatio);
                      setCompHighMakeup(preset.compHighMakeup);
                      handleAddLog({
                        id: `export-preset-apply-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        source: "Preset Manager",
                        level: "INFO",
                        message: language === "de"
                          ? `Export-Preset angewendet: ${preset.nameDe || preset.name}`
                          : `Applied preset: ${preset.name}`
                      });
                    }}
                    className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-grab active:cursor-grabbing text-[7.5px] font-mono transition-colors border ${
                      isActive 
                        ? "bg-cyan-900/30 text-cyan-300 border-cyan-800/50" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent hover:border-slate-700/50"
                    }`}
                    style={{ marginLeft: `${(depth + 1) * 10 + 6}px` }}
                  >
                    <Sliders className={`h-2.5 w-2.5 shrink-0 ${isActive ? "text-cyan-400" : "opacity-60"}`} />
                    <span className="truncate">{language === "de" ? preset.nameDe || preset.name : preset.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  // Keyboard shortcut Ctrl+S for saving Export Preset when modal is open
  React.useEffect(() => {
    if (!showExportSummaryModal) return;

    const handleCtrlS = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSaveExportPreset();
      }
    };

    window.addEventListener("keydown", handleCtrlS);
    return () => {
      window.removeEventListener("keydown", handleCtrlS);
    };
  }, [
    showExportSummaryModal,
    newPresetName,
    presetSaveParentCategory,
    presetSaveNewSubcategory,
    compressorEnabled,
    isNormalized,
    fadeInDuration,
    fadeOutDuration,
    noiseGateThreshold,
    compLowThreshold,
    compLowRatio,
    compLowMakeup,
    compMidThreshold,
    compMidRatio,
    compMidMakeup,
    compHighThreshold,
    compHighRatio,
    compHighMakeup,
    exportPresets,
    language
  ]);

  const activeAutomationPreset = React.useMemo(() => {
    for (const preset of AUTOMATION_PRESETS) {
      const s = preset.settings;
      if (
        Math.abs(fadeInDuration - s.fadeInDuration) < 0.05 &&
        Math.abs(fadeOutDuration - s.fadeOutDuration) < 0.05 &&
        noiseGateThreshold === s.noiseGateThreshold &&
        isNormalized === s.isNormalized &&
        compressorEnabled === s.compressorEnabled &&
        compMidThreshold === s.compMidThreshold &&
        Math.abs(compMidRatio - s.compMidRatio) < 0.05 &&
        compMidMakeup === s.compMidMakeup &&
        compLowThreshold === s.compLowThreshold &&
        Math.abs(compLowRatio - s.compLowRatio) < 0.05 &&
        compLowMakeup === s.compLowMakeup &&
        compHighThreshold === s.compHighThreshold &&
        Math.abs(compHighRatio - s.compHighRatio) < 0.05 &&
        compHighMakeup === s.compHighMakeup
      ) {
        return preset.id;
      }
    }
    return null;
  }, [
    fadeInDuration,
    fadeOutDuration,
    noiseGateThreshold,
    isNormalized,
    compressorEnabled,
    compMidThreshold,
    compMidRatio,
    compMidMakeup,
    compLowThreshold,
    compLowRatio,
    compLowMakeup,
    compHighThreshold,
    compHighRatio,
    compHighMakeup
  ]);

  const applyAutomationPreset = (presetId: string) => {
    if (isTrimLocked) return;
    const preset = AUTOMATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const s = preset.settings;
    setFadeInDuration(s.fadeInDuration);
    setFadeOutDuration(s.fadeOutDuration);
    setNoiseGateThreshold(s.noiseGateThreshold);
    setIsNormalized(s.isNormalized);
    setCompressorEnabled(s.compressorEnabled);
    
    setCompMidThreshold(s.compMidThreshold);
    setCompMidRatio(s.compMidRatio);
    setCompMidMakeup(s.compMidMakeup);
    
    setCompLowThreshold(s.compLowThreshold);
    setCompLowRatio(s.compLowRatio);
    setCompLowMakeup(s.compLowMakeup);
    
    setCompHighThreshold(s.compHighThreshold);
    setCompHighRatio(s.compHighRatio);
    setCompHighMakeup(s.compHighMakeup);

    handleAddLog({
      id: `automation-preset-${presetId}-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Automation Preset",
      message: language === "de" 
        ? `Automations-Preset '${preset.nameDe}' angewendet: Kompression aktiviert, Fade-In: ${s.fadeInDuration}s, Fade-Out: ${s.fadeOutDuration}s, Noise Gate: ${s.noiseGateThreshold}%.`
        : `Applied '${preset.name}' automation preset: Compression engaged, Fade-In: ${s.fadeInDuration}s, Fade-Out: ${s.fadeOutDuration}s, Noise Gate: ${s.noiseGateThreshold}%.`
    });
  };

  const handleCapturedSpeech = (resultText: string) => {
    setTranscript(resultText);
    const duration = parseFloat((Math.random() * 8 + 32).toFixed(1)); // 32.0 to 40.0 seconds
    setAudioDuration(duration);
    setTrimStart(0.0);
    setTrimEnd(duration);
    setCroppedSuccessfully(false);
    setIsPlayingAudio(false);
    setPlayheadProgress(0.0);
    setFadeInDuration(1.0);
    setFadeOutDuration(1.0);
    setIsNormalized(false);
    setNoiseGateThreshold(15);
    setCompressorEnabled(true);
    setCompressorActiveBand("mid");
    setCompLowThreshold(-24);
    setCompLowRatio(2.5);
    setCompLowAttack(30);
    setCompLowRelease(150);
    setCompLowMakeup(2);
    setCompMidThreshold(-16);
    setCompMidRatio(4.0);
    setCompMidAttack(15);
    setCompMidRelease(100);
    setCompMidMakeup(3);
    setCompHighThreshold(-20);
    setCompHighRatio(3.0);
    setCompHighAttack(8);
    setCompHighRelease(80);
    setCompHighMakeup(1);
    setShowShortcutsModal(false);
    setTrimmerHistory([]);
    setHistoryIndex(-1);
  };

  const exportTrimmedAudio = () => {
    const sampleRate = 16000;
    const duration = trimEnd - trimStart;
    if (duration <= 0) return;
    const numSamples = Math.floor(duration * sampleRate);
    const heights = [35, 20, 55, 30, 85, 45, 40, 75, 95, 55, 30, 65, 85, 45, 75, 30, 55, 20, 45, 65, 30, 55, 40, 20];
    const maxVal = Math.max(...heights);
    const normMultiplier = isNormalized ? (100 / maxVal) : 1.0;
    
    // Allocate buffer: 44 bytes header + numSamples * 2 bytes data
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // Helper to write ASCII strings to DataView
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // Write WAV Header
    writeString(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true); // File size - 8
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align (1 channel * 2 bytes/sample)
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, "data");
    view.setUint32(40, numSamples * 2, true); // Data chunk size
    
    // Write PCM Samples
    let currentLowGain = 1.0;
    let currentMidGain = 1.0;
    let currentHighGain = 1.0;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate; // time relative to start of trimmed region
      const originalTime = trimStart + t; // original time in full track
      
      // Determine amplitude from corresponding waveform bar
      const barIdx = Math.min(23, Math.floor((originalTime / audioDuration) * 24));
      const barHeightPct = (heights[barIdx] || 0) * normMultiplier;
      
      // Check silence threshold
      let targetVolume = barHeightPct / 100;
      if (barHeightPct < silenceThreshold) {
        targetVolume = targetVolume * 0.15; // Apply significant dampening for silence
      }
      
      // Apply Noise Gate (fully silence background noise below threshold floor)
      if (barHeightPct < noiseGateThreshold) {
        targetVolume = 0;
      }
      
      // Apply Fade In
      if (t < fadeInDuration && fadeInDuration > 0) {
        targetVolume *= (t / fadeInDuration);
      }
      // Apply Fade Out
      else if (t > duration - fadeOutDuration && fadeOutDuration > 0) {
        targetVolume *= ((duration - t) / fadeOutDuration);
      }
      
      // Compute raw band amplitudes
      const ampLow = 0.5 * targetVolume;
      const ampMid = 0.3 * targetVolume;
      const ampHigh = 0.2 * targetVolume;
      
      const getDb = (amp: number) => {
        if (amp <= 0.0001) return -100;
        return 20 * Math.log10(amp);
      };
      
      // Compute target compressor gain reductions
      let targetLowGain = 1.0;
      let targetMidGain = 1.0;
      let targetHighGain = 1.0;
      
      if (compressorEnabled) {
        // Low Band
        const dbLow = getDb(ampLow);
        if (dbLow > compLowThreshold) {
          const excess = dbLow - compLowThreshold;
          const compressedExcess = excess / compLowRatio;
          const reductionDb = compressedExcess - excess;
          targetLowGain = Math.pow(10, (reductionDb + compLowMakeup) / 20);
        } else {
          targetLowGain = Math.pow(10, compLowMakeup / 20);
        }
        
        // Mid Band
        const dbMid = getDb(ampMid);
        if (dbMid > compMidThreshold) {
          const excess = dbMid - compMidThreshold;
          const compressedExcess = excess / compMidRatio;
          const reductionDb = compressedExcess - excess;
          targetMidGain = Math.pow(10, (reductionDb + compMidMakeup) / 20);
        } else {
          targetMidGain = Math.pow(10, compMidMakeup / 20);
        }
        
        // High Band
        const dbHigh = getDb(ampHigh);
        if (dbHigh > compHighThreshold) {
          const excess = dbHigh - compHighThreshold;
          const compressedExcess = excess / compHighRatio;
          const reductionDb = compressedExcess - excess;
          targetHighGain = Math.pow(10, (reductionDb + compHighMakeup) / 20);
        } else {
          targetHighGain = Math.pow(10, compHighMakeup / 20);
        }
      }
      
      // Dynamic response (Attack/Release smoothing)
      if (compressorEnabled) {
        const lowAttackSec = compLowAttack / 1000;
        const lowReleaseSec = compLowRelease / 1000;
        const lowCoeff = targetLowGain < currentLowGain
          ? 1 - Math.exp(-1 / (sampleRate * lowAttackSec))
          : 1 - Math.exp(-1 / (sampleRate * lowReleaseSec));
        currentLowGain += lowCoeff * (targetLowGain - currentLowGain);
        
        const midAttackSec = compMidAttack / 1000;
        const midReleaseSec = compMidRelease / 1000;
        const midCoeff = targetMidGain < currentMidGain
          ? 1 - Math.exp(-1 / (sampleRate * midAttackSec))
          : 1 - Math.exp(-1 / (sampleRate * midReleaseSec));
        currentMidGain += midCoeff * (targetMidGain - currentMidGain);
        
        const highAttackSec = compHighAttack / 1000;
        const highReleaseSec = compHighRelease / 1000;
        const highCoeff = targetHighGain < currentHighGain
          ? 1 - Math.exp(-1 / (sampleRate * highAttackSec))
          : 1 - Math.exp(-1 / (sampleRate * highReleaseSec));
        currentHighGain += highCoeff * (targetHighGain - currentHighGain);
      } else {
        currentLowGain = 1.0;
        currentMidGain = 1.0;
        currentHighGain = 1.0;
      }
      
      // Synthesize multi-band composite wave with applied band compression gains
      const wave = Math.sin(2 * Math.PI * 220 * t) * 0.5 * currentLowGain + 
                   Math.sin(2 * Math.PI * 440 * t) * 0.3 * currentMidGain + 
                   Math.sin(2 * Math.PI * 880 * t) * 0.2 * currentHighGain;
      
      // Final sample value, scaling and rounding to signed 16-bit range [-32768, 32767]
      const sampleVal = Math.max(-32768, Math.min(32767, Math.floor(wave * targetVolume * 28000)));
      view.setInt16(44 + i * 2, sampleVal, true);
    }
    
    // Create Blob and Download
    const blob = new Blob([view], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trimmed_voice_command_${(trimEnd - trimStart).toFixed(1)}s.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    handleAddLog({
      id: `export-wav-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Audio Exporter",
      message: `Exported trimmed WAV audio file (${duration.toFixed(1)}s) successfully with ${isNormalized ? "normalized peak gain (100% target) and " : ""}applied fade-in/fade-out ramps.`
    });
  };

  // Keyboard Shortcuts Hook for Audio Trimmer and Exporter
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if trimmer is not shown
      if (audioDuration <= 0 || !transcript) return;
      
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      // Space key -> Play / Pause
      if (e.code === "Space") {
        e.preventDefault();
        if (isPlayingAudio) {
          setIsPlayingAudio(false);
        } else {
          setPlayheadProgress(trimStart);
          setIsPlayingAudio(true);
        }
        handleAddLog({
          id: `shortcut-space-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Keyboard Shortcut",
          message: isPlayingAudio ? "Paused audio playback via [Space] hotkey." : "Started audio playback from trim start via [Space] hotkey."
        });
      }

      // Left arrow key -> Nudge trim bounds left
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isTrimLocked) {
          handleAddLog({
            id: `shortcut-locked-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "WARNING",
            source: "Keyboard Shortcut",
            message: language === "de" ? "Zuschnitt gesperrt. Hebe die Sperre oben auf, um die Grenzen anzupassen." : "Cannot nudge trim boundaries. Trimming is currently locked."
          });
          return;
        }
        setTrimStart(prev => {
          const next = Math.max(0, parseFloat((prev - 0.1).toFixed(1)));
          return next;
        });
        setTrimEnd(prev => {
          const next = Math.max(trimStart + 0.5, parseFloat((prev - 0.1).toFixed(1)));
          return next;
        });
        handleAddLog({
          id: `shortcut-left-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Keyboard Shortcut",
          message: "Nudged trim boundaries left by 0.1s via [Left Arrow] hotkey."
        });
      }

      // Right arrow key -> Nudge trim bounds right
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isTrimLocked) {
          handleAddLog({
            id: `shortcut-locked-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "WARNING",
            source: "Keyboard Shortcut",
            message: language === "de" ? "Zuschnitt gesperrt. Hebe die Sperre oben auf, um die Grenzen anzupassen." : "Cannot nudge trim boundaries. Trimming is currently locked."
          });
          return;
        }
        setTrimEnd(prev => {
          const next = Math.min(audioDuration, parseFloat((prev + 0.1).toFixed(1)));
          return next;
        });
        setTrimStart(prev => {
          const next = Math.min(trimEnd - 0.5, parseFloat((prev + 0.1).toFixed(1)));
          return next;
        });
        handleAddLog({
          id: `shortcut-right-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Keyboard Shortcut",
          message: "Nudged trim boundaries right by 0.1s via [Right Arrow] hotkey."
        });
      }

      // Cmd/Ctrl + E -> Export as WAV
      if ((e.metaKey || e.ctrlKey) && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        exportTrimmedAudio();
      }

      // Cmd/Ctrl + Z -> Undo
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      }

      // Cmd/Ctrl + Y or Cmd/Ctrl + Shift + Z -> Redo
      if (
        ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "z" || e.key === "Z"))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [audioDuration, transcript, isPlayingAudio, trimStart, trimEnd, isNormalized, isTrimLocked, handleUndo, handleRedo]);

  const simulateVoiceInput = () => {
    setIsListening(true);
    setSpeechError(null);
    setTranscript("");
    setVoiceLog(null);
    setAudioDuration(0);
    
    // Pick a random supported command
    const commands = [
      "Generate post for Harry Kane",
      "Go to Command Center",
      "Search for tactical analysis of Leverkusen match",
      "Wechsle zu RAG Wissensdatenbank",
      "Erstelle Beitrag für Musiala auf TikTok"
    ];
    const chosenCommand = commands[Math.floor(Math.random() * commands.length)];

    setTimeout(() => {
      setIsListening(false);
      handleCapturedSpeech(chosenCommand);
    }, 2500);
  };

  React.useEffect(() => {
    let interval: any = null;
    if (isPlayingAudio) {
      const step = 0.05;
      interval = setInterval(() => {
        setPlayheadProgress(prev => {
          if (prev >= trimEnd) {
            setIsPlayingAudio(false);
            return trimStart;
          }
          return parseFloat((prev + step).toFixed(2));
        });
      }, 50);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingAudio, trimStart, trimEnd]);

  const [voiceCommandHistory, setVoiceCommandHistory] = useLocalStorage<string[]>("fcb_miasanai_voice_history", []);

  const recognitionRef = React.useRef<any>(null);
  const serverRecorderRef = React.useRef<ServerTranscriptionController | null>(null);
  const executeVoiceCommandRef = React.useRef<any>(null);
  const handleCapturedSpeechRef = React.useRef<any>(null);

  const speakFeedback = (text: string) => {
    if (!speechEnabled) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "de" ? "de-DE" : "en-US";
      utterance.pitch = 1.0;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const executeVoiceCommand = (resultText: string) => {
    setTranscript(resultText);
    
    handleAddLog({
      id: `voice-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "TRIGGER",
      source: "Voice Command",
      message: `Executed: "${resultText}"`
    });

    const processResult = processVoiceCommand(resultText);
    if (processResult.success) {
      setVoiceCommandHistory(prev => {
        const filtered = prev.filter(cmd => cmd.toLowerCase() !== resultText.toLowerCase());
        const updated = [resultText, ...filtered].slice(0, 5);
        try {
          localStorage.setItem("fcb_miasanai_voice_history", JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });

      if (processResult.action === "navigation") {
        setVoiceLog(
          language === "de"
            ? `Aktion ausgeführt: Navigation zu ${processResult.target}`
            : `Action executed: Navigate to ${processResult.target}`
        );
      } else if (processResult.action === "search") {
        setVoiceLog(
          language === "de"
            ? `Suche ausgeführt nach: "${processResult.target}"`
            : `Search executed for: "${processResult.target}"`
        );
      } else {
        setVoiceLog(
          language === "de"
            ? `Post generiert für ${processResult.player}`
            : `Generated post for ${processResult.player}`
        );
      }
    } else {
      setVoiceLog(
        language === "de"
          ? `Befehl nicht erkannt. Versuchen Sie es mit "Kommandozentrale" oder "Generiere Beitrag für Kane".`
          : `Command not recognized. Try saying "Command Center" or "Generate post for Kane".`
      );
      speakFeedback(
        language === "de"
          ? "Befehl nicht erkannt."
          : "Command not recognized."
      );
    }
  };

  React.useEffect(() => {
    executeVoiceCommandRef.current = executeVoiceCommand;
    handleCapturedSpeechRef.current = handleCapturedSpeech;
  }, [executeVoiceCommand, handleCapturedSpeech]);

  const processVoiceCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    
    // 1. Navigation Mapping
    if (
      text.includes("dashboard") || 
      text.includes("kommando") || 
      text.includes("system") || 
      text.includes("übersicht") || 
      text.includes("overview") || 
      text.includes("command center")
    ) {
      setActiveTab("dashboard");
      speakFeedback(language === "de" ? "Wechsle zur Kommandozentrale." : "Switching to Command Center.");
      return { success: true, action: "navigation", target: "Dashboard" };
    }
    
    if (
      text.includes("journey") || 
      text.includes("lifecycle") || 
      text.includes("kundenreise") || 
      text.includes("kampagne") || 
      text.includes("ablauf") || 
      text.includes("flow")
    ) {
      setActiveTab("journey");
      speakFeedback(language === "de" ? "Wechsle zur Lifecycle-Engine." : "Switching to Lifecycle Engine.");
      return { success: true, action: "navigation", target: "Lifecycle Engine" };
    }
    
    // Check for trigger post generation
    const isGenerateCommand = 
      text.includes("generier") || 
      text.includes("erstell") || 
      text.includes("schreib") || 
      text.includes("create") || 
      text.includes("generate") || 
      text.includes("content") || 
      text.includes("post");

    if (isGenerateCommand) {
      setActiveTab("generator");
      
      let player = "";
      if (text.includes("kane")) player = "Harry Kane";
      else if (text.includes("müller") || text.includes("muller")) player = "Thomas Müller";
      else if (text.includes("musiala")) player = "Jamal Musiala";
      else if (text.includes("kimmich")) player = "Joshua Kimmich";
      else if (text.includes("neuer")) player = "Manuel Neuer";
      
      console.log("VOICE_COMMAND_TEST - Detected player mapping:", player || "None");
      
      let platform = "";
      if (text.includes("instagram")) platform = "Instagram";
      else if (text.includes("twitter") || text.includes(" x ")) platform = "X/Twitter";
      else if (text.includes("tiktok")) platform = "TikTok";
      else if (text.includes("facebook")) platform = "Facebook";
      else if (text.includes("newsletter") || text.includes("app")) platform = "FCB App/Newsletter";
      
      let tone = "";
      if (text.includes("mia san mia") || text.includes("emotional")) tone = "Mia San Mia / Emotional";
      else if (text.includes("witty") || text.includes("spielrisch") || text.includes("lustig")) tone = "Witty / Playful";
      else if (text.includes("tactical") || text.includes("taktisch") || text.includes("analytisch")) tone = "Tactical / Analytical";
      else if (text.includes("hype") || text.includes("energetic") || text.includes("laut")) tone = "Hype / Energetic";

      speakFeedback(
        language === "de" 
          ? `Generiere Beitrag für ${player || "den ausgewählten Spieler"}.` 
          : `Generating post for ${player || "the selected player"}.`
      );

      setTimeout(() => {
        const event = new CustomEvent("miasanai-voice-generate", {
          detail: { player, platform, tone }
        });
        window.dispatchEvent(event);
      }, 300);

      return { 
        success: true, 
        action: "generate", 
        player: player || "Current", 
        platform: platform || "Default" 
      };
    }

    if (
      text.includes("generator") || 
      text.includes("beitrag") || 
      text.includes("post") || 
      text.includes("schreiben")
    ) {
      setActiveTab("generator");
      speakFeedback(language === "de" ? "Wechsle zum Multi-Format-Generator." : "Switching to Multi-Format Generator.");
      return { success: true, action: "navigation", target: "Generator" };
    }

    if (
      text.includes("video") || 
      text.includes("studio") || 
      text.includes("film") || 
      text.includes("runway") || 
      text.includes("director") || 
      text.includes("kamera")
    ) {
      setActiveTab("video");
      speakFeedback(language === "de" ? "Wechsle zum Video-Studio." : "Switching to Runway Video Director.");
      return { success: true, action: "navigation", target: "Video Studio" };
    }

    if (
      text.includes("rag") || 
      text.includes("wissensdatenbank") || 
      text.includes("knowledge") || 
      text.includes("suche") || 
      text.includes("datenbank") || 
      text.includes("hub")
    ) {
      // Check if it's a search command
      const isSearchKeyword = text.includes("suche") || text.includes("search");
      if (isSearchKeyword) {
        const searchQuery = text.replace(/suche\s+|search\s+/, "").trim();
        setActiveTab("rag");
        speakFeedback(
          language === "de" 
            ? `Suche in Wissensdatenbank nach: ${searchQuery}` 
            : `Searching Knowledge Hub for: ${searchQuery}`
        );
        
        setTimeout(() => {
          const event = new CustomEvent("miasanai-voice-search", {
            detail: { query: searchQuery }
          });
          window.dispatchEvent(event);
        }, 300);
        
        return { success: true, action: "search", target: searchQuery };
      }

      setActiveTab("rag");
      speakFeedback(language === "de" ? "Wechsle zur FCB-Wissensdatenbank." : "Switching to FCB Knowledge Hub.");
      return { success: true, action: "navigation", target: "Knowledge Hub" };
    }

    if (
      text.includes("automation") || 
      text.includes("webhook") || 
      text.includes("middleware") || 
      text.includes("connectors") || 
      text.includes("pipeline")
    ) {
      setActiveTab("automation");
      speakFeedback(language === "de" ? "Wechsle zur Webhook-Pipeline." : "Switching to Webhook Middleware Connectors.");
      return { success: true, action: "navigation", target: "Automation Connectors" };
    }

    // Direct search backup (if starting with search or suche)
    if (text.startsWith("suche ") || text.startsWith("search ")) {
      const searchQuery = text.replace(/^suche |^search /, "").trim();
      setActiveTab("rag");
      speakFeedback(
        language === "de" 
          ? `Suche in Wissensdatenbank nach: ${searchQuery}` 
          : `Searching Knowledge Hub for: ${searchQuery}`
      );
      
      setTimeout(() => {
        const event = new CustomEvent("miasanai-voice-search", {
          detail: { query: searchQuery }
        });
        window.dispatchEvent(event);
      }, 300);
      
      return { success: true, action: "search", target: searchQuery };
    }

    return { success: false, text: rawText };
  };

  React.useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setTranscript("");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (handleCapturedSpeechRef.current) {
          handleCapturedSpeechRef.current(resultText);
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === "no-speech") {
          setIsListening(false);
          return;
        }
        console.warn("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError(language === "de" ? "Mikrofonzugriff verweigert." : "Microphone access denied.");
        } else {
          // Avoid showing obscure technical errors for common browser restrictions
          setSpeechError(null);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setSpeechSupported(false);
    }
  }, [language]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language === "de" ? "de-DE" : "en-US";
        recognitionRef.current.start();
        setVoiceLog(null);
        setShowAssistantPanel(true);
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    } else {
      // Server-side STT fallback when the browser lacks the Web Speech API.
      setVoiceLog(null);
      setShowAssistantPanel(true);
      setSpeechError(null);
      setIsListening(true);
      startServerTranscription({ language })
        .then((ctrl) => {
          serverRecorderRef.current = ctrl;
        })
        .catch((err) => {
          console.error("Failed to start server transcription", err);
          setSpeechError(language === "de" ? "Mikrofonzugriff verweigert." : "Microphone access denied.");
          setIsListening(false);
        });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop speech recognition", err);
      }
    } else if (serverRecorderRef.current) {
      const ctrl = serverRecorderRef.current;
      serverRecorderRef.current = null;
      ctrl
        .stop()
        .then((text: string) => {
          if (text && handleCapturedSpeechRef.current) {
            handleCapturedSpeechRef.current(text);
          }
        })
        .catch((err: any) => console.error("Server transcription failed", err))
        .finally(() => setIsListening(false));
    }
  };

  const navigationTabs = [
    { id: "secret-manager", name: "GCP Secret QA", icon: Shield },
    { id: "dashboard", name: t("tabDashboard"), icon: Layers, description: t("tabDashboardDesc") },
    { id: "journey", name: t("tabJourney"), icon: GitFork, description: t("tabJourneyDesc") },
    { id: "generator", name: t("tabGenerator"), icon: Sparkles, description: t("tabGeneratorDesc") },
    { id: "moderation", name: t("tabModeration"), icon: CheckCircle2, description: t("tabModerationDesc") },
    { id: "video", name: t("tabVideo"), icon: Clapperboard, description: t("tabVideoDesc") },
    { id: "rag", name: t("tabRag"), icon: Database, description: t("tabRagDesc") },
    { id: "automation", name: t("tabAutomation"), icon: Workflow, description: t("tabAutomationDesc") },
    { id: "langgraph", name: t("tabLangGraph"), icon: Network, description: t("tabLangGraphDesc") },
    { id: "analytics", name: language === "de" ? "Analyse-Studio" : "Analytics Studio", icon: BarChart3, Activity, description: language === "de" ? "Tableau & Live KPIs" : "Tableau Embed & Live KPIs" },
    { id: "settings", name: t("tabSettings"), icon: Settings, description: t("tabSettingsDesc") }
  ];

  const filteredExportForBatch = exportPresets.filter(p => {
    if (!presetListFilter.trim()) return true;
    const q = presetListFilter.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
  });
  const visibleSelectedCount = filteredExportForBatch.filter(p => batchSelectedPresets.includes(p.id)).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-fcb-red selection:text-white">
      
      {/* 1. Global Header branding bar */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* FCB Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-fcb-red rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-fcb-red/10 flex-shrink-0">
            <span className="text-white font-extrabold font-display text-xs tracking-tighter">FCB</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display tracking-tight text-white">{t("appName")}</h1>
              <span className="bg-fcb-gold/15 text-fcb-gold text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border border-fcb-gold/25">
                {t("enterprise")}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{t("subHeader")}</p>
          </div>
        </div>

        {/* Global interactive notification bell banner */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <AnimatePresence mode="wait">
            {notification && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg max-w-sm sm:max-w-md text-[11px] text-slate-300 flex items-center gap-2 shadow-inner"
              >
                <Bell className="h-3.5 w-3.5 text-fcb-gold animate-bounce flex-shrink-0" />
                <span className="truncate">{notification}</span>
                <button 
                  onClick={() => setNotification(null)}
                  className="text-slate-500 hover:text-white font-mono ml-1 text-[10px]"
                >
                  [x]
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Language Switcher Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800/80 p-1 rounded-lg">
            <button
              onClick={() => setLanguage("de")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                language === "de"
                  ? "bg-fcb-red text-white shadow-md shadow-fcb-red/10 font-black"
                  : "text-slate-500 hover:text-slate-300 font-normal"
              }`}
            >
              DE
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                language === "en"
                  ? "bg-fcb-red text-white shadow-md shadow-fcb-red/10 font-black"
                  : "text-slate-500 hover:text-slate-300 font-normal"
              }`}
            >
              EN
            </button>
          </div>

          {/* Voice Assistant Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[11px] font-mono cursor-pointer ${
                isListening
                  ? "bg-red-500/15 border-red-500 text-red-400 shadow-md shadow-red-500/10 font-bold"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
              title={language === "de" ? "Sprachsteuerung" : "Voice Command"}
              id="voice-command-trigger"
            >
              {isListening ? (
                <>
                  <Mic className="h-3.5 w-3.5 animate-pulse text-red-500" />
                  <span className="hidden sm:inline font-bold uppercase tracking-wider text-[9px] animate-pulse">
                    {language === "de" ? "Zuhören..." : "Listening..."}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5 text-fcb-gold" />
                  <span className="hidden sm:inline font-bold uppercase tracking-wider text-[9px]">
                    {language === "de" ? "Sprachbefehl" : "Voice Assist"}
                  </span>
                </>
              )}
            </button>

            {/* Voice Command Info Popover / Assistant Flyout */}
            <AnimatePresence>
              {showAssistantPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-850 rounded-xl shadow-2xl z-50 p-4 space-y-3.5 select-text"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[9px] font-mono text-fcb-gold uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-fcb-gold" />
                      MiaSanAI Voice Command
                    </span>
                    <button
                      onClick={() => setShowAssistantPanel(false)}
                      className="text-slate-500 hover:text-white text-[10px] cursor-pointer font-mono"
                    >
                      [close]
                    </button>
                  </div>

                  {/* Recognition Status / Animation */}
                  <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/60 flex flex-col items-center justify-center min-h-[75px] relative overflow-hidden">
                    {isListening ? (
                      <div className="space-y-2 text-center w-full">
                        <div className="flex items-center justify-center gap-1">
                          <span className="h-3 w-0.5 bg-red-500 animate-bounce rounded-full"></span>
                          <span className="h-5 w-0.5 bg-red-500 animate-bounce rounded-full" style={{ animationDelay: "100ms" }}></span>
                          <span className="h-4 w-0.5 bg-red-500 animate-bounce rounded-full" style={{ animationDelay: "200ms" }}></span>
                          <span className="h-6 w-0.5 bg-red-500 animate-bounce rounded-full" style={{ animationDelay: "150ms" }}></span>
                          <span className="h-3 w-0.5 bg-red-500 animate-bounce rounded-full" style={{ animationDelay: "50ms" }}></span>
                        </div>
                        <span className="text-[9px] font-mono text-red-400 block uppercase tracking-wide">
                          {language === "de" ? "Sprechen Sie jetzt..." : "Speak now..."}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <MicOff className="h-4 w-4 text-slate-600 mx-auto" />
                        <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wide">
                          {language === "de" ? "Mikrofon inaktiv" : "Microphone Idle"}
                        </span>
                        <button
                          onClick={simulateVoiceInput}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[9px] text-fcb-gold rounded-md font-mono cursor-pointer transition active:scale-95 animate-pulse"
                          id="simulate-mic-trigger"
                        >
                          {language === "de" ? "[Sprachbefehl simulieren]" : "[Simulate Recording]"}
                        </button>
                      </div>
                    )}

                    {/* Live Transcript or Hint */}
                    {transcript && (
                      <div className="mt-2.5 w-full text-center border-t border-slate-900 pt-2 select-text">
                        <span className="text-[8px] font-mono text-slate-500 block uppercase">Captured Transcript:</span>
                        <p className="text-[10px] text-white italic font-medium mt-0.5">"{transcript}"</p>
                      </div>
                    )}

                    {speechError && (
                      <div className="mt-2.5 w-full text-center border-t border-slate-900 pt-2">
                        <p className="text-[10px] text-red-400 font-medium">{speechError}</p>
                      </div>
                    )}

                    {voiceLog && (
                      <div className="mt-2.5 w-full text-center border-t border-slate-900 pt-2 select-text">
                        <p className="text-[10.5px] text-green-400 font-semibold leading-relaxed">{voiceLog}</p>
                      </div>
                    )}
                  </div>

                  {/* Audio Trimmer & Waveform Crop Tool */}
                  {audioDuration > 0 && transcript && (() => {
                    const heights = [35, 20, 55, 30, 85, 45, 40, 75, 95, 55, 30, 65, 85, 45, 75, 30, 55, 20, 45, 65, 30, 55, 40, 20];
                    const maxVal = Math.max(...heights);
                    const normMultiplier = isNormalized ? (100 / maxVal) : 1.0;
                    const processedHeights = heights.map(h => Math.min(100, Math.round(h * normMultiplier)));

                    const optStartIdx = processedHeights.findIndex(h => h >= silenceThreshold);
                    const optEndIdx = 23 - [...processedHeights].reverse().findIndex(h => h >= silenceThreshold);
                    
                    const suggestedStartS = optStartIdx >= 0 ? parseFloat((optStartIdx * (audioDuration / 24)).toFixed(1)) : 0.0;
                    const suggestedEndS = optEndIdx >= 0 && optEndIdx < 24 ? parseFloat(((optEndIdx + 1) * (audioDuration / 24)).toFixed(1)) : audioDuration;

                    return (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/60 space-y-3 relative overflow-hidden" id="audio-trimmer-visualization">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wide flex items-center gap-1">
                            <Scissors className="h-3 w-3 animate-pulse" />
                            {language === "de" ? "Audio-Zuschnitt & Lautstärkeverlauf" : "Audio Crop, Trim & Fades"}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Undo / Redo controls */}
                            <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-slate-400">
                              <button
                                onClick={handleUndo}
                                disabled={historyIndex <= 0}
                                className="p-1 hover:bg-slate-805 disabled:opacity-20 disabled:hover:bg-transparent text-slate-300 hover:text-white disabled:text-slate-600 rounded cursor-pointer transition flex items-center justify-center"
                                title={language === "de" ? "Rückgängig (Strg+Z)" : "Undo change (Ctrl+Z)"}
                                id="trimmer-undo-btn"
                              >
                                <Undo className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={handleRedo}
                                disabled={historyIndex >= trimmerHistory.length - 1}
                                className="p-1 hover:bg-slate-805 disabled:opacity-20 disabled:hover:bg-transparent text-slate-300 hover:text-white disabled:text-slate-600 rounded cursor-pointer transition flex items-center justify-center"
                                title={language === "de" ? "Wiederholen (Strg+Y)" : "Redo change (Ctrl+Y)"}
                                id="trimmer-redo-btn"
                              >
                                <Redo className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            <button
                              id="lock-trim-toggle"
                              onClick={() => {
                                const newLocked = !isTrimLocked;
                                setIsTrimLocked(newLocked);
                                handleAddLog({
                                  id: `lock-toggle-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Audio Trimmer",
                                  message: newLocked
                                    ? (language === "de"
                                      ? "Zuschnittgrenzen gesperrt. Drag-and-Drop-Griffe und Hotkey-Anpassungen sind deaktiviert."
                                      : "Trimming boundaries locked. Accidental drag-and-drop handles and hotkey adjustments are now disabled.")
                                    : (language === "de"
                                      ? "Zuschnittgrenzen entsperrt. Präzisions-Feineinstellungen aktiviert."
                                      : "Trimming boundaries unlocked. Precision adjustments enabled.")
                                });
                              }}
                              className={`px-1.5 py-0.5 border text-[8px] font-mono rounded cursor-pointer transition flex items-center gap-1 ${
                                isTrimLocked
                                  ? "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-400 font-bold"
                                  : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                              title={isTrimLocked ? (language === "de" ? "Auswahl entsperren" : "Unlock Selection") : (language === "de" ? "Auswahl sperren" : "Lock Selection")}
                            >
                              {isTrimLocked ? (
                                <>
                                  <Lock className="h-2.5 w-2.5 text-rose-400" />
                                  <span>{language === "de" ? "Gesperrt" : "Locked"}</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-2.5 w-2.5" />
                                  <span>{language === "de" ? "Sperren" : "Lock"}</span>
                                </>
                              )}
                            </button>

                            <button
                              id="keyboard-shortcuts-btn"
                              onClick={() => setShowShortcutsModal(true)}
                              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[8px] font-mono rounded cursor-pointer transition flex items-center gap-1"
                              title={language === "de" ? "Tastaturkürzel anzeigen" : "Show keyboard shortcuts"}
                            >
                              <Keyboard className="h-2.5 w-2.5" />
                              <span>{language === "de" ? "Shortcuts" : "Shortcuts"}</span>
                            </button>

                            <button
                              id="trimmer-reset-all-btn"
                              onClick={handleResetAudioSettings}
                              className="px-1.5 py-0.5 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 text-[8px] font-mono rounded cursor-pointer transition flex items-center gap-1"
                              title={language === "de" ? "Alle Audio-Einstellungen auf Standardwerte zurücksetzen" : "Reset all audio settings to factory defaults"}
                            >
                              <RotateCcw className="h-2.5 w-2.5 text-rose-500" />
                              <span>{language === "de" ? "Zurücksetzen" : "Reset All"}</span>
                            </button>

                            <button
                              id="show-export-summary-btn"
                              onClick={() => setShowExportSummaryModal(true)}
                              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[8px] font-mono rounded cursor-pointer transition flex items-center gap-1"
                              title={language === "de" ? "Export-Zusammenfassung anzeigen" : "Show Export Summary"}
                            >
                              <Info className="h-2.5 w-2.5 text-cyan-400" />
                              <span>{language === "de" ? "Export-Zusammenfassung" : "Export Summary"}</span>
                            </button>
                            <span className="text-[9px] font-mono text-slate-400">
                              {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s / {audioDuration.toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        {/* Quick Trimming Presets Section */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                            {language === "de" ? "Schnell-Zuschnitt-Presets:" : "Quick Trimming Presets:"}
                          </span>
                          <div className="grid grid-cols-4 gap-1">
                            {[5, 10, 30].map((presetVal) => {
                              const isAvailable = audioDuration >= presetVal;
                              return (
                                <button
                                  key={presetVal}
                                  disabled={!isAvailable || isTrimLocked}
                                  onClick={() => {
                                    const targetEnd = Math.min(presetVal, audioDuration);
                                    setTrimStart(0);
                                    setTrimEnd(targetEnd);
                                    setPlayheadProgress(0);
                                    // Adjust fades if they exceed new bounds
                                    const maxAllowedFade = Math.min(1.0, parseFloat((targetEnd / 2).toFixed(1)));
                                    setFadeInDuration(maxAllowedFade);
                                    setFadeOutDuration(maxAllowedFade);
                                    setCroppedSuccessfully(false);
                                    handleAddLog({
                                      id: `preset-${presetVal}-${Date.now()}`,
                                      timestamp: new Date().toLocaleTimeString(),
                                      level: "INFO",
                                      source: "Audio Trimmer",
                                      message: `Applied standard speech crop preset: [0.0s - ${targetEnd.toFixed(1)}s] (${presetVal}s window).`
                                    });
                                  }}
                                  className={`py-1 rounded text-[9px] font-mono border cursor-pointer transition text-center disabled:opacity-35 disabled:cursor-not-allowed ${
                                    trimStart === 0 && Math.abs(trimEnd - Math.min(presetVal, audioDuration)) < 0.1
                                      ? "bg-fcb-red/20 border-fcb-red text-white font-bold animate-pulse"
                                      : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                                  }`}
                                >
                                  {presetVal}s
                                </button>
                              );
                            })}
                            <button
                              disabled={isTrimLocked}
                              onClick={() => {
                                setTrimStart(0);
                                setTrimEnd(audioDuration);
                                setPlayheadProgress(0);
                                setFadeInDuration(1.0);
                                setFadeOutDuration(1.0);
                                setCroppedSuccessfully(false);
                                handleAddLog({
                                  id: `preset-reset-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Audio Trimmer",
                                  message: `Reset trimming boundaries to original speech signal duration of ${audioDuration.toFixed(1)}s.`
                                });
                              }}
                              className={`py-1 rounded text-[9px] font-mono border cursor-pointer transition text-center disabled:opacity-35 disabled:cursor-not-allowed ${
                                trimStart === 0 && Math.abs(trimEnd - audioDuration) < 0.1
                                  ? "bg-fcb-gold/20 border-fcb-gold text-white font-bold"
                                  : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {language === "de" ? "Gesamt" : "Full Reset"}
                            </button>
                          </div>
                        </div>

                        {/* Automation Presets Section */}
                        <div id="automation-presets-panel" className="space-y-1.5 p-2 rounded border border-slate-900 bg-slate-900/40">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-950 pb-1.5">
                            <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                              <Sliders className="h-3 w-3 text-cyan-500 animate-pulse" />
                              {language === "de" ? "Automations-Presets (Lautstärke & Kompression):" : "Automation Presets (Gain & Compression):"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider">
                                {language === "de" ? "Kategorie:" : "Category:"}
                              </span>
                              <select
                                id="preset-category-dropdown"
                                value={selectedPresetCategory}
                                onChange={(e) => setSelectedPresetCategory(e.target.value)}
                                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[8.5px] font-mono outline-none transition cursor-pointer"
                              >
                                <option value="All">{language === "de" ? "Alle" : "All"}</option>
                                <option value="Podcast">Podcast</option>
                                <option value="Short-form Social">Short-form Social</option>
                                <option value="System Voice">System Voice</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-[8px] text-slate-500 leading-normal font-mono">
                            {language === "de"
                              ? "Kompressions- und Fade-Kurven sofort für gängige Audio-Typen optimieren."
                              : "Instantly apply standard compression & fade curves optimized for specific speech types."}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {AUTOMATION_PRESETS
                              .filter((p) => selectedPresetCategory === "All" || p.category === selectedPresetCategory)
                              .map((preset) => {
                                const isActive = activeAutomationPreset === preset.id;
                                const desc = language === "de" ? preset.descriptionDe : preset.description;
                                return (
                                  <button
                                    key={preset.id}
                                    disabled={isTrimLocked}
                                    onClick={() => {
                                      applyAutomationPreset(preset.id);
                                    }}
                                    className={`p-1.5 rounded text-[9.5px] font-mono border cursor-pointer transition text-left flex flex-col justify-between h-[52px] group disabled:opacity-35 disabled:cursor-not-allowed ${
                                      isActive
                                        ? preset.activeBg
                                        : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                                    }`}
                                    title={desc}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-bold truncate">{language === "de" ? preset.nameDe : preset.name}</span>
                                      <span className="text-[10px] group-hover:scale-110 transition-transform">{preset.icon}</span>
                                    </div>
                                    <span className="text-[7.5px] text-slate-500 group-hover:text-slate-400 truncate w-full block">
                                      {desc}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* Silence Detection and Highlights Section */}
                        <div className="bg-slate-900/40 p-2 rounded border border-slate-900/60 space-y-2">
                          <div className="grid grid-cols-2 gap-3 pb-1.5 border-b border-slate-950/50">
                            {/* Column 1: Silence Suggestions */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-amber-500 animate-pulse" />
                                  {language === "de" ? "Stille-Analysator" : "Silence Suggestion"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="range"
                                  min="10"
                                  max="55"
                                  step="5"
                                  value={silenceThreshold}
                                  onChange={(e) => {
                                    setSilenceThreshold(parseInt(e.target.value));
                                  }}
                                  className="flex-1 accent-amber-500 bg-slate-950 h-1 rounded cursor-pointer"
                                />
                                <span className="text-[9px] font-mono text-slate-300 font-bold min-w-[20px] text-right">
                                  {silenceThreshold}%
                                </span>
                              </div>
                            </div>

                            {/* Column 2: Noise Gate Threshold */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Volume2 className="h-3 w-3 text-rose-500" />
                                  {language === "de" ? "Noise Gate" : "Noise Gate"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  id="noise-gate-slider"
                                  type="range"
                                  min="0"
                                  max="40"
                                  step="2"
                                  value={noiseGateThreshold}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setNoiseGateThreshold(val);
                                    handleAddLog({
                                      id: `noise-gate-${Date.now()}`,
                                      timestamp: new Date().toLocaleTimeString(),
                                      level: "INFO",
                                      source: "Audio Engine",
                                      message: `Noise gate threshold floor adjusted to ${val}%. Waveform segments below ${val}% amplitude will be programmatically attenuated to 0% volume.`
                                    });
                                  }}
                                  className="flex-1 accent-rose-500 bg-slate-950 h-1 rounded cursor-pointer"
                                />
                                <span className="text-[9px] font-mono text-slate-300 font-bold min-w-[20px] text-right">
                                  {noiseGateThreshold}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[9px] font-mono">
                            <span className="text-slate-400">{language === "de" ? "Lautstärke normalisieren:" : "Normalize Audio Volume:"}</span>
                            <button
                              id="normalize-volume-btn"
                              onClick={() => {
                                const newNormalized = !isNormalized;
                                setIsNormalized(newNormalized);
                                handleAddLog({
                                  id: `normalize-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "INFO",
                                  source: "Audio Engine",
                                  message: newNormalized 
                                    ? `Volume normalization enabled. Programmatically adjusting peak levels of the buffer to 100% (Gain multiplier: x${(100 / Math.max(...heights)).toFixed(2)}).`
                                    : "Volume normalization disabled. Reverting to raw speech input amplitude levels."
                                });
                              }}
                              className={`px-2 py-0.5 rounded cursor-pointer transition text-[9px] font-mono border ${
                                isNormalized 
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-400"
                              }`}
                            >
                              {isNormalized ? (language === "de" ? "AKTIV" : "ENABLED") : (language === "de" ? "INAKTIV" : "DISABLED")}
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 bg-slate-950/75 p-1.5 rounded border border-slate-900 text-[9px] font-mono text-slate-300">
                            <div className="space-y-0.5">
                              <span className="text-[8px] text-slate-500 block uppercase">{language === "de" ? "Empfohlenes Sprachsegment:" : "Suggested Speech Window:"}</span>
                              <span className="text-amber-400 font-bold font-mono">
                                {suggestedStartS.toFixed(1)}s - {suggestedEndS.toFixed(1)}s 
                                <span className="text-slate-400 font-normal ml-1">({(suggestedEndS - suggestedStartS).toFixed(1)}s)</span>
                              </span>
                            </div>
                            <button
                              disabled={isTrimLocked}
                              onClick={() => {
                                setTrimStart(suggestedStartS);
                                setTrimEnd(suggestedEndS);
                                setPlayheadProgress(suggestedStartS);
                                setCroppedSuccessfully(false);
                                handleAddLog({
                                  id: `silence-crop-${Date.now()}`,
                                  timestamp: new Date().toLocaleTimeString(),
                                  level: "SUCCESS",
                                  source: "Silence Detection",
                                  message: `Applied optimal crop suggestion: [${suggestedStartS.toFixed(1)}s - ${suggestedEndS.toFixed(1)}s] based on ${silenceThreshold}% amplitude threshold.`
                                });
                              }}
                              className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 text-[9px] font-mono rounded cursor-pointer transition active:scale-95 whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed"
                            >
                              {language === "de" ? "Vorschlag anwenden" : "Apply Suggestion"}
                            </button>
                          </div>
                        </div>

                        {/* Multi-Band Dynamic Range Compressor Panel */}
                        <div id="multi-band-compressor-panel" className="bg-slate-900/50 p-2.5 rounded border border-slate-900/80 space-y-2.5">
                          {/* Header Block */}
                          <div className="flex items-center justify-between border-b border-slate-950/60 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Sliders className={`h-3.5 w-3.5 ${compressorEnabled ? "text-violet-400 animate-pulse" : "text-slate-500"}`} />
                              <span className="text-[10px] font-mono text-slate-200 uppercase tracking-wider font-bold">
                                {language === "de" ? "Multi-Band Dynamik-Kompressor" : "Multi-Band Dynamic Compressor"}
                              </span>
                            </div>
                            
                            {/* Master Toggle */}
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-mono text-slate-400">
                                {compressorEnabled ? (language === "de" ? "AKTIVIERT" : "COMPRESSION ACTIVE") : (language === "de" ? "BYPASS" : "BYPASS")}
                              </span>
                              <button
                                onClick={() => {
                                  const newVal = !compressorEnabled;
                                  setCompressorEnabled(newVal);
                                  handleAddLog({
                                    id: `comp-toggle-${Date.now()}`,
                                    timestamp: new Date().toLocaleTimeString(),
                                    level: newVal ? "SUCCESS" : "WARNING",
                                    source: "Audio Engine",
                                    message: newVal 
                                      ? "Multi-band dynamic range compressor engaged. Low, Mid, and High band signal levels will be compressed above thresholds to professional standards."
                                      : "Multi-band compressor bypassed. Reverting to linear raw audio dynamics."
                                  });
                                }}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${compressorEnabled ? "bg-violet-500" : "bg-slate-950 border border-slate-800"}`}
                              >
                                <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${compressorEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                          </div>

                          {/* 3-Band Selector Tabs */}
                          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded border border-slate-900">
                            {[
                              { id: "low", label: language === "de" ? "Bass (Tiefen)" : "Low Band (<250Hz)", color: "border-emerald-500/30 text-emerald-400" },
                              { id: "mid", label: language === "de" ? "Mitten (Sprache)" : "Mid Band (Speech)", color: "border-cyan-500/30 text-cyan-400" },
                              { id: "high", label: language === "de" ? "Sibilanz (Höhen)" : "High Band (>4kHz)", color: "border-purple-500/30 text-purple-400" }
                            ].map((band) => {
                              const isActive = compressorActiveBand === band.id;
                              return (
                                <button
                                  key={band.id}
                                  onClick={() => setCompressorActiveBand(band.id as any)}
                                  className={`py-1 px-1.5 rounded text-[8px] font-mono font-bold tracking-tight cursor-pointer transition text-center border ${
                                    isActive 
                                      ? "bg-slate-900 border-violet-500/80 text-violet-300 shadow-sm"
                                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  {band.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Active Band Sliders and Gain Reduction Indicator */}
                          <div className="bg-slate-950/50 p-2 rounded border border-slate-950/80 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Controls Column */}
                            <div className="space-y-2">
                              {/* Row 1: Ratio Slider */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[8px] font-mono">
                                  <span className="text-slate-400">{language === "de" ? "Verhältnis (Ratio):" : "Compression Ratio:"}</span>
                                  <span className="text-violet-400 font-bold">
                                    {compressorActiveBand === "low" ? compLowRatio.toFixed(1) : compressorActiveBand === "mid" ? compMidRatio.toFixed(1) : compHighRatio.toFixed(1)}:1
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="range"
                                    min="1.0"
                                    max="20.0"
                                    step="0.5"
                                    value={compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (compressorActiveBand === "low") setCompLowRatio(val);
                                      else if (compressorActiveBand === "mid") setCompMidRatio(val);
                                      else setCompHighRatio(val);
                                    }}
                                    disabled={!compressorEnabled}
                                    className="flex-1 accent-violet-500 bg-slate-950 h-1 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Threshold Slider */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[8px] font-mono">
                                  <span className="text-slate-400">{language === "de" ? "Schwelle (Threshold):" : "Threshold:"}</span>
                                  <span className="text-violet-400 font-bold">
                                    {compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold} dB
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="range"
                                    min="-40"
                                    max="0"
                                    step="1"
                                    value={compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (compressorActiveBand === "low") setCompLowThreshold(val);
                                      else if (compressorActiveBand === "mid") setCompMidThreshold(val);
                                      else setCompHighThreshold(val);
                                    }}
                                    disabled={!compressorEnabled}
                                    className="flex-1 accent-violet-500 bg-slate-950 h-1 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </div>
                              </div>

                              {/* Row 3: Makeup Gain Slider */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[8px] font-mono">
                                  <span className="text-slate-400">{language === "de" ? "Aufholverstärkung (Makeup):" : "Makeup Gain:"}</span>
                                  <span className="text-emerald-400 font-bold">
                                    +{compressorActiveBand === "low" ? compLowMakeup : compressorActiveBand === "mid" ? compMidMakeup : compHighMakeup} dB
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="range"
                                    min="0"
                                    max="12"
                                    step="0.5"
                                    value={compressorActiveBand === "low" ? compLowMakeup : compressorActiveBand === "mid" ? compMidMakeup : compHighMakeup}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (compressorActiveBand === "low") setCompLowMakeup(val);
                                      else if (compressorActiveBand === "mid") setCompMidMakeup(val);
                                      else setCompHighMakeup(val);
                                    }}
                                    disabled={!compressorEnabled}
                                    className="flex-1 accent-emerald-500 bg-slate-950 h-1 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Envelopes & Response Column */}
                            <div className="space-y-2 flex flex-col justify-between">
                              <div className="grid grid-cols-2 gap-2">
                                {/* Attack setting */}
                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-slate-400 block">{language === "de" ? "Ansprechzeit (Attack):" : "Attack:"}</span>
                                  <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded border border-slate-900">
                                    <input
                                      type="range"
                                      min="5"
                                      max="100"
                                      step="5"
                                      value={compressorActiveBand === "low" ? compLowAttack : compressorActiveBand === "mid" ? compMidAttack : compHighAttack}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (compressorActiveBand === "low") setCompLowAttack(val);
                                        else if (compressorActiveBand === "mid") setCompMidAttack(val);
                                        else setCompHighAttack(val);
                                      }}
                                      disabled={!compressorEnabled}
                                      className="flex-1 accent-violet-500 bg-slate-900 h-1 cursor-pointer"
                                    />
                                    <span className="text-[8px] font-mono text-slate-300 font-bold w-7 text-right">
                                      {compressorActiveBand === "low" ? compLowAttack : compressorActiveBand === "mid" ? compMidAttack : compHighAttack}ms
                                    </span>
                                  </div>
                                </div>

                                {/* Release setting */}
                                <div className="space-y-1">
                                  <span className="text-[8px] font-mono text-slate-400 block">{language === "de" ? "Abfallzeit (Release):" : "Release:"}</span>
                                  <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded border border-slate-900">
                                    <input
                                      type="range"
                                      min="50"
                                      max="500"
                                      step="10"
                                      value={compressorActiveBand === "low" ? compLowRelease : compressorActiveBand === "mid" ? compMidRelease : compHighRelease}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (compressorActiveBand === "low") setCompLowRelease(val);
                                        else if (compressorActiveBand === "mid") setCompMidRelease(val);
                                        else setCompHighRelease(val);
                                      }}
                                      disabled={!compressorEnabled}
                                      className="flex-1 accent-violet-500 bg-slate-900 h-1 cursor-pointer"
                                    />
                                    <span className="text-[8px] font-mono text-slate-300 font-bold w-8 text-right">
                                      {compressorActiveBand === "low" ? compLowRelease : compressorActiveBand === "mid" ? compMidRelease : compHighRelease}ms
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Live Compression Gain Reduction (GR) Meter */}
                              <div className="bg-slate-950/80 p-2 rounded border border-slate-900 space-y-1">
                                <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">{language === "de" ? "Pegelabschwächung (GR):" : "Gain Reduction (GR):"}</div>
                                {(() => {
                                  // Calculate simulated attenuation for GR meter
                                  const currentBarIdx = Math.min(23, Math.floor((playheadProgress / audioDuration) * 24));
                                  const rawBarHeight = processedHeights[currentBarIdx] || 0;
                                  
                                  let activeReduction = 0;
                                  if (isPlayingAudio && compressorEnabled && rawBarHeight > noiseGateThreshold) {
                                    const testAmp = rawBarHeight;
                                    let bandAmp = 0;
                                    let bandThreshold = 0;
                                    let bandRatio = 1.0;
                                    
                                    if (compressorActiveBand === "low") {
                                      bandAmp = 0.5 * testAmp;
                                      bandThreshold = compLowThreshold;
                                      bandRatio = compLowRatio;
                                    } else if (compressorActiveBand === "mid") {
                                      bandAmp = 0.3 * testAmp;
                                      bandThreshold = compMidThreshold;
                                      bandRatio = compMidRatio;
                                    } else {
                                      bandAmp = 0.2 * testAmp;
                                      bandThreshold = compHighThreshold;
                                      bandRatio = compHighRatio;
                                    }
                                    
                                    const getDb = (amp: number) => {
                                      if (amp <= 0.001) return -100;
                                      return 20 * Math.log10(amp / 100);
                                    };
                                    
                                    const bandDb = getDb(bandAmp);
                                    if (bandDb > bandThreshold) {
                                      activeReduction = bandDb - (bandThreshold + (bandDb - bandThreshold) / bandRatio);
                                    }
                                  }
                                  
                                  const widthPct = Math.min(100, (activeReduction / 12) * 100);
                                  
                                  return (
                                    <div className="flex items-center gap-1.5 w-full mt-0.5">
                                      {/* GR Bar starts from right and goes left */}
                                      <div className="flex-1 h-2 bg-slate-900 rounded-[1px] relative overflow-hidden flex justify-end">
                                        <div 
                                          className="h-full bg-amber-500/80 transition-all duration-75"
                                          style={{ width: `${isPlayingAudio ? widthPct : 0}%` }}
                                        />
                                      </div>
                                      <span className="text-[8px] text-amber-400 font-bold font-mono min-w-[32px] text-right">
                                        {isPlayingAudio && activeReduction > 0 ? `-${activeReduction.toFixed(1)} dB` : "0.0 dB"}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Column 3: Compression Curve Visual Chart */}
                            {(() => {
                              const T = compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold;
                              const R = compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio;
                              const M = compressorActiveBand === "low" ? compLowMakeup : compressorActiveBand === "mid" ? compMidMakeup : compHighMakeup;

                              const clampY = (yVal: number) => Math.max(5, Math.min(95, yVal));
                              const pyA = clampY(90 - (M / 52) * 80);
                              const pyB = clampY(90 - ((T + M + 40) / 52) * 80);
                              const pyC = clampY(90 - ((T - T / R + M + 40) / 52) * 80);
                              const pxB = 10 + ((T + 40) / 40) * 80;

                              // Live input / output coordinates
                              const currentBarIdx = Math.min(23, Math.floor((playheadProgress / audioDuration) * 24));
                              const rawBarHeight = processedHeights[currentBarIdx] || 0;
                              
                              let livePoint = null;
                              if (isPlayingAudio && rawBarHeight > noiseGateThreshold) {
                                const testAmp = rawBarHeight;
                                let bandAmp = 0;
                                if (compressorActiveBand === "low") {
                                  bandAmp = 0.5 * testAmp;
                                } else if (compressorActiveBand === "mid") {
                                  bandAmp = 0.3 * testAmp;
                                } else {
                                  bandAmp = 0.2 * testAmp;
                                }
                                
                                const getDb = (amp: number) => {
                                  if (amp <= 0.001) return -100;
                                  return 20 * Math.log10(amp / 100);
                                };
                                
                                const inputDb = Math.max(-40, Math.min(0, getDb(bandAmp)));
                                let outputDb = inputDb;
                                if (inputDb > T) {
                                  outputDb = T + (inputDb - T) / R;
                                }
                                outputDb += M;
                                
                                const livePx = 10 + ((inputDb + 40) / 40) * 80;
                                const livePy = clampY(90 - ((outputDb + 40) / 52) * 80);
                                livePoint = { px: livePx, py: livePy };
                              }

                              return (
                                <div id="compressor-curve-chart" className="space-y-1.5 flex flex-col justify-between">
                                  <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>{language === "de" ? "Kompressionskurve:" : "Compression Curve:"}</span>
                                    <span className="text-violet-400 font-bold uppercase">{compressorActiveBand} band</span>
                                  </div>
                                  
                                  <div className="flex-1 bg-slate-950 rounded border border-slate-900/60 p-1 flex items-center justify-center relative min-h-[110px]">
                                    <svg viewBox="0 0 100 100" className="w-full h-full max-h-[120px] select-none">
                                      {/* Background Grid */}
                                      {/* -20dB Vertical */}
                                      <line x1={50} y1={10} x2={50} y2={90} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
                                      <text x={50} y={97} fill="#475569" fontSize="5" textAnchor="middle" fontFamily="monospace">-20dB IN</text>

                                      {/* Input Axis Labels */}
                                      <text x={11} y={97} fill="#475569" fontSize="5" textAnchor="start" fontFamily="monospace">-40dB</text>
                                      <text x={89} y={97} fill="#475569" fontSize="5" textAnchor="end" fontFamily="monospace">0dB</text>

                                      {/* -20dB Horizontal */}
                                      <line x1={10} y1={59.23} x2={90} y2={59.23} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
                                      <text x={8} y={60.5} fill="#475569" fontSize="5" textAnchor="end" fontFamily="monospace">-20</text>

                                      {/* 0dB Horizontal */}
                                      <line x1={10} y1={28.46} x2={90} y2={28.46} stroke="#334155" strokeWidth="0.5" strokeDasharray="1,1" />
                                      <text x={8} y={30} fill="#64748b" fontSize="5" textAnchor="end" fontFamily="monospace">0dB</text>

                                      {/* +12dB Horizontal Top */}
                                      <text x={8} y={12} fill="#475569" fontSize="5" textAnchor="end" fontFamily="monospace">+12</text>
                                      
                                      {/* -40dB Horizontal Bottom */}
                                      <text x={8} y={91.5} fill="#475569" fontSize="5" textAnchor="end" fontFamily="monospace">-40</text>

                                      {/* Unity Line (Reference) */}
                                      <line x1={10} y1={90} x2={90} y2={28.46} stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2,2" />

                                      {/* Active Compression Curve Path */}
                                      <path 
                                        d={`M 10 ${pyA} L ${pxB} ${pyB} L 90 ${pyC}`} 
                                        fill="none" 
                                        stroke={compressorEnabled ? "#8b5cf6" : "#475569"} 
                                        strokeWidth={compressorEnabled ? "1.5" : "1"} 
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />

                                      {/* Knee Point Marker */}
                                      <circle 
                                        cx={pxB} 
                                        cy={pyB} 
                                        r="2" 
                                        fill={compressorEnabled ? "#a78bfa" : "#64748b"} 
                                        className={compressorEnabled ? "stroke-violet-900 stroke-[1px]" : ""}
                                      />
                                      
                                      {/* Live Point Indicator */}
                                      {livePoint && (
                                        <>
                                          {/* Horizontal guide */}
                                          <line 
                                            x1={10} 
                                            y1={livePoint.py} 
                                            x2={livePoint.px} 
                                            y2={livePoint.py} 
                                            stroke="rgba(139, 92, 246, 0.25)" 
                                            strokeWidth="0.5" 
                                            strokeDasharray="1,1" 
                                          />
                                          {/* Vertical guide */}
                                          <line 
                                            x1={livePoint.px} 
                                            y1={90} 
                                            x2={livePoint.px} 
                                            y2={livePoint.py} 
                                            stroke="rgba(139, 92, 246, 0.25)" 
                                            strokeWidth="0.5" 
                                            strokeDasharray="1,1" 
                                          />
                                          {/* Glowing point */}
                                          <circle 
                                            cx={livePoint.px} 
                                            cy={livePoint.py} 
                                            r="3" 
                                            className="fill-violet-400 opacity-60 animate-ping" 
                                          />
                                          <circle 
                                            cx={livePoint.px} 
                                            cy={livePoint.py} 
                                            r="1.75" 
                                            fill="#c084fc" 
                                            stroke="#ffffff" 
                                            strokeWidth="0.5" 
                                          />
                                        </>
                                      )}
                                    </svg>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Waveform Visualization + Vertical Peak DB Meter */}
                        <div className="flex gap-2.5 items-stretch h-14 w-full">
                          {/* Left: Waveform Visualization Wrapper */}
                          <div className="flex-1 relative">
                            {/* Floating Video Frame Preview Card */}
                            {(() => {
                              let activePreviewTime = playheadProgress;
                              let previewPositionPct = (playheadProgress / audioDuration) * 100;
                              let isPreviewVisible = isPlayingAudio; // visible when playing

                              if (activeDragHandle === "start") {
                                activePreviewTime = trimStart;
                                previewPositionPct = (trimStart / audioDuration) * 100;
                                isPreviewVisible = true;
                              } else if (activeDragHandle === "end") {
                                activePreviewTime = trimEnd;
                                previewPositionPct = (trimEnd / audioDuration) * 100;
                                isPreviewVisible = true;
                              } else if (isHoveringWaveform && hoveredTime !== null) {
                                activePreviewTime = hoveredTime;
                                previewPositionPct = (hoveredTime / audioDuration) * 100;
                                isPreviewVisible = true;
                              }

                              const activeFrame = getCapturedFrame(activePreviewTime, audioDuration);
                              let previewSource = language === "de" ? "ABSPIELEN" : "PLAYBACK";
                              if (activeDragHandle === "start") {
                                previewSource = language === "de" ? "ZUSCHNITT ANFANG" : "TRIM START";
                              } else if (activeDragHandle === "end") {
                                previewSource = language === "de" ? "ZUSCHNITT ENDE" : "TRIM END";
                              } else if (isHoveringWaveform) {
                                previewSource = language === "de" ? "SUCHEN" : "SCRUBBING";
                              }

                              return (
                                <AnimatePresence>
                                  {isPreviewVisible && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                      animate={{ opacity: 1, y: -4, scale: 1 }}
                                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                      transition={{ duration: 0.12 }}
                                      className="absolute bottom-full mb-1.5 z-50 pointer-events-none select-none"
                                      style={{
                                        left: `${previewPositionPct}%`,
                                        transform: "translateX(-50%)",
                                      }}
                                    >
                                      {/* Triangle Arrow pointing down */}
                                      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-slate-900 border-r border-b border-slate-800 z-10" />

                                      {/* Preview Frame Box */}
                                      <div className="w-56 bg-slate-900/95 border border-slate-800 rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-md text-[10px] text-slate-200">
                                        {/* Video Aspect Screen (16:10 for extra height) */}
                                        <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden border-b border-slate-800">
                                          <img 
                                            src={activeFrame.imageUrl} 
                                            alt={activeFrame.title} 
                                            className="w-full h-full object-cover opacity-90"
                                            referrerPolicy="no-referrer"
                                          />
                                          {/* Video overlays */}
                                          {/* Top left indicator */}
                                          <div className="absolute top-1.5 left-2 flex items-center gap-1 bg-slate-950/75 backdrop-blur-[2px] px-1.5 py-0.5 rounded-full border border-slate-800/45">
                                            <span className={`h-1.5 w-1.5 rounded-full ${previewSource.includes("PLAY") || previewSource.includes("ABSP") ? "bg-red-500 animate-pulse" : "bg-cyan-400 animate-ping"}`} />
                                            <span className="text-[7.5px] font-mono font-bold tracking-wider text-white uppercase">{previewSource}</span>
                                          </div>

                                          {/* Top right camera indicator */}
                                          <div className="absolute top-1.5 right-2 bg-slate-950/70 backdrop-blur-[2px] px-1 py-0.5 rounded text-[7px] font-mono text-slate-400">
                                            {activeFrame.cameraInfo}
                                          </div>

                                          {/* Camera viewfinder grids/corner brackets */}
                                          <div className="absolute inset-2 border-l border-t border-white/20 w-1.5 h-1.5 pointer-events-none" />
                                          <div className="absolute inset-y-2 right-2 border-r border-t border-white/20 w-1.5 h-1.5 pointer-events-none" />
                                          <div className="absolute inset-x-2 bottom-2 border-l border-b border-white/20 w-1.5 h-1.5 pointer-events-none" />
                                          <div className="absolute bottom-2 right-2 border-r border-b border-white/20 w-1.5 h-1.5 pointer-events-none" />

                                          {/* Timecode overlay centered at bottom */}
                                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-[2px] px-2 py-0.5 rounded border border-slate-800 text-[8px] font-mono text-fcb-gold tracking-widest font-bold shadow">
                                            {activeFrame.timecode}
                                          </div>
                                        </div>

                                        {/* Text Info Area */}
                                        <div className="p-2 space-y-0.5 bg-slate-950/50">
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-white text-[10.5px] truncate max-w-[130px]">{activeFrame.title}</h4>
                                            <span className="text-[8px] font-mono text-slate-400">FR: {activeFrame.frameNo}</span>
                                          </div>
                                          <p className="text-[8px] font-mono text-fcb-gold font-bold uppercase tracking-wide">{activeFrame.subtitle}</p>
                                          <p className="text-[8.5px] text-slate-400 leading-snug font-sans line-clamp-2 pt-0.5 border-t border-slate-900/60 mt-0.5">
                                            {activeFrame.description}
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              );
                            })()}

                            {/* Waveform Area */}
                            <div
                              ref={visualizerRef}
                              className="w-full h-full relative bg-slate-900/60 rounded border border-slate-900/80 overflow-hidden flex items-end justify-between px-2 py-1 select-none"
                              onMouseMove={handleWaveformMouseMove}
                              onMouseEnter={handleWaveformMouseEnter}
                              onMouseLeave={handleWaveformMouseLeave}
                            >
                              {/* 24-Bar Custom Waveform */}
                              {processedHeights.map((heightPct, idx) => {
                                const barTime = (idx / 24) * audioDuration;
                                const isInRange = barTime >= trimStart && barTime <= trimEnd;
                                const isPlayed = isPlayingAudio && playheadProgress >= barTime;
                                
                                // Check if bar falls into Fade In or Fade Out zone
                                const isFadeInZone = isInRange && barTime <= (trimStart + fadeInDuration);
                                const isFadeOutZone = isInRange && barTime >= (trimEnd - fadeOutDuration);

                                const isGated = heightPct < noiseGateThreshold;
                                const isSilent = heightPct < silenceThreshold;

                                let barColor = "#1e293b"; // Slate (Out of crop)
                                let opacity = "1.0";
                                
                                if (isGated) {
                                  barColor = "#475569"; // Gated slate gray
                                  opacity = isInRange ? "0.15" : "0.05";
                                } else if (isPlayed) {
                                  barColor = "#eab308"; // Gold (Playhead passed)
                                } else if (isInRange) {
                                  if (isSilent) {
                                    barColor = "#f59e0b"; // Warning amber/orange for active silence
                                    opacity = "0.4"; // dimmer opacity to represent silence
                                  } else if (isFadeInZone) {
                                    barColor = "#06b6d4"; // Cyan (Fade In volume ramp)
                                  } else if (isFadeOutZone) {
                                    barColor = "#a855f7"; // Purple/Magenta (Fade Out volume ramp)
                                  } else {
                                    barColor = "#dc2626"; // Red (Peak fully-unfaded volume)
                                  }
                                } else {
                                  // Out of active trim range
                                  if (isSilent) {
                                    opacity = "0.2";
                                  }
                                }

                                return (
                                  <div
                                    key={idx}
                                    className="w-[3%] rounded-t transition-colors duration-150 relative group"
                                    style={{
                                      height: `${heightPct}%`,
                                      backgroundColor: barColor,
                                      opacity: opacity
                                    }}
                                  >
                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-800 text-slate-300 text-[8px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none mb-1 z-30 whitespace-nowrap shadow-md">
                                      {heightPct}%{isGated ? " (GATED)" : isSilent ? " (SILENT)" : ""}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Moving Playhead Marker */}
                              {isPlayingAudio && (
                                <div
                                  className="absolute top-0 bottom-0 w-[1.5px] bg-fcb-gold z-10 transition-all duration-75"
                                  style={{
                                    left: `${(playheadProgress / audioDuration) * 100}%`
                                  }}
                                />
                              )}

                              {/* Left Trim Handle Visual Cover */}
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-slate-950/70 border-r border-slate-800 pointer-events-none"
                                style={{
                                  width: `${(trimStart / audioDuration) * 100}%`
                                }}
                              />

                              {/* Right Trim Handle Visual Cover */}
                              <div
                                className="absolute right-0 top-0 bottom-0 bg-slate-950/70 border-l border-slate-800 pointer-events-none"
                                style={{
                                  width: `${(1 - trimEnd / audioDuration) * 100}%`
                                }}
                              />

                              {/* Draggable Left Handle (trimStart) */}
                              <div
                                className={`absolute top-0 bottom-0 w-5 -ml-2.5 z-40 group flex items-center justify-center ${
                                  isTrimLocked ? "cursor-not-allowed" : "cursor-ew-resize"
                                }`}
                                style={{
                                  left: `${(trimStart / audioDuration) * 100}%`
                                }}
                                onMouseDown={handleStartDrag}
                                onTouchStart={handleStartDrag}
                                title={
                                  isTrimLocked
                                    ? language === "de"
                                      ? "Zuschnitt gesperrt (Sperre oben aufheben)"
                                      : "Trim locked (Unlock above to adjust)"
                                    : language === "de"
                                    ? "Zuschnitt-Anfang ziehen"
                                    : "Drag Trim Start"
                                }
                                id="trimmer-handle-start"
                              >
                                {/* Glowing Vertical Line */}
                                <div className={`w-[2px] h-full transition-colors ${
                                  isTrimLocked 
                                    ? "bg-slate-600 shadow-none" 
                                    : "bg-cyan-400 group-hover:bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.7)]"
                                }`} />
                                {/* Grab Handle Pill */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-6 rounded border flex flex-col gap-[1.5px] items-center justify-center shadow-lg transition-colors ${
                                  isTrimLocked
                                    ? "bg-slate-700 border-slate-800"
                                    : "bg-cyan-500 hover:bg-cyan-400 border-slate-950"
                                }`}>
                                  <span className={`w-0.5 h-1.5 rounded-full ${isTrimLocked ? "bg-slate-900/45" : "bg-slate-950/60"}`} />
                                  <span className={`w-0.5 h-1.5 rounded-full ${isTrimLocked ? "bg-slate-900/45" : "bg-slate-950/60"}`} />
                                </div>
                              </div>

                              {/* Draggable Right Handle (trimEnd) */}
                              <div
                                className={`absolute top-0 bottom-0 w-5 -ml-2.5 z-40 group flex items-center justify-center ${
                                  isTrimLocked ? "cursor-not-allowed" : "cursor-ew-resize"
                                }`}
                                style={{
                                  left: `${(trimEnd / audioDuration) * 100}%`
                                }}
                                onMouseDown={handleEndDrag}
                                onTouchStart={handleEndDrag}
                                title={
                                  isTrimLocked
                                    ? language === "de"
                                      ? "Zuschnitt gesperrt (Sperre oben aufheben)"
                                      : "Trim locked (Unlock above to adjust)"
                                    : language === "de"
                                    ? "Zuschnitt-Ende ziehen"
                                    : "Drag Trim End"
                                }
                                id="trimmer-handle-end"
                              >
                                {/* Glowing Vertical Line */}
                                <div className={`w-[2px] h-full transition-colors ${
                                  isTrimLocked
                                    ? "bg-slate-600 shadow-none"
                                    : "bg-purple-400 group-hover:bg-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.7)]"
                                }`} />
                                {/* Grab Handle Pill */}
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-6 rounded border flex flex-col gap-[1.5px] items-center justify-center shadow-lg transition-colors ${
                                  isTrimLocked
                                    ? "bg-slate-700 border-slate-800"
                                    : "bg-purple-500 hover:bg-purple-400 border-slate-950"
                                }`}>
                                  <span className={`w-0.5 h-1.5 rounded-full ${isTrimLocked ? "bg-slate-900/45" : "bg-slate-950/60"}`} />
                                  <span className={`w-0.5 h-1.5 rounded-full ${isTrimLocked ? "bg-slate-900/45" : "bg-slate-950/60"}`} />
                                </div>
                              </div>

                              {/* Visual Fade-In End Marker Line (Dashed Cyan) */}
                              {trimStart + fadeInDuration < trimEnd && (
                                <div
                                  className="absolute top-0 bottom-0 border-r border-dashed border-cyan-400/80 z-20 pointer-events-none flex flex-col justify-start"
                                  style={{
                                    left: `${((trimStart + fadeInDuration) / audioDuration) * 100}%`
                                  }}
                                >
                                  <span className="text-[7px] text-cyan-400 font-mono px-1 py-0.5 bg-slate-950/90 rounded border border-cyan-500/20 mt-1 whitespace-nowrap scale-90 origin-left">
                                    ▲ {language === "de" ? "Fade-In Ende" : "Fade End"}
                                  </span>
                                </div>
                              )}

                              {/* Visual Fade-Out Start Marker Line (Dashed Purple) */}
                              {trimEnd - fadeOutDuration > trimStart && (
                                <div
                                  className="absolute top-0 bottom-0 border-l border-dashed border-purple-400/80 z-20 pointer-events-none flex flex-col justify-start"
                                  style={{
                                    left: `${((trimEnd - fadeOutDuration) / audioDuration) * 100}%`
                                  }}
                                >
                                  <span className="text-[7px] text-purple-400 font-mono px-1 py-0.5 bg-slate-950/90 rounded border border-purple-500/20 mt-1 whitespace-nowrap scale-90 origin-right ml-[-45px]">
                                    ▼ {language === "de" ? "Fade-Out Start" : "Fade Start"}
                                  </span>
                                </div>
                              )}

                              {/* Visual Suggested Start Line (Dotted Amber) */}
                              {suggestedStartS > 0 && suggestedStartS < audioDuration && (
                                <div
                                  className="absolute top-0 bottom-0 border-r-2 border-dotted border-amber-500/50 z-20 pointer-events-none flex flex-col justify-end"
                                  style={{
                                    left: `${(suggestedStartS / audioDuration) * 100}%`
                                  }}
                                >
                                  <span className="text-[6.5px] text-amber-400 font-mono px-1 py-0.5 bg-slate-950/90 rounded border border-amber-500/20 mb-1 whitespace-nowrap scale-90 origin-left">
                                    ✂ {language === "de" ? "Opt. Start" : "Opt. Start"} ({suggestedStartS.toFixed(1)}s)
                                  </span>
                                </div>
                              )}

                              {/* Visual Suggested End Line (Dotted Amber) */}
                              {suggestedEndS > 0 && suggestedEndS < audioDuration && (
                                <div
                                  className="absolute top-0 bottom-0 border-l-2 border-dotted border-amber-500/50 z-20 pointer-events-none flex flex-col justify-end"
                                  style={{
                                    left: `${(suggestedEndS / audioDuration) * 100}%`
                                  }}
                                >
                                  <span className="text-[6.5px] text-amber-400 font-mono px-1 py-0.5 bg-slate-950/90 rounded border border-amber-500/20 mb-1 whitespace-nowrap scale-90 origin-right ml-[-45px]">
                                    ✂ {language === "de" ? "Opt. Ende" : "Opt. End"} ({suggestedEndS.toFixed(1)}s)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Vertical Decibel Peak Meter */}
                          {(() => {
                            const currentBarIdx = Math.min(23, Math.floor((playheadProgress / audioDuration) * 24));
                            const currentBarHeight = processedHeights[currentBarIdx] || 0;

                            let realTimeAmp = 0;
                            if (isPlayingAudio) {
                              const elapsedInTrim = playheadProgress - trimStart;
                              const trimDuration = trimEnd - trimStart;
                              let envelopeMultiplier = 1.0;
                              
                              if (elapsedInTrim < fadeInDuration && fadeInDuration > 0) {
                                envelopeMultiplier = elapsedInTrim / fadeInDuration;
                              } else if (elapsedInTrim > trimDuration - fadeOutDuration && fadeOutDuration > 0) {
                                envelopeMultiplier = (trimDuration - elapsedInTrim) / fadeOutDuration;
                              }
                              
                              // Apply Noise Gate
                              if (currentBarHeight < noiseGateThreshold) {
                                realTimeAmp = 0;
                              } else {
                                realTimeAmp = currentBarHeight;
                                // Apply Silence dampening
                                if (currentBarHeight < silenceThreshold) {
                                  realTimeAmp *= 0.15;
                                }
                                realTimeAmp *= envelopeMultiplier;

                                if (compressorEnabled) {
                                  // Split realTimeAmp into simulated Low/Mid/High band components
                                  const ampLow = 0.5 * realTimeAmp;
                                  const ampMid = 0.3 * realTimeAmp;
                                  const ampHigh = 0.2 * realTimeAmp;
                                  
                                  const getDb = (amp: number) => {
                                    if (amp <= 0.001) return -100;
                                    return 20 * Math.log10(amp / 100); // normalized against 100% full scale
                                  };
                                  
                                  // Compute compressed amplitudes
                                  let finalLow = ampLow;
                                  const dbLow = getDb(ampLow);
                                  if (dbLow > compLowThreshold) {
                                    const excess = dbLow - compLowThreshold;
                                    const compressedExcess = excess / compLowRatio;
                                    finalLow = Math.pow(10, (compLowThreshold + compressedExcess + compLowMakeup) / 20) * 100;
                                  } else {
                                    finalLow = ampLow * Math.pow(10, compLowMakeup / 20);
                                  }
                                  
                                  let finalMid = ampMid;
                                  const dbMid = getDb(ampMid);
                                  if (dbMid > compMidThreshold) {
                                    const excess = dbMid - compMidThreshold;
                                    const compressedExcess = excess / compMidRatio;
                                    finalMid = Math.pow(10, (compMidThreshold + compressedExcess + compMidMakeup) / 20) * 100;
                                  } else {
                                    finalMid = ampMid * Math.pow(10, compMidMakeup / 20);
                                  }
                                  
                                  let finalHigh = ampHigh;
                                  const dbHigh = getDb(ampHigh);
                                  if (dbHigh > compHighThreshold) {
                                    const excess = dbHigh - compHighThreshold;
                                    const compressedExcess = excess / compHighRatio;
                                    finalHigh = Math.pow(10, (compHighThreshold + compressedExcess + compHighMakeup) / 20) * 100;
                                  } else {
                                    finalHigh = ampHigh * Math.pow(10, compHighMakeup / 20);
                                  }
                                  
                                  realTimeAmp = finalLow + finalMid + finalHigh;
                                }
                              }
                            }

                            // Convert to decibels (0 to 100 max scale)
                            const currentDb = realTimeAmp > 0 ? 20 * Math.log10(realTimeAmp / 100) : -40; // -40dB floor
                            const meterFillPct = Math.max(0, Math.min(100, ((currentDb - (-40)) / 40) * 100));

                            return (
                              <div 
                                id="decibel-peak-meter"
                                className="w-14 bg-slate-900/40 border border-slate-900/80 rounded p-1 flex items-center gap-1.5 justify-between relative select-none"
                                title={language === "de" ? "Echtzeit-Pegelanzeige (dB)" : "Real-time Decibel Peak Meter"}
                              >
                                {/* DB Ticks & Labels */}
                                <div className="flex flex-col justify-between h-full text-[6.5px] font-mono text-slate-500 text-right leading-none py-0.5 w-[14px]">
                                  <span>0dB</span>
                                  <span>-12</span>
                                  <span>-24</span>
                                  <span>-40</span>
                                </div>

                                {/* Meter Bar Track */}
                                <div className="flex-1 h-full bg-slate-950/80 rounded-[2px] border border-slate-900 relative overflow-hidden flex flex-col justify-end">
                                  {/* LED Meter Fill */}
                                  <div 
                                    className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 rounded-b-[1px] transition-all duration-75 origin-bottom"
                                    style={{ height: `${isPlayingAudio ? meterFillPct : 0}%` }}
                                  />
                                  {/* Peak Floating Tick */}
                                  {isPlayingAudio && meterFillPct > 0 && (
                                    <div 
                                      className="absolute left-0 right-0 h-[1.5px] bg-white shadow-sm z-10"
                                      style={{ bottom: `calc(${meterFillPct}% - 1.5px)` }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Waveform Color Legend */}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-slate-950 p-1.5 rounded border border-slate-900/60 text-[8px] font-mono text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            <span>{language === "de" ? "Peak-Signal" : "Peak Signal"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span>Fade In</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            <span>Fade Out</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 opacity-40" />
                            <span>{language === "de" ? "Detektierte Stille" : "Silent Zones"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            <span>{language === "de" ? "Wiedergabe" : "Playhead"}</span>
                          </div>
                        </div>

                        {/* Trimming Sliders */}
                        <div className="space-y-2 text-[10px] border-b border-slate-900 pb-2">
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                              <span>{language === "de" ? "Startzeit" : "Trim Start"}</span>
                              <span className="text-slate-300 font-bold">{trimStart.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={(trimEnd - 0.5).toFixed(1)}
                              step="0.1"
                              value={trimStart}
                              onChange={(e) => {
                                const val = parseFloat(parseFloat(e.target.value).toFixed(1));
                                setTrimStart(val);
                                setPlayheadProgress(val);
                              }}
                              className="w-full accent-fcb-red bg-slate-900 h-1 rounded cursor-pointer"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                              <span>{language === "de" ? "Endzeit" : "Trim End"}</span>
                              <span className="text-slate-300 font-bold">{trimEnd.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min={(trimStart + 0.5).toFixed(1)}
                              max={audioDuration.toFixed(1)}
                              step="0.1"
                              value={trimEnd}
                              onChange={(e) => {
                                const val = parseFloat(parseFloat(e.target.value).toFixed(1));
                                setTrimEnd(val);
                                if (playheadProgress > val) {
                                  setPlayheadProgress(trimStart);
                                }
                              }}
                              className="w-full accent-fcb-red bg-slate-900 h-1 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Fade Settings Controllers */}
                        <div className="bg-slate-950/40 p-2 rounded border border-slate-900 grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 font-mono text-[8.5px]">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                {language === "de" ? "Einblendung" : "Fade-In Duration"}
                              </span>
                              <span className="text-cyan-400 font-bold font-mono">{fadeInDuration.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max={Math.min(3.0, parseFloat(((trimEnd - trimStart) / 2).toFixed(1)))}
                              step="0.1"
                              value={fadeInDuration}
                              onChange={(e) => {
                                setFadeInDuration(parseFloat(parseFloat(e.target.value).toFixed(1)));
                              }}
                              className="w-full accent-cyan-400 bg-slate-900 h-1 rounded cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-slate-400 font-mono text-[8.5px]">
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                {language === "de" ? "Ausblendung" : "Fade-Out Duration"}
                              </span>
                              <span className="text-purple-400 font-bold font-mono">{fadeOutDuration.toFixed(1)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max={Math.min(3.0, parseFloat(((trimEnd - trimStart) / 2).toFixed(1)))}
                              step="0.1"
                              value={fadeOutDuration}
                              onChange={(e) => {
                                setFadeOutDuration(parseFloat(parseFloat(e.target.value).toFixed(1)));
                              }}
                              className="w-full accent-purple-400 bg-slate-900 h-1 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Audio Export Metadata Panel */}
                        {(() => {
                          const estBytes = 44 + Math.floor((trimEnd - trimStart) * 16000) * 2;
                          const estSizeStr = estBytes >= 1024 * 1024 
                            ? `${(estBytes / (1024 * 1024)).toFixed(2)} MB`
                            : `${(estBytes / 1024).toFixed(2)} KB`;
                          
                          return (
                            <div 
                              id="trimmer-metadata-panel"
                              className="bg-slate-950/70 border border-slate-900 rounded p-2 text-[9px] font-mono text-slate-400 space-y-1"
                            >
                              <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-900 pb-1 mb-1 flex items-center justify-between">
                                <span>{language === "de" ? "Signal-Metadaten" : "Signal & File Metadata"}</span>
                                <span className="text-cyan-400">WAV PCM</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                <div className="flex justify-between">
                                  <span>{language === "de" ? "Abtastrate:" : "Sample Rate:"}</span>
                                  <span className="text-slate-200 font-bold">16,000 Hz</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{language === "de" ? "Bittiefe:" : "Bit Depth:"}</span>
                                  <span className="text-slate-200 font-bold">16-bit Mono</span>
                                </div>
                                <div className="flex justify-between col-span-2 border-t border-slate-900/40 pt-1 mt-0.5">
                                  <span>{language === "de" ? "Berechnete Größe:" : "Est. File Size:"}</span>
                                  <span className="text-amber-400 font-bold">{estSizeStr} <span className="text-slate-500 font-normal">({estBytes.toLocaleString()} Bytes)</span></span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Playback & Action Buttons */}
                        <div className="grid grid-cols-4 gap-1 pt-0.5">
                          <button
                            onClick={() => {
                              if (isPlayingAudio) {
                                setIsPlayingAudio(false);
                              } else {
                                setPlayheadProgress(trimStart);
                                setIsPlayingAudio(true);
                              }
                            }}
                            className="py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md text-[9.5px] font-mono text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            {isPlayingAudio ? (
                              <>
                                <div className="h-2 w-2 bg-yellow-500 rounded-sm animate-pulse" />
                                <span>{language === "de" ? "Pause" : "Pause"}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 text-fcb-gold" />
                                <span>{language === "de" ? "Spielen" : "Play Trim"}</span>
                              </>
                            )}
                          </button>

                          <button
                            id="replay-selection-btn"
                            onClick={() => {
                              setPlayheadProgress(trimStart);
                              setIsPlayingAudio(true);
                              handleAddLog({
                                id: `replay-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "INFO",
                                source: "Audio Engine",
                                message: `Replay selection triggered: playback instantly reset to start of trim bounds (${trimStart.toFixed(1)}s) and playing to ${trimEnd.toFixed(1)}s.`
                              });
                            }}
                            className="py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md text-[9.5px] font-mono text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition"
                            title={language === "de" ? "Wiederholen von Trim-Anfang" : "Replay from Trim Start"}
                          >
                            <RotateCcw className="h-3 w-3 text-cyan-400" />
                            <span>{language === "de" ? "Wdh." : "Replay"}</span>
                          </button>

                          <button
                            onClick={() => {
                              setCroppedSuccessfully(true);
                              setIsPlayingAudio(false);
                              handleAddLog({
                                id: `trim-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "SUCCESS",
                                source: "Audio Trimmer",
                                message: `Grounded speech signal cropped with fades applied: Trimmed to ${(trimEnd - trimStart).toFixed(1)}s window. Fade-in: ${fadeInDuration.toFixed(1)}s, Fade-out: ${fadeOutDuration.toFixed(1)}s.`
                              });
                            }}
                            className={`py-1 border border-slate-800 rounded-md text-[9.5px] font-mono flex items-center justify-center gap-1 cursor-pointer transition ${
                              croppedSuccessfully 
                                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                                : "bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white"
                            }`}
                          >
                            <Scissors className="h-3 w-3 text-cyan-400" />
                            <span>{croppedSuccessfully ? (language === "de" ? "Beschnitten" : "Cropped!") : (language === "de" ? "Zuschneiden" : "Crop")}</span>
                          </button>

                          <button
                            id="export-trimmed-audio-btn"
                            onClick={exportTrimmedAudio}
                            className="py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-white rounded-md text-[9.5px] font-mono flex items-center justify-center gap-1 cursor-pointer transition"
                            title={language === "de" ? "Als .wav-Datei exportieren" : "Export as .wav file"}
                          >
                            <Download className="h-3 w-3 text-amber-500" />
                            <span>{language === "de" ? "Exportieren" : "Export WAV"}</span>
                          </button>
                        </div>

                        {/* Apply & Execute */}
                        <button
                          onClick={() => {
                            handleAddLog({
                              id: `voice-run-${Date.now()}`,
                              timestamp: new Date().toLocaleTimeString(),
                              level: "INFO",
                              source: "Audio Engine",
                              message: `Compiling cropped speech signal... Running voice parser on [${trimStart.toFixed(1)}s - ${trimEnd.toFixed(1)}s] window with volume ramps: Fade In (${fadeInDuration.toFixed(1)}s), Fade Out (${fadeOutDuration.toFixed(1)}s).`
                            });
                            executeVoiceCommand(transcript);
                            
                            // Reset state
                            setAudioDuration(0);
                            setTranscript("");
                            setCroppedSuccessfully(false);
                          }}
                          className="w-full py-1.5 bg-gradient-to-r from-fcb-red to-red-600 hover:from-red-600 hover:to-red-700 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer active:scale-98 transition"
                        >
                          <Check className="h-3 w-3" />
                          <span>{language === "de" ? "Zuschnitt anwenden & Starten" : "Apply & Execute"}</span>
                        </button>

                        {/* Keyboard Shortcuts Helper Modal (contained within trimmer container) */}
                        <AnimatePresence>
                          {showShortcutsModal && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs z-40 p-4 flex flex-col justify-between border border-slate-800 rounded-lg"
                            >
                              <div>
                                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
                                  <span className="text-[10px] font-mono font-bold text-fcb-gold flex items-center gap-1.5 uppercase tracking-wide">
                                    <Keyboard className="h-3.5 w-3.5 text-fcb-gold" />
                                    {language === "de" ? "Tastaturkürzel-Hilfe" : "Keyboard Shortcuts Helper"}
                                  </span>
                                  <button
                                    onClick={() => setShowShortcutsModal(false)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer transition"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="space-y-2 pb-2">
                                  {/* Row 1 */}
                                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900/40 pb-1.5">
                                    <span className="text-slate-400">{language === "de" ? "Abspielen / Pause" : "Play / Pause Trim Segment"}</span>
                                    <div className="flex items-center gap-1">
                                      <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Space</kbd>
                                    </div>
                                  </div>

                                  {/* Row 2 */}
                                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900/40 pb-1.5">
                                    <span className="text-slate-400">{language === "de" ? "Zuschnitt-Grenzen verschieben" : "Nudge Trim Boundaries"}</span>
                                    <div className="flex items-center gap-1">
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">←</kbd>
                                      <span className="text-slate-600">/</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">→</kbd>
                                      <span className="text-[9px] text-slate-500 ml-1">(0.1s)</span>
                                    </div>
                                  </div>

                                  {/* Row 3 */}
                                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900/40 pb-1.5">
                                    <span className="text-slate-400">{language === "de" ? "Als .wav-Datei exportieren" : "Export as WAV File"}</span>
                                    <div className="flex items-center gap-1">
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Ctrl</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">E</kbd>
                                      <span className="text-slate-500 text-[8px]">{language === "de" ? "oder" : "or"}</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">⌘</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">E</kbd>
                                    </div>
                                  </div>

                                  {/* Row 4: Undo */}
                                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900/40 pb-1.5">
                                    <span className="text-slate-400">{language === "de" ? "Änderung rückgängig" : "Undo Trim/Fade Change"}</span>
                                    <div className="flex items-center gap-1">
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Ctrl</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Z</kbd>
                                      <span className="text-slate-500 text-[8px]">{language === "de" ? "oder" : "or"}</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">⌘</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Z</kbd>
                                    </div>
                                  </div>

                                  {/* Row 5: Redo */}
                                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-900/40 pb-1.5">
                                    <span className="text-slate-400">{language === "de" ? "Änderung wiederholen" : "Redo Trim/Fade Change"}</span>
                                    <div className="flex items-center gap-1">
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Ctrl</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Y</kbd>
                                      <span className="text-slate-500 text-[8px]">{language === "de" ? "oder" : "or"}</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">⌘</kbd>
                                      <span className="text-slate-600 text-[8px]">+</span>
                                      <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-300 font-sans shadow-sm">Y</kbd>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end border-t border-slate-900 pt-2.5">
                                <button
                                  onClick={() => setShowShortcutsModal(false)}
                                  className="px-3 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-mono cursor-pointer transition"
                                >
                                  {language === "de" ? "Schließen" : "Dismiss"}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Export Summary Modal */}
                        <AnimatePresence>
                          {showExportSummaryModal && (() => {
                            const totalDuration = Math.max(0, trimEnd - trimStart);
                            const sampleRate = 16000;
                            const bitDepth = 16;
                            const bitrate = 256; // kbps
                            const numSamples = Math.floor(totalDuration * sampleRate);
                            const fileSizeBytes = 44 + numSamples * 2;
                            const fileSizeKb = (fileSizeBytes / 1024).toFixed(2);

                            const calcReduction = (threshold: number, ratio: number) => {
                              if (!compressorEnabled) return 0.0;
                              if (0 > threshold) {
                                const excess = 0 - threshold;
                                const compressedExcess = excess / ratio;
                                return excess - compressedExcess;
                              }
                              return 0.0;
                            };

                            const lowRed = calcReduction(compLowThreshold, compLowRatio);
                            const midRed = calcReduction(compMidThreshold, compMidRatio);
                            const highRed = calcReduction(compHighThreshold, compHighRatio);

                            const heights = [35, 20, 55, 30, 85, 45, 40, 75, 95, 55, 30, 65, 85, 45, 75, 30, 55, 20, 45, 65, 30, 55, 40, 20];
                            const maxVal = Math.max(...heights);
                            const normMultiplier = isNormalized ? (100 / maxVal) : 1.0;
                            const origHeights = heights.map(h => Math.min(100, Math.round(h * normMultiplier)));
                            const compHeights = heights.map((h, idx) => {
                              const processedHeight = Math.min(100, Math.round(h * normMultiplier));
                              const inputDb = (processedHeight / 100) * 40 - 40;

                              let threshold = 0;
                              let ratio = 1;
                              let makeup = 0;

                              if (idx < 8) {
                                threshold = compLowThreshold;
                                ratio = compLowRatio;
                                makeup = compLowMakeup;
                              } else if (idx < 16) {
                                threshold = compMidThreshold;
                                ratio = compMidRatio;
                                makeup = compMidMakeup;
                              } else {
                                threshold = compHighThreshold;
                                ratio = compHighRatio;
                                makeup = compHighMakeup;
                              }

                              if (compressorEnabled) {
                                if (inputDb > threshold) {
                                  const excess = inputDb - threshold;
                                  const compressedExcess = excess / ratio;
                                  let outputDb = threshold + compressedExcess;
                                  outputDb += makeup;
                                  return Math.max(2, Math.min(100, Math.round(((outputDb + 40) / 40) * 100)));
                                } else {
                                  let outputDb = inputDb + makeup;
                                  return Math.max(2, Math.min(100, Math.round(((outputDb + 40) / 40) * 100)));
                                }
                              }
                              return processedHeight;
                            });

                            return (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-x-4 top-4 bottom-4 md:inset-x-8 md:top-8 md:bottom-8 bg-slate-950/98 backdrop-blur-xs z-40 p-4 md:p-5 flex flex-col justify-between border border-slate-800 rounded-lg shadow-2xl"
                                id="export-summary-modal"
                              >
                                {/* Title Header Bar (Persistent) */}
                                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3 shrink-0">
                                  <span className="text-[10.5px] font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                                    <Info className="h-4 w-4 text-cyan-400" />
                                    {language === "de" ? "Export-Parameter & Audio-Profil" : "Calculated Export Summary"}
                                  </span>
                                  <button
                                    onClick={() => setShowExportSummaryModal(false)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer transition"
                                    id="export-summary-close-x"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Main Two-Column View Layout (Scrollable container) */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1 select-none scrollbar-thin flex-1 pb-2">
                                  
                                  {/* Left Column (md:col-span-6): File Parameters, Presets, Waveforms */}
                                  <div className="md:col-span-6 space-y-3">
                                    {/* Basic calculated parameters */}
                                    <div className="grid grid-cols-2 gap-2 text-[9.5px] font-mono">
                                      <div className="bg-slate-900/50 p-2 rounded border border-slate-900 flex flex-col justify-between">
                                        <span className="text-slate-500 text-[8px] uppercase">{language === "de" ? "Bittiefe & Format" : "Bit Depth & Format"}</span>
                                        <span className="text-slate-200 font-bold">{bitDepth}-bit Mono PCM (WAV)</span>
                                      </div>
                                      <div className="bg-slate-900/50 p-2 rounded border border-slate-900 flex flex-col justify-between">
                                        <span className="text-slate-500 text-[8px] uppercase">{language === "de" ? "Abtastrate" : "Sample Rate"}</span>
                                        <span className="text-slate-200 font-bold">16,000 Hz (16 kHz)</span>
                                      </div>
                                      <div className="bg-slate-900/50 p-2 rounded border border-slate-900 flex flex-col justify-between">
                                        <span className="text-slate-500 text-[8px] uppercase">{language === "de" ? "Exakte Bitrate" : "Exact Bit-rate"}</span>
                                        <span className="text-slate-200 font-bold">{bitrate} kbps</span>
                                      </div>
                                      <div className="bg-slate-900/50 p-2 rounded border border-slate-900 flex flex-col justify-between">
                                        <span className="text-slate-500 text-[8px] uppercase">{language === "de" ? "Endgültige Dauer" : "Total File Duration"}</span>
                                        <span className="text-emerald-400 font-bold">{totalDuration.toFixed(2)}s</span>
                                      </div>
                                      <div className="bg-slate-900/50 p-2 rounded border border-slate-900 flex flex-col justify-between col-span-2">
                                        <span className="text-slate-500 text-[8px] uppercase">{language === "de" ? "Geschätzte Dateigröße" : "Estimated File Size"}</span>
                                        <span className="text-amber-400 font-bold">{fileSizeKb} KB ({fileSizeBytes.toLocaleString()} Bytes)</span>
                                      </div>
                                    </div>

                                    {/* Gain Reduction Profile Summary Table */}
                                    <div className="space-y-1.5 text-left">
                                      <span className="text-[8.5px] font-mono text-cyan-400/80 font-bold uppercase tracking-wider block text-left">
                                        {language === "de" ? "Angewendetes Pegelreduktionsprofil:" : "Applied Gain Reduction Profile:"}
                                      </span>
                                      <div className="border border-slate-900 rounded overflow-hidden">
                                        <table className="w-full text-left font-mono text-[8.5px]">
                                          <thead>
                                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                              <th className="p-1">{language === "de" ? "Band" : "Band"}</th>
                                              <th className="p-1">{language === "de" ? "Schw. (dB)" : "Thresh"}</th>
                                              <th className="p-1">{language === "de" ? "Verh." : "Ratio"}</th>
                                              <th className="p-1">{language === "de" ? "Gain" : "Makeup"}</th>
                                              <th className="p-1 text-right">{language === "de" ? "Max Red." : "Max Red."}</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-950 bg-slate-950/40">
                                            <tr className="text-slate-300">
                                              <td className="p-1 font-bold text-cyan-500">{language === "de" ? "Tief (Bass)" : "Low (<250Hz)"}</td>
                                              <td className="p-1">{compLowThreshold} dB</td>
                                              <td className="p-1">{compLowRatio.toFixed(1)}:1</td>
                                              <td className="p-1">+{compLowMakeup} dB</td>
                                              <td className="p-1 text-right text-rose-400 font-semibold">
                                                {compressorEnabled ? `-${lowRed.toFixed(1)} dB` : "0.0 dB"}
                                              </td>
                                            </tr>
                                            <tr className="text-slate-300">
                                              <td className="p-1 font-bold text-violet-400">{language === "de" ? "Mitte (Speech)" : "Mid (250-4k)"}</td>
                                              <td className="p-1">{compMidThreshold} dB</td>
                                              <td className="p-1">{compMidRatio.toFixed(1)}:1</td>
                                              <td className="p-1">+{compMidMakeup} dB</td>
                                              <td className="p-1 text-right text-rose-400 font-semibold">
                                                {compressorEnabled ? `-${midRed.toFixed(1)} dB` : "0.0 dB"}
                                              </td>
                                            </tr>
                                            <tr className="text-slate-300">
                                              <td className="p-1 font-bold text-amber-500">{language === "de" ? "Hoch (Sibil.)" : "High (>4kHz)"}</td>
                                              <td className="p-1">{compHighThreshold} dB</td>
                                              <td className="p-1">{compHighRatio.toFixed(1)}:1</td>
                                              <td className="p-1">+{compHighMakeup} dB</td>
                                              <td className="p-1 text-right text-rose-400 font-semibold">
                                                {compressorEnabled ? `-${highRed.toFixed(1)} dB` : "0.0 dB"}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                      {!compressorEnabled && (
                                        <p className="text-[7.5px] text-rose-400 italic font-mono text-left">
                                          * {language === "de" 
                                            ? "Hinweis: Der Kompressor ist derzeit umgangen/deaktiviert." 
                                            : "Note: Multiband Compressor is currently bypassed/disabled."}
                                        </p>
                                      )}
                                    </div>

                                    {/* Presets and custom saving */}
                                    <div className="space-y-2 p-2 rounded border border-slate-900 bg-slate-900/40 text-left" id="export-presets-container">
                                      <div className="flex items-center justify-between border-b border-slate-950 pb-1 flex-wrap gap-2">
                                        <span className="text-[8.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                          <Save className="h-3 w-3 text-cyan-500 animate-pulse" />
                                          {language === "de" ? "Export-Presets:" : "Export Presets:"}
                                        </span>
                                        <div className="flex items-center gap-1.5 py-0.5 px-1.5 bg-slate-900 border border-slate-800 rounded">
                                          <FolderPlus className="h-3 w-3 text-emerald-400 shrink-0" />
                                          <input
                                            type="text"
                                            value={sidebarCategoryCreateValue}
                                            onChange={(e) => setSidebarCategoryCreateValue(e.target.value)}
                                            placeholder={language === "de" ? "Neue Hauptkategorie..." : "New Top-Level Category..."}
                                            className="flex-1 bg-transparent text-slate-300 text-[8px] font-mono outline-none min-w-[150px]"
                                            maxLength={24}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleCreateCustomTopLevelCategory(sidebarCategoryCreateValue);
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleCreateCustomTopLevelCategory(sidebarCategoryCreateValue)}
                                            disabled={!sidebarCategoryCreateValue.trim()}
                                            className={`p-0.5 rounded cursor-pointer ${sidebarCategoryCreateValue.trim() ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-600'}`}
                                            title="Add category"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Two-column layout: Left Sidebar for Category Management, Right side for Tree and Presets */}
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1" id="presets-layout-grid" data-splitpane="true">
                                        {/* Left Column: Dedicated Hierarchical Folder Tree Sidebar (md:col-span-4) */}
                                        <div className="md:col-span-4 flex flex-col space-y-2 border-r border-slate-950/40 pr-2 text-left" id="presets-category-sidebar">
                                          <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-500 font-bold uppercase select-none pb-1 border-b border-slate-950/40 flex-wrap gap-1">
                                            <span className="flex items-center gap-1 text-slate-400">
                                              <Folder className="h-3 w-3 text-cyan-500" />
                                              <span>{language === "de" ? "Verzeichnisse:" : "Folder Tree:"}</span>
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => setShowSeasonMatchdaySidebar(!showSeasonMatchdaySidebar)}
                                                className={`flex items-center gap-0.5 px-1 py-[1px] rounded text-[6.5px] font-mono border transition cursor-pointer select-none font-bold ${
                                                  showSeasonMatchdaySidebar
                                                    ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-400"
                                                    : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300"
                                                }`}
                                                title={language === "de" ? "Saison & Spieltag Kategorien umschalten" : "Toggle Season & Matchday categories"}
                                              >
                                                <Filter className="h-2 w-2 shrink-0" />
                                                <span>{language === "de" ? "Tags" : "Tags"}</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setInTreeCategoryCreatePath("");
                                                  setInTreeCategoryInputValue("");
                                                }}
                                                className="text-cyan-500 hover:text-cyan-400 flex items-center gap-0.5 font-bold transition cursor-pointer text-[6.5px]"
                                                title={language === "de" ? "Hauptkategorie erstellen" : "Create root category"}
                                              >
                                                <FolderPlus className="h-3 w-3" />
                                                <span>{language === "de" ? "+ HAUPTKATEGORIE" : "+ ROOT CATEGORY"}</span>
                                              </button>
                                            </div>
                                          </div>

                                          {/* Inline top-level category creator in sidebar */}
                                          {inTreeCategoryCreatePath === "" && (
                                            <div className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-950 border border-slate-800 rounded animate-in fade-in slide-in-from-top-1 duration-150">
                                              <input
                                                type="text"
                                                value={inTreeCategoryInputValue}
                                                onChange={(e) => setInTreeCategoryInputValue(e.target.value)}
                                                placeholder={language === "de" ? "Neue Hauptkat..." : "New root cat..."}
                                                className="flex-1 bg-slate-950 border border-slate-900 text-slate-300 text-[8px] rounded px-1 py-0.5 font-mono outline-none"
                                                maxLength={18}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    handleCreateInTreeCategory("");
                                                  } else if (e.key === "Escape") {
                                                    setInTreeCategoryCreatePath(null);
                                                  }
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleCreateInTreeCategory("")}
                                                className="p-0.5 text-emerald-400 hover:bg-slate-900 rounded cursor-pointer"
                                              >
                                                <Check className="h-3 w-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setInTreeCategoryCreatePath(null)}
                                                className="p-0.5 text-rose-400 hover:bg-slate-900 rounded cursor-pointer"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                          )}

                                          {/* Category pill items */}
                                          <div className="flex flex-col gap-1 max-h-[190px] overflow-y-auto scrollbar-thin pr-1">
                                            {/* Standard Category: All */}
                                            {(() => {
                                              const isSel = exportPresetCategoryFilter === "All";
                                              const count = exportPresets.length;
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={() => setExportPresetCategoryFilter("All")}
                                                  onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (draggedPresetId || (draggedFolderPath && draggedFolderPath.includes("/"))) {
                                                      setDragOverFolder("All");
                                                    }
                                                  }}
                                                  onDragLeave={() => {
                                                    setDragOverFolder(null);
                                                  }}
                                                  onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDragOverFolder(null);
                                                    if (draggedPresetId) {
                                                      const movingIds = selectedPresetIds.includes(draggedPresetId)
                                                        ? selectedPresetIds
                                                        : [draggedPresetId];
                                                      handleBulkMovePresets(movingIds, "");
                                                    } else if (draggedFolderPath && draggedFolderPath.includes("/")) {
                                                      handleMoveFolder(draggedFolderPath, "");
                                                    }
                                                  }}
                                                  className={`w-full text-left px-2 py-1.5 rounded text-[7.5px] font-mono font-bold flex items-center justify-between transition cursor-pointer select-none border ${
                                                    isSel
                                                      ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                                                      : dragOverFolder === "All"
                                                        ? "bg-cyan-950/60 border-cyan-400/80 text-cyan-300 scale-[1.01] shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                                        : "bg-slate-950/60 border-slate-955 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <LayoutGrid className="h-3 w-3 text-cyan-500 shrink-0" />
                                                    <span className="truncate">{language === "de" ? "Alle Verzeichnisse" : "All Directories"}</span>
                                                  </div>
                                                  <span className={`text-[6.5px] px-1 py-[0.5px] rounded font-bold ${
                                                    isSel ? "bg-cyan-500/30 text-cyan-200" : "bg-slate-900 text-slate-600"
                                                  }`}>
                                                    {count}
                                                  </span>
                                                </button>
                                              );
                                            })()}

                                            {/* Sidebar Folder Tree rendering */}
                                            {(() => {
                                              // Ensure "Technical" and "Creative" are at least existing as root nodes.
                                              const allPaths = Array.from(new Set(["Technical", "Creative", ...customCategoryPaths]));
                                              const sidebarRootNode = buildPresetTree(exportPresets, allPaths);
                                              return (
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                  
                                                  {renderFolderNode(sidebarRootNode, 0)}
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setInTreeCategoryCreatePath("");
                                                      setInTreeCategoryInputValue("");
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 mt-1 rounded text-[7.5px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer select-none border border-dashed border-slate-800/80 text-slate-500 hover:text-cyan-400 hover:bg-slate-900/60 hover:border-slate-700"
                                                  >
                                                    <FolderPlus className="h-3 w-3" />
                                                    {language === "de" ? "Neue Hauptkategorie erstellen" : "Create Root Category"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={handleAutoSortPresets}
                                                    className="w-full text-left px-2 py-1.5 mt-1 rounded text-[7.5px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer select-none border border-slate-800/80 text-cyan-500 hover:text-cyan-400 hover:bg-slate-900/60 hover:border-slate-700 bg-cyan-950/20"
                                                  >
                                                    <FolderSync className="h-3 w-3" />
                                                    {language === "de" ? "Presets automatisch sortieren" : "Auto-Sort Presets"}
                                                  </button>
                                                </div>
                                              );
                                            })()}
</div>
{/* Season & Matchday Tag Filters */}
                                          {showSeasonMatchdaySidebar && (() => {
                                            const uniqueSeasons = Array.from(new Set(exportPresets.flatMap(p => {
                                              if (Array.isArray(p.seasons)) return p.seasons;
                                              if (p.season) return p.season.split(",").map((s: string) => s.trim());
                                              return [];
                                            }).filter(Boolean))) as string[];

                                            const uniqueMatchdays = Array.from(new Set(exportPresets.flatMap(p => {
                                              if (Array.isArray(p.matchdays)) return p.matchdays;
                                              if (p.matchday) return p.matchday.split(",").map((m: string) => m.trim());
                                              return [];
                                            }).filter(Boolean))) as string[];
                                            
                                            if (uniqueSeasons.length === 0 && uniqueMatchdays.length === 0) return null;
                                            
                                            return (
                                              <div className="space-y-2 mt-3 pt-3 border-t border-slate-950/40 text-left" id="sidebar-tags-filters">
                                                {/* Season Filters */}
                                                {uniqueSeasons.length > 0 && (
                                                  <div className="space-y-1">
                                                    <span className="text-[6.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                                                      {language === "de" ? "Filter nach Saison:" : "Filter by Season:"}
                                                    </span>
                                                    <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto scrollbar-thin pr-1">
                                                      {uniqueSeasons.map((season) => {
                                                        const isSel = activeSeasonFilter === season;
                                                        const count = exportPresets.filter(p => {
                                                          const seasons = Array.isArray(p.seasons)
                                                            ? p.seasons
                                                            : (p.season ? p.season.split(",").map((s: string) => s.trim()) : []);
                                                          return seasons.includes(season);
                                                        }).length;
                                                        return (
                                                          <button
                                                            key={season}
                                                            type="button"
                                                            onClick={() => setActiveSeasonFilter(isSel ? null : season)}
                                                            className={`w-full text-left px-2 py-1 rounded text-[7px] font-mono font-bold flex items-center justify-between transition cursor-pointer select-none border ${
                                                              isSel
                                                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                                                                : "bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                                                            }`}
                                                          >
                                                            <div className="flex items-center gap-1.5 truncate">
                                                              <Calendar className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                                              <span className="truncate">{season}</span>
                                                            </div>
                                                            <span className={`text-[6px] px-1 py-[0.5px] rounded font-bold ${
                                                              isSel ? "bg-amber-500/30 text-amber-200" : "bg-slate-900 text-slate-600"
                                                            }`}>
                                                              {count}
                                                            </span>
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Matchday Filters */}
                                                {uniqueMatchdays.length > 0 && (
                                                  <div className="space-y-1 mt-2">
                                                    <span className="text-[6.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                                                      {language === "de" ? "Filter nach Spieltag:" : "Filter by Matchday:"}
                                                    </span>
                                                    <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto scrollbar-thin pr-1">
                                                      {uniqueMatchdays.map((matchday) => {
                                                        const isSel = activeMatchdayFilter === matchday;
                                                        const count = exportPresets.filter(p => {
                                                          const matchdays = Array.isArray(p.matchdays)
                                                            ? p.matchdays
                                                            : (p.matchday ? p.matchday.split(",").map((m: string) => m.trim()) : []);
                                                          return matchdays.includes(matchday);
                                                        }).length;
                                                        return (
                                                          <button
                                                            key={matchday}
                                                            type="button"
                                                            onClick={() => setActiveMatchdayFilter(isSel ? null : matchday)}
                                                            className={`w-full text-left px-2 py-1 rounded text-[7px] font-mono font-bold flex items-center justify-between transition cursor-pointer select-none border ${
                                                              isSel
                                                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                                                                : "bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                                                            }`}
                                                          >
                                                            <div className="flex items-center gap-1.5 truncate">
                                                              <Tag className="h-2.5 w-2.5 text-cyan-500 shrink-0" />
                                                              <span className="truncate">{matchday}</span>
                                                            </div>
                                                            <span className={`text-[6px] px-1 py-[0.5px] rounded font-bold ${
                                                              isSel ? "bg-cyan-500/30 text-cyan-200" : "bg-slate-900 text-slate-600"
                                                            }`}>
                                                              {count}
                                                            </span>
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Clear Tags Filter button */}
                                                {(activeSeasonFilter || activeMatchdayFilter) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setActiveSeasonFilter(null);
                                                      setActiveMatchdayFilter(null);
                                                    }}
                                                    className="w-full mt-2 text-center py-1 rounded text-[7px] font-mono font-bold text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/50 hover:bg-rose-900/30 transition cursor-pointer"
                                                  >
                                                    {language === "de" ? "Tag-Filter aufheben" : "Clear Tag Filters"}
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        {/* Right Column: Search, Active Folder Tree / Presets, Preset Saving (md:col-span-8) */}
                                        <div className="md:col-span-8 flex flex-col space-y-2" id="presets-main-content">
                                          {/* Search Input Bar */}
                                          <div className="relative" id="export-presets-search-container">
                                            <input
                                              type="text"
                                              value={exportPresetSearchQuery}
                                              onChange={(e) => setExportPresetSearchQuery(e.target.value)}
                                              placeholder={language === "de" ? "Suchen nach Name, Kategorie oder Metadaten (z.B. comp, dry, fade, gate, 12)..." : "Search presets by name, category or metadata (e.g., comp, dry, fade, gate, 12)..."}
                                              className="w-full bg-slate-950 border border-slate-900 rounded pl-7 pr-6 py-1 text-[8.5px] font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition"
                                            />
                                            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
                                            {exportPresetSearchQuery && (
                                              <button
                                                onClick={() => setExportPresetSearchQuery("")}
                                                className="absolute right-1.5 top-1.5 text-slate-500 hover:text-white hover:bg-slate-900 p-0.5 rounded cursor-pointer transition"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            )}
                                          </div>
                                          {/* Batch Apply (Filtered) Bar */}
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg" id="export-presets-batch-apply">
                                            <div className="flex items-center gap-1.5 w-full sm:flex-1">
                                              <Copy className="h-3.5 w-3.5 text-emerald-400" />
                                              <span className="text-[8px] font-mono text-slate-300 font-bold uppercase tracking-wider whitespace-nowrap">
                                                {language === "de" ? "Batch Apply (Gefiltert):" : "Batch Apply (Filtered):"}
                                              </span>
                                              <select
                                                value={batchApplyPresetId}
                                                onChange={(e) => setBatchApplyPresetId(e.target.value)}
                                                className="flex-1 min-w-0 bg-slate-900 border border-slate-800 text-slate-200 text-[8px] rounded px-1.5 py-1 font-mono outline-none"
                                              >
                                                <option value="">{language === "de" ? "-- Preset wählen --" : "-- Select Preset --"}</option>
                                                {exportPresets.map(p => (
                                                  <option key={p.id} value={p.id}>{p.category ? `${p.category}/` : ""}{p.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={handleBatchApplyPreset}
                                              disabled={!batchApplyPresetId}
                                              className="w-full sm:w-auto px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded text-[8px] font-mono flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0"
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                              <span>{language === "de" ? "Auf alle anwenden" : "Apply to All"}</span>
                                            </button>
                                          </div>

                                          {/* Real-time Preset Statistics Panel */}
                                          {(() => {
                                            const selectedStatsPreset = batchApplyPresetId
                                              ? exportPresets.find(p => p.id === batchApplyPresetId)
                                              : selectedPresetIds.length === 1
                                                ? exportPresets.find(p => p.id === selectedPresetIds[0])
                                                : null;

                                            if (!selectedStatsPreset) return null;

                                            // Calculate approximated stats based on the preset's DSP settings
                                            const avgRatio = ((selectedStatsPreset.compLowRatio || 1) + (selectedStatsPreset.compMidRatio || 1) + (selectedStatsPreset.compHighRatio || 1)) / 3;
                                            const avgReduction = selectedStatsPreset.compressorEnabled ? 
                                              ((selectedStatsPreset.compLowThreshold || 0) + (selectedStatsPreset.compMidThreshold || 0) + (selectedStatsPreset.compHighThreshold || 0)) / 3 * -0.15 * avgRatio : 0;
                                            const peakGain = selectedStatsPreset.compressorEnabled ?
                                              Math.max(selectedStatsPreset.compLowMakeup || 0, selectedStatsPreset.compMidMakeup || 0, selectedStatsPreset.compHighMakeup || 0) : 0;
                                            const ratioFreq = selectedStatsPreset.compressorEnabled ? 
                                              `${avgRatio.toFixed(1)}:1 @ ${Math.abs(avgReduction * 2).toFixed(0)}Hz` : "Bypassed";

                                            return (
                                              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 space-y-2 shadow-inner animate-in fade-in duration-200">
                                                <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                                                  <Activity className="h-3.5 w-3.5" />
                                                  <span>{language === "de" ? "Echtzeit-Statistiken (Ausgewähltes Preset):" : "Real-time Statistics (Selected Preset):"}</span>
                                                  <span className="text-slate-300 ml-1 truncate max-w-[200px] border-b border-slate-700 pb-0.5">{selectedStatsPreset.name}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <div className="bg-slate-950/80 p-2 rounded border border-slate-900 flex flex-col justify-between hover:border-cyan-900/50 transition">
                                                    <span className="text-slate-500 text-[7px] uppercase font-bold tracking-widest">{language === "de" ? "Ø Reduktions-Gain" : "Avg Reduction Gain"}</span>
                                                    <div className="flex items-end gap-1 mt-1">
                                                      <span className="text-rose-400 font-bold text-[11px] leading-none">{avgReduction < 0 ? avgReduction.toFixed(2) : "0.00"}</span>
                                                      <span className="text-rose-400/60 text-[7px] mb-0.5 font-bold">dB</span>
                                                    </div>
                                                  </div>
                                                  <div className="bg-slate-950/80 p-2 rounded border border-slate-900 flex flex-col justify-between hover:border-cyan-900/50 transition">
                                                    <span className="text-slate-500 text-[7px] uppercase font-bold tracking-widest">{language === "de" ? "Spitzen-dB-Gain" : "Peak dB Gain"}</span>
                                                    <div className="flex items-end gap-1 mt-1">
                                                      <span className="text-emerald-400 font-bold text-[11px] leading-none">+{peakGain.toFixed(1)}</span>
                                                      <span className="text-emerald-400/60 text-[7px] mb-0.5 font-bold">dB</span>
                                                    </div>
                                                  </div>
                                                  <div className="bg-slate-950/80 p-2 rounded border border-slate-900 flex flex-col justify-between hover:border-cyan-900/50 transition">
                                                    <span className="text-slate-500 text-[7px] uppercase font-bold tracking-widest">{language === "de" ? "Komp.-Ratio-Frequenz" : "Comp Ratio Frequency"}</span>
                                                    <div className="flex items-end gap-1 mt-1">
                                                      <span className="text-cyan-400 font-bold text-[11px] leading-none">{ratioFreq}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Advanced Analytics Toggle */}
                                                <div className="flex justify-end mt-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
                                                    className="text-[7.5px] font-mono text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition"
                                                  >
                                                    <BarChart3 className="h-3 w-3" />
                                                    {showAdvancedAnalytics 
                                                      ? (language === "de" ? "Erweiterte Analyse ausblenden" : "Hide Advanced Analytics") 
                                                      : (language === "de" ? "Erweiterte Analyse anzeigen" : "Show Advanced Analytics")}
                                                  </button>
                                                </div>

                                                {/* Advanced Analytics View */}
                                                {showAdvancedAnalytics && (
                                                  <div className="bg-slate-950/60 rounded border border-slate-900/60 p-2 mt-2 space-y-2">
                                                    <span className="text-[7.5px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                                                      {language === "de" ? "Gain-Reduktion (Letzte 100 Zyklen)" : "Gain Reduction Distribution (Last 100 Cycles)"}
                                                    </span>
                                                    <div className="h-[80px] w-full">
                                                      <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                          data={Array.from({ length: 20 }).map((_, i) => ({
                                                            cycle: `C${i * 5}`,
                                                            reduction: selectedStatsPreset.compressorEnabled 
                                                              ? Math.max(0, (Math.sin(i * 0.5) * 0.5 + 0.5) * Math.abs(avgReduction) * 1.5 + Math.random() * 2) 
                                                              : 0
                                                          }))}
                                                          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
                                                        >
                                                          <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                                                          <XAxis dataKey="cycle" hide />
                                                          <YAxis 
                                                            tick={{ fontSize: 7, fill: '#64748b' }} 
                                                            axisLine={false} 
                                                            tickLine={false}
                                                          />
                                                          <Tooltip 
                                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '8px', borderRadius: '4px' }}
                                                            itemStyle={{ color: '#fb7185' }}
                                                            formatter={(value) => [`-${Number(value).toFixed(1)} dB`, 'Reduction']}
                                                            labelStyle={{ display: 'none' }}
                                                          />
                                                          <Bar dataKey="reduction" fill="#fb7185" radius={[2, 2, 0, 0]} maxBarSize={15} />
                                                        </BarChart>
                                                      </ResponsiveContainer>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[7px] font-mono text-slate-500">
                                                      <span>{language === "de" ? "Zyklus 0" : "Cycle 0"}</span>
                                                      <span>{language === "de" ? "Zyklus 100" : "Cycle 100"}</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}

                                          {/* Selection Helper Bar & Bulk Editing Panel */}
                                          {selectedPresetIds.length > 0 && (
                                            <div className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-3 space-y-3 shadow-lg" id="export-presets-bulk-panel">
                                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="bg-cyan-500/15 p-1 rounded">
                                                    <Layers className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                                                  </div>
                                                  <div>
                                                    <h4 className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wide">
                                                      {language === "de" ? "Massenbearbeitung" : "Bulk Preset Editing"}
                                                    </h4>
                                                    <p className="text-[7.5px] font-mono text-slate-400">
                                                      {language === "de"
                                                        ? `${selectedPresetIds.length} von ${exportPresets.length} Presets ausgewählt`
                                                        : `${selectedPresetIds.length} of ${exportPresets.length} presets selected`}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const visible = getFilteredPresets();
                                                      const visibleIds = visible.map(p => p.id);
                                                      const allSelected = visibleIds.every(id => selectedPresetIds.includes(id));
                                                      if (allSelected) {
                                                        // Deselect visible
                                                        setSelectedPresetIds(prev => prev.filter(id => !visibleIds.includes(id)));
                                                      } else {
                                                        // Select all visible
                                                        setSelectedPresetIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                                                      }
                                                    }}
                                                    className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-[7px] font-mono font-bold cursor-pointer transition select-none"
                                                  >
                                                    {(() => {
                                                      const visible = getFilteredPresets();
                                                      const visibleIds = visible.map(p => p.id);
                                                      const allSelected = visibleIds.every(id => selectedPresetIds.includes(id));
                                                      if (allSelected) {
                                                        return language === "de" ? "Filterauswahl aufheben" : "Deselect Filtered";
                                                      } else {
                                                        return language === "de" ? "Alle gefilterten wählen" : "Select All Filtered";
                                                      }
                                                    })()}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedPresetIds([])}
                                                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer hover:bg-slate-800 transition"
                                                    title={language === "de" ? "Auswahl aufheben" : "Clear selection"}
                                                  >
                                                    <X className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {/* 1. Status Section */}
                                                <div className="space-y-1.5 bg-slate-950/40 p-2 rounded border border-slate-900/60">
                                                  <span className="text-[7.5px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                                                    {language === "de" ? "Status festlegen:" : "Apply Status:"}
                                                  </span>
                                                  <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className="text-[7px] font-mono text-slate-500 uppercase font-bold">{language === "de" ? "Toggle Status:" : "Toggle Status:"}</span>
                                                    <select
                                                      onChange={(e) => {
                                                        if (e.target.value) {
                                                          handleBulkSetStatus(e.target.value);
                                                          e.target.value = "";
                                                        }
                                                      }}
                                                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 text-slate-300 text-[7.5px] rounded px-1.5 py-0.5 font-mono outline-none cursor-pointer"
                                                    >
                                                      <option value="">{language === "de" ? "-- Schnellauswahl --" : "-- Quick Select --"}</option>
                                                      <option value="Draft">{language === "de" ? "Entwurf" : "Draft"}</option>
                                                      <option value="Needs Work">{language === "de" ? "Überarbeiten" : "Needs Work"}</option>
                                                      <option value="Approved">{language === "de" ? "Freigegeben" : "Approved"}</option>
                                                      {customStatuses.map(cs => (
                                                        <option key={cs.name} value={cs.name}>{cs.name}</option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleBulkSetStatus("Draft")}
                                                      className="px-1.5 py-0.5 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 text-slate-400 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition"
                                                    >
                                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                      {language === "de" ? "Entwurf" : "Draft"}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleBulkSetStatus("Needs Work")}
                                                      className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition"
                                                    >
                                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                      {language === "de" ? "Überarbeiten" : "Needs Work"}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleBulkSetStatus("Approved")}
                                                      className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition"
                                                    >
                                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                      {language === "de" ? "Freigegeben" : "Approved"}
                                                    </button>

                                                    {/* Custom Statuses */}
                                                    {customStatuses.map((cs) => (
                                                      <button
                                                        key={cs.name}
                                                        type="button"
                                                        onClick={() => handleBulkSetStatus(cs.name)}
                                                        className="px-1.5 py-0.5 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition border"
                                                        style={{
                                                          backgroundColor: `${cs.color}15`,
                                                          borderColor: `${cs.color}25`,
                                                          color: cs.color
                                                        }}
                                                      >
                                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cs.color }} />
                                                        {cs.name}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>

                                                {/* 2. Compressor Settings Section */}
                                                <div className="space-y-1.5 bg-slate-950/40 p-2 rounded border border-slate-900/60 flex flex-col justify-between">
                                                  <div>
                                                    <span className="text-[7.5px] font-mono text-slate-400 uppercase font-bold tracking-wider block mb-1">
                                                      {language === "de" ? "Kompressor-Schalter:" : "Compressor Switch:"}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleBulkSetCompressorEnabled(true)}
                                                        className="px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition"
                                                      >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                                        {language === "de" ? "Aktivieren" : "Enable"}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleBulkSetCompressorEnabled(false)}
                                                        className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded text-[7.5px] font-mono flex items-center gap-1 cursor-pointer transition"
                                                      >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                                        {language === "de" ? "Umgehen" : "Bypass"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="pt-1.5 border-t border-slate-900/40 mt-1">
                                                    <button
                                                      type="button"
                                                      onClick={handleBulkApplyActiveDsp}
                                                      className="w-full px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[7.5px] font-mono flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.01]"
                                                      title={language === "de" ? "Kopiert alle aktiven Schieberegler-DSP-Werte auf die ausgewählten Presets" : "Copies all current slider-based DSP parameters to selected presets"}
                                                    >
                                                      <Sliders className="h-2.5 w-2.5" />
                                                      <span>
                                                        {language === "de" ? "Aktive DSP-Werte auf alle übertragen" : "Apply Active DSP to Selected"}
                                                      </span>
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* 3. Category Settings Section */}
                                                <div className="space-y-1.5 bg-slate-950/40 p-2 rounded border border-slate-900/60">
                                                  <span className="text-[7.5px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                                                    {language === "de" ? "Kategorie festlegen:" : "Apply Category:"}
                                                  </span>
                                                  <div className="flex items-center gap-1.5 mb-1.5">
                                                    <select
                                                      onChange={(e) => {
                                                        if (e.target.value) {
                                                          handleBulkSetCategory(e.target.value);
                                                          e.target.value = "";
                                                        }
                                                      }}
                                                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 text-slate-300 text-[7.5px] rounded px-1.5 py-0.5 font-mono outline-none cursor-pointer"
                                                    >
                                                      <option value="">{language === "de" ? "-- Kategorie wählen --" : "-- Select Category --"}</option>
                                                      {Array.from(new Set(exportPresets.map(p => (p.category || "") as string).filter(Boolean))).map((cat) => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  <div className="pt-1.5 mt-1 border-t border-slate-900/40 flex">
                                                    <div className="flex w-full items-center gap-1.5">
                                                      <input
                                                        type="text"
                                                        id="bulk-category-input"
                                                        placeholder={language === "de" ? "Neue Kategorie..." : "New category..."}
                                                        className="flex-1 bg-slate-950 border border-slate-900 text-slate-300 text-[7.5px] rounded px-1 py-0.5 font-mono outline-none"
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter") {
                                                            const val = (e.target as HTMLInputElement).value;
                                                            if (val) {
                                                              handleBulkSetCategory(val);
                                                              (e.target as HTMLInputElement).value = "";
                                                            }
                                                          }
                                                        }}
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const input = document.getElementById("bulk-category-input") as HTMLInputElement;
                                                          if (input && input.value) {
                                                            handleBulkSetCategory(input.value);
                                                            input.value = "";
                                                          }
                                                        }}
                                                        className="px-1.5 py-0.5 bg-fcb-red hover:bg-red-600 text-white rounded text-[7.5px] font-mono cursor-pointer transition-all"
                                                      >
                                                        {language === "de" ? "Verschieben" : "Move"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Scrollable, high-density card grid for active presets */}
                                          <div className="flex flex-col flex-1 min-h-[300px] max-h-[390px] bg-slate-950/40 border border-slate-900 rounded-lg p-2.5 space-y-2 text-left" id="export-presets-active-grid-container">
                                            {/* Header showing active folder location and preset count */}
                                            <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-[8px] font-mono select-none">
                                              <div className="flex items-center gap-1.5 text-slate-300">
                                                <FolderOpen className="h-3.5 w-3.5 text-cyan-500 fill-cyan-500/10" />
                                                <span className="font-bold uppercase tracking-wider">{language === "de" ? "Aktiv:" : "Active:"}</span>
                                                <span className="text-cyan-400 bg-cyan-950/40 px-1 rounded-sm border border-cyan-900/30 font-bold max-w-[200px] truncate" title={exportPresetCategoryFilter}>
                                                  {exportPresetCategoryFilter === "All" 
                                                    ? (language === "de" ? "Alle Verzeichnisse" : "All Directories") 
                                                    : exportPresetCategoryFilter}
                                                </span>
                                              </div>
                                              {/* Action to create a new folder under current directory */}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setInTreeCategoryCreatePath(exportPresetCategoryFilter === "All" ? "" : exportPresetCategoryFilter);
                                                  setInTreeCategoryInputValue("");
                                                }}
                                                className="text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer font-bold text-[7.5px]"
                                                title={language === "de" ? "Unterordner in diesem Verzeichnis erstellen" : "Create subfolder in this directory"}
                                              >
                                                <FolderPlus className="h-3 w-3" />
                                                <span>{language === "de" ? "+ NEUER ORDNER" : "+ NEW FOLDER"}</span>
                                              </button>
                                            </div>

                                            {/* Subfolder Creation Inline Form in Right Column if active */}
                                            {inTreeCategoryCreatePath !== null && inTreeCategoryCreatePath !== "" && inTreeCategoryCreatePath === exportPresetCategoryFilter && (
                                              <div className="flex items-center gap-1.5 py-1 px-1.5 bg-slate-950 border border-slate-800 rounded animate-in fade-in duration-150">
                                                <span className="text-[7.5px] font-mono text-slate-500">{language === "de" ? "In Ordner:" : "In folder:"} {exportPresetCategoryFilter.split("/").pop()}</span>
                                                <input
                                                  type="text"
                                                  value={inTreeCategoryInputValue}
                                                  onChange={(e) => setInTreeCategoryInputValue(e.target.value)}
                                                  placeholder={language === "de" ? "Ordnername..." : "Folder name..."}
                                                  className="flex-1 bg-slate-950 border border-slate-900 text-slate-300 text-[8px] rounded px-1 py-0.5 font-mono outline-none"
                                                  maxLength={18}
                                                  autoFocus
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                      handleCreateInTreeCategory(exportPresetCategoryFilter);
                                                    } else if (e.key === "Escape") {
                                                      setInTreeCategoryCreatePath(null);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleCreateInTreeCategory(exportPresetCategoryFilter)}
                                                  className="p-0.5 text-emerald-400 hover:bg-slate-900 rounded cursor-pointer"
                                                >
                                                  <Check className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setInTreeCategoryCreatePath(null)}
                                                  className="p-0.5 text-rose-400 hover:bg-slate-900 rounded cursor-pointer"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            )}

                                            {/* Presets Cards grid */}
                                            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2 max-h-[330px]" id="export-presets-active-grid">
                                              {(() => {
                                                const filteredPresetsForTree = getFilteredPresets();
                                                const allPaths = Array.from(new Set(["Technical", "Creative", ...customCategoryPaths]));
                                                const rootNode = buildPresetTree(filteredPresetsForTree, allPaths);
                                                const displayNode = exportPresetCategoryFilter === "All" ? rootNode : findSubNode(rootNode, exportPresetCategoryFilter);
                                                
                                                if (!displayNode) {
                                                  return (
                                                    <div className="text-center py-8 text-slate-600 text-[8.5px] font-mono">
                                                      {language === "de" ? "Kategorie nicht gefunden." : "Category not found."}
                                                    </div>
                                                  );
                                                }

                                                // Helper to recursively collect presets
                                                const getPresetsInFolder = (node: TreeNode): any[] => {
                                                  let list = [...node.presets];
                                                  Object.values(node.subfolders).forEach(sub => {
                                                    list = list.concat(getPresetsInFolder(sub));
                                                  });
                                                  return list;
                                                };

                                                const activePresetsRaw = getPresetsInFolder(displayNode);
                                                const activePresets = activePresetsRaw.filter(p => {
                                                  if (!presetListFilter.trim()) return true;
                                                  const q = presetListFilter.toLowerCase();
                                                  return (
                                                    (p.name && p.name.toLowerCase().includes(q)) ||
                                                    (p.description && p.description.toLowerCase().includes(q)) ||
                                                    (p.status && p.status.toLowerCase().includes(q))
                                                  );
                                                });

                                                if (activePresets.length === 0) {
                                                  return (
                                                    <div className="text-center py-10 text-slate-600 text-[8.5px] font-mono">
                                                      {language === "de" 
                                                        ? "Keine aktiven Presets in diesem Verzeichnis gefunden." 
                                                        : "No active presets found in this directory."}
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-2">
                                                    {activePresets.map((preset) => renderPresetCard(preset))}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>

                                          {/* Preset Saving Controls */}
                                          <div className="flex flex-col md:flex-row items-stretch gap-3 pt-2.5 border-t border-slate-900/60 mt-2 w-full bg-slate-950/20 p-2.5 rounded-lg border border-slate-900/30">
                                            {/* Inputs Form */}
                                            <div className="flex-1 flex flex-col gap-1.5 min-w-[150px]">
                                              <span className="text-[7.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                                                {language === "de" ? "Preset Speichern & Konfigurieren:" : "Save & Configure Preset:"}
                                              </span>

                                              {/* Persistent Status Count Legend */}
                                              {(() => {
                                                const filteredPresetsForLegend = legendSearchQuery.trim()
                                                  ? exportPresets.filter(p => {
                                                      const q = legendSearchQuery.toLowerCase();
                                                      return (
                                                        (p.name && p.name.toLowerCase().includes(q)) ||
                                                        (p.category && p.category.toLowerCase().includes(q)) ||
                                                        (p.description && p.description.toLowerCase().includes(q)) ||
                                                        (p.status && p.status.toLowerCase().includes(q))
                                                      );
                                                    })
                                                  : exportPresets;

                                                const draftCount = filteredPresetsForLegend.filter(p => p.status === "Draft").length;
                                                const needsWorkCount = filteredPresetsForLegend.filter(p => p.status === "Needs Work").length;
                                                const approvedCount = filteredPresetsForLegend.filter(p => p.status === "Approved" || !p.status).length;

                                                const customStatusCounts = customStatuses.map(statusObj => {
                                                  const count = filteredPresetsForLegend.filter(p => p.status === statusObj.name).length;
                                                  return {
                                                    name: statusObj.name,
                                                    value: count,
                                                    color: statusObj.color
                                                  };
                                                });

                                                const chartData = [
                                                  { name: "Draft", value: draftCount, color: "#94a3b8" },
                                                  { name: "Needs Work", value: needsWorkCount, color: "#f59e0b" },
                                                  { name: "Approved", value: approvedCount, color: "#10b981" },
                                                  ...customStatusCounts
                                                ];

                                                const displayData = chartData.length > 0 ? chartData : [{ name: "Empty", value: 1, color: "#334155" }];
                                                const total = draftCount + needsWorkCount + approvedCount + customStatuses.reduce((acc, statusObj) => {
                                                  return acc + filteredPresetsForLegend.filter(p => p.status === statusObj.name).length;
                                                }, 0);

                                                // Generate 7-day historical status distribution + 3-day projection
                                                const trendData = Array.from({ length: 10 }).map((_, i) => {
                                                  const isProjection = i > 6;
                                                  const date = new Date();
                                                  let dateString = "";

                                                  if (trendTemporalRange === "Daily") {
                                                    if (!isProjection) {
                                                      const dayOffset = 6 - i;
                                                      date.setDate(date.getDate() - dayOffset);
                                                    } else {
                                                      const dayOffset = i - 6;
                                                      date.setDate(date.getDate() + dayOffset);
                                                    }
                                                    dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });
                                                  } else if (trendTemporalRange === "Weekly") {
                                                    if (!isProjection) {
                                                      const dayOffset = (6 - i) * 7;
                                                      date.setDate(date.getDate() - dayOffset);
                                                    } else {
                                                      const dayOffset = (i - 6) * 7;
                                                      date.setDate(date.getDate() + dayOffset);
                                                    }
                                                    const weekNum = i - 6;
                                                    if (weekNum < 0) {
                                                      dateString = `W${weekNum}`;
                                                    } else if (weekNum === 0) {
                                                      dateString = language === "de" ? "Diese Woche" : "This Week";
                                                    } else {
                                                      dateString = `W+${weekNum}`;
                                                    }
                                                  } else { // Monthly
                                                    if (!isProjection) {
                                                      const monthOffset = 6 - i;
                                                      date.setMonth(date.getMonth() - monthOffset);
                                                    } else {
                                                      const monthOffset = i - 6;
                                                      date.setMonth(date.getMonth() + monthOffset);
                                                    }
                                                    dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", year: "2-digit" });
                                                  }
                                                  
                                                  // Scale values depending on interval
                                                  let scale = 1.0;
                                                  let varianceDraft = 0;
                                                  let varianceNeeds = 0;
                                                  let varianceApproved = 0;

                                                  if (trendTemporalRange === "Daily") {
                                                    if (!isProjection) {
                                                      scale = 0.5 + (0.5 * i) / 6;
                                                      varianceDraft = Math.sin(i) * 0.1;
                                                      varianceNeeds = Math.cos(i) * 0.08;
                                                      varianceApproved = Math.sin(i * 1.5) * 0.12;
                                                    } else {
                                                      const projectionDays = i - 6;
                                                      scale = 1.0 + 0.08 * projectionDays;
                                                      varianceDraft = Math.sin(i) * 0.05;
                                                      varianceNeeds = Math.cos(i) * 0.04;
                                                      varianceApproved = Math.sin(i * 1.5) * 0.06;
                                                    }
                                                  } else if (trendTemporalRange === "Weekly") {
                                                    if (!isProjection) {
                                                      scale = 0.4 + (0.6 * i) / 6;
                                                      varianceDraft = Math.cos(i) * 0.12;
                                                      varianceNeeds = Math.sin(i * 1.2) * 0.07;
                                                      varianceApproved = Math.cos(i * 1.8) * 0.15;
                                                    } else {
                                                      const projectionWeeks = i - 6;
                                                      scale = 1.0 + 0.12 * projectionWeeks;
                                                      varianceDraft = Math.cos(i) * 0.06;
                                                      varianceNeeds = Math.sin(i * 1.2) * 0.03;
                                                      varianceApproved = Math.cos(i * 1.8) * 0.08;
                                                    }
                                                  } else { // Monthly
                                                    if (!isProjection) {
                                                      scale = 0.3 + (0.7 * i) / 6;
                                                      varianceDraft = Math.sin(i * 0.8) * 0.15;
                                                      varianceNeeds = Math.cos(i * 1.4) * 0.1;
                                                      varianceApproved = Math.sin(i * 2.2) * 0.2;
                                                    } else {
                                                      const projectionMonths = i - 6;
                                                      scale = 1.0 + 0.18 * projectionMonths;
                                                      varianceDraft = Math.sin(i * 0.8) * 0.08;
                                                      varianceNeeds = Math.cos(i * 1.4) * 0.05;
                                                      varianceApproved = Math.sin(i * 2.2) * 0.1;
                                                    }
                                                  }

                                                  const dVal = Math.max(0, Math.round(draftCount * (scale + varianceDraft)));
                                                  const nVal = Math.max(0, Math.round(needsWorkCount * (scale + varianceNeeds)));
                                                  const aVal = Math.max(0, Math.round(approvedCount * (scale + varianceApproved)));

                                                  const customTrendVals = customStatusCounts.map(c => {
                                                    const val = Math.max(0, Math.round(c.value * (scale + varianceApproved)));
                                                    return { name: c.name, value: val };
                                                  });

                                                  const dayTotal = dVal + nVal + aVal + customTrendVals.reduce((acc, curr) => acc + curr.value, 0);

                                                  let milestone = null;
                                                  if (!isProjection) {
                                                    if (trendTemporalRange === "Daily") {
                                                      if (i === 2) milestone = language === "de" ? "Massen-Initialisierung" : "Bulk Presets Created";
                                                      else if (i === 4) milestone = language === "de" ? "QS-Prüfungsphase" : "QA Audit Phase Complete";
                                                      else if (i === 6) milestone = language === "de" ? "Aktuelle Freigaben" : "Latest Approved Presets";
                                                    } else if (trendTemporalRange === "Weekly") {
                                                      if (i === 2) milestone = language === "de" ? "Saison-Start Presets" : "Season Launch Presets";
                                                      else if (i === 4) milestone = language === "de" ? "Automations-Upgrade" : "Automation Engine Upgrade";
                                                      else if (i === 6) milestone = language === "de" ? "Aktueller Stand" : "Current Active Balance";
                                                    } else { // Monthly
                                                      if (i === 1) milestone = language === "de" ? "Systemstart" : "System Launch";
                                                      else if (i === 4) milestone = language === "de" ? "Kampagnen-Hochlauf" : "Campaign Ramp-Up";
                                                      else if (i === 6) milestone = language === "de" ? "Heutiges Inventar" : "Current Live Inventory";
                                                    }
                                                  }

                                                  const baseRet: any = {
                                                    day: dateString,
                                                    Draft: dVal,
                                                    "Needs Work": nVal,
                                                    Approved: aVal,
                                                    total: isProjection ? null : dayTotal,
                                                    projectedTotal: isProjection || i === 6 ? dayTotal : null,
                                                    isProjection,
                                                    milestone,
                                                  };
                                                  customTrendVals.forEach(ctv => {
                                                    baseRet[ctv.name] = ctv.value;
                                                  });
                                                  return baseRet;
                                                });

                                                // Custom tooltip component for Recharts Tooltip
                                                const CustomDonutTooltip = ({ active, payload }: any) => {
                                                  if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    if (data.name === "Empty") return null;
                                                    const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0;
                                                    const displayName = language === "de"
                                                      ? (data.name === "Draft" ? "Entwurf" : data.name === "Needs Work" ? "Überarbeitung nötig" : data.name === "Approved" ? "Freigegeben" : data.name)
                                                      : data.name;
                                                    return (
                                                      <div className="bg-slate-950/95 border border-slate-800 text-slate-200 text-[8px] font-mono p-1.5 rounded shadow-xl pointer-events-none z-50 min-w-[80px] backdrop-blur-sm">
                                                        <p className="font-bold mb-0.5 text-slate-100" style={{ color: data.color }}>{displayName}</p>
                                                        <p className="text-[7.5px] text-slate-300">
                                                          {data.value} {language === "de" ? "Presets" : "presets"} ({percentage}%)
                                                        </p>
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                };

                                                // Calculate dynamic number of days
                                                const now = new Date();
                                                const startOfYear = new Date(now.getFullYear(), 0, 1);
                                                const daysYTD = Math.max(1, Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
                                                const trendNumDays = legendTrendRange === "7D" ? 7 : legendTrendRange === "30D" ? 30 : daysYTD;

                                                // Generate historical trend for stacked area chart (status-to-inventory velocity)
                                                let trendData30 = Array.from({ length: trendNumDays }).map((_, i) => {
                                                  const date = new Date();
                                                  date.setDate(date.getDate() - (trendNumDays - 1 - i));
                                                  const dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });
                                                  
                                                  // Progress factor mimicking system growth over time (from 35% baseline up to current totals)
                                                  const progress = trendNumDays > 1 ? i / (trendNumDays - 1) : 1;
                                                  const scale = 0.35 + 0.65 * progress;
                                                  const varianceDraft = Math.sin(i * 0.45) * 0.1;
                                                  const varianceNeeds = Math.cos(i * 0.35) * 0.08;
                                                  const varianceApproved = Math.sin(i * 0.55) * 0.12;

                                                  const dVal = Math.max(0, Math.round(draftCount * (scale + varianceDraft)));
                                                  const nVal = Math.max(0, Math.round(needsWorkCount * (scale + varianceNeeds)));
                                                  const aVal = Math.max(0, Math.round(approvedCount * (scale + varianceApproved)));

                                                  const dayData: any = {
                                                    day: dateString,
                                                    Draft: dVal,
                                                    "Needs Work": nVal,
                                                    Approved: aVal,
                                                    isProjected: false
                                                  };

                                                  customStatuses.forEach(cs => {
                                                    const count = filteredPresetsForLegend.filter(p => p.status === cs.name).length;
                                                    const varianceCustom = Math.sin(i * 0.65) * 0.09;
                                                    dayData[cs.name] = Math.max(0, Math.round(count * (scale + varianceCustom)));
                                                  });

                                                  return dayData;
                                                });

                                                if (showRegressionProjection) {
                                                  const N = trendNumDays;
                                                  const calculateRegression = (key: string) => {
                                                    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                                                    for (let j = 0; j < N; j++) {
                                                      const val = trendData30[j][key] || 0;
                                                      sumX += j;
                                                      sumY += val;
                                                      sumXY += j * val;
                                                      sumXX += j * j;
                                                    }
                                                    const denom = N * sumXX - sumX * sumX;
                                                    const m = denom === 0 ? 0 : (N * sumXY - sumX * sumY) / denom;
                                                    const c = (sumY - m * sumX) / N;
                                                    return { m, c };
                                                  };

                                                  const regDraft = calculateRegression("Draft");
                                                  const regNeeds = calculateRegression("Needs Work");
                                                  const regApproved = calculateRegression("Approved");
                                                  const regCustoms = customStatuses.map(cs => ({
                                                    name: cs.name,
                                                    reg: calculateRegression(cs.name)
                                                  }));

                                                  const projectionDays = legendTrendRange === "7D" ? 3 : legendTrendRange === "30D" ? 7 : 14;
                                                  const projections = Array.from({ length: projectionDays }).map((_, step) => {
                                                    const i = N + step;
                                                    const date = new Date();
                                                    date.setDate(date.getDate() + (step + 1));
                                                    const dateString = date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", { month: "short", day: "numeric" });

                                                    const dVal = Math.max(0, Math.round(regDraft.m * i + regDraft.c));
                                                    const nVal = Math.max(0, Math.round(regNeeds.m * i + regNeeds.c));
                                                    const aVal = Math.max(0, Math.round(regApproved.m * i + regApproved.c));

                                                    const dayData: any = {
                                                      day: dateString,
                                                      Draft: dVal,
                                                      "Needs Work": nVal,
                                                      Approved: aVal,
                                                      isProjected: true
                                                    };

                                                    regCustoms.forEach(rc => {
                                                      dayData[rc.name] = Math.max(0, Math.round(rc.reg.m * i + rc.reg.c));
                                                    });

                                                    return dayData;
                                                  });

                                                  trendData30 = [...trendData30, ...projections];
                                                }

                                                const last30DaysTrendData = trendData30.map(dayData => {
                                                  let total = 0;
                                                  if (!hiddenStatuses.includes("Draft")) total += (dayData.Draft || 0);
                                                  if (!hiddenStatuses.includes("Needs Work")) total += (dayData["Needs Work"] || 0);
                                                  if (!hiddenStatuses.includes("Approved")) total += (dayData.Approved || 0);
                                                  customStatuses.forEach(cs => {
                                                    if (!hiddenStatuses.includes(cs.name)) {
                                                      total += (dayData[cs.name] || 0);
                                                    }
                                                  });
                                                  return {
                                                    ...dayData,
                                                    TotalCompletion: total
                                                  };
                                                });

                                                // Calculate date-based high-transition milestones (top 2 changes)
                                                const milestoneTransitions = last30DaysTrendData
                                                  .filter(dayData => !dayData.isProjected)
                                                  .map((dayData, idx, arr) => {
                                                    if (idx === 0) return { day: dayData.day, change: 0 };
                                                    const prev = arr[idx - 1];
                                                    let diff = 0;
                                                    if (!hiddenStatuses.includes("Draft")) diff += Math.abs((dayData.Draft || 0) - (prev.Draft || 0));
                                                    if (!hiddenStatuses.includes("Needs Work")) diff += Math.abs((dayData["Needs Work"] || 0) - (prev["Needs Work"] || 0));
                                                    if (!hiddenStatuses.includes("Approved")) diff += Math.abs((dayData.Approved || 0) - (prev.Approved || 0));
                                                    customStatuses.forEach(cs => {
                                                      if (!hiddenStatuses.includes(cs.name)) {
                                                        diff += Math.abs((dayData[cs.name] || 0) - (prev[cs.name] || 0));
                                                      }
                                                    });
                                                    return { day: dayData.day, change: diff };
                                                  });

                                                const peakTransitionMilestones = milestoneTransitions
                                                  .filter(t => t.change > 0)
                                                  .sort((a, b) => b.change - a.change)
                                                  .slice(0, 2);

                                                // Calculate the average cumulative status distribution for visible (active) categories across the 30 days (excluding projected values)
                                                const dailyVisibleTotals = last30DaysTrendData
                                                  .filter(dayData => !dayData.isProjected)
                                                  .map(dayData => {
                                                    let sum = 0;
                                                    if (!hiddenStatuses.includes("Draft")) sum += (dayData.Draft || 0);
                                                    if (!hiddenStatuses.includes("Needs Work")) sum += (dayData["Needs Work"] || 0);
                                                    if (!hiddenStatuses.includes("Approved")) sum += (dayData.Approved || 0);
                                                    customStatuses.forEach(cs => {
                                                      if (!hiddenStatuses.includes(cs.name)) {
                                                        sum += (dayData[cs.name] || 0);
                                                      }
                                                    });
                                                    return sum;
                                                  });
                                                const calculatedAverage = Math.round(dailyVisibleTotals.reduce((a, b) => a + b, 0) / dailyVisibleTotals.length) || 0;
                                                const averageBenchmark = customBenchmark !== null ? customBenchmark : calculatedAverage;
                                                const maxDailyTotal = Math.max(...dailyVisibleTotals, 5);
                                                const currentActiveTotal = dailyVisibleTotals[dailyVisibleTotals.length - 1] || 0;
                                                const isTargetMet = currentActiveTotal >= averageBenchmark;

                                                const CustomAreaTooltip = ({ active, payload }: any) => {
                                                  if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const dayTotal = 
                                                      (!hiddenStatuses.includes("Draft") ? (data.Draft || 0) : 0) +
                                                      (!hiddenStatuses.includes("Needs Work") ? (data["Needs Work"] || 0) : 0) +
                                                      (!hiddenStatuses.includes("Approved") ? (data.Approved || 0) : 0) + 
                                                      customStatuses.reduce((acc, cs) => {
                                                        return acc + (!hiddenStatuses.includes(cs.name) ? (data[cs.name] || 0) : 0);
                                                      }, 0);
                                                    
                                                    const getPercentage = (val: number) => dayTotal > 0 ? Math.round((val / dayTotal) * 100) : 0;

                                                    return (
                                                      <div className="bg-slate-950/95 border border-slate-800 text-slate-200 text-[8px] font-mono p-1.5 rounded shadow-xl pointer-events-none z-50 min-w-[130px] backdrop-blur-sm">
                                                        <p className="font-bold mb-0.5 text-slate-100 border-b border-slate-800/80 pb-0.5 flex items-center justify-between gap-1">
                                                          <span>{data.day}</span>
                                                          {data.isProjected && (
                                                            <span className="text-[6px] text-purple-400 font-bold uppercase bg-purple-950/40 border border-purple-800/50 px-1 py-0.5 rounded leading-none shrink-0">
                                                              {language === "de" ? "PROGNOSE" : "PROJ"}
                                                            </span>
                                                          )}
                                                        </p>
                                                        {!hiddenStatuses.includes("Draft") && (
                                                          <p className="text-[7.5px] text-slate-400 flex justify-between gap-2">
                                                            <span>{language === "de" ? "Entwurf" : "Draft"}:</span>
                                                            <span className="font-bold text-slate-300">{data.Draft || 0} <span className="opacity-60 font-normal">({getPercentage(data.Draft || 0)}%)</span></span>
                                                          </p>
                                                        )}
                                                        {!hiddenStatuses.includes("Needs Work") && (
                                                          <p className="text-[7.5px] text-amber-400 flex justify-between gap-2">
                                                            <span>{language === "de" ? "Überarbeiten" : "Needs Work"}:</span>
                                                            <span className="font-bold">{data["Needs Work"] || 0} <span className="opacity-60 font-normal">({getPercentage(data["Needs Work"] || 0)}%)</span></span>
                                                          </p>
                                                        )}
                                                        {!hiddenStatuses.includes("Approved") && (
                                                          <p className="text-[7.5px] text-emerald-400 flex justify-between gap-2">
                                                            <span>{language === "de" ? "Freigegeben" : "Approved"}:</span>
                                                            <span className="font-bold">{data.Approved || 0} <span className="opacity-60 font-normal">({getPercentage(data.Approved || 0)}%)</span></span>
                                                          </p>
                                                        )}
                                                        {customStatuses.filter(cs => !hiddenStatuses.includes(cs.name)).map(cs => (
                                                          <p key={cs.name} className="text-[7.5px] flex justify-between gap-2" style={{ color: cs.color }}>
                                                            <span>{cs.name}:</span>
                                                            <span className="font-bold">{data[cs.name] || 0} <span className="opacity-60 font-normal">({getPercentage(data[cs.name] || 0)}%)</span></span>
                                                          </p>
                                                        ))}
                                                        <p className="text-[7.5px] text-sky-400 flex justify-between gap-2 border-t border-slate-900 pt-0.5 mt-0.5 font-bold">
                                                          <span>Total:</span>
                                                          <span>{dayTotal}</span>
                                                        </p>
                                                      </div>
                                                    );
                                                  }
                                                  return null;
                                                };

                                                return (
                                                  <motion.div 
                                                    id="preset-status-count-legend" 
                                                    key={`legend-${customStatuses.length}-${hiddenStatuses.join(",")}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                                    className="flex flex-col gap-2 p-2 rounded bg-slate-950 border border-slate-900/60 text-[6.5px] font-mono select-none w-full"
                                                  >
                                                    {/* Header: Title & Info */}
                                                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-1">
                                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[6.5px] flex items-center gap-1">
                                                        <BarChart3 className="h-1.5 w-1.5 text-cyan-400" />
                                                        {language === "de" ? "Status-Bestand & Fluss-Geschwindigkeit" : "Status Inventory & Flow Velocity"}
                                                      </span>
                                                      <div className="flex items-center gap-1.5">
                                                        {/* Layout Switcher (Side-by-side vs Stacked) */}
                                                        <div className="flex items-center bg-slate-900/80 p-[1px] rounded border border-slate-900/40 gap-[1px]">
                                                          <button
                                                            id="layout-stacked-btn"
                                                            type="button"
                                                            onClick={() => setLegendLayoutMode("stacked")}
                                                            className={`p-[1.5px] rounded transition-colors ${legendLayoutMode === "stacked" ? "bg-cyan-600/80 text-white font-bold" : "text-slate-500 hover:text-slate-300"}`}
                                                            title={language === "de" ? "Gestapelte Ansicht" : "Stacked View"}
                                                          >
                                                            <Rows className="h-1.5 w-1.5" />
                                                          </button>
                                                          <button
                                                            id="layout-side-btn"
                                                            type="button"
                                                            onClick={() => setLegendLayoutMode("side")}
                                                            className={`p-[1.5px] rounded transition-colors ${legendLayoutMode === "side" ? "bg-cyan-600/80 text-white font-bold" : "text-slate-500 hover:text-slate-300"}`}
                                                            title={language === "de" ? "Nebeneinander-Ansicht" : "Side-by-side View"}
                                                          >
                                                            <Columns className="h-1.5 w-1.5" />
                                                          </button>
                                                        </div>

                                                        {/* Interactive Toggle Switch for Regression Projection */}
                                                        <div className="flex items-center gap-1 bg-slate-900/80 px-1 py-[1px] rounded border border-slate-900/40">
                                                          <span className="text-[5.5px] text-purple-400 font-bold uppercase tracking-tight">{language === "de" ? "PROGNOSE" : "PROJ"}</span>
                                                          <button
                                                            id="projection-toggle-switch"
                                                            type="button"
                                                            onClick={() => setShowRegressionProjection(prev => !prev)}
                                                            className={`relative inline-flex h-2.5 w-5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showRegressionProjection ? 'bg-purple-600' : 'bg-slate-800'}`}
                                                            title={language === "de" ? "Prognose ein-/ausschalten" : "Toggle projection"}
                                                          >
                                                            <span
                                                              className={`pointer-events-none inline-block h-1.5 w-1.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showRegressionProjection ? 'translate-x-2.5' : 'translate-x-0.5'}`}
                                                              style={{ marginTop: '0.2px' }}
                                                            />
                                                          </button>
                                                        </div>
                                                        
                                                        {/* Interactive Toggle Switch for Completion Trendline */}
                                                        <div className="flex items-center gap-1 bg-slate-900/80 px-1 py-[1px] rounded border border-slate-900/40">
                                                          <span className="text-[5.5px] text-emerald-400 font-bold uppercase tracking-tight">{language === "de" ? "TREND" : "TREND"}</span>
                                                          <button
                                                            id="trendline-toggle-switch"
                                                            type="button"
                                                            onClick={() => setShowCompletionTrendline(prev => !prev)}
                                                            className={`relative inline-flex h-2.5 w-5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showCompletionTrendline ? 'bg-emerald-600' : 'bg-slate-800'}`}
                                                            title={language === "de" ? "Trendlinie ein-/ausschalten" : "Toggle trendline"}
                                                          >
                                                            <span
                                                              className={`pointer-events-none inline-block h-1.5 w-1.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showCompletionTrendline ? 'translate-x-2.5' : 'translate-x-0.5'}`}
                                                              style={{ marginTop: '0.2px' }}
                                                            />
                                                          </button>
                                                        </div>

                                                        <span className="bg-slate-900 px-1 py-[1px] rounded text-slate-400 font-bold text-[6px]">
                                                          {legendTrendRange}
                                                        </span>
                                                      </div>
                                                    </div>
 
                                                    {/* Real-time search filter and range selector */}
                                                    <div className="flex items-center gap-1.5 w-full">
                                                      <div className="relative flex items-center bg-slate-900/50 rounded border border-slate-900/80 px-1.5 py-0.5 flex-1">
                                                        <Search className="h-1.5 w-1.5 text-slate-500 mr-1 shrink-0" />
                                                        <input
                                                          id="legend-search-input"
                                                          type="text"
                                                          value={legendSearchQuery}
                                                          onChange={(e) => setLegendSearchQuery(e.target.value)}
                                                          placeholder={language === "de" ? "Nach Kategorien, Namen oder Status filtern..." : "Filter by category, name, or status..."}
                                                          className="w-full bg-transparent border-none text-slate-200 text-[6.5px] font-mono outline-none placeholder:text-slate-600 py-[1px]"
                                                        />
                                                        {legendSearchQuery && (
                                                          <button
                                                            type="button"
                                                            onClick={() => setLegendSearchQuery("")}
                                                            className="text-slate-500 hover:text-slate-300 ml-1 text-[6.5px] cursor-pointer font-bold select-none"
                                                          >
                                                            ✕
                                                          </button>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-1 shrink-0 bg-slate-900/50 rounded border border-slate-900/80 px-1 py-0.5">
                                                        <span className="text-slate-500 font-bold uppercase text-[5px] tracking-wider">{language === "de" ? "Ziel:" : "Target:"}</span>
                                                        <input 
                                                          type="number"
                                                          value={customBenchmark !== null ? customBenchmark : ""}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === "") {
                                                              setCustomBenchmark(null);
                                                            } else {
                                                              setCustomBenchmark(Number(val));
                                                            }
                                                          }}
                                                          placeholder="Auto"
                                                          className="w-10 bg-transparent border-none text-slate-300 text-[6px] font-mono outline-none placeholder:text-slate-600"
                                                          min="0"
                                                        />
                                                      </div>
                                                      <select
                                                        value={legendTrendRange}
                                                        onChange={(e) => setLegendTrendRange(e.target.value as "7D" | "30D" | "YTD")}
                                                        className="bg-slate-900/80 text-slate-300 border border-slate-900/40 rounded px-1 py-[3.5px] text-[6px] font-bold font-mono outline-none cursor-pointer shrink-0 uppercase"
                                                      >
                                                        <option value="7D">{language === "de" ? "Letzte 7 Tage" : "Last 7 Days"}</option>
                                                        <option value="30D">{language === "de" ? "Letzte 30 Tage" : "Last 30 Days"}</option>
                                                        <option value="YTD">{language === "de" ? "Jahr bis heute" : "Year-to-Date"}</option>
                                                      </select>
                                                    </div>

                                                    {/* Quick Category Filter Pills */}
                                                    {(() => {
                                                      const uniqueCats = Array.from(new Set(exportPresets.map(p => (p.category || "") as string).filter(Boolean))) as string[];
                                                      if (uniqueCats.length === 0) return null;
                                                      return (
                                                        <div className="flex flex-wrap gap-1 items-center bg-slate-900/30 p-1 rounded border border-slate-900/50 w-full">
                                                          <span className="text-[5px] text-slate-500 uppercase font-bold shrink-0">{language === "de" ? "Kategorien:" : "Categories:"}</span>
                                                          {uniqueCats.map((cat: string) => {
                                                            const isSelected = legendSearchQuery.toLowerCase() === cat.toLowerCase();
                                                            return (
                                                              <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => {
                                                                  if (isSelected) {
                                                                    setLegendSearchQuery("");
                                                                  } else {
                                                                    setLegendSearchQuery(cat);
                                                                  }
                                                                }}
                                                                className={`px-1 py-[1px] rounded text-[5px] font-mono transition-all border ${
                                                                  isSelected 
                                                                    ? "bg-cyan-600/80 border-cyan-400 text-white font-bold" 
                                                                    : "bg-slate-950 border-slate-900 hover:border-slate-850 text-slate-400 hover:text-slate-200"
                                                                }`}
                                                              >
                                                                {cat}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      );
                                                    })()}
 

                                                    {/* 'Total Presets' trend sparkline to visualize volume fluctuations */}
                                                    {(() => {
                                                      const sparklineTotalData = trendData30.map((dayData) => {
                                                        const totalVal = (dayData.Draft || 0) + (dayData["Needs Work"] || 0) + (dayData.Approved || 0) +
                                                          customStatuses.reduce((acc, cs) => acc + (dayData[cs.name] || 0), 0);
                                                        return {
                                                          day: dayData.day,
                                                          total: totalVal,
                                                          isProjected: dayData.isProjected
                                                        };
                                                      });

                                                      const historicalSparklineData = sparklineTotalData.filter(d => !d.isProjected);
                                                      const firstVal = historicalSparklineData[0]?.total || 0;
                                                      const lastVal = historicalSparklineData[historicalSparklineData.length - 1]?.total || 0;
                                                      const diffVal = lastVal - firstVal;
                                                      const percentChange = firstVal > 0 ? ((diffVal / firstVal) * 100).toFixed(1) : (diffVal > 0 ? "100.0" : "0.0");
                                                      const sign = diffVal >= 0 ? "+" : "";

                                                      const minVal = Math.min(...sparklineTotalData.map(d => d.total));
                                                      const maxVal = Math.max(...sparklineTotalData.map(d => d.total));

                                                      return (
                                                        <div className="flex items-center justify-between bg-slate-900/30 p-1.5 rounded border border-slate-900/50 gap-2 w-full mt-1 mb-1" id="preset-status-count-legend-sparkline-row">
                                                          <div className="flex flex-col shrink-0 min-w-[55px]">
                                                            <span className="text-[5.5px] text-slate-500 uppercase font-bold tracking-wider">
                                                              {language === "de" ? "Gesamt-Trend" : "Total Trend"}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-slate-200 mt-0.5 leading-none">
                                                              {lastVal} <span className="text-[5px] font-normal text-slate-400">{language === "de" ? "Presets" : "presets"}</span>
                                                            </span>
                                                            <span className={`text-[5.5px] font-bold mt-0.5 leading-none ${diffVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                              {sign}{diffVal} ({sign}{percentChange}%)
                                                            </span>
                                                          </div>
                                                          
                                                          <div className="flex-1 h-[22px] min-w-[100px] relative">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                              <AreaChart data={sparklineTotalData} margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                                                                <defs>
                                                                  <linearGradient id="totalPresetsTrendSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                                                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                                                                  </linearGradient>
                                                                </defs>
                                                                <Tooltip
                                                                  content={({ active, payload }) => {
                                                                    if (active && payload && payload.length) {
                                                                      const item = payload[0].payload;
                                                                      return (
                                                                        <div className="bg-slate-950/95 border border-slate-800 text-[5px] text-slate-300 font-mono px-1 py-0.5 rounded leading-none backdrop-blur-sm shadow-md pointer-events-none">
                                                                          <span className="font-bold text-slate-100">{item.day}:</span> {item.total} {item.isProjected ? (language === "de" ? "(Prog)" : "(Proj)") : ""}
                                                                        </div>
                                                                      );
                                                                    }
                                                                    return null;
                                                                  }}
                                                                  position={{ y: -16 }}
                                                                  cursor={{ stroke: '#0891b2', strokeWidth: 0.5, strokeDasharray: '2 2' }}
                                                                />
                                                                <Area
                                                                  type="monotone"
                                                                  dataKey="total"
                                                                  stroke="#06b6d4"
                                                                  strokeWidth={1}
                                                                  fill="url(#totalPresetsTrendSparklineGrad)"
                                                                  isAnimationActive={false}
                                                                  dot={({ cx, cy, index, payload }) => {
                                                                    const isLastActual = !payload.isProjected && index === historicalSparklineData.length - 1;
                                                                    const isLastProjected = payload.isProjected && index === sparklineTotalData.length - 1;
                                                                    if (cx !== undefined && cy !== undefined) {
                                                                      if (isLastActual) {
                                                                        return <circle cx={cx} cy={cy} r={1.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={0.25} key={`dot-act-${index}`} />;
                                                                      }
                                                                      if (isLastProjected) {
                                                                        return <circle cx={cx} cy={cy} r={1.5} fill="#c084fc" stroke="#ffffff" strokeWidth={0.25} key={`dot-proj-${index}`} />;
                                                                      }
                                                                    }
                                                                    return <g key={`dot-empty-${index}`} />;
                                                                  }}
                                                                />
                                                              </AreaChart>
                                                            </ResponsiveContainer>
                                                          </div>

                                                          <div className="flex flex-col text-[4.5px] text-slate-500 text-right shrink-0 font-bold leading-tight font-mono">
                                                            <span>MAX: {maxVal}</span>
                                                            <span>MIN: {minVal}</span>
                                                          </div>
                                                        </div>
                                                      );
                                                    })()}

                                                    {/* Split-View Block */}
                                                    <div className={`flex gap-2 w-full ${legendLayoutMode === "side" ? "flex-col lg:flex-row" : "flex-col"}`}>
                                                      {/* Top Section: Donut Chart Current Distribution */}
                                                      <div className={`flex items-center gap-2 bg-slate-900/10 p-1.5 rounded border border-slate-900/40 relative ${legendLayoutMode === "side" ? "lg:w-5/12" : "w-full"}`}>
                                                        {/* Donut Chart with Centered Total */}
                                                        <div className="relative w-[50px] h-[50px] shrink-0 flex items-center justify-center">
                                                          <PieChart width={50} height={50}>
                                                            <Pie
                                                              data={displayData}
                                                              dataKey="value"
                                                              cx="50%"
                                                              cy="50%"
                                                              innerRadius={15}
                                                              outerRadius={23}
                                                              strokeWidth={0.5}
                                                              stroke="#090d16"
                                                              isAnimationActive={false}
                                                            >
                                                              {displayData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                              ))}
                                                            </Pie>
                                                            {chartData.length > 0 && (
                                                              <Tooltip
                                                                content={<CustomDonutTooltip />}
                                                                position={{ y: -34 }}
                                                                cursor={false}
                                                              />
                                                            )}
                                                          </PieChart>
                                                          {/* Total Count Centered inside the Donut */}
                                                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                            <span className="text-[8px] font-bold text-slate-100 leading-none">{total}</span>
                                                            <span className="text-[4px] text-slate-500 tracking-tighter uppercase leading-none mt-[1px]">TOTAL</span>
                                                          </div>
                                                        </div>

                                                        {/* Legend Key */}
                                                        <div className="flex-1 flex flex-col gap-1 pr-1 border-l border-slate-900/80 pl-2">
                                                          <div className="text-[6px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{language === "de" ? "Legenden-Schlüssel" : "Legend Key"}</div>
                                                          <div className="flex flex-col gap-1">
                                                            <AnimatePresence>
                                                              {[
                                                                { name: "Draft", color: "bg-slate-400", hex: "#94a3b8", count: draftCount, labelDe: "Entwurf", labelEn: "Draft", isCustom: false, originalColor: "" },
                                                                { name: "Needs Work", color: "bg-amber-400", hex: "#fbbf24", count: needsWorkCount, labelDe: "Überarb.", labelEn: "Needs W.", isCustom: false, originalColor: "" },
                                                                { name: "Approved", color: "bg-emerald-400", hex: "#34d399", count: approvedCount, labelDe: "Freigeg.", labelEn: "Approved", isCustom: false, originalColor: "" },
                                                                ...customStatuses.map(cs => ({
                                                                  name: cs.name, color: cs.color, hex: cs.color, count: filteredPresetsForLegend.filter(p => p.status === cs.name).length, labelDe: cs.name, labelEn: cs.name, isCustom: true, originalColor: cs.color
                                                                }))
                                                              ].map((s, idx) => ({ ...s, idx })).filter(s => {
                                                                const q = legendSearchQuery.trim().toLowerCase();
                                                                if (!q) return true;
                                                                if (s.count > 0) return true;
                                                                if (s.name.toLowerCase().includes(q) || s.labelDe.toLowerCase().includes(q) || s.labelEn.toLowerCase().includes(q)) return true;
                                                                return false;
                                                              }).sort((a, b) => {
                                                                const aVisible = !hiddenStatuses.includes(a.name);
                                                                const bVisible = !hiddenStatuses.includes(b.name);
                                                                if (aVisible && !bVisible) return -1;
                                                                if (!aVisible && bVisible) return 1;
                                                                return a.idx - b.idx;
                                                              }).map(status => {
                                                                const isVisible = !hiddenStatuses.includes(status.name);
                                                                return (
                                                                  <motion.div 
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    key={status.name}
                                                                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded border text-[6px] font-mono leading-none transition-all ${
                                                                      isVisible 
                                                                        ? (status.isCustom ? "bg-slate-900/40 border-slate-700/50" : "bg-slate-900/40 border-slate-700/50 text-slate-300")
                                                                        : "bg-slate-950/40 border-slate-950 text-slate-600 opacity-50"
                                                                    }`}
                                                                    style={isVisible && status.isCustom ? { color: status.originalColor } : {}}
                                                                  >
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                        setHiddenStatuses(prev => 
                                                                          prev.includes(status.name) ? prev.filter(s => s !== status.name) : [...prev, status.name]
                                                                        );
                                                                      }}
                                                                      className={`transition-colors ${status.isCustom ? "hover:opacity-70" : "hover:text-cyan-400"}`}
                                                                      style={status.isCustom ? { color: isVisible ? status.originalColor : undefined } : {}}
                                                                      title={language === "de" ? "Sichtbarkeit umschalten" : "Toggle visibility"}
                                                                    >
                                                                      {isVisible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                                                    </button>
                                                                    {status.isCustom ? (
                                                                      <div 
                                                                        className="relative w-2 h-2 rounded-full shrink-0 cursor-pointer border border-white/20 shadow-sm hover:scale-110 active:scale-95 transition-all" 
                                                                        style={{ backgroundColor: status.originalColor }} 
                                                                        title={language === "de" ? `Farbe für "${status.name}" ändern` : `Change color for "${status.name}"`}
                                                                      >
                                                                        <input
                                                                          type="color"
                                                                          value={status.originalColor}
                                                                          onChange={(e) => handleUpdateCustomStatusColor(status.name, e.target.value)}
                                                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full custom-status-color-picker"
                                                                          style={{ width: "100%", height: "100%", padding: 0, border: "none" }}
                                                                        />
                                                                      </div>
                                                                    ) : (
                                                                      <span className={`w-1.5 h-1.5 rounded-full ${status.color} shrink-0`} />
                                                                    )}
                                                                    <span className={`truncate ${!isVisible ? "line-through" : ""}`} title={status.isCustom ? status.name : undefined}>
                                                                      {language === "de" ? status.labelDe : status.labelEn}
                                                                    </span>
                                                                    <span className="font-bold ml-auto" style={status.isCustom && isVisible ? { color: status.originalColor } : { color: isVisible ? status.hex : undefined }}>
                                                                      {status.count}
                                                                    </span>
                                                                  </motion.div>
                                                                );
                                                              })}
                                                            </AnimatePresence>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    {/* Bottom Row: Status Filter Badges, Export & Dynamic Status Creator */}
                                                    <div className="flex flex-col gap-1.5 w-full border-t border-slate-900/60 pt-1.5 mt-0.5">
                                                      <div className="flex items-center justify-between gap-1.5 w-full flex-wrap">
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                          {/* Draft count badge */}
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              setPresetSaveStatus("Draft");
                                                              setShowStatusLegend(true);
                                                            }}
                                                            className={`flex items-center gap-1 px-1 py-[1px] rounded border transition-all cursor-pointer ${
                                                              presetSaveStatus === "Draft"
                                                                ? "bg-slate-500/20 border-slate-400 text-slate-200"
                                                                : "bg-slate-950/45 border-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-900"
                                                            }`}
                                                            title={language === "de" ? "Als Entwurf auswählen" : "Select Draft status"}
                                                          >
                                                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                            <span>{language === "de" ? "Entwurf" : "Draft"}:</span>
                                                            <span className="font-bold text-slate-200">{draftCount}</span>
                                                          </button>

                                                          {/* Needs Work count badge */}
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              setPresetSaveStatus("Needs Work");
                                                              setShowStatusLegend(true);
                                                            }}
                                                            className={`flex items-center gap-1 px-1 py-[1px] rounded border transition-all cursor-pointer ${
                                                              presetSaveStatus === "Needs Work"
                                                                ? "bg-amber-500/20 border-amber-400 text-amber-200"
                                                                : "bg-slate-950/45 border-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-900"
                                                            }`}
                                                          >
                                                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                                                            <span>{language === "de" ? "Überarb." : "Needs W."}:</span>
                                                            <span className="font-bold text-amber-200">{needsWorkCount}</span>
                                                          </button>

                                                          {/* Approved count badge */}
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              setPresetSaveStatus("Approved");
                                                              setShowStatusLegend(true);
                                                            }}
                                                            className={`flex items-center gap-1 px-1 py-[1px] rounded border transition-all cursor-pointer ${
                                                              presetSaveStatus === "Approved"
                                                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                                                                : "bg-slate-950/45 border-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-900"
                                                            }`}
                                                          >
                                                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                                            <span>{language === "de" ? "Freigeg." : "Approved"}:</span>
                                                            <span className="font-bold text-emerald-200">{approvedCount}</span>
                                                          </button>

                                                          {/* Custom Status filter badges */}
                                                          {customStatuses.map(cs => (
                                                            <button
                                                              key={`filter-${cs.name}`}
                                                              type="button"
                                                              onClick={() => {
                                                                setPresetSaveStatus(cs.name);
                                                                setShowStatusLegend(true);
                                                              }}
                                                              className={`flex items-center gap-1 px-1 py-[1px] rounded border transition-all cursor-pointer ${
                                                                presetSaveStatus === cs.name
                                                                  ? "bg-slate-800/60 text-slate-200"
                                                                  : "bg-slate-950/45 border-slate-900 text-slate-400 hover:text-slate-300 hover:bg-slate-900"
                                                              }`}
                                                              style={presetSaveStatus === cs.name ? { borderColor: cs.color } : {}}
                                                            >
                                                              <span className="w-1 h-1 rounded-full shadow-sm" style={{ backgroundColor: cs.color }} />
                                                              <span>{cs.name}:</span>
                                                              <span className="font-bold" style={{ color: presetSaveStatus === cs.name ? cs.color : undefined }}>
                                                                {filteredPresetsForLegend.filter(p => p.status === cs.name).length}
                                                              </span>
                                                            </button>
                                                          ))}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                          <button
                                                            id="preset-export-csv-btn"
                                                            type="button"
                                                            onClick={handleExportReport}
                                                            className="flex items-center gap-1 px-1.5 py-[1px] rounded border transition-all cursor-pointer font-mono text-[6.5px] bg-slate-900/45 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-900/65"
                                                            title={language === "de" ? "Report als CSV exportieren" : "Export Report as CSV"}
                                                          >
                                                            <Download className="h-1.5 w-1.5 text-emerald-400 shrink-0" />
                                                            <span>{language === "de" ? "Export" : "Export"}</span>
                                                          </button>
                                                                                                                    {/* Manage Categories button */}
                                                          <button
                                                            id="preset-sidebar-legend-btn"
                                                            type="button"
                                                            onClick={() => setShowSidebarStatusLegend(prev => !prev)}
                                                            className={`flex items-center gap-1 px-1.5 py-[1px] rounded border transition-all cursor-pointer font-mono text-[6.5px] ${showSidebarStatusLegend ? 'bg-cyan-900/65 border-cyan-800/80 text-cyan-300' : 'bg-slate-900/45 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-900/65'}`}
                                                            title={language === "de" ? "Status-Legende anzeigen" : "Show Status Legend"}
                                                          >
                                                            <Info className="h-1.5 w-1.5 shrink-0" />
                                                            <span>{language === "de" ? "Legende" : "Legend"}</span>
                                                          </button>
                                                          <button
                                                            id="preset-manage-categories-btn"
                                                            type="button"
                                                            onClick={() => {
                                                              if (!showManageStatusesPanel) {
                                                                setTempCustomStatuses(customStatuses.map(cs => ({ ...cs, originalName: cs.name })));
                                                              }
                                                              setShowManageStatusesPanel(prev => !prev);
                                                            }}
                                                            className={`flex items-center gap-1 px-1.5 py-[1px] rounded border transition-all cursor-pointer font-mono text-[6.5px] ${showManageStatusesPanel ? 'bg-cyan-900/65 border-cyan-800/80 text-cyan-300' : 'bg-slate-900/45 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-slate-900/65'}`}
                                                            title={language === "de" ? "Statuskategorien verwalten" : "Manage Status Categories"}
                                                          >
                                                            <Settings className="h-1.5 w-1.5 shrink-0" />
                                                            <span>{language === "de" ? "Kategorien verwalten" : "Manage Categories"}</span>
                                                          </button>
                                                        </div>
                                                      </div>
                                                                                                            {showSidebarStatusLegend && (
                                                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-2 mt-1 font-mono text-[6px] text-slate-300 flex flex-col gap-1.5 animate-fadeIn w-full">
                                                          <div className="flex items-center gap-1 text-cyan-400 uppercase tracking-wider font-bold mb-0.5">
                                                            <Info className="h-2 w-2" />
                                                            {language === "de" ? "Status-Bedeutungen (Workflow)" : "Status Meanings (Workflow)"}
                                                          </div>
                                                          <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-start gap-1">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-[2px] shrink-0" />
                                                              <div>
                                                                <span className="font-bold text-slate-200 uppercase">{language === "de" ? "Entwurf" : "Draft"}:</span> {language === "de" ? "Arbeit in Arbeit (WIP). Noch nicht fertiggestellt. Dient zum Testen und Verfeinern im Editor, bevor es freigegeben wird." : "Work in Progress (WIP). Not yet completed. Used for testing and refining in the editor before approval."}
                                                              </div>
                                                            </div>
                                                            <div className="flex items-start gap-1">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-[2px] shrink-0" />
                                                              <div>
                                                                <span className="font-bold text-amber-200 uppercase">{language === "de" ? "Überarbeiten" : "Needs Work"}:</span> {language === "de" ? "Überarbeitung erforderlich. Ein Preset mit Fehlern, Artefakten oder Handlungsbedarf basierend auf Test-Resultaten." : "Requires Revision. A preset with errors, artifacts, or necessary action items based on test results."}
                                                              </div>
                                                            </div>
                                                            <div className="flex items-start gap-1">
                                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-[2px] shrink-0" />
                                                              <div>
                                                                <span className="font-bold text-emerald-200 uppercase">{language === "de" ? "Freigegeben" : "Approved"}:</span> {language === "de" ? "Produktionsbereit. Vollständig validiert. Bereit für die automatische Freigabe in Social-Media-Pipeline-Kampagnen." : "Production Ready. Fully validated. Ready for automated publishing in social media pipeline campaigns."}
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      )}
                                                      {showManageStatusesPanel && (
                                                        <div className="w-full mt-2 p-2 bg-slate-900/40 border border-slate-800 rounded-md">
                                                          <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1">
                                                            <span className="text-[7px] font-bold text-slate-300">{language === "de" ? "Status-Kategorien bearbeiten" : "Bulk Edit Status Categories"}</span>
                                                            <div className="flex items-center gap-1.5">
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  setCustomStatuses([]);
                                                                  setTempCustomStatuses([]);
                                                                  
                                                                  setShowManageStatusesPanel(false);
                                                                }}
                                                                className="px-2 py-0.5 bg-rose-950/60 text-rose-400 hover:bg-rose-900/80 hover:text-rose-300 border border-rose-800/80 rounded font-bold text-[6px] transition-all cursor-pointer"
                                                                title={language === "de" ? "Auf Werkseinstellungen zurücksetzen" : "Revert to factory defaults"}
                                                              >
                                                                {language === "de" ? "Alle zurücksetzen" : "Reset All"}
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  const newStatuses = tempCustomStatuses.map(ts => ({ name: ts.name.trim(), color: ts.color })).filter(ts => ts.name);
                                                                  let updatedPresets = [...exportPresets];
                                                                  let presetsChanged = false;
                                                                  tempCustomStatuses.forEach(ts => {
                                                                    if (ts.name.trim() && ts.name !== ts.originalName) {
                                                                      updatedPresets = updatedPresets.map(p => {
                                                                        if (p.status === ts.originalName) {
                                                                          presetsChanged = true;
                                                                          return { ...p, status: ts.name.trim() };
                                                                        }
                                                                        return p;
                                                                      });
                                                                    }
                                                                  });
                                                                  setCustomStatuses(newStatuses);
                                                                  try {
                                                                    localStorage.setItem("fcb_miasanai_custom_categories", JSON.stringify(newStatuses));
                                                                  } catch(e) {}
                                                                  if (presetsChanged) {
                                                                    setExportPresets(updatedPresets);
                                                                  }
                                                                  setShowManageStatusesPanel(false);
                                                                }}
                                                                className="px-2 py-0.5 bg-emerald-900/60 text-emerald-400 hover:bg-emerald-800/80 hover:text-emerald-300 border border-emerald-800/80 rounded font-bold text-[6px] transition-all cursor-pointer"
                                                              >
                                                                {language === "de" ? "Alle speichern" : "Save All Changes"}
                                                              </button>
                                                            </div>
                                                          </div>
                                                          {tempCustomStatuses.length === 0 ? (
                                                            <div className="text-[6px] text-slate-500 italic py-2">{language === "de" ? "Keine benutzerdefinierten Kategorien vorhanden." : "No custom categories exist."}</div>
                                                          ) : (
                                                            <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                                              {tempCustomStatuses.map((ts, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 bg-slate-950/50 p-1 border border-slate-900/50 rounded">
                                                                  <div className="relative w-3 h-3 rounded-full overflow-hidden shrink-0 border border-slate-800 cursor-pointer" style={{ backgroundColor: ts.color }}>
                                                                    <input
                                                                      type="color"
                                                                      value={ts.color}
                                                                      onChange={(e) => {
                                                                        const updated = [...tempCustomStatuses];
                                                                        updated[idx].color = e.target.value;
                                                                        setTempCustomStatuses(updated);
                                                                      }}
                                                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                                    />
                                                                  </div>
                                                                  <input
                                                                    type="text"
                                                                    value={ts.name}
                                                                    onChange={(e) => {
                                                                      const updated = [...tempCustomStatuses];
                                                                      updated[idx].name = e.target.value;
                                                                      setTempCustomStatuses(updated);
                                                                    }}
                                                                    className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 text-[6px] rounded outline-none focus:border-cyan-500/50"
                                                                    placeholder={language === "de" ? "Name" : "Name"}
                                                                  />
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setTempCustomStatuses(tempCustomStatuses.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="text-red-500 hover:text-red-400 p-0.5"
                                                                    title={language === "de" ? "Kategorie entfernen" : "Remove Category"}
                                                                  >
                                                                    <Trash2 className="h-2 w-2" />
                                                                  </button>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>

                                                    </div>
                                                  </motion.div>
                                                );
                                              })()}

                                              
                                              <div className="flex flex-col gap-1">
                                                {/* Clone / Duplicate existing settings select */}
                                                <div className="flex items-center gap-1.5 text-[7px] font-mono mb-1 bg-slate-900/40 p-1.5 rounded border border-slate-850/60 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                                                  <span className="text-slate-400 shrink-0 font-bold uppercase tracking-wider text-[6.5px] flex items-center gap-0.5">
                                                    <Copy className="h-2 w-2 text-cyan-400" />
                                                    {language === "de" ? "Preset Klonen:" : "Clone Preset:"}
                                                  </span>
                                                  <div className="relative flex items-center">
                                                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 text-slate-500" />
                                                    <input
                                                      type="text"
                                                      value={clonePresetSearchQuery}
                                                      onChange={(e) => setClonePresetSearchQuery(e.target.value)}
                                                      placeholder={language === "de" ? "Suchen..." : "Search..."}
                                                      className="bg-slate-950 border border-slate-800 focus:border-cyan-700/50 text-slate-300 rounded pl-4 pr-1 py-0.5 text-[7px] font-mono outline-none transition-all w-20"
                                                    />
                                                  </div>
                                                  <select
                                                    id="preset-save-clone-select"
                                                    onChange={(e) => {
                                                      const selectedId = e.target.value;
                                                      if (!selectedId) return;
                                                      const sourcePreset = exportPresets.find(p => p.id === selectedId);
                                                      if (sourcePreset) {
                                                        setNewPresetName(language === "de" ? `${sourcePreset.nameDe || sourcePreset.name} Kopie` : `${sourcePreset.name} Copy`);
                                                        setNewPresetDescription(sourcePreset.description || "");
                                                        setNewPresetNotes(sourcePreset.notes || "");
                                                        setPresetSaveStatus(sourcePreset.status || "Draft");
                                                        setPresetSaveParentCategory(sourcePreset.category || "");
                                                        setPresetSaveSeason(sourcePreset.season || "");
                                                        setPresetSaveMatchday(sourcePreset.matchday || "");
                                                        
                                                        // Load multi-selected seasons
                                                        let loadedSeasons: string[] = [];
                                                        if (Array.isArray(sourcePreset.seasons)) {
                                                          loadedSeasons = sourcePreset.seasons;
                                                        } else if (sourcePreset.season) {
                                                          loadedSeasons = sourcePreset.season.split(",").map((s: any) => s.trim()).filter(Boolean);
                                                        }
                                                        setPresetSaveSeasons(loadedSeasons);

                                                        // Load multi-selected matchdays
                                                        let loadedMatchdays: string[] = [];
                                                        if (Array.isArray(sourcePreset.matchdays)) {
                                                          loadedMatchdays = sourcePreset.matchdays;
                                                        } else if (sourcePreset.matchday) {
                                                          loadedMatchdays = sourcePreset.matchday.split(",").map((m: any) => m.trim()).filter(Boolean);
                                                        }
                                                        setPresetSaveMatchdays(loadedMatchdays);
                                                        
                                                        // Load the DSP settings
                                                        setCompressorEnabled(sourcePreset.compressorEnabled);
                                                        setIsNormalized(sourcePreset.isNormalized);
                                                        setFadeInDuration(sourcePreset.fadeInDuration);
                                                        setFadeOutDuration(sourcePreset.fadeOutDuration);
                                                        setNoiseGateThreshold(sourcePreset.noiseGateThreshold);
                                                        
                                                        setCompLowThreshold(sourcePreset.compLowThreshold);
                                                        setCompLowRatio(sourcePreset.compLowRatio);
                                                        setCompLowMakeup(sourcePreset.compLowMakeup);
                                                        
                                                        setCompMidThreshold(sourcePreset.compMidThreshold);
                                                        setCompMidRatio(sourcePreset.compMidRatio);
                                                        setCompMidMakeup(sourcePreset.compMidMakeup);
                                                        
                                                        setCompHighThreshold(sourcePreset.compHighThreshold);
                                                        setCompHighRatio(sourcePreset.compHighRatio);
                                                        setCompHighMakeup(sourcePreset.compHighMakeup);

                                                        handleAddLog({
                                                          id: `preset-clone-form-${Date.now()}`,
                                                          timestamp: new Date().toLocaleTimeString(),
                                                          source: "Preset Manager",
                                                          level: "SUCCESS",
                                                          message: language === "de"
                                                            ? `Einstellungen von '${sourcePreset.nameDe || sourcePreset.name}' in das Formular kopiert.`
                                                            : `Copied settings from '${sourcePreset.name}' into form.`
                                                        });
                                                      }
                                                      // Reset select value to default placeholder
                                                      e.target.value = "";
                                                    }}
                                                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[7px] font-mono cursor-pointer outline-none min-w-0 hover:border-slate-700 transition"
                                                    defaultValue=""
                                                  >
                                                    <option value="" disabled>
                                                      {language === "de" ? "-- Preset zum Klonen auswählen --" : "-- Select preset to clone --"}
                                                    </option>
                                                    {exportPresets.filter(p => {
                                                        if (!clonePresetSearchQuery.trim()) return true;
                                                        const q = clonePresetSearchQuery.toLowerCase();
                                                        return (p.name && p.name.toLowerCase().includes(q)) || (p.nameDe && p.nameDe.toLowerCase().includes(q));
                                                    }).map(p => (
                                                      <option key={p.id} value={p.id}>
                                                        {language === "de" ? p.nameDe || p.name : p.name} ({p.category.split("/").pop() || p.category})
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>

                                                {/* Add custom category directly from the form */}
                                                <div className="flex items-center gap-1.5 text-[7px] font-mono mb-1 bg-slate-900/40 p-1.5 rounded border border-slate-850/60 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                                                  <span className="text-slate-400 shrink-0 font-bold uppercase tracking-wider text-[6.5px] flex items-center gap-0.5">
                                                    <FolderPlus className="h-2.5 w-2.5 text-cyan-400" />
                                                    {language === "de" ? "Neue Kat:" : "New Cat:"}
                                                  </span>
                                                  <input
                                                    id="preset-save-new-category-direct-input"
                                                    type="text"
                                                    value={presetFormNewCategory}
                                                    onChange={(e) => setPresetFormNewCategory(e.target.value)}
                                                    placeholder={language === "de" ? "Kategorie-Name..." : "Category name..."}
                                                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[7px] font-mono outline-none hover:border-slate-700 focus:border-cyan-500/50 transition min-w-0"
                                                    maxLength={24}
                                                  />
                                                  <button
                                                    id="preset-save-add-category-direct-btn"
                                                    type="button"
                                                    onClick={handleCreateCategoryFromPresetForm}
                                                    disabled={!presetFormNewCategory.trim()}
                                                    className={`px-2 py-0.5 rounded text-[6.5px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-0.5 shrink-0 select-none ${
                                                      presetFormNewCategory.trim()
                                                        ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 active:scale-95"
                                                        : "bg-slate-950 border-slate-850 text-slate-600 cursor-not-allowed border-slate-900"
                                                    }`}
                                                  >
                                                    <Plus className="h-2 w-2" />
                                                    {language === "de" ? "Ordner Erstellen" : "Add Category"}
                                                  </button>
                                                </div>

                                                <div className="flex gap-1 items-center">
                                                  <input
                                                    id="preset-save-name-input"
                                                    type="text"
                                                    value={newPresetName}
                                                    onChange={(e) => {
                                                      setNewPresetName(e.target.value);
                                                      if (e.target.value.trim() && presetSaveError) {
                                                        setPresetSaveError(null);
                                                      }
                                                    }}
                                                    placeholder={language === "de" ? "Preset Name (z.B. Podcast-Mix)..." : "Preset Name (e.g., Podcast Mix)..."}
                                                    className={`flex-1 bg-slate-950 border text-slate-200 text-[8.5px] rounded px-1.5 py-0.5 outline-none font-mono transition-all ${
                                                      presetSaveError 
                                                        ? "border-rose-500/80 focus:border-rose-400 placeholder:text-rose-900/50 shadow-[0_0_8px_rgba(239,68,68,0.15)]" 
                                                        : "border-slate-800 focus:border-slate-700 placeholder:text-slate-600"
                                                    }`}
                                                    maxLength={24}
                                                  />
                                                  <button
                                                    id="preset-ai-categorize-btn"
                                                    type="button"
                                                    onClick={handleFetchCategorySuggestions}
                                                    disabled={isSuggestingCategory || !newPresetName.trim()}
                                                    className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold flex items-center gap-0.5 select-none shrink-0 border transition-all ${
                                                      newPresetName.trim()
                                                        ? "bg-purple-950/40 border-purple-800/80 hover:border-purple-600 text-purple-300 hover:bg-purple-900/30 active:scale-95 cursor-pointer"
                                                        : "bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed"
                                                    }`}
                                                    title={language === "de" ? "Kategorie per AI vorschlagen" : "Suggest category via AI"}
                                                  >
                                                    {isSuggestingCategory ? (
                                                      <span className="animate-spin text-[6.5px]">⏳</span>
                                                    ) : (
                                                      <span>✨</span>
                                                    )}
                                                    <span>AI</span>
                                                  </button>
                                                </div>



                                                {/* AI Category Suggestions Area */}
                                                {(isSuggestingCategory || aiCategorySuggestions.length > 0) && (
                                                  <div id="preset-ai-category-suggestions" className="bg-purple-950/10 border border-purple-900/30 rounded p-1.5 font-mono text-[7px] flex flex-col gap-1 w-full">
                                                    <div className="flex items-center gap-1 text-purple-400 font-bold uppercase tracking-wider text-[6.5px]">
                                                      <span>✨</span>
                                                      <span>{language === "de" ? "KI-Kategorievorschläge:" : "AI Category Suggestions:"}</span>
                                                    </div>
                                                    {isSuggestingCategory ? (
                                                      <div className="text-slate-400 italic text-[6.5px] flex items-center gap-1 py-0.5">
                                                        <span className="animate-pulse">●</span>
                                                        <span>{language === "de" ? "Analysiere Preset-Eigenschaften..." : "Analyzing preset characteristics..."}</span>
                                                      </div>
                                                    ) : (
                                                      <div className="flex flex-col gap-1">
                                                        <div className="flex flex-wrap gap-1">
                                                          {aiCategorySuggestions.map((suggestion, idx) => (
                                                            <button
                                                              key={idx}
                                                              type="button"
                                                              onClick={() => handleSelectCategorySuggestion(suggestion)}
                                                              className="px-1.5 py-0.5 rounded bg-purple-900/20 border border-purple-800/40 hover:bg-purple-800/40 hover:border-purple-500/80 text-purple-200 transition-all text-[6.5px] font-bold cursor-pointer flex items-center gap-1 active:scale-95"
                                                              title={suggestion.reason}
                                                            >
                                                              <span>{suggestion.name}</span>
                                                              {suggestion.isExisting && (
                                                                <span className="text-[5.5px] bg-cyan-900/60 text-cyan-300 px-0.5 rounded border border-cyan-800/50">
                                                                  {language === "de" ? "Existiert" : "Exists"}
                                                                </span>
                                                              )}
                                                            </button>
                                                          ))}
                                                        </div>
                                                        <div className="text-slate-500 text-[6px] italic leading-tight mt-0.5">
                                                          {language === "de"
                                                            ? "* Klicke auf einen Vorschlag, um ihn als Kategorie festzulegen."
                                                            : "* Click a suggestion to set it as the preset's category."}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                {presetSaveError && (
                                                  <span className="text-[7px] text-rose-400 font-mono font-bold leading-none flex items-center gap-1 py-0.5">
                                                    <span>⚠️</span>
                                                    <span>{presetSaveError}</span>
                                                  </span>
                                                )}
                                              </div>

                                              {/* Real-time status toggler/selector */}
                                              <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between text-[7.5px] font-mono flex-wrap gap-1">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">{language === "de" ? "Status:" : "Status:"}</span>
                                                    <div className="flex gap-1" id="preset-save-status-wrapper">
                                                      {(["Draft", "Needs Work", "Approved"] as const).map((st) => {
                                                        const isSel = presetSaveStatus === st;
                                                        const label = st === "Approved" ? (language === "de" ? "Freigegeben" : "Approved")
                                                          : st === "Draft" ? (language === "de" ? "Entwurf" : "Draft")
                                                          : (language === "de" ? "Überarbeiten" : "Needs Work");
                                                        return (
                                                          <button
                                                            key={st}
                                                            type="button"
                                                            onClick={() => setPresetSaveStatus(st)}
                                                            className={`px-1.5 py-[2px] rounded border text-[6px] font-mono leading-none transition-all cursor-pointer select-none ${
                                                              isSel 
                                                                ? (st === "Approved" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.15)]" 
                                                                   : st === "Draft" ? "bg-slate-500/20 border-slate-500/50 text-slate-200 font-bold shadow-[0_0_8px_rgba(100,116,139,0.15)]"
                                                                   : "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.15)]")
                                                                : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                                                            }`}
                                                            title={language === "de" ? `Als '${label}' markieren` : `Mark as '${label}'`}
                                                          >
                                                            {label}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                  
                                                  </div>

                                                {/* Expanded Interactive Status Legend Card */}
                                                {showStatusLegend && (
                                                  <div 
                                                    id="preset-status-legend-card"
                                                    className="bg-slate-950 border border-slate-900/80 rounded-lg p-2.5 mt-1 font-mono text-[7px] leading-normal text-slate-300 flex flex-col gap-2 shadow-xl animate-fadeIn"
                                                  >
                                                    <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                                                      <span className="text-[7.5px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                                        <Info className="h-2 w-2 text-cyan-400" />
                                                        {language === "de" ? "Preset Lebenszyklus-Leitfaden" : "Preset Lifecycle Guide"}
                                                      </span>
                                                      <button 
                                                        type="button" 
                                                        onClick={() => setShowStatusLegend(false)}
                                                        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                                      >
                                                        <X className="h-2.5 w-2.5" />
                                                      </button>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                      {/* Draft */}
                                                      <div 
                                                        className={`flex items-start gap-2 cursor-pointer hover:bg-slate-900/50 p-1.5 rounded border transition-all ${
                                                          presetSaveStatus === "Draft" 
                                                            ? "bg-slate-900/40 border-slate-700" 
                                                            : "bg-transparent border-transparent"
                                                        }`}
                                                        onClick={() => setPresetSaveStatus("Draft")}
                                                        title={language === "de" ? "Als Entwurf auswählen" : "Select Draft status"}
                                                      >
                                                        <span className={`px-1.5 py-[1px] rounded text-[5.5px] uppercase font-bold shrink-0 mt-0.5 border ${
                                                          presetSaveStatus === "Draft" 
                                                            ? "bg-slate-500/20 border-slate-500 text-slate-200" 
                                                            : "bg-slate-950 border-slate-800 text-slate-500"
                                                        }`}>
                                                          {language === "de" ? "Entwurf" : "Draft"}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                          <p className={`font-bold text-[7.5px] ${presetSaveStatus === "Draft" ? "text-slate-200" : "text-slate-400"}`}>
                                                            {language === "de" ? "Arbeit in Arbeit (WIP)" : "Work in Progress (WIP)"}
                                                          </p>
                                                          <p className="text-slate-400 text-[6.5px] mt-0.5 leading-tight">
                                                            {language === "de" 
                                                              ? "Noch nicht fertiggestellt. Dient zum Testen und Verfeinern im Editor, bevor es freigegeben wird." 
                                                              : "Not finalized yet. Used for sandbox testing and iterative fine-tuning in the editor before official release."}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      {/* Needs Work */}
                                                      <div 
                                                        className={`flex items-start gap-2 cursor-pointer hover:bg-slate-900/50 p-1.5 rounded border transition-all ${
                                                          presetSaveStatus === "Needs Work" 
                                                            ? "bg-amber-950/20 border-amber-800/40" 
                                                            : "bg-transparent border-transparent"
                                                        }`}
                                                        onClick={() => setPresetSaveStatus("Needs Work")}
                                                        title={language === "de" ? "Als Überarbeiten auswählen" : "Select Needs Work status"}
                                                      >
                                                        <span className={`px-1.5 py-[1px] rounded text-[5.5px] uppercase font-bold shrink-0 mt-0.5 border ${
                                                          presetSaveStatus === "Needs Work" 
                                                            ? "bg-amber-500/20 border-amber-500 text-amber-300" 
                                                            : "bg-slate-950 border-slate-800 text-slate-500"
                                                        }`}>
                                                          {language === "de" ? "Überarbeiten" : "Needs Work"}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                          <p className={`font-bold text-[7.5px] ${presetSaveStatus === "Needs Work" ? "text-amber-300" : "text-slate-400"}`}>
                                                            {language === "de" ? "Überarbeitung erforderlich" : "Requires Revision"}
                                                          </p>
                                                          <p className="text-slate-400 text-[6.5px] mt-0.5 leading-tight">
                                                            {language === "de" 
                                                              ? "Ein Preset mit Fehlern, Artefakten oder Handlungsbedarf basierend auf Test-Resultaten." 
                                                              : "A preset with issues, unwanted audio artifacts, or flagged for revision based on trial exports."}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      {/* Approved */}
                                                      <div 
                                                        className={`flex items-start gap-2 cursor-pointer hover:bg-slate-900/50 p-1.5 rounded border transition-all ${
                                                          presetSaveStatus === "Approved" 
                                                            ? "bg-emerald-950/20 border-emerald-800/40" 
                                                            : "bg-transparent border-transparent"
                                                        }`}
                                                        onClick={() => setPresetSaveStatus("Approved")}
                                                        title={language === "de" ? "Als Freigegeben auswählen" : "Select Approved status"}
                                                      >
                                                        <span className={`px-1.5 py-[1px] rounded text-[5.5px] uppercase font-bold shrink-0 mt-0.5 border ${
                                                          presetSaveStatus === "Approved" 
                                                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" 
                                                            : "bg-slate-950 border-slate-800 text-slate-500"
                                                        }`}>
                                                          {language === "de" ? "Freigegeben" : "Approved"}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                          <p className={`font-bold text-[7.5px] ${presetSaveStatus === "Approved" ? "text-emerald-300" : "text-slate-400"}`}>
                                                            {language === "de" ? "Produktionsbereit" : "Production Ready"}
                                                          </p>
                                                          <p className="text-slate-400 text-[6.5px] mt-0.5 leading-tight">
                                                            {language === "de" 
                                                              ? "Vollständig validiert. Bereit für die automatische Freigabe in Social-Media-Pipeline-Kampagnen." 
                                                              : "Fully verified and validated. Locked and ready for seamless automatic export into active social campaign pipelines."}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="text-[5.5px] text-slate-500 border-t border-slate-900 pt-1.5 text-center font-bold flex items-center justify-center gap-1">
                                                      <span>💡</span>
                                                      <span>
                                                        {language === "de" 
                                                          ? "Tipp: Klicke auf eine Status-Zeile oben, um diesen Status direkt auszuwählen!" 
                                                          : "Tip: Click any status row above to select that lifecycle state directly!"}
                                                      </span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              

                                              <div className="flex items-center gap-1.5 flex-wrap" id="preset-save-category-wrapper">
                                                <div className="w-full mb-1 flex items-center justify-between border-b border-slate-900/50 pb-1">
                                                  <div className="text-[7.5px] font-mono font-bold text-slate-400">
                                                    {isBatchMode ? (language === "de" ? "Batch-Verarbeitung" : "Batch Processing") : (language === "de" ? "Einzel-Bearbeitung" : "Single Preset Editing")}
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <div className="relative flex items-center">
                                                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                        <Search className="h-2 w-2" />
                                                      </div>
                                                      <input
                                                        type="text"
                                                        value={presetListFilter}
                                                        onChange={(e) => setPresetListFilter(e.target.value)}
                                                        placeholder={language === "de" ? "Filter..." : "Filter..."}
                                                        className="bg-slate-950 border border-slate-800 text-slate-300 rounded pl-4 pr-1.5 py-[1px] text-[6.5px] font-mono outline-none hover:border-slate-700 focus:border-cyan-500/50 transition w-24"
                                                        title={language === "de" ? "Presets nach Name, Beschreibung oder Status filtern" : "Filter presets by name, description, or status"}
                                                      />
                                                      {presetListFilter && (
                                                        <button
                                                          type="button"
                                                          onClick={() => setPresetListFilter("")}
                                                          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                        >
                                                          <X className="h-2 w-2" />
                                                        </button>
                                                      )}
                                                    </div>
                                                    <button
                                                    type="button"
                                                    id="status-legend-toggle"
                                                    onClick={() => setShowStatusLegend(!showStatusLegend)}
                                                    className={`flex items-center gap-0.5 cursor-pointer select-none border rounded px-1 py-[1.5px] leading-none text-[6.5px] font-mono transition-all ${
                                                      showStatusLegend 
                                                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold" 
                                                        : "bg-cyan-950/25 border-cyan-900/30 text-cyan-400 hover:bg-cyan-900/30 hover:border-cyan-700/50"
                                                    }`}
                                                    title={language === "de" ? "Status-Legende anzeigen/ausblenden" : "Show/hide status legend"}
                                                  >
                                                    <HelpCircle className="h-2 w-2 text-cyan-400 shrink-0" />
                                                    <span>{language === "de" ? "Lebenszyklus-Guide" : "Lifecycle Guide"}</span>
                                                  </button>
                                                
                                                    {isBatchMode && (
                                                      <div className="relative flex items-center gap-1.5">
                                                        {visibleSelectedCount > 0 && (
                                                          <div className="flex items-center gap-1 mr-1" title={language === "de" ? "Genehmigt / Ausgewählt" : "Approved / Selected"}>
                                                            {(() => {
                                                              const filteredExport = filteredExportForBatch;
                                                              const visibleSelected = filteredExport.filter(p => batchSelectedPresets.includes(p.id));
                                                              const selectedCount = visibleSelected.length;
                                                              const approvedCount = visibleSelected.filter(p => p.status === 'Approved').length;
                                                              if (selectedCount === 0) return null;
                                                              const progress = Math.round((approvedCount / selectedCount) * 100);
                                                              const radius = 6;
                                                              const circumference = 2 * Math.PI * radius;
                                                              const strokeDashoffset = circumference - (progress / 100) * circumference;
                                                              return (
                                                                <>
                                                                  <div className="relative w-4 h-4 flex items-center justify-center">
                                                                    <svg className="w-4 h-4 transform -rotate-90">
                                                                      <circle 
                                                                        cx="8" cy="8" r="6" 
                                                                        stroke="currentColor" strokeWidth="2" 
                                                                        fill="transparent" 
                                                                        className="text-slate-800" 
                                                                      />
                                                                      <circle 
                                                                        cx="8" cy="8" r="6" 
                                                                        stroke="currentColor" strokeWidth="2" 
                                                                        fill="transparent" 
                                                                        strokeDasharray={circumference} 
                                                                        strokeDashoffset={strokeDashoffset} 
                                                                        className="text-emerald-500 transition-all duration-300" 
                                                                      />
                                                                    </svg>
                                                                  </div>
                                                                  <span className="text-[6px] font-mono font-bold text-slate-400">
                                                                    {progress}%
                                                                  </span>
                                                                </>
                                                              );
                                                            })()}
                                                          </div>
                                                        )}
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            if (visibleSelectedCount > 0) {
                                                              const updated = exportPresets.map(p => {
                                                                if (!batchSelectedPresets.includes(p.id)) return p;
                                                                if (presetListFilter.trim()) {
                                                                  const q = presetListFilter.toLowerCase();
                                                                  const matches = (p.name && p.name.toLowerCase().includes(q)) ||
                                                                                  (p.description && p.description.toLowerCase().includes(q)) ||
                                                                                  (p.status && p.status.toLowerCase().includes(q));
                                                                  if (!matches) return p;
                                                                }
                                                                return { ...p, status: 'Approved' };
                                                              });
                                                              setExportPresets(updated);
                                                              setPresetSaveError(language === "de" ? "Status 'Approved' angewendet!" : "Status 'Approved' applied!");
                                                              setTimeout(() => setPresetSaveError(null), 2500);
                                                            }
                                                          }}
                                                          disabled={visibleSelectedCount === 0}
                                                          className={`px-1.5 py-[2px] text-[6px] uppercase font-bold rounded border transition-colors flex items-center gap-1 ${
                                                            visibleSelectedCount > 0
                                                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400'
                                                              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                          }`}
                                                          title={language === "de" ? "Ausgewählte genehmigen" : "Approve selected"}
                                                        >
                                                          <CheckCircle2 className="h-2 w-2" />
                                                          <span>Approve</span>
                                                        </button>
                                                        
                                                        <button
                                                          type="button"
                                                          onClick={() => setShowBatchStatsPopover(!showBatchStatsPopover)}
                                                          disabled={visibleSelectedCount === 0}
                                                          className={`px-1.5 py-[2px] text-[6px] uppercase font-bold rounded border transition-colors flex items-center gap-1 ${
                                                            showBatchStatsPopover 
                                                              ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300' 
                                                              : visibleSelectedCount > 0
                                                                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-fuchsia-400 hover:border-fuchsia-700/50'
                                                                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                          }`}
                                                          title={language === "de" ? "Batch-Statistiken anzeigen" : "View Batch Stats"}
                                                        >
                                                          <BarChart2 className="h-2 w-2" />
                                                          <span>Stats</span>
                                                        </button>
                                                        
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            if (visibleSelectedCount > 0) {
                                                              const selectedPresetsData = exportPresets.filter(p => batchSelectedPresets.includes(p.id));
                                                              const jsonStr = JSON.stringify(selectedPresetsData, null, 2);
                                                              const blob = new Blob([jsonStr], { type: "application/json" });
                                                              const url = URL.createObjectURL(blob);
                                                              const link = document.createElement("a");
                                                              link.href = url;
                                                              link.download = `fcb_bulk_presets_${new Date().toISOString().slice(0, 10)}.json`;
                                                              document.body.appendChild(link);
                                                              link.click();
                                                              document.body.removeChild(link);
                                                              URL.revokeObjectURL(url);
                                                            }
                                                          }}
                                                          disabled={visibleSelectedCount === 0}
                                                          className={`px-1.5 py-[2px] text-[6px] uppercase font-bold rounded border transition-colors flex items-center gap-1 ${
                                                            visibleSelectedCount > 0
                                                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 hover:border-amber-400'
                                                              : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                          }`}
                                                          title={language === "de" ? "Ausgewählte Presets exportieren" : "Bulk Export Selected"}
                                                        >
                                                          <Download className="h-2 w-2" />
                                                          <span>Export</span>
                                                        </button>

                                                        <div className="relative flex items-center">
                                                          <select
                                                            className={`px-1.5 py-[2px] pr-4 text-[6px] uppercase font-bold rounded border transition-colors outline-none cursor-pointer appearance-none ${visibleSelectedCount > 0 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}
                                                            value=""
                                                            disabled={visibleSelectedCount === 0}
                                                            onChange={(e) => {
                                                              const val = e.target.value;
                                                              if (val && visibleSelectedCount > 0) {
                                                                const updated = exportPresets.map(p => {
                                                                  if (!batchSelectedPresets.includes(p.id)) return p;
                                                                  if (presetListFilter.trim()) {
                                                                    const q = presetListFilter.toLowerCase();
                                                                    const matches = (p.name && p.name.toLowerCase().includes(q)) ||
                                                                                    (p.description && p.description.toLowerCase().includes(q)) ||
                                                                                    (p.status && p.status.toLowerCase().includes(q));
                                                                    if (!matches) return p;
                                                                  }
                                                                  return { ...p, status: val };
                                                                });
                                                                setExportPresets(updated);
                                                                setPresetSaveError(language === "de" ? `Status '${val}' angewendet!` : `Status '${val}' applied!`);
                                                                setTimeout(() => setPresetSaveError(null), 2500);
                                                              }
                                                            }}
                                                            title={language === "de" ? "Status-Schnellauswahl für Batch" : "Quick Status selection for Batch"}
                                                          >
                                                            <option value="" disabled hidden>{language === "de" ? "Status ändern..." : "Change Status..."}</option>
                                                            <option value="Draft">Draft</option>
                                                            <option value="Needs Work">Needs Work</option>
                                                            <option value="Approved">Approved</option>
                                                            {customStatuses.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                          </select>
                                                          <div className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none ${visibleSelectedCount > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                                                            <Zap className="h-1.5 w-1.5" />
                                                          </div>
                                                        </div>
                                                        
                                                        <AnimatePresence>
                                                          {showBatchStatsPopover && visibleSelectedCount > 0 && (
                                                            <motion.div
                                                              initial={{ opacity: 0, y: -5 }}
                                                              animate={{ opacity: 1, y: 0 }}
                                                              exit={{ opacity: 0, y: -5 }}
                                                              transition={{ duration: 0.15 }}
                                                              className="absolute right-0 top-full mt-2 w-48 bg-[#0a0b0e] border border-slate-800 rounded-lg shadow-xl shadow-black/50 z-50 p-2 pointer-events-auto"
                                                            >
                                                              <div className="text-[7.5px] font-bold text-slate-400 mb-2 border-b border-slate-800 pb-1">
                                                                {language === "de" ? "Batch-Status Verteilung" : "Batch Status Distribution"}
                                                              </div>
                                                              <div className="flex flex-col gap-1.5">
                                                                {(() => {
                                                                  const selected = exportPresets.filter(p => {
                                                                    if (!batchSelectedPresets.includes(p.id)) return false;
                                                                    if (!presetListFilter.trim()) return true;
                                                                    const q = presetListFilter.toLowerCase();
                                                                    return (
                                                                      (p.name && p.name.toLowerCase().includes(q)) ||
                                                                      (p.description && p.description.toLowerCase().includes(q)) ||
                                                                      (p.status && p.status.toLowerCase().includes(q))
                                                                    );
                                                                  });
                                                                  const total = selected.length;
                                                                  const counts = selected.reduce<Record<string, number>>((acc, curr) => {
                                                                    acc[curr.status || 'Draft'] = (acc[curr.status || 'Draft'] || 0) + 1;
                                                                    return acc;
                                                                  }, {});
                                                                  
                                                                  return Object.entries(counts).map(([status, count]) => {
                                                                    const pct = (count / total) * 100;
                                                                    let colorClass = "bg-slate-500";
                                                                    if (status === "Draft") colorClass = "bg-slate-400";
                                                                    else if (status === "Needs Work") colorClass = "bg-amber-400";
                                                                    else if (status === "Approved") colorClass = "bg-emerald-400";
                                                                    else colorClass = "bg-cyan-400";
                                                                    
                                                                    return (
                                                                      <div key={status} className="flex flex-col gap-0.5">
                                                                        <div className="flex items-center justify-between text-[6.5px] font-mono">
                                                                          <span className="text-slate-300">{status}</span>
                                                                          <span className="text-slate-500">{count} ({pct.toFixed(0)}%)</span>
                                                                        </div>
                                                                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                                          <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
                                                                        </div>
                                                                      </div>
                                                                    );
                                                                  });
                                                                })()}
                                                              </div>
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </div>
                                                    )}
                                                    <button
                                                      type="button"
                                                      onClick={() => setIsBatchMode(!isBatchMode)}
                                                      className={`px-1.5 py-[2px] text-[6px] uppercase font-bold rounded border transition-colors flex items-center gap-1 ${isBatchMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-cyan-400'}`}
                                                    >
                                                      <ListChecks className="h-2 w-2" />
                                                      {language === "de" ? "Batch Mode" : "Batch Mode"}
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => setIsSchemaEditorOpen(true)}
                                                        className="px-1.5 py-[2px] text-[6px] uppercase font-bold rounded border bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors flex items-center gap-1"
                                                      >
                                                        <FileJson className="h-2 w-2" />
                                                        <span>{language === "de" ? "Schema Editor" : "Open Schema Editor"}</span>
                                                      </button>
                                                      <span id="schema-rules-badge" className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[8px] font-bold shadow-md border border-indigo-400 flex items-center justify-center min-w-[16px]">
                                                        {schemaRules.length}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {isBatchMode ? (
                                                  <div className="w-full flex flex-col gap-2 relative mt-1">
                                                    <div className="flex gap-1.5 w-full items-center">
                                                      <div className="relative flex-1">
                                                        <input
                                                          type="text"
                                                          value={batchPresetSearchQuery}
                                                          onChange={(e) => setBatchPresetSearchQuery(e.target.value)}
                                                          placeholder={language === "de" ? "Presets nach Name / Beschreibung filtern..." : "Filter presets by name or description..."}
                                                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-700/50 rounded pl-6 pr-2 py-1 text-[7.5px] font-mono text-slate-200 placeholder:text-slate-600 outline-none transition-all"
                                                        />
                                                        <Search className="absolute left-1.5 top-[5px] h-3 w-3 text-slate-500 pointer-events-none" />
                                                        {batchPresetSearchQuery && (
                                                          <button 
                                                            onClick={() => setBatchPresetSearchQuery("")}
                                                            className="absolute right-1 top-[5px] text-slate-500 hover:text-slate-300"
                                                          >
                                                            <X className="h-3 w-3" />
                                                          </button>
                                                        )}
                                                      </div>
                                                      <button
                                                        onClick={() => setBatchShowNeedsWorkDraftOnly(!batchShowNeedsWorkDraftOnly)}
                                                        title={language === "de" ? "Nur 'Needs Work' oder 'Draft' anzeigen" : "Show only 'Needs Work' or 'Draft'"}
                                                        className={`h-[22px] px-2 rounded border flex items-center justify-center transition-colors shrink-0 ${batchShowNeedsWorkDraftOnly ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                                      >
                                                        <Filter className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                    <div className="max-h-[160px] overflow-y-auto border border-slate-800 rounded bg-slate-950/50 p-1 flex flex-col gap-0.5 scrollbar-thin">
                                                      {(() => {
                                                        let filtered = getFilteredPresets();
                                                        if (batchShowNeedsWorkDraftOnly) {
                                                          filtered = filtered.filter(p => p.status === 'Needs Work' || p.status === 'Draft' || !p.status);
                                                        }
                                                        if (batchPresetSearchQuery.trim()) {
                                                          const q = batchPresetSearchQuery.toLowerCase().trim();
                                                          filtered = filtered.filter(p => 
                                                            p.name?.toLowerCase().includes(q) || 
                                                            p.description?.toLowerCase().includes(q) ||
                                                            p.nameDe?.toLowerCase().includes(q)
                                                          );
                                                        }
                                                        return filtered.length === 0 ? (
                                                          <div className="p-2 text-center text-[7.5px] text-slate-500">{language === "de" ? "Keine Presets gefunden." : "No presets found."}</div>
                                                        ) : filtered.map(p => (
                                                          <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-slate-900 rounded cursor-pointer border border-transparent hover:border-slate-800/50">
                                                            <input
                                                              type="checkbox"
                                                              checked={batchSelectedPresets.includes(p.id)}
                                                              onChange={(e) => {
                                                                if (e.target.checked) setBatchSelectedPresets([...batchSelectedPresets, p.id]);
                                                                else setBatchSelectedPresets(batchSelectedPresets.filter(id => id !== p.id));
                                                              }}
                                                              className="h-3 w-3 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                                            />
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                              <span className="text-[8px] font-bold text-slate-300 truncate">{p.name || p.id}</span>
                                                              <span className="text-[6.5px] text-slate-500 truncate">{p.category || 'Root'} • {p.status || 'Draft'}</span>
                                                            </div>
                                                          </label>
                                                        ));
                                                      })()}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between w-full mt-0.5">
                                                      <div className="flex items-center gap-1.5">
                                                        <button 
                                                          type="button"
                                                          onClick={() => {
                                                            let filtered = getFilteredPresets();
                                                            if (batchShowNeedsWorkDraftOnly) {
                                                              filtered = filtered.filter(p => p.status === 'Needs Work' || p.status === 'Draft' || !p.status);
                                                            }
                                                            if (batchPresetSearchQuery.trim()) {
                                                              const q = batchPresetSearchQuery.toLowerCase().trim();
                                                              filtered = filtered.filter(p => 
                                                                p.name?.toLowerCase().includes(q) || 
                                                                p.description?.toLowerCase().includes(q) ||
                                                                p.nameDe?.toLowerCase().includes(q)
                                                              );
                                                            }
                                                            if (batchSelectedPresets.length === filtered.length && filtered.length > 0) {
                                                              setBatchSelectedPresets([]);
                                                            } else {
                                                              setBatchSelectedPresets(filtered.map(p => p.id));
                                                            }
                                                          }}
                                                          className="text-[6px] uppercase font-bold px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors"
                                                        >
                                                          {(() => {
                                                            let filtered = getFilteredPresets();
                                                            if (batchShowNeedsWorkDraftOnly) {
                                                              filtered = filtered.filter(p => p.status === 'Needs Work' || p.status === 'Draft' || !p.status);
                                                            }
                                                            if (batchPresetSearchQuery.trim()) {
                                                              const q = batchPresetSearchQuery.toLowerCase().trim();
                                                              filtered = filtered.filter(p => 
                                                                p.name?.toLowerCase().includes(q) || 
                                                                p.description?.toLowerCase().includes(q) ||
                                                                p.nameDe?.toLowerCase().includes(q)
                                                              );
                                                            }
                                                            return batchSelectedPresets.length === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All";
                                                          })()}
                                                        </button>
                                                        <span className="text-[6.5px] font-mono text-cyan-500/80">{batchSelectedPresets.length} selected</span>
                                                      </div>
                                                    </div>

                                                    <div className={`flex flex-col gap-1.5 mt-1 p-2 border rounded transition-all ${visibleSelectedCount > 0 ? 'border-cyan-900/50 bg-slate-900/30' : 'border-slate-800/50 bg-slate-950/20 opacity-50 pointer-events-none'}`}>
                                                      <div className="flex items-center justify-between w-full">
                                                        <div className="text-[7.5px] font-bold text-slate-300 flex items-center gap-1">
                                                          <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                                                          {language === "de" ? "Batch Update Aktionen" : "Batch Update Actions"}
                                                        </div>
                                                        {visibleSelectedCount > 0 && (() => {
                                                          const selectedPresetsData = exportPresets.filter(p => batchSelectedPresets.includes(p.id));
                                                          const appCount = selectedPresetsData.filter(p => p.status === 'Approved').length;
                                                          const nwCount = selectedPresetsData.filter(p => p.status === 'Needs Work').length;
                                                          const draftCount = selectedPresetsData.filter(p => p.status === 'Draft' || !p.status).length;
                                                          const total = selectedPresetsData.length;
                                                          if (total === 0) return null;
                                                          return (
                                                            <div className="flex items-center w-20 h-1.5 bg-slate-950/80 rounded overflow-hidden shadow-inner border border-slate-800/50" title={`Approved: ${appCount}, Needs Work: ${nwCount}, Draft: ${draftCount}`}>
                                                              {appCount > 0 && <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(appCount / total) * 100}%` }}></div>}
                                                              {nwCount > 0 && <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(nwCount / total) * 100}%` }}></div>}
                                                              {draftCount > 0 && <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${(draftCount / total) * 100}%` }}></div>}
                                                            </div>
                                                          );
                                                        })()}
                                                      </div>
                                                      <div className="flex flex-col gap-0.5 w-full">
                                                        <span className="text-[6.5px] text-slate-500 uppercase tracking-wider font-bold">
                                                          {language === "de" ? "Umbenennen (Muster)" : "Rename (Pattern)"}
                                                        </span>
                                                        <input
                                                          type="text"
                                                          value={batchRenamePattern}
                                                          onChange={(e) => setBatchRenamePattern(e.target.value)}
                                                          placeholder="{name}_{date} or NewName_{index}"
                                                          className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 text-slate-200 text-[8px] rounded px-1.5 py-1 outline-none font-mono placeholder:text-slate-600"
                                                          title={language === "de" ? "Unterstützte Platzhalter: {name}, {date}, {time}, {index}" : "Supported placeholders: {name}, {date}, {time}, {index}"}
                                                        />
                                                      </div>
                                                      <textarea
                                                        value={newPresetDescription}
                                                        onChange={(e) => setNewPresetDescription(e.target.value)}
                                                        placeholder={language === "de" ? "Neue Beschreibung (optional)..." : "New description (optional)..."}
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 text-slate-200 text-[8px] rounded px-1.5 py-1 outline-none font-mono resize-y min-h-[40px]"
                                                      />
                                                      <textarea
                                                        value={newPresetNotes}
                                                        onChange={(e) => setNewPresetNotes(e.target.value)}
                                                        placeholder={language === "de" ? "Neue interne Notizen (optional)..." : "New internal notes (optional)..."}
                                                        className="w-full bg-slate-950/50 border border-slate-800 focus:border-cyan-700/50 text-slate-300 text-[8px] rounded px-1.5 py-1 outline-none font-mono resize-y min-h-[40px]"
                                                      />
                                                      <div className="flex items-center gap-1">
                                                        {presetSaveStatus === "Approved" ? (
                                                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                                                        ) : presetSaveStatus === "Needs Work" ? (
                                                          <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                                                        ) : presetSaveStatus === "Draft" ? (
                                                          <Edit2 className="h-2.5 w-2.5 text-slate-400" />
                                                        ) : (
                                                          <Circle className="h-2.5 w-2.5 text-slate-400" />
                                                        )}
                                                        <span className="text-[7px] text-slate-500 uppercase font-bold">Status:</span>
                                                        <select
                                                          value={presetSaveStatus}
                                                          onChange={(e) => setPresetSaveStatus(e.target.value)}
                                                          className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1 py-0.5 text-[7px] font-mono outline-none"
                                                        >
                                                          <option value="Draft">Draft</option>
                                                          <option value="Needs Work">Needs Work</option>
                                                          <option value="Approved">Approved</option>
                                                          {customStatuses.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 mt-0.5">
                                                        <button
                                                          type="button"
                                                          onClick={() => setBatchSyncToCloud(!batchSyncToCloud)}
                                                          className={`h-3 w-3 rounded flex items-center justify-center border transition-colors ${batchSyncToCloud ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-700 text-transparent'}`}
                                                        >
                                                          <Check className="h-2 w-2" />
                                                        </button>
                                                        <span className="text-[7px] text-slate-400 font-medium">
                                                          {language === "de" ? "In die Cloud synchronisieren" : "Sync to Cloud"}
                                                        </span>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          if (batchSelectedPresets.length === 0) return;
                                                          if (window.confirm(language === "de" ? "Sind Sie sicher, dass Sie alle ausgewählten Presets löschen möchten?" : "Are you sure you want to delete all selected presets?")) {
                                                            setExportPresets(prev => prev.filter(p => !batchSelectedPresets.includes(p.id)));
                                                            setBatchSelectedPresets([]);
                                                          }
                                                        }}
                                                        className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500/50 text-red-400 text-[7.5px] font-bold rounded uppercase tracking-wider transition-colors"
                                                      >
                                                        <Trash2 className="h-2.5 w-2.5" />
                                                        {language === "de" ? "Ausgewählte löschen" : "Delete Selected"}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          if (batchSelectedPresets.length === 0) return;
                                                          let indexCounter = 1;
                                                          const currentDate = new Date();
                                                          const dateStr = currentDate.toISOString().split('T')[0];
                                                          const timeStr = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-');

                                                          const updated = exportPresets.map(p => {
                                                            if (batchSelectedPresets.includes(p.id)) {
                                                              let updatedName = p.name || "Preset";
                                                              if (batchRenamePattern.trim()) {
                                                                updatedName = batchRenamePattern
                                                                  .replace(/{name}/g, updatedName)
                                                                  .replace(/{date}/g, dateStr)
                                                                  .replace(/{time}/g, timeStr)
                                                                  .replace(/{index}/g, indexCounter.toString());
                                                                indexCounter++;
                                                              }
                                                              return { ...p, name: updatedName, description: newPresetDescription || p.description, notes: newPresetNotes || p.notes, status: presetSaveStatus };
                                                            }
                                                            return p;
                                                          });
                                                          setExportPresets(updated);
                                                          setBatchSelectedPresets([]);
                                                          setNewPresetDescription("");
                                                          setNewPresetNotes("");
                                                          setBatchRenamePattern("");
                                                          
                                                          if (batchSyncToCloud) {
                                                            setPresetSaveError(language === "de" ? "Synchronisiere mit der Cloud..." : "Syncing to cloud...");
                                                            setTimeout(() => {
                                                              setPresetSaveError(language === "de" ? "Batch-Update und Cloud-Sync erfolgreich!" : "Batch update and cloud sync successful!");
                                                              setTimeout(() => setPresetSaveError(null), 3000);
                                                            }, 1500);
                                                          } else {
                                                            setPresetSaveError(language === "de" ? "Batch-Update erfolgreich!" : "Batch update successful!");
                                                            setTimeout(() => setPresetSaveError(null), 3000);
                                                          }
                                                        }}
                                                        className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[7.5px] font-bold rounded uppercase tracking-wider transition-colors"
                                                      >
                                                        <Save className="h-2.5 w-2.5" />
                                                        {language === "de" ? "Ausgewählte aktualisieren" : "Update Selected"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <>

                                                <div className="flex w-full mb-1 flex-col gap-1">
                                                  <textarea
                                                    id="preset-save-description-field"
                                                    value={newPresetDescription}
                                                    onChange={(e) => setNewPresetDescription(e.target.value)}
                                                    placeholder={language === "de" ? "Preset Beschreibung (Optional)..." : "Preset Description (Optional)..."}
                                                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 placeholder:text-slate-600 text-slate-200 text-[8.5px] rounded px-1.5 py-1 outline-none font-mono transition-all resize-y min-h-[48px]"
                                                    maxLength={300}
                                                  />
                                                  <textarea
                                                    id="preset-save-notes-field"
                                                    value={newPresetNotes}
                                                    onChange={(e) => setNewPresetNotes(e.target.value)}
                                                    placeholder={language === "de" ? "Interne technische Notizen (Optional)..." : "Internal technical notes (Optional)..."}
                                                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-cyan-700/50 placeholder:text-slate-700 text-slate-300 text-[8.5px] rounded px-1.5 py-1 outline-none font-mono transition-all resize-y min-h-[48px]"
                                                    maxLength={1000}
                                                  />
                                                </div>
                                                <span className="text-[7.5px] font-mono text-slate-500">{language === "de" ? "Kat:" : "Cat:"}</span>
                                                <select
                                                    id="preset-save-category-select"
                                                    value={presetSaveParentCategory}
                                                    onChange={(e) => setPresetSaveParentCategory(e.target.value)}
                                                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1 py-0.5 text-[7.5px] font-mono cursor-pointer outline-none max-w-[110px]"
                                                  >
                                                  <option value="">{language === "de" ? "Hauptverzeichnis" : "Root (None)"}</option>
                                                  {(() => {
                                                    let cats = Array.from(new Set([
                                                      "Technical", 
                                                      "Creative", 
                                                      ...customCategoryPaths, 
                                                      ...exportPresets.map(p => p.category)
                                                    ])).filter(Boolean);
                                                    
                                                    if (presetCategorySortMethod === "alpha") {
                                                      cats.sort((a, b) => a.localeCompare(b));
                                                    } else {
                                                      const defaultCats = ["Technical", "Creative"];
                                                      const dynamicCats = cats.filter(c => !defaultCats.includes(c)).reverse();
                                                      cats = [...defaultCats, ...dynamicCats];
                                                    }
                                                    
                                                    return cats.filter(cat => { if (presetCategorySearchQuery.trim() && !cat.toLowerCase().includes(presetCategorySearchQuery.trim().toLowerCase())) return false; 
                                                      if (!presetCategoryQuickFilterActive || !presetSaveParentCategory) return true;
                                                      return cat === presetSaveParentCategory || cat.startsWith(presetSaveParentCategory + "/");
                                                    }).map(cat => {
                                                      const depth = cat.split("/").length - 1;
                                                      const displayName = "\u00A0\u00A0".repeat(depth) + (depth > 0 ? "└ " : "") + cat.split("/").pop();
                                                      return (
                                                        <option key={cat} value={cat}>
                                                          {displayName}
                                                        </option>
                                                      );
                                                    });
                                                  })()}
                                                </select>
                                                
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setShowInlineCategoryCreate(!showInlineCategoryCreate);
                                                    if (!showInlineCategoryCreate) setInlineCategoryCreateValue("");
                                                  }}
                                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition-colors border border-slate-800 hover:border-emerald-900/50 flex items-center justify-center ml-0.5"
                                                  title={language === "de" ? "Neue Kategorie hinzufügen" : "Add New Category"}
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </button>

                                                <AnimatePresence>
                                                  {showInlineCategoryCreate && (
                                                    <motion.div
                                                      initial={{ width: 0, opacity: 0 }}
                                                      animate={{ width: "auto", opacity: 1 }}
                                                      exit={{ width: 0, opacity: 0 }}
                                                      className="overflow-hidden flex items-center"
                                                    >
                                                      <input
                                                        type="text"
                                                        value={inlineCategoryCreateValue}
                                                        onChange={(e) => setInlineCategoryCreateValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            const newCat = inlineCategoryCreateValue.trim();
                                                            if (newCat && !customCategoryPaths.includes(newCat) && !["Technical", "Creative"].includes(newCat)) {
                                                              setCustomCategoryPaths([...customCategoryPaths, newCat]);
                                                              setPresetSaveParentCategory(newCat);
                                                              setInlineCategoryCreateValue("");
                                                              setShowInlineCategoryCreate(false);
                                                            }
                                                          } else if (e.key === "Escape") {
                                                            setShowInlineCategoryCreate(false);
                                                          }
                                                        }}
                                                        placeholder={language === "de" ? "Neue Kategorie..." : "New category..."}
                                                        className="ml-1 bg-slate-950 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[7.5px] font-mono outline-none max-w-[100px]"
                                                        autoFocus
                                                      />
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>

                                                <div className="relative">
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowSaveCompressionEfficiencyPopover(!showSaveCompressionEfficiencyPopover)}
                                                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors border border-slate-800 hover:border-amber-900/50 flex items-center justify-center ml-0.5"
                                                    title={language === "de" ? "Kompressionseffizienz anzeigen" : "Show Compression Efficiency"}
                                                  >
                                                    <BarChart3 className="h-3 w-3" />
                                                  </button>
                                                  <AnimatePresence>
                                                    {showSaveCompressionEfficiencyPopover && (
                                                      <motion.div
                                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-2xl shadow-amber-900/20"
                                                      >
                                                        {(() => {
                                                          const T = compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold;
                                                          const R = compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio;
                                                          const maxGR = Math.max(0, Math.abs(T) * (1 - 1/Math.max(1, R)));
                                                          const avgGR = maxGR * 0.45;
                                                          const displayName = isBatchMode ? "Batch Edit" : newPresetName || "Selected Preset";
                                                          
                                                          return (
                                                            <div className="space-y-3">
                                                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                  <BarChart3 className="h-3 w-3 text-amber-400" />
                                                                  <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wider">Efficiency - {displayName}</span>
                                                                </div>
                                                                <button onClick={() => setShowSaveCompressionEfficiencyPopover(false)} className="text-slate-500 hover:text-slate-300">
                                                                  <X className="h-2.5 w-2.5" />
                                                                </button>
                                                              </div>
                                                              <div className="bg-slate-950 rounded border border-slate-800/50 p-2">
                                                                <div className="text-[8px] text-slate-500 font-mono mb-1 uppercase">Band: {compressorActiveBand}</div>
                                                                
                                                                <div className="h-24 w-full mt-2">
                                                                  <ResponsiveContainer width="100%" height="100%">
                                                                    <BarChart data={[{name: 'Avg Reduction', value: avgGR, fill: '#fbbf24'}, {name: 'Peak Gain', value: maxGR, fill: '#f43f5e'}]}>
                                                                      <Bar dataKey="value" radius={[2, 2, 0, 0]} />
                                                                    </BarChart>
                                                                  </ResponsiveContainer>
                                                                </div>

                                                                <div className="flex justify-between items-center mt-2 border-t border-slate-800/50 pt-1.5">
                                                                  <span className="text-[8px] text-slate-400">Avg Reduction vs Peak dB Gain</span>
                                                                </div>
                                                                
                                                                <div className="flex justify-between items-center mt-1">
                                                                  <span className="text-[8px] text-slate-400">Ratio Frequency</span>
                                                                  <span className="text-emerald-400 font-mono text-[8px]">{R.toFixed(1)}:1</span>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })()}
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                                <div className="relative">
                                                  <button
                                                    id="preset-save-dsp-feedback-btn"
                                                    type="button"
                                                    onClick={() => setShowDSPFeedbackPopover(!showDSPFeedbackPopover)}
                                                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-violet-400 transition-colors border border-slate-800 hover:border-violet-900/50 flex items-center justify-center ml-0.5"
                                                    title={language === "de" ? "DSP Feedback anzeigen" : "Show DSP Feedback"}
                                                  >
                                                    <Info className="h-3 w-3" />
                                                  </button>
                                                  <AnimatePresence>
                                                    {showDSPFeedbackPopover && (
                                                      <motion.div
                                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-2xl shadow-violet-900/20"
                                                      >
                                                        {(() => {
                                                          const T = compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold;
                                                          const R = compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio;
                                                          const maxGR = Math.max(0, Math.abs(T) * (1 - 1/Math.max(1, R)));
                                                          
                                                          const currentData = realtimeSparklineData.length > 0 ? realtimeSparklineData : Array.from({ length: 20 }, (_, i) => ({ time: i, gr: 0 }));
                                                          const displayName = isBatchMode ? "Batch Edit" : newPresetName || "Selected Preset";

                                                          return (
                                                            <div className="space-y-2">
                                                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                  <Activity className="h-3 w-3 text-violet-400" />
                                                                  <span className="text-[9px] font-bold text-slate-200 uppercase tracking-wider">DSP Feedback - {displayName}</span>
                                                                </div>
                                                                <button onClick={() => setShowDSPFeedbackPopover(false)} className="text-slate-500 hover:text-slate-300">
                                                                  <X className="h-2.5 w-2.5" />
                                                                </button>
                                                              </div>
                                                              
                                                              <div className="bg-slate-950 rounded border border-slate-800/50 p-2">
                                                                <div className="flex justify-between items-center mb-1">
                                                                  <span className="text-[8px] text-slate-500 font-mono uppercase">Band: {compressorActiveBand}</span>
                                                                  <span className="text-[8px] text-slate-400 font-mono">Ratio: {R.toFixed(1)}:1</span>
                                                                </div>
                                                                
                                                                <div className="h-10 w-full mt-2">
                                                                  <ResponsiveContainer width="100%" height="100%">
                                                                    <AreaChart data={currentData}>
                                                                      <defs>
                                                                        <linearGradient id="colorGR" x1="0" y1="0" x2="0" y2="1">
                                                                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                                        </linearGradient>
                                                                      </defs>
                                                                      <Area type="monotone" dataKey="gr" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorGR)" strokeWidth={1.5} isAnimationActive={false} />
                                                                    </AreaChart>
                                                                  </ResponsiveContainer>
                                                                </div>
                                                                
                                                                <div className="flex justify-between items-center mt-2 border-t border-slate-800/50 pt-1.5">
                                                                  <span className="text-[8px] text-slate-500">Peak Gain Reduction</span>
                                                                  <span className="text-[9px] font-mono text-rose-400">-{maxGR.toFixed(1)} dB</span>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          );
                                                        })()}
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>

                                                <select
                                                  value={exportPresetStatusFilter}
                                                  onChange={(e) => setExportPresetStatusFilter(e.target.value)}
                                                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-1 text-[7px] font-mono outline-none cursor-pointer focus:border-cyan-700 transition-colors ml-1"
                                                  title={language === "de" ? "Nach Status filtern" : "Filter by Status"}
                                                >
                                                  <option value="All">{language === "de" ? "Alle Status" : "All Statuses"}</option>
                                                  <option value="Draft">Draft</option>
                                                  <option value="Needs Work">Needs Work</option>
                                                  <option value="Approved">Approved</option>
                                                  {customStatuses.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                </select>
                                                <button
                                                  type="button"
                                                  onClick={() => setPresetCategorySortMethod(presetCategorySortMethod === "alpha" ? "recent" : "alpha")}
                                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors border border-slate-800 hover:border-cyan-900/50 flex items-center justify-center ml-0.5"
                                                  title={language === "de" ? "Sortierung umschalten (A-Z / Zuletzt)" : "Toggle Sort (A-Z / Recent)"}
                                                >
                                                  {presetCategorySortMethod === "alpha" ? <SortAsc className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                </button>
                                                
                                                <div className="flex items-center gap-1.5 ml-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => setLivePreviewPreset(!livePreviewPreset)}
                                                    className={`h-3 w-3 rounded flex items-center justify-center border transition-colors ${livePreviewPreset ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-700 text-transparent'}`}
                                                  >
                                                    <Check className="h-2 w-2" />
                                                  </button>
                                                  <span className="text-[7.5px] text-slate-400 font-medium whitespace-nowrap">
                                                    {language === "de" ? "Live-Vorschau" : "Live Preview"}
                                                  </span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => setPresetCategoryQuickFilterActive(!presetCategoryQuickFilterActive)}
                                                  className={`p-1 rounded transition-colors border flex items-center justify-center ${presetCategoryQuickFilterActive ? "bg-violet-900/50 border-violet-700/50 text-violet-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-violet-400 hover:border-violet-900/50"}`}
                                                  title={language === "de" ? "Schnellfilter (nur Unterordner anzeigen)" : "Quick Filter (Show Sub-folders only)"}
                                                >
                                                  <Filter className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setShowCategorySparklines(!showCategorySparklines)}
                                                  className={`p-1 rounded transition-colors border flex items-center justify-center ${showCategorySparklines ? "bg-cyan-900/50 border-cyan-700/50 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-900/50"}`}
                                                  title={language === "de" ? "30-Tage Velocity Sparklines umschalten" : "Toggle 30-day Velocity Sparklines"}
                                                >
                                                  <Activity className="h-3 w-3" />
                                                </button>
                                                <div className="relative ml-auto flex items-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowCategoryStatsModal(!showCategoryStatsModal)}
                                                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors border border-slate-800 hover:border-cyan-900/50 flex items-center justify-center"
                                                    title={language === "de" ? "Kategoriestatistiken anzeigen" : "View Category Stats"}
                                                  >
                                                    <BarChart3 className="h-3 w-3" />
                                                  </button>
                                                  <AnimatePresence>
                                                    {showCategoryStatsModal && (
                                                      <motion.div
                                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute z-[100] top-full right-0 mt-2 w-[350px] bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-2xl shadow-cyan-900/10"
                                                      >
                                                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                                          <div className="flex items-center gap-1.5">
                                                            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
                                                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                                                              {language === "de" ? "Kategoriestatistiken" : "Category Statistics"}
                                                            </span>
                                                          </div>
                                                          <button onClick={() => setShowCategoryStatsModal(false)} className="text-slate-500 hover:text-slate-300">
                                                            <X className="h-3 w-3" />
                                                          </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                          {(() => {
                                                            const catStats: Record<string, {name: string, count: number, approved: number}> = {};
                                                            
                                                            // Calculate stats for current category or subcategories
                                                            exportPresets.forEach(p => {
                                                              const cat = p.category || "Root";
                                                              // Include if viewing "All", or if it is exactly this category, or if it is a subcategory
                                                              if (exportPresetCategoryFilter === "All" || cat === exportPresetCategoryFilter || cat.startsWith(exportPresetCategoryFilter + "/")) {
                                                                 if (!catStats[cat]) catStats[cat] = { name: cat, count: 0, approved: 0 };
                                                                 catStats[cat].count++;
                                                                 if (p.status === "Approved") catStats[cat].approved++;
                                                              }
                                                            });
                                                            const data = Object.values(catStats).sort((a, b) => b.count - a.count).slice(0, 5);
                                                            
                                                            if (data.length === 0) {
                                                              return <div className="text-[9px] text-slate-500 text-center py-4">{language === "de" ? "Keine Daten verfügbar." : "No data available."}</div>;
                                                            }
                                                            
                                                            return (
                                                              <div className="h-[150px] w-full mt-2">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                  <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" horizontal={false} />
                                                                    <XAxis type="number" hide />
                                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#64748b", fontSize: 8 }} axisLine={false} tickLine={false} />
                                                                    <Tooltip
                                                                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", fontSize: "10px", borderRadius: "4px" }}
                                                                      itemStyle={{ color: "#38bdf8" }}
                                                                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                                                                    />
                                                                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 2, 2, 0]} barSize={12} name={language === "de" ? "Gesamt" : "Total Presets"} />
                                                                    <Bar dataKey="approved" fill="#10b981" radius={[0, 2, 2, 0]} barSize={12} name={language === "de" ? "Freigegeben" : "Approved"} />
                                                                  </BarChart>
                                                                </ResponsiveContainer>
                                                              </div>
                                                            );
                                                          })()}
                                                        </div>
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                  <button
                                                    type="button"
                                                    onClick={() => setShowWorkflowLegendModal(!showWorkflowLegendModal)}
                                                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition-colors border border-slate-800 hover:border-emerald-900/50 flex items-center justify-center"
                                                    title={language === "de" ? "Workflow-Legende anzeigen" : "Show Workflow Legend"}
                                                  >
                                                    <HelpCircle className="h-3 w-3" />
                                                  </button>
                                                  <AnimatePresence>
                                                    {showWorkflowLegendModal && (
                                                      <motion.div
                                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute z-[100] top-full right-0 mt-2 w-[240px] bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-2xl shadow-emerald-900/10"
                                                      >
                                                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                                          <div className="flex items-center gap-1.5">
                                                            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                                                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                                                              {language === "de" ? "MiaSanAI Workflow" : "MiaSanAI Workflow"}
                                                            </span>
                                                          </div>
                                                          <button onClick={() => setShowWorkflowLegendModal(false)} className="text-slate-500 hover:text-slate-300">
                                                            <X className="h-3 w-3" />
                                                          </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                          <div className="flex items-start gap-2">
                                                            <div className="mt-0.5"><span className="inline-block px-1 py-0.5 rounded text-[7px] uppercase font-bold bg-slate-500/20 border border-slate-500/50 text-slate-300">Draft</span></div>
                                                            <div className="text-[9px] text-slate-400 leading-snug">
                                                              <strong className="text-slate-300">Work in Progress.</strong> Use this when testing curves, creating experimental settings, or when you aren't yet finished tweaking parameters.
                                                            </div>
                                                          </div>
                                                          <div className="flex items-start gap-2">
                                                            <div className="mt-0.5"><span className="inline-block px-1 py-0.5 rounded text-[7px] uppercase font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300">Needs Work</span></div>
                                                            <div className="text-[9px] text-slate-400 leading-snug">
                                                              <strong className="text-amber-200">Pending Review/Changes.</strong> Applied to presets that need to be revisited or corrected before final approval.
                                                            </div>
                                                          </div>
                                                          <div className="flex items-start gap-2">
                                                            <div className="mt-0.5"><span className="inline-block px-1 py-0.5 rounded text-[7px] uppercase font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">Approved</span></div>
                                                            <div className="text-[9px] text-slate-400 leading-snug">
                                                              <strong className="text-emerald-200">Production Ready.</strong> Validated and signed-off presets. Safe for team-wide use and bulk exports.
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
 
                                                {/* Hierarchical Subcategory Input Field */}
                                                {(() => {
                                                  const existingCategories = Array.from(new Set([
                                                    "Technical", 
                                                    "Creative", 
                                                    ...customCategoryPaths, 
                                                    ...exportPresets.map(p => p.category).filter(Boolean)
                                                  ]));
                                                  const trimmedSubCat = presetSaveNewSubcategory.trim();
                                                  const proposedPath = presetSaveParentCategory ? `${presetSaveParentCategory}/${trimmedSubCat}` : trimmedSubCat;
                                                  const isTaken = trimmedSubCat.length > 0 && existingCategories.includes(proposedPath);
                                                  const isInvalid = trimmedSubCat.length > 0 && (presetSaveNewSubcategory.includes("/") || presetSaveNewSubcategory.includes("\\"));
                                                  const isValidNew = trimmedSubCat.length > 0 && !isTaken && !isInvalid;
                                                  
                                                  const currentPathToDelete = (trimmedSubCat.length > 0) ? (isTaken ? proposedPath : null) : (presetSaveParentCategory || null);
                                                  const canDelete = currentPathToDelete && !["Technical", "Creative"].includes(currentPathToDelete);
                                                  
                                                  return (
                                                    <div className="flex items-center gap-1.5">
                                                      <div className="relative flex items-center">
                                                        <input
                                                          id="preset-save-custom-category-input"
                                                        type="text"
                                                        value={presetSaveNewSubcategory}
                                                        onChange={(e) => setPresetSaveNewSubcategory(e.target.value)}
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter" && !isInvalid) {
                                                            e.preventDefault();
                                                            if (isValidNew) {
                                                              const parts = proposedPath.split("/").map((p) => p.trim()).filter(Boolean);
                                                              let currentPath = "";
                                                              const pathsToAdd = [];
                                                              for (const part of parts) {
                                                                currentPath = currentPath ? `${currentPath}/${part}` : part;
                                                                if (!customCategoryPaths.includes(currentPath) && !["Technical", "Creative"].includes(currentPath)) {
                                                                  pathsToAdd.push(currentPath);
                                                                }
                                                              }
                                                              if (pathsToAdd.length > 0) {
                                                                setCustomCategoryPaths([...customCategoryPaths, ...pathsToAdd]);
                                                              }
                                                              setPresetSaveParentCategory(proposedPath);
                                                              setPresetSaveNewSubcategory("");
                                                            }
                                                          }
                                                        }}
                                                        placeholder={language === "de" ? "Neue Kat..." : "New category..."}
                                                        className={`w-[95px] bg-slate-950 border text-slate-300 rounded px-1.5 py-0.5 text-[7.5px] font-mono outline-none placeholder:text-slate-700 pr-5 transition-colors ${
                                                          isInvalid ? 'border-rose-500/50 focus:border-rose-500 bg-rose-500/5' :
                                                          isTaken ? 'border-amber-500/50 focus:border-amber-500 bg-amber-500/5' :
                                                          isValidNew ? 'border-emerald-500/50 focus:border-emerald-500 bg-emerald-500/5' :
                                                          'border-slate-800 focus:border-cyan-500/50'
                                                        }`}
                                                        maxLength={18}
                                                        title={isInvalid ? (language === "de" ? "Ungültige Zeichen (/ oder \\)" : "Invalid characters (/ or \\)") : isTaken ? (language === "de" ? "Kategorie existiert bereits" : "Category already exists") : (language === "de" ? "Unterkategorie im ausgewählten Ordner erstellen (Enter zum Speichern)" : "Create subcategory inside selected folder (Enter to save)")}
                                                      />
                                                      {trimmedSubCat.length > 0 && (
                                                        <div className="absolute right-1.5 flex items-center pointer-events-none">
                                                          {(isInvalid || isTaken) && <AlertCircle className={`h-3 w-3 drop-shadow-md ${isInvalid ? 'text-rose-500' : 'text-amber-500'}`} />}
                                                          {isValidNew && <CheckCircle2 className="h-3 w-3 text-emerald-500 drop-shadow-md" />}
                                                        </div>
                                                      )}
                                                      </div>
                                                      <button
                                                        id="preset-save-quick-clone-btn"
                                                        type="button"
                                                        onClick={() => {
                                                          const currentPath = exportPresetCategoryFilter === "All" ? "" : exportPresetCategoryFilter;
                                                          if (!currentPath) {
                                                            setPresetSaveParentCategory("");
                                                            setPresetSaveNewSubcategory("");
                                                          } else if (currentPath.includes("/")) {
                                                            const parts = currentPath.split("/");
                                                            setPresetSaveNewSubcategory(parts.pop() || "");
                                                            setPresetSaveParentCategory(parts.join("/"));
                                                          } else {
                                                            setPresetSaveParentCategory("");
                                                            setPresetSaveNewSubcategory(currentPath);
                                                          }
                                                        }}
                                                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors border border-slate-800 hover:border-cyan-900/50 flex items-center justify-center"
                                                        title={language === "de" ? "Quick Clone" : "Quick Clone"}
                                                      >
                                                        <Copy className="h-3 w-3" />
                                                        <span className="sr-only">Quick Clone</span>
                                                      </button>
                                                      <button
                                                        id="preset-save-delete-category-btn"
                                                        type="button"
                                                        disabled={!canDelete}
                                                        onClick={() => {
                                                          if (!currentPathToDelete || !canDelete) return;
                                                          // Clean up customCategoryPaths
                                                          const updatedCustomPaths = customCategoryPaths.filter(p => p !== currentPathToDelete && !p.startsWith(currentPathToDelete + "/"));
                                                          setCustomCategoryPaths(updatedCustomPaths);

                                                          // Clean up exportPresets
                                                          const updatedPresets = exportPresets.map(p => {
                                                            if (p.category === currentPathToDelete || p.category?.startsWith(currentPathToDelete + "/")) {
                                                              const parentCategory = currentPathToDelete.includes("/") ? currentPathToDelete.split("/").slice(0, -1).join("/") : "";
                                                              return { ...p, category: parentCategory };
                                                            }
                                                            return p;
                                                          });
                                                          setExportPresets(updatedPresets);

                                                          // Reset selection
                                                          if (presetSaveParentCategory === currentPathToDelete || presetSaveParentCategory.startsWith(currentPathToDelete + "/")) {
                                                            setPresetSaveParentCategory("");
                                                            setPresetSaveNewSubcategory("");
                                                          } else if (proposedPath === currentPathToDelete) {
                                                            setPresetSaveNewSubcategory("");
                                                          }
                                                        }}
                                                        className={`p-1 rounded transition-colors border flex items-center justify-center ml-0.5 ${canDelete ? 'bg-slate-900 hover:bg-rose-900/40 text-slate-500 hover:text-rose-400 border-slate-800 hover:border-rose-900/50' : 'bg-slate-950 border-slate-800/50 text-slate-700 cursor-not-allowed'}`}
                                                        title={language === "de" ? "Kategorie löschen" : "Delete Category"}
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                        <span className="sr-only">Delete Category</span>
                                                      </button>
                                                      <div className="relative">
                                                        <button
                                                          type="button"
                                                          onClick={() => setShowCompressionEfficiencyModal(!showCompressionEfficiencyModal)}
                                                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-violet-400 transition-colors border border-slate-800 hover:border-violet-900/50 flex items-center justify-center ml-1"
                                                          title={language === "de" ? "Kompressionseffizienz anzeigen" : "Show Compression Efficiency"}
                                                        >
                                                          <Activity className="h-3 w-3" />
                                                        </button>
                                                        <AnimatePresence>
                                                          {showCompressionEfficiencyModal && (
                                                            <motion.div
                                                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                              animate={{ opacity: 1, y: 0, scale: 1 }}
                                                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                              transition={{ duration: 0.15 }}
                                                              className="absolute z-[100] bottom-full right-0 mb-2 w-52 bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-2xl shadow-violet-900/20"
                                                            >
                                                              {(() => {
                                                                const T = compressorActiveBand === "low" ? compLowThreshold : compressorActiveBand === "mid" ? compMidThreshold : compHighThreshold;
                                                                const R = compressorActiveBand === "low" ? compLowRatio : compressorActiveBand === "mid" ? compMidRatio : compHighRatio;
                                                                const maxGR = Math.max(0, Math.abs(T) * (1 - 1/Math.max(1, R)));
                                                                const avgGR = maxGR * 0.45;
                                                                
                                                                return (
                                                                  <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                      <div className="flex items-center gap-1.5">
                                                                        <Activity className="h-3.5 w-3.5 text-violet-400" />
                                                                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Efficiency</span>
                                                                      </div>
                                                                      <button onClick={() => setShowCompressionEfficiencyModal(false)} className="text-slate-500 hover:text-slate-300">
                                                                        <X className="h-3 w-3" />
                                                                      </button>
                                                                    </div>
                                                                    <div className="bg-slate-950 rounded border border-slate-800/50 p-2">
                                                                      <div className="text-[9px] text-slate-500 font-mono mb-1 uppercase">Band: {compressorActiveBand}</div>
                                                                      <div className="flex justify-between items-center mt-1">
                                                                        <span className="text-[9px] text-slate-400">Peak GR</span>
                                                                        <span className="text-rose-400 font-mono text-[9px]">-{maxGR.toFixed(1)} dB</span>
                                                                      </div>
                                                                      <div className="w-full bg-slate-900 h-1 mt-0.5 rounded-full overflow-hidden">
                                                                        <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, (maxGR / 20) * 100)}%` }} />
                                                                      </div>
                                                                      
                                                                      <div className="flex justify-between items-center mt-2">
                                                                        <span className="text-[9px] text-slate-400">Avg GR</span>
                                                                        <span className="text-amber-400 font-mono text-[9px]">-{avgGR.toFixed(1)} dB</span>
                                                                      </div>
                                                                      <div className="w-full bg-slate-900 h-1 mt-0.5 rounded-full overflow-hidden">
                                                                        <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, (avgGR / 20) * 100)}%` }} />
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                );
                                                              })()}
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}

                                                {/* Quick Folders Block */}
                                                {(() => {
                                                  const frequencies: Record<string, number> = {};
                                                  exportPresets.forEach(p => {
                                                    if (p.category) {
                                                      frequencies[p.category] = (frequencies[p.category] || 0) + 1;
                                                    }
                                                  });
                                                  const topCategories = Object.entries(frequencies)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 3)
                                                    .map(entry => entry[0]);
                                                    
                                                  if (topCategories.length === 0) return null;
                                                  
                                                  return (
                                                    <div className="flex items-center gap-1 w-full mt-1">
                                                      <span className="text-[6.5px] text-slate-500 uppercase tracking-wider font-mono mr-0.5">Quick:</span>
                                                      {topCategories.map(cat => (
                                                        <button
                                                          key={cat}
                                                          type="button"
                                                          onClick={() => {
                                                            setPresetSaveParentCategory(cat);
                                                            setPresetSaveNewSubcategory("");
                                                          }}
                                                          className="text-[6.5px] font-mono bg-slate-900 hover:bg-slate-800 text-cyan-400/80 hover:text-cyan-300 border border-slate-800 hover:border-cyan-900/50 px-1.5 py-0.5 rounded transition-colors truncate max-w-[90px]"
                                                          title={cat}
                                                        >
                                                          {cat.split('/').pop() || cat}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  );
                                                })()}
                                                 {/* Multi-Select Season Dropdown */}
                                                {(() => {
                                                  const allSeasons = Array.from(new Set([
                                                    "2024/2025",
                                                    "2025/2026",
                                                    "2026/2027",
                                                    "2027/2028",
                                                    ...exportPresets.flatMap(p => {
                                                      if (Array.isArray(p.seasons)) return p.seasons;
                                                      if (p.season) return p.season.split(",").map((s: string) => s.trim());
                                                      return [];
                                                    }),
                                                    ...customSeasons
                                                  ])).filter(Boolean) as string[];

                                                  return (
                                                    <div className="relative font-mono text-[7.5px]" id="preset-save-season-multi-select-container">
                                                      <button
                                                        id="preset-save-season-dropdown-toggle-btn"
                                                        type="button"
                                                        onClick={() => {
                                                          setSeasonDropdownOpen(!seasonDropdownOpen);
                                                          setMatchdayDropdownOpen(false);
                                                        }}
                                                        className="w-[70px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[7.5px] text-left outline-none truncate flex items-center justify-between cursor-pointer select-none"
                                                        title={language === "de" ? "Saisons auswählen" : "Select Seasons"}
                                                      >
                                                        <span className="truncate">
                                                          {presetSaveSeasons.length === 0
                                                            ? (language === "de" ? "Saison..." : "Season...")
                                                            : `${presetSaveSeasons.length} ${language === "de" ? "Saison" : "Season"}${presetSaveSeasons.length > 1 ? "s" : ""}`}
                                                        </span>
                                                        <ChevronDown className="h-2 w-2 text-slate-500 shrink-0 ml-0.5" />
                                                      </button>

                                                      {seasonDropdownOpen && (
                                                        <>
                                                          <div className="fixed inset-0 z-40" onClick={() => setSeasonDropdownOpen(false)} />
                                                          <div className="absolute left-0 bottom-full mb-1 w-[130px] bg-slate-950 border border-slate-850 rounded shadow-2xl p-1.5 z-50 flex flex-col gap-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                                                            <span className="text-[6px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
                                                              {language === "de" ? "Saisons:" : "Seasons:"}
                                                            </span>
                                                            {allSeasons.map((season) => {
                                                              const isChecked = presetSaveSeasons.includes(season);
                                                              return (
                                                                <label
                                                                  key={season}
                                                                  className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-900 cursor-pointer select-none text-slate-300 hover:text-white"
                                                                >
                                                                  <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                      if (isChecked) {
                                                                        setPresetSaveSeasons(presetSaveSeasons.filter(s => s !== season));
                                                                      } else {
                                                                        setPresetSaveSeasons([...presetSaveSeasons, season]);
                                                                      }
                                                                    }}
                                                                    className="h-2.5 w-2.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                                  />
                                                                  <span className="truncate">{season}</span>
                                                                </label>
                                                              );
                                                            })}
                                                            
                                                            {/* Add Custom Season inline input */}
                                                            <div className="border-t border-slate-900 pt-1 mt-1 flex gap-1">
                                                              <input
                                                                type="text"
                                                                value={newSeasonInput}
                                                                onChange={(e) => setNewSeasonInput(e.target.value)}
                                                                placeholder={language === "de" ? "Neu..." : "New..."}
                                                                className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[6.5px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 flex-1 min-w-0"
                                                                onKeyDown={(e) => {
                                                                  if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    const clean = newSeasonInput.trim();
                                                                    if (clean && !allSeasons.includes(clean)) {
                                                                      setCustomSeasons([...customSeasons, clean]);
                                                                      setPresetSaveSeasons([...presetSaveSeasons, clean]);
                                                                      setNewSeasonInput("");
                                                                    }
                                                                  }
                                                                }}
                                                              />
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  const clean = newSeasonInput.trim();
                                                                  if (clean && !allSeasons.includes(clean)) {
                                                                    setCustomSeasons([...customSeasons, clean]);
                                                                    setPresetSaveSeasons([...presetSaveSeasons, clean]);
                                                                    setNewSeasonInput("");
                                                                  }
                                                                }}
                                                                className="px-1 bg-cyan-950 border border-cyan-900 hover:bg-cyan-900 text-cyan-400 hover:text-white rounded text-[6.5px] cursor-pointer font-bold"
                                                              >
                                                                +
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  );
                                                })()}

                                                {/* Multi-Select Matchday Dropdown */}
                                                {(() => {
                                                  const allMatchdays = Array.from(new Set([
                                                    "Matchday 1",
                                                    "Matchday 2",
                                                    "Matchday 3",
                                                    "Champions League",
                                                    "DFB Pokal",
                                                    ...exportPresets.flatMap(p => {
                                                      if (Array.isArray(p.matchdays)) return p.matchdays;
                                                      if (p.matchday) return p.matchday.split(",").map((m: string) => m.trim());
                                                      return [];
                                                    }),
                                                    ...customMatchdays
                                                  ])).filter(Boolean) as string[];

                                                  return (
                                                    <div className="relative font-mono text-[7.5px]" id="preset-save-matchday-multi-select-container">
                                                      <button
                                                        id="preset-save-matchday-dropdown-toggle-btn"
                                                        type="button"
                                                        onClick={() => {
                                                          setMatchdayDropdownOpen(!matchdayDropdownOpen);
                                                          setSeasonDropdownOpen(false);
                                                        }}
                                                        className="w-[70px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[7.5px] text-left outline-none truncate flex items-center justify-between cursor-pointer select-none"
                                                        title={language === "de" ? "Spieltage auswählen" : "Select Matchdays"}
                                                      >
                                                        <span className="truncate">
                                                          {presetSaveMatchdays.length === 0
                                                            ? (language === "de" ? "Spieltag..." : "Matchday...")
                                                            : `${presetSaveMatchdays.length} ${language === "de" ? "Spieltag" : "Matchday"}${presetSaveMatchdays.length > 1 ? "s" : ""}`}
                                                        </span>
                                                        <ChevronDown className="h-2 w-2 text-slate-500 shrink-0 ml-0.5" />
                                                      </button>

                                                      {matchdayDropdownOpen && (
                                                        <>
                                                          <div className="fixed inset-0 z-40" onClick={() => setMatchdayDropdownOpen(false)} />
                                                          <div className="absolute left-0 bottom-full mb-1 w-[130px] bg-slate-950 border border-slate-850 rounded shadow-2xl p-1.5 z-50 flex flex-col gap-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                                                            <span className="text-[6px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
                                                              {language === "de" ? "Spieltage:" : "Matchdays:"}
                                                            </span>
                                                            {allMatchdays.map((matchday) => {
                                                              const isChecked = presetSaveMatchdays.includes(matchday);
                                                              return (
                                                                <label
                                                                  key={matchday}
                                                                  className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-900 cursor-pointer select-none text-slate-300 hover:text-white"
                                                                >
                                                                  <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                      if (isChecked) {
                                                                        setPresetSaveMatchdays(presetSaveMatchdays.filter(m => m !== matchday));
                                                                      } else {
                                                                        setPresetSaveMatchdays([...presetSaveMatchdays, matchday]);
                                                                      }
                                                                    }}
                                                                    className="h-2.5 w-2.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                                  />
                                                                  <span className="truncate">{matchday}</span>
                                                                </label>
                                                              );
                                                            })}
                                                            
                                                            {/* Add Custom Matchday inline input */}
                                                            <div className="border-t border-slate-900 pt-1 mt-1 flex gap-1">
                                                              <input
                                                                type="text"
                                                                value={newMatchdayInput}
                                                                onChange={(e) => setNewMatchdayInput(e.target.value)}
                                                                placeholder={language === "de" ? "Neu..." : "New..."}
                                                                className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[6.5px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 flex-1 min-w-0"
                                                                onKeyDown={(e) => {
                                                                  if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    const clean = newMatchdayInput.trim();
                                                                    if (clean && !allMatchdays.includes(clean)) {
                                                                      setCustomMatchdays([...customMatchdays, clean]);
                                                                      setPresetSaveMatchdays([...presetSaveMatchdays, clean]);
                                                                      setNewMatchdayInput("");
                                                                    }
                                                                  }
                                                                }}
                                                              />
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  const clean = newMatchdayInput.trim();
                                                                  if (clean && !allMatchdays.includes(clean)) {
                                                                    setCustomMatchdays([...customMatchdays, clean]);
                                                                    setPresetSaveMatchdays([...presetSaveMatchdays, clean]);
                                                                    setNewMatchdayInput("");
                                                                  }
                                                                }}
                                                                className="px-1 bg-cyan-950 border border-cyan-900 hover:bg-cyan-900 text-cyan-400 hover:text-white rounded text-[6.5px] cursor-pointer font-bold"
                                                              >
                                                                +
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  );
                                                })()}
                                                  </>
                                                )}
                                              </div>
                                            </div>

                                            {/* Preview Card Column */}
                                            <div 
                                              id="preset-save-preview-section" 
                                              className="w-full md:w-[220px] shrink-0 border border-slate-900 bg-slate-950/40 p-2 rounded-lg flex flex-col justify-between"
                                            >
                                              <div className="flex items-center justify-between shrink-0 mb-1 leading-none">
                                                <span className="text-[7.5px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                                                  {language === "de" ? "Karten-Vorschau:" : "Card Preview:"}
                                                </span>
                                                <span className="text-[6px] font-mono bg-cyan-950 border border-cyan-900 text-cyan-400 px-1 py-[1px] rounded leading-none">
                                                  LIVE
                                                </span>
                                              </div>
                                              
                                              {/* Preview Card itself */}
                                              <div className="rounded p-1.5 h-[62px] bg-slate-900/90 border border-slate-800 flex flex-col justify-between font-mono text-[8px] text-slate-400 relative">
                                                <div className="flex items-center justify-between w-full min-h-[14px]">
                                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                                    <GripVertical className="h-2.5 w-2.5 text-slate-700 shrink-0" />
                                                    <input
                                                      type="checkbox"
                                                      disabled
                                                      className="h-2.5 w-2.5 rounded border-slate-800 bg-slate-950 cursor-not-allowed opacity-30"
                                                    />
                                                    <span className="truncate text-slate-200 font-bold text-[8px] max-w-[90px]">
                                                      {newPresetName.trim() || (language === "de" ? "Unbenannt" : "Unnamed")}
                                                    </span>
                                                    
                                                    {presetSaveSeasons.map((season) => (
                                                      <span key={season} className="inline-flex items-center gap-0.5 px-0.5 py-[0.5px] rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[5.5px] shrink-0">
                                                        <Calendar className="h-1 w-1 shrink-0" />
                                                        <span className="max-w-[30px] truncate">{season}</span>
                                                      </span>
                                                    ))}
                                                    
                                                    {presetSaveMatchdays.map((matchday) => (
                                                      <span key={matchday} className="inline-flex items-center gap-0.5 px-0.5 py-[0.5px] rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[5.5px] shrink-0">
                                                        <Tag className="h-1 w-1 shrink-0" />
                                                        <span className="max-w-[30px] truncate">{matchday}</span>
                                                      </span>
                                                    ))}

                                                    {/* Real-time Status Badge with VISUAL ICON INDICATOR */}
                                                    {(() => {
                                                      const statusInfo = getStatusBadge(presetSaveStatus);
                                                      if (!statusInfo) return null;
                                                      return (
                                                        <span 
                                                          id="preset-save-preview-status-badge"
                                                          className={`inline-flex items-center gap-0.5 px-1 py-[0.5px] rounded border text-[5.5px] leading-none shrink-0 cursor-pointer select-none transition-all hover:brightness-110 ${statusInfo.classes}`}
                                                          title={language === "de" ? "Klicken zum Ändern" : "Click to toggle status"}
                                                          onClick={() => {
                                                            const order: Array<"Draft" | "Needs Work" | "Approved"> = ["Draft", "Needs Work", "Approved"];
                                                            const nextIdx = (order.indexOf(presetSaveStatus as "Draft" | "Needs Work" | "Approved") + 1) % order.length;
                                                            setPresetSaveStatus(order[nextIdx]);
                                                          }}
                                                        >
                                                          {presetSaveStatus === "Approved" ? (
                                                            <CheckCircle2 className="h-1 w-1 shrink-0 text-emerald-400 animate-pulse" />
                                                          ) : presetSaveStatus === "Draft" ? (
                                                            <Edit2 className="h-1 w-1 shrink-0 text-slate-400" />
                                                          ) : (
                                                            <AlertCircle className="h-1 w-1 shrink-0 text-amber-400 animate-bounce" style={{ animationDuration: '2s' }} />
                                                          )}
                                                          <span>{statusInfo.label}</span>
                                                        </span>
                                                      );
                                                    })()}
                                                  </div>
                                                </div>

                                                {/* Description Preview on Card */}
                                                {newPresetDescription.trim() ? (
                                                  <div className="text-[6px] leading-tight bg-slate-950/40 border border-slate-950/50 px-1 py-[1px] rounded text-slate-500 italic max-w-full truncate mt-0.5">
                                                    <span className="text-slate-600 font-bold not-italic mr-0.5">INFO:</span>
                                                    {newPresetDescription.trim()}
                                                  </div>
                                                ) : (
                                                  <div className="text-[6px] text-slate-600 italic truncate mt-0.5">
                                                    {language === "de" ? "Keine Beschreibung" : "No description"}
                                                  </div>
                                                )}

                                                <div className="flex items-center justify-between border-t border-slate-900/60 pt-0.5 mt-0.5">
                                                  <span className="text-[6px] text-slate-600">
                                                    {compressorEnabled ? "Comp" : "Bypass"} • {isNormalized ? "Norm" : "Dry"}
                                                  </span>
                                                  
                                                  <button
                                                    id="preset-save-btn"
                                                    onClick={handleSaveExportPreset}
                                                    className="px-1.5 py-[2px] bg-cyan-600 hover:bg-cyan-500 text-white text-[7.5px] rounded font-semibold flex items-center gap-0.5 cursor-pointer transition select-none leading-none"
                                                    title={language === "de" ? "Aktuelle Einstellungen speichern (Strg+S)" : "Save current settings (Ctrl+S)"}
                                                  >
                                                    <Save className="h-2 w-2" />
                                                    <span>{language === "de" ? "Sichern" : "Save"}</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Live Preview Render */}
                                    {livePreviewPreset && (
                                      <div className="space-y-2 p-2 rounded border border-cyan-900/50 bg-cyan-950/10 text-left mb-2">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <Check className="h-3.5 w-3.5 text-cyan-400" />
                                          <span className="text-[8.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Live Preview Render</span>
                                        </div>
                                        {renderPresetCard({
                                          id: "live-preview-mock-id",
                                          name: newPresetName || "Preview",
                                          description: newPresetDescription,
                                          category: presetSaveParentCategory ? `${presetSaveParentCategory}${presetSaveNewSubcategory ? '/' + presetSaveNewSubcategory : ''}` : presetSaveNewSubcategory,
                                          season: presetSaveSeasons.join(", "),
                                          seasons: presetSaveSeasons,
                                          matchday: presetSaveMatchdays.join(", "),
                                          matchdays: presetSaveMatchdays,
                                          status: presetSaveStatus,
                                          compressorEnabled,
                                          isNormalized,
                                          fadeInDuration,
                                          fadeOutDuration,
                                          noiseGateThreshold,
                                          compLowThreshold,
                                          compLowRatio,
                                          compLowMakeup,
                                          compMidThreshold,
                                          compMidRatio,
                                          compMidMakeup,
                                          compHighThreshold,
                                          compHighRatio,
                                          compHighMakeup,
                                        })}
                                      </div>
                                    )}
                                    {/* Waveform comparative views */}
                                    <div className="space-y-2 p-2 rounded border border-slate-900 bg-slate-900/20 text-left" id="export-before-after-waveform-comparison">
                                      <div className="flex items-center justify-between flex-wrap gap-2 min-h-[14px]">
                                        <span className="text-[8.5px] font-mono text-cyan-400/80 font-bold uppercase tracking-wider block">
                                          {language === "de" ? "Signal-Kompression: Vorher vs. Nachher:" : "Signal Compression: Before vs. After:"}
                                        </span>
                                        {hoveredWaveformBarIdx !== null && origHeights[hoveredWaveformBarIdx] !== undefined && compHeights[hoveredWaveformBarIdx] !== undefined && (
                                          <div className="text-[8px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 flex items-center gap-1.5 leading-none">
                                            <span className="text-slate-500 font-bold">
                                              {language === "de" ? "Pos:" : "Pos:"} {((hoveredWaveformBarIdx / 24) * audioDuration).toFixed(1)}s
                                            </span>
                                            <span className="text-rose-400 font-bold">
                                              {language === "de" ? "Vorher:" : "Before:"} {origHeights[hoveredWaveformBarIdx]}%
                                            </span>
                                            <span className="text-slate-600">→</span>
                                            <span className="text-emerald-400 font-bold">
                                              {language === "de" ? "Nachher:" : "After:"} {compHeights[hoveredWaveformBarIdx]}%
                                            </span>
                                            <span className={`font-bold text-[7.5px] ${compHeights[hoveredWaveformBarIdx] - origHeights[hoveredWaveformBarIdx] >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
                                              ({compHeights[hoveredWaveformBarIdx] - origHeights[hoveredWaveformBarIdx] >= 0 ? "+" : ""}{(compHeights[hoveredWaveformBarIdx] - origHeights[hoveredWaveformBarIdx]).toFixed(0)}%)
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 bg-slate-950/40 p-1.5 rounded border border-slate-950">
                                          <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-500">
                                            <span>{language === "de" ? "VORHER (Original)" : "BEFORE (Original)"}</span>
                                            <span className="text-slate-400">Peak: {Math.max(...origHeights)}%</span>
                                          </div>
                                          <div className="h-[38px] flex items-end justify-between gap-0.5 relative px-1 py-0.5 select-none bg-slate-950/80 rounded border border-slate-900/40">
                                            {origHeights.map((h, idx) => {
                                              const barTime = (idx / 24) * audioDuration;
                                              const isInRange = barTime >= trimStart && barTime <= trimEnd;
                                              const isHovered = hoveredWaveformBarIdx === idx;
                                              return (
                                                <div
                                                  key={idx}
                                                  onMouseEnter={() => setHoveredWaveformBarIdx(idx)}
                                                  onMouseLeave={() => setHoveredWaveformBarIdx(null)}
                                                  className={`w-[3.5%] rounded-t transition-all duration-150 cursor-crosshair ${
                                                    isHovered ? "ring-1 ring-white/50 scale-y-110" : ""
                                                  }`}
                                                  style={{
                                                    height: `${h}%`,
                                                    backgroundColor: isHovered 
                                                      ? "#f87171" 
                                                      : (isInRange ? "#ef4444" : "#475569"),
                                                    opacity: isHovered ? 1 : (isInRange ? 0.95 : 0.2)
                                                  }}
                                                  title={language === "de" 
                                                    ? `Zeit: ${barTime.toFixed(2)}s\nVorher (Original): ${h}%\nNachher (Komprimiert): ${compHeights[idx]}%\nDifferenz: ${compHeights[idx] - h >= 0 ? "+" : ""}${compHeights[idx] - h}%`
                                                    : `Time: ${barTime.toFixed(2)}s\nBefore (Original): ${h}%\nAfter (Compressed): ${compHeights[idx]}%\nDifference: ${compHeights[idx] - h >= 0 ? "+" : ""}${compHeights[idx] - h}%`
                                                  }
                                                />
                                              );
                                            })}
                                          </div>
                                        </div>

                                        <div className="space-y-1 bg-slate-950/40 p-1.5 rounded border border-slate-950">
                                          <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-500">
                                            <span>{language === "de" ? "NACHHER (Komprimiert)" : "AFTER (Compressed)"}</span>
                                            <span className="text-emerald-400">Peak: {Math.max(...compHeights)}%</span>
                                          </div>
                                          <div className="h-[38px] flex items-end justify-between gap-0.5 relative px-1 py-0.5 select-none bg-slate-950/80 rounded border border-slate-900/40">
                                            {compHeights.map((h, idx) => {
                                              const barTime = (idx / 24) * audioDuration;
                                              const isInRange = barTime >= trimStart && barTime <= trimEnd;
                                              const isHovered = hoveredWaveformBarIdx === idx;
                                              return (
                                                <div
                                                  key={idx}
                                                  onMouseEnter={() => setHoveredWaveformBarIdx(idx)}
                                                  onMouseLeave={() => setHoveredWaveformBarIdx(null)}
                                                  className={`w-[3.5%] rounded-t transition-all duration-150 cursor-crosshair ${
                                                    isHovered ? "ring-1 ring-white/50 scale-y-110" : ""
                                                  }`}
                                                  style={{
                                                    height: `${h}%`,
                                                    backgroundColor: isHovered 
                                                      ? "#34d399" 
                                                      : (isInRange ? "#10b981" : "#334155"),
                                                    opacity: isHovered ? 1 : (isInRange ? 0.95 : 0.15)
                                                  }}
                                                  title={language === "de" 
                                                    ? `Zeit: ${barTime.toFixed(2)}s\nVorher (Original): ${origHeights[idx]}%\nNachher (Komprimiert): ${h}%\nDifferenz: ${h - origHeights[idx] >= 0 ? "+" : ""}${h - origHeights[idx]}%`
                                                    : `Time: ${barTime.toFixed(2)}s\nBefore (Original): ${origHeights[idx]}%\nAfter (Compressed): ${h}%\nDifference: ${h - origHeights[idx] >= 0 ? "+" : ""}${h - origHeights[idx]}%`
                                                  }
                                                />
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-[7.5px] text-slate-500 leading-snug font-mono">
                                        {language === "de"
                                          ? "Visualisiert die Bändigung lauter Spitzen & Anhebung leiser Pegel innerhalb des Schnittfensters."
                                          : "Visualizes the taming of loud peaks and gain enhancement for quiet passages inside your crop range."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right Column: Live Compression Curve Workspace with Interactive Sliders */}
                                  <div className="md:col-span-6 flex flex-col bg-slate-900/20 border border-slate-900/85 rounded-lg p-3 space-y-3.5 text-left" id="export-live-compression-workspace">
                                    <div className="flex items-center justify-between border-b border-slate-900/60 pb-1.5 shrink-0">
                                      <span className="text-[8.5px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Sliders className="h-3 w-3 text-cyan-500" />
                                        {language === "de" ? "Interaktiver DSP-Kurven-Editor:" : "Interactive DSP Curve Editor:"}
                                      </span>
                                      
                                      <button
                                        onClick={() => {
                                          setCompressorEnabled(!compressorEnabled);
                                          handleAddLog({
                                            id: `export-comp-toggle-${Date.now()}`,
                                            timestamp: new Date().toLocaleTimeString(),
                                            source: "DSP Editor",
                                            level: "INFO",
                                            message: language === "de"
                                              ? `Kompressor im Editor ${!compressorEnabled ? "aktiviert" : "umgangen"}.`
                                              : `Compressor in editor ${!compressorEnabled ? "activated" : "bypassed"}.`
                                          });
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition flex items-center gap-1 cursor-pointer select-none border ${
                                          compressorEnabled 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        }`}
                                      >
                                        <div className={`w-1 h-1 rounded-full ${compressorEnabled ? "bg-emerald-400 animate-ping" : "bg-rose-400"}`} />
                                        {compressorEnabled 
                                          ? (language === "de" ? "AKTIV" : "ACTIVE") 
                                          : (language === "de" ? "BYPASS" : "BYPASS")}
                                      </button>
                                    </div>

                                    {/* Band Tabs Selector */}
                                    <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded border border-slate-900 shrink-0" id="export-comp-band-tabs">
                                      {(["low", "mid", "high"] as const).map((band) => {
                                        const isSel = compressorActiveBand === band;
                                        const bandLabel = band === "low" 
                                          ? (language === "de" ? "TIEF (Bass)" : "LOW (Bass)") 
                                          : band === "mid" 
                                            ? (language === "de" ? "MITTE (Mitten)" : "MID (Speech)") 
                                            : (language === "de" ? "HOCH (Höhen)" : "HIGH (Sibil.)");
                                        const tabColorClass = band === "low" 
                                          ? (isSel ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "text-slate-500 hover:text-cyan-400/80")
                                          : band === "mid"
                                            ? (isSel ? "bg-violet-500/20 text-violet-300 border-violet-500/40" : "text-slate-500 hover:text-violet-400/80")
                                            : (isSel ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-slate-500 hover:text-amber-400/80");

                                        return (
                                          <button
                                            key={band}
                                            onClick={() => setCompressorActiveBand(band)}
                                            className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold transition border border-transparent cursor-pointer select-none text-center ${tabColorClass}`}
                                          >
                                            {bandLabel}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {(() => {
                                      const getBandSettings = () => {
                                        if (compressorActiveBand === "low") {
                                          return {
                                            thresh: compLowThreshold,
                                            setThresh: setCompLowThreshold,
                                            ratio: compLowRatio,
                                            setRatio: setCompLowRatio,
                                            makeup: compLowMakeup,
                                            setMakeup: setCompLowMakeup,
                                            color: "text-cyan-400 border-cyan-500/30",
                                            accentBg: "bg-cyan-500/10",
                                            accentText: "text-cyan-400",
                                            stroke: "#22d3ee" // cyan-400
                                          };
                                        } else if (compressorActiveBand === "mid") {
                                          return {
                                            thresh: compMidThreshold,
                                            setThresh: setCompMidThreshold,
                                            ratio: compMidRatio,
                                            setRatio: setCompMidRatio,
                                            makeup: compMidMakeup,
                                            setMakeup: setCompMidMakeup,
                                            color: "text-violet-400 border-violet-500/30",
                                            accentBg: "bg-violet-500/10",
                                            accentText: "text-violet-400",
                                            stroke: "#a78bfa" // violet-400
                                          };
                                        } else {
                                          return {
                                            thresh: compHighThreshold,
                                            setThresh: setCompHighThreshold,
                                            ratio: compHighRatio,
                                            setRatio: setCompHighRatio,
                                            makeup: compHighMakeup,
                                            setMakeup: setCompHighMakeup,
                                            color: "text-amber-400 border-amber-500/30",
                                            accentBg: "bg-amber-500/10",
                                            accentText: "text-amber-400",
                                            stroke: "#fbbf24" // amber-400
                                          };
                                        }
                                      };

                                      const activeProps = getBandSettings();
                                      const T = activeProps.thresh;
                                      const R = activeProps.ratio;
                                      const M = activeProps.makeup;

                                      const clampY = (yVal: number) => Math.max(5, Math.min(95, yVal));
                                      
                                      const pyA = clampY(90 - (M / 52) * 80);
                                      const pyB = clampY(90 - ((T + M + 40) / 52) * 80);
                                      const pyC = clampY(90 - ((T - T / R + M + 40) / 52) * 80);
                                      const pxB = 20 + ((T + 40) / 40) * 120;

                                      return (
                                        <div className="space-y-3 flex-1 flex flex-col justify-between overflow-hidden">
                                          <div className="bg-slate-950/80 rounded border border-slate-900 p-2.5 flex flex-col justify-center relative flex-1 min-h-[120px]" id="export-detailed-curve-svg-wrapper">
                                            <svg viewBox="0 0 160 100" className="w-full h-full select-none flex-1 max-h-[140px]">
                                              {[-30, -20, -10].map((db) => {
                                                const x = 20 + ((db + 40) / 40) * 120;
                                                return (
                                                  <g key={`v-grid-${db}`}>
                                                    <line x1={x} y1={10} x2={x} y2={90} stroke="#111827" strokeWidth="0.75" strokeDasharray="2,3" />
                                                    <text x={x} y={96} fill="#475569" fontSize="4.5" textAnchor="middle" fontFamily="monospace">{db}dB</text>
                                                  </g>
                                                );
                                              })}

                                              {[0, -10, -20, -30].map((db) => {
                                                const y = 90 - ((db + 40) / 52) * 80;
                                                const isZero = db === 0;
                                                return (
                                                  <g key={`h-grid-${db}`}>
                                                    <line x1={20} y1={y} x2={140} y2={y} stroke={isZero ? "#1f2937" : "#0f172a"} strokeWidth="0.75" strokeDasharray={isZero ? "1,1" : "2,4"} />
                                                    <text x={16} y={y + 1.5} fill={isZero ? "#64748b" : "#475569"} fontSize="4.5" textAnchor="end" fontFamily="monospace">{db}dB</text>
                                                  </g>
                                                );
                                              })}

                                              <text x={20} y={96} fill="#475569" fontSize="4.5" textAnchor="middle" fontFamily="monospace">-40dB</text>
                                              <text x={140} y={96} fill="#475569" fontSize="4.5" textAnchor="middle" fontFamily="monospace">0dB</text>
                                              <text x={14} y={12} fill="#475569" fontSize="4.5" textAnchor="end" fontFamily="monospace">+12</text>
                                              <text x={14} y={91.5} fill="#475569" fontSize="4.5" textAnchor="end" fontFamily="monospace">-40</text>

                                              <line x1={20} y1={90} x2={140} y2={28.46} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                                              
                                              <text x={24} y={16} fill="#334155" fontSize="4" fontFamily="monospace">--- UNITY REFERENCE</text>
                                              <text x={24} y={22} fill={activeProps.stroke} fontSize="4" fontFamily="monospace">___ COMPRESSION KNEE</text>

                                              <path 
                                                d={`M 20 ${pyA} L ${pxB} ${pyB} L 140 ${pyC}`} 
                                                fill="none" 
                                                stroke={compressorEnabled ? activeProps.stroke : "#4b5563"} 
                                                strokeWidth={compressorEnabled ? "2" : "1"} 
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="transition-all duration-100"
                                              />

                                              <circle 
                                                cx={pxB} 
                                                cy={pyB} 
                                                r="3.5" 
                                                fill={compressorEnabled ? activeProps.stroke : "#6b7280"} 
                                                className={compressorEnabled ? "stroke-slate-950 stroke-[1.5px]" : ""}
                                              />

                                              <text 
                                                x={pxB} 
                                                y={pyB - 6} 
                                                fill={compressorEnabled ? activeProps.stroke : "#9ca3af"} 
                                                fontSize="4.5" 
                                                textAnchor="middle" 
                                                fontFamily="monospace"
                                                fontWeight="bold"
                                              >
                                                KNEE ({T}dB)
                                              </text>
                                            </svg>
                                            
                                            <div className="text-[7px] font-mono text-slate-500 text-center mt-1 pt-1 border-t border-slate-900/40">
                                              {language === "de"
                                                ? "X-Achse: Eingang (dB) • Y-Achse: Ausgang (dB)"
                                                : "X-Axis: Input Level (dB) • Y-Axis: Output Level (dB)"}
                                            </div>
                                          </div>

                                          {/* Sliders Workspace Panel */}
                                          <div className="bg-slate-950/40 border border-slate-900 rounded p-2.5 space-y-3 font-mono shrink-0">
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[8.5px]">
                                                <span className="text-slate-400 font-bold">{language === "de" ? "SCHWELLENWERT (Threshold):" : "THRESHOLD (KNEE):"}</span>
                                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${activeProps.accentBg} ${activeProps.accentText}`}>
                                                  {T} dB
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[7.5px] text-slate-600">-36 dB</span>
                                                <input 
                                                  type="range"
                                                  min={-36}
                                                  max={0}
                                                  step={1}
                                                  value={T}
                                                  onChange={(e) => activeProps.setThresh(Number(e.target.value))}
                                                  className="flex-1 h-1 bg-slate-900 hover:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                />
                                                <span className="text-[7.5px] text-slate-600">0 dB</span>
                                              </div>
                                            </div>

                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[8.5px]">
                                                <span className="text-slate-400 font-bold">{language === "de" ? "KOMPRESSIONS-VERHÄLTNIS (Ratio):" : "COMPRESSION RATIO:"}</span>
                                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${activeProps.accentBg} ${activeProps.accentText}`}>
                                                  {R.toFixed(1)}:1
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[7.5px] text-slate-600">1.0:1</span>
                                                <input 
                                                  type="range"
                                                  min={1}
                                                  max={10}
                                                  step={0.1}
                                                  value={R}
                                                  onChange={(e) => activeProps.setRatio(Number(e.target.value))}
                                                  className="flex-1 h-1 bg-slate-900 hover:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                                />
                                                <span className="text-[7.5px] text-slate-600">10.0:1</span>
                                              </div>
                                            </div>

                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-[8.5px]">
                                                <span className="text-slate-400 font-bold">{language === "de" ? "LAUTSTÄRKE-AUSGLEICH (Makeup Gain):" : "MAKEUP GAIN:"}</span>
                                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${activeProps.accentBg} ${activeProps.accentText}`}>
                                                  +{M} dB
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[7.5px] text-slate-600">0 dB</span>
                                                <input 
                                                  type="range"
                                                  min={0}
                                                  max={12}
                                                  step={1}
                                                  value={M}
                                                  onChange={(e) => activeProps.setMakeup(Number(e.target.value))}
                                                  className="flex-1 h-1 bg-slate-900 hover:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                                <span className="text-[7.5px] text-slate-600">+12 dB</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Modal Footer (Persistent) */}
                                <div className="flex items-center justify-between border-t border-slate-900 pt-2.5 mt-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      const audioSettingsBackup = {
                                        appName: "FC Bayern Content Suite - Audio Settings Preset Backup",
                                        timestamp: new Date().toISOString(),
                                        language: language,
                                        trimmer: {
                                          trimStart,
                                          trimEnd,
                                          fadeInDuration,
                                          fadeOutDuration,
                                          silenceThreshold,
                                          noiseGateThreshold,
                                          isNormalized,
                                          isTrimLocked,
                                        },
                                        compressor: {
                                          compressorEnabled,
                                          lowBand: {
                                            threshold: compLowThreshold,
                                            ratio: compLowRatio,
                                            attack: compLowAttack,
                                            release: compLowRelease,
                                            makeup: compLowMakeup,
                                          },
                                          midBand: {
                                            threshold: compMidThreshold,
                                            ratio: compMidRatio,
                                            attack: compMidAttack,
                                            release: compMidRelease,
                                            makeup: compMidMakeup,
                                          },
                                          highBand: {
                                            threshold: compHighThreshold,
                                            ratio: compHighRatio,
                                            attack: compHighAttack,
                                            release: compHighRelease,
                                            makeup: compHighMakeup,
                                          }
                                        }
                                      };

                                      const jsonStr = JSON.stringify(audioSettingsBackup, null, 2);
                                      const blob = new Blob([jsonStr], { type: "application/json" });
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement("a");
                                      link.href = url;
                                      link.download = `fcb_audio_preset_backup_${new Date().toISOString().slice(0, 10)}.json`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);

                                      handleAddLog({
                                        id: `audio-settings-backup-${Date.now()}`,
                                        timestamp: new Date().toLocaleTimeString(),
                                        level: "SUCCESS",
                                        source: "Audio Exporter",
                                        message: language === "de"
                                          ? "Audio-Zuschnitt- und Kompressionseinstellungen erfolgreich als JSON-Backup exportiert."
                                          : "Audio trim and compression settings successfully exported as a JSON backup."
                                      });
                                    }}
                                    className="px-3 py-1 bg-slate-950 hover:bg-fcb-gold/15 border border-slate-800 hover:border-fcb-gold/40 text-slate-300 hover:text-fcb-gold rounded text-[10px] font-mono cursor-pointer transition flex items-center gap-1.5 animate-pulse-subtle"
                                    id="export-audio-json-btn"
                                    title={language === "de" ? "Audio-Einstellungen als JSON exportieren" : "Export current audio settings as JSON"}
                                  >
                                    <Download className="h-3.5 w-3.5 text-fcb-gold" />
                                    <span>{language === "de" ? "JSON-Einstellungen exportieren" : "Export Audio Settings (JSON)"}</span>
                                  </button>

                                  <button
                                    onClick={() => setShowExportSummaryModal(false)}
                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-mono cursor-pointer transition"
                                    id="export-summary-dismiss-btn"
                                  >
                                    {language === "de" ? "Schließen" : "Dismiss"}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                    );
                  })()}


                        
                  {/* Voice Command History Panel */}
                  <div className="space-y-2 border-t border-slate-800/60 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <History className="h-3 w-3 text-fcb-gold" />
                        {language === "de" ? "Befehlsverlauf:" : "Command History (Last 5):"}
                      </span>
                      {voiceCommandHistory.length > 0 && (
                        <button
                          onClick={() => {
                            setVoiceCommandHistory([]);
                            
                          }}
                          className="text-[8px] font-mono text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          {language === "de" ? "[leeren]" : "[clear]"}
                        </button>
                      )}
                    </div>
                    {voiceCommandHistory.length === 0 ? (
                      <p className="text-[9px] font-mono text-slate-600 italic">
                        {language === "de" ? "Keine Befehle im Verlauf" : "No commands in history"}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {voiceCommandHistory.map((cmd, idx) => (
                          <button
                            key={idx}
                            onClick={() => executeVoiceCommand(cmd)}
                            className="w-full text-left bg-slate-950/60 hover:bg-slate-850 border border-slate-800/60 hover:border-fcb-gold/30 rounded-md p-1.5 transition-all flex items-center justify-between group cursor-pointer text-slate-300 hover:text-white"
                          >
                            <span className="text-[10px] font-mono truncate mr-2">
                              "{cmd}"
                            </span>
                            <Play className="h-2.5 w-2.5 text-slate-500 group-hover:text-fcb-gold transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Command Shortcuts */}
                  <div className="space-y-2">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                      {language === "de" ? "Unterstützte Sprachbefehle:" : "Supported Commands:"}
                    </span>
                    <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                      <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
                        <span className="text-fcb-gold">1. Navigation:</span>
                        <p className="text-[9px] text-slate-500 mt-0.5 italic">
                          "Go to Command Center" / "Wechsle zu Kommandozentrale" / "RAG" / "Lifecycle" / "Video" / "Webhook"
                        </p>
                      </div>
                      <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
                        <span className="text-fcb-gold">2. Generation:</span>
                        <p className="text-[9px] text-slate-500 mt-0.5 italic">
                          "Generate post for Harry Kane" / "Erstelle Beitrag für Musiala auf TikTok"
                        </p>
                      </div>
                      <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
                        <span className="text-fcb-gold">3. Search:</span>
                        <p className="text-[9px] text-slate-500 mt-0.5 italic">
                          "Search Allianz Arena" / "Suche Marken-Compliance"
                        </p>
                      </div>
                    </div>
                  </div>

                  {!speechSupported && (
                    <p className="text-[9px] text-amber-500 text-center font-mono">
                      ⚠️ {language === "de" ? "Web Speech API nicht verfügbar – Server-Transkription (Whisper/Gemini) wird genutzt." : "Web Speech API unavailable – using server transcription (Whisper/Gemini)."}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secure compliance badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-lg text-slate-400 font-mono text-[10px]">
            <Cpu className="h-3.5 w-3.5 text-green-400 animate-pulse" />
            <span>{t("secureBadge")}</span>
          </div>
        </div>
      </header>

      {/* 2. Primary layout with Sidebar and Main Tab Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Navigation & Quick References (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Main Navigation Tab Selector */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/90 space-y-1">
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-3 px-1">
              Social Operations Workspace
            </span>
            {navigationTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setNotification(`${t("workspaceShifted")}${tab.name}`);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group cursor-pointer border ${
                    isSelected 
                      ? "bg-gradient-to-r from-fcb-red to-rose-600 border-fcb-red text-white font-semibold shadow-md shadow-fcb-red/5" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-950"
                  }`}
                  id={`tab-select-${tab.id}`}
                >
                  <TabIcon className={`h-4.5 w-4.5 transition-transform group-hover:scale-105 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  <div>
                    <span className="text-xs block leading-none">{tab.name}</span>
                    <span className={`text-[9.5px] mt-0.5 block font-medium leading-none ${isSelected ? "text-slate-100" : "text-slate-500"}`}>
                      {tab.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick RAG Compliance Reference Panel */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/90 space-y-3 hidden lg:block">
            <span className="block text-[10px] font-mono text-fcb-gold uppercase tracking-wide font-bold px-1 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-fcb-gold" /> {t("brandComplianceTitle")}
            </span>
            <div className="space-y-2 select-text">
              {FCB_BRAND_RULES.map((rule, idx) => (
                <div key={idx} className="bg-slate-950/60 p-2 rounded-lg border border-slate-900/40 text-[10px] text-slate-400 leading-normal">
                  {rule}
                </div>
              ))}
            </div>
            <div className="pt-1.5 border-t border-slate-900/80 text-[10px] text-slate-500 font-mono text-center">
              {t("brandComplianceFooter")}
            </div>
          </div>
        </div>

        {/* Right Main Panel (Span 9) */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense fallback={<div className="p-8 text-center text-slate-500 font-mono text-sm">Loading...</div>}>
              {activeTab === "dashboard" && (
                <DashboardOverview 
                  logs={logs} 
                  onAddLog={handleAddLog} 
                  onSimulateTrigger={handleSimulateTrigger} 
                />
              )}

              {activeTab === "journey" && (
                <JourneyBuilder 
                  onAddLog={handleAddLog} 
                  onTriggerSimulate={handleSimulateTrigger}
                  activeSimulation={activeSimulation}
                />
              )}

              {activeTab === "generator" && (
                <ContentGenerator 
                  onAddLog={handleAddLog} 
                  drafts={drafts}
                  setDrafts={setDrafts}
                />
              )}

              {activeTab === "moderation" && (
                <ModerationPanel 
                  drafts={drafts}
                  setDrafts={setDrafts}
                  onAddLog={handleAddLog}
                  language={language}
                />
              )}

              {activeTab === "video" && (
                <VideoStudio 
                  onAddLog={handleAddLog} 
                />
              )}

              {activeTab === "rag" && (
                <RagHub 
                  onAddLog={handleAddLog} 
                />
              )}

              {activeTab === "automation" && (
                <AutomationLogs 
                  logs={logs}
                  onAddLog={handleAddLog} 
                />
              )}

              {activeTab === "langgraph" && (
                <LangGraphAgent 
                  onAddLog={handleAddLog} 
                />
              )}

              {activeTab === "analytics" && (
                <Analytics 
                  logs={logs}
                  onAddLog={handleAddLog}
                  presets={exportPresets}
                />
              )}

              
        {activeTab === "secret-manager" && <SecretManagerQA />}

        {activeTab === "settings" && (
                <SettingsPanel
                  theme={theme}
                  setTheme={setTheme}
                  onAddLog={handleAddLog}
                  speechEnabled={speechEnabled}
                  setSpeechEnabled={setSpeechEnabled}
                />
              )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* 3. Global Footer */}
      <footer className="mt-auto bg-slate-950/40 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        <p>{t("footerText")}</p>
        <p className="text-[10px] text-slate-600 mt-1">
          {t("footerSubText")}
        </p>
        <p className="mt-2 flex items-center justify-center gap-3 text-[11px]">
          <a href="/impressum.html" className="text-slate-400 hover:text-white underline underline-offset-2">Impressum</a>
          <span className="text-slate-700">·</span>
          <a href="/datenschutz.html" className="text-slate-400 hover:text-white underline underline-offset-2">Datenschutz</a>
        </p>
      </footer>

      <AnimatePresence>
        {isSchemaEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            >
               <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <FileJson className="w-4 h-4 text-indigo-400" />
                   <h3 className="text-sm font-bold text-slate-200">JSON Schema Editor</h3>
                 </div>
                 <button onClick={() => setIsSchemaEditorOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                   <X className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                 </button>
               </div>
               <div className="p-4">
                 <p className="text-xs text-slate-400 mb-4">Define and manage JSON validation rules for your templates.</p>
                 
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-xs font-mono text-slate-500">
                     Active Rules: <span className="text-indigo-400 font-bold">{schemaRules.length}</span>
                   </span>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         const blob = new Blob([JSON.stringify(schemaRules, null, 2)], { type: 'application/json' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = 'schema-rules.json';
                         document.body.appendChild(a);
                         a.click();
                         document.body.removeChild(a);
                         URL.revokeObjectURL(url);
                       }} 
                       className="px-3 py-1.5 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded text-xs flex items-center gap-1 transition-colors"
                     >
                       <Download className="w-3 h-3" /> Export Schema
                     </button>
                     <button 
                       onClick={() => setSchemaRules([...schemaRules, { id: Date.now() }])} 
                       className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 rounded text-xs flex items-center gap-1 transition-colors"
                     >
                       <Plus className="w-3 h-3" /> Add Rule
                     </button>
                   </div>
                 </div>
                 
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                   {schemaRules.length === 0 ? (
                     <div className="text-center p-6 border border-dashed border-slate-700 rounded-lg text-slate-500 text-xs">
                       No validation rules defined yet.
                     </div>
                   ) : (
                     schemaRules.map((rule, i) => (
                        <div key={rule.id || i} className="flex items-center gap-3 bg-slate-950/50 border border-slate-800 p-3 rounded-lg">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input 
                              type="text" 
                              value={rule.key || ""}
                              onChange={(e) => setSchemaRules(schemaRules.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))}
                              placeholder="Rule key (e.g., required_fields)"
                              className="w-full bg-transparent border-b border-slate-700 text-xs text-slate-300 p-1 outline-none focus:border-indigo-500 transition-colors"
                            />
                            <input 
                              type="text" 
                              value={rule.description || ""}
                              onChange={(e) => setSchemaRules(schemaRules.map((r, idx) => idx === i ? { ...r, description: e.target.value } : r))}
                              placeholder="Rule description"
                              className="w-full bg-transparent border-b border-slate-700 text-xs text-slate-400 p-1 outline-none focus:border-indigo-500 transition-colors"
                            />
                            <div className="relative mt-2 border border-slate-700 rounded-md bg-[#1d1f21]">
                              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 bg-slate-950/50">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">JSON Definition</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      const parsed = JSON.parse(rule.definition || "{}");
                                      const formatted = JSON.stringify(parsed, null, 2);
                                      setSchemaRules(schemaRules.map((r, idx) => idx === i ? { ...r, definition: formatted } : r));
                                    } catch (e) {
                                      // Invalid JSON, ignore
                                    }
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-colors"
                                >
                                  Auto-format
                                </button>
                              </div>
                              <div className="relative min-h-[80px]">
                                <pre className="w-full h-full min-h-[80px] p-2 text-xs font-mono overflow-auto m-0 bg-transparent text-slate-300" aria-hidden="true" style={{ tabSize: 2 }}>
                                  <code
                                    dangerouslySetInnerHTML={{
                                      __html: Prism.highlight(rule.definition || "", Prism.languages.json, 'json')
                                    }}
                                  />
                                </pre>
                                <textarea 
                                  value={rule.definition || ""}
                                  onChange={(e) => setSchemaRules(schemaRules.map((r, idx) => idx === i ? { ...r, definition: e.target.value } : r))}
                                  placeholder='{\n  "type": "string"\n}'
                                  spellCheck={false}
                                  style={{ tabSize: 2 }}
                                  className="absolute top-0 left-0 w-full h-full p-2 text-xs font-mono text-transparent caret-indigo-400 bg-transparent outline-none resize-y min-h-[80px]"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setSchemaRules(schemaRules.map((r, idx) => idx === i ? { ...r, enabled: r.enabled === false ? true : false } : r))}
                            className={`w-8 h-4 rounded-full flex items-center transition-colors px-0.5 ${rule.enabled !== false ? 'bg-indigo-600' : 'bg-slate-700'}`}
                            title={rule.enabled !== false ? "Disable Rule" : "Enable Rule"}
                          >
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${rule.enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <button 
                            onClick={() => setSchemaRules(schemaRules.filter((_, idx) => idx !== i))} 
                            className="flex items-center gap-1 text-rose-500/70 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded transition-colors ml-1"
                            title="Remove Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] uppercase font-bold">Delete</span>
                          </button>
                        </div>
                     ))
                   )}
                 </div>
                 
                 <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-800">
                   <button 
                     onClick={() => setIsSchemaEditorOpen(false)}
                     className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={() => setIsSchemaEditorOpen(false)}
                     className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-lg shadow-indigo-500/20"
                   >
                     Save Schema
                   </button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
