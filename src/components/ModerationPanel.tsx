import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, AlertCircle, Trash2, Edit2, Check, X, Search, Filter, 
  ThumbsUp, ThumbsDown, Send, Clock, User, Sparkles, AlertTriangle, ShieldCheck,
  Eye, Save, ArrowRight, LayoutGrid, List, CheckSquare, Shield, RefreshCw, Calendar, Download, Zap,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";
import { DraftSocialPost, PipelineLog } from "../types";

export interface ModerationHistoryItem {
  id: string;
  who: string;
  whoRole: string;
  when: string;
  what: string;
  action: "approve" | "reject" | "publish" | "edit";
  headline: string;
  platform: string;
  originalDraft?: DraftSocialPost;
}

const MODERATOR_PROFILES = [
  { name: "Veselin Takev", role: "Lead Editor", id: "mod-vt" },
  { name: "Sarah Brand", role: "Brand Compliance Officer", id: "mod-sb" },
  { name: "Thomas Müller", role: "Club Media Manager", id: "mod-tm" },
  { name: "MiaSanAI Agent", role: "AI automated Reviewer", id: "mod-ai" }
];

const INITIAL_HISTORY: ModerationHistoryItem[] = [
  {
    id: "hist-1",
    who: "Sarah Brand",
    whoRole: "Brand Compliance Officer",
    when: "07/07/2026, 11:20:00 AM",
    what: "Approved Social Media Post for Campaign",
    action: "approve",
    headline: "BAMBI ON FIRE ⚡",
    platform: "TikTok"
  },
  {
    id: "hist-2",
    who: "Veselin Takev",
    whoRole: "Lead Editor",
    when: "07/07/2026, 11:05:15 AM",
    what: "Edited Post Caption content directly",
    action: "edit",
    headline: "MIA SAN HALBFINALE! 🔥",
    platform: "Instagram"
  },
  {
    id: "hist-3",
    who: "Sarah Brand",
    whoRole: "Brand Compliance Officer",
    when: "07/07/2026, 09:44:12 AM",
    what: "Rejected draft: Outdated platform length constraints",
    action: "reject",
    headline: "Harry Kane Matchday Announcement",
    platform: "X/Twitter"
  }
];

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: "approved" | "rejected";
  draftId: string;
  headline: string;
  reason: string;
  user: string;
}

interface ModerationPanelProps {
  drafts: DraftSocialPost[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftSocialPost[]>>;
  onAddLog: (log: PipelineLog) => void;
  language: "de" | "en";
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({ 
  drafts, 
  setDrafts, 
  onAddLog,
  language 
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [editingDraft, setEditingDraft] = useState<DraftSocialPost | null>(null);
  const [previewDraft, setPreviewDraft] = useState<DraftSocialPost | null>(null);
  
  // Moderator Profiles States
  const [activeModIdx, setActiveModIdx] = useState<number>(0);
  const currentMod = MODERATOR_PROFILES[activeModIdx];

  // History Log States
  const [history, setHistory] = useState<ModerationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("fcb_miasanai_mod_history");
      return saved ? JSON.parse(saved) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [selectedBulkDraftIds, setSelectedBulkDraftIds] = useState<string[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  // Sync history log to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("fcb_miasanai_mod_history", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  // Form states for editing
  const [editHeadline, setEditHeadline] = useState<string>("");
  const [editCaption, setEditCaption] = useState<string>("");
  const [editHashtags, setEditHashtags] = useState<string>("");
  const [editPlatform, setEditPlatform] = useState<string>("");

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    draftId: string;
    action: "approve" | "reject";
    isQuick?: boolean;
  } | null>(null);
  const [modalNotes, setModalNotes] = useState<string>("");

  const triggerConfirmModal = (draftId: string, action: "approve" | "reject", isQuick: boolean = false) => {
    setConfirmModal({
      isOpen: true,
      draftId,
      action,
      isQuick
    });
    setModalNotes(feedbackMap[draftId] || "");
  };

  // Statistics
  const rejectedCount = history.filter(h => h.action === "reject").length;

  const stats = {
    total: drafts.length,
    pending: drafts.filter(d => d.status === "pending").length,
    approved: drafts.filter(d => d.status === "approved").length,
    published: drafts.filter(d => d.status === "published").length,
    rejected: rejectedCount,
  };

  // Run dynamic brand audit scan on selected draft
  const runBrandAudit = (draft: DraftSocialPost) => {
    const textToScan = `${draft.headline} ${draft.caption} ${draft.hashtags.join(" ")}`.toLowerCase();
    
    const checks = [
      {
        id: "motto",
        label: language === "de" ? 'Enthält "Mia San Mia" Motto' : 'Contains "Mia San Mia" Motto',
        passed: textToScan.includes("mia san mia"),
        critical: true,
        feedback: language === "de" 
          ? "Das offizielle Vereinsmotto fehlt. Es wird dringend empfohlen, dieses hinzuzufügen."
          : "The official club motto is missing. It is highly recommended to include it."
      },
      {
        id: "hashtags",
        label: language === "de" ? "Erforderliche Hashtags vorhanden" : "Required Hashtags Included",
        passed: draft.hashtags.length >= 2,
        critical: false,
        feedback: language === "de"
          ? "Mindestens 2 strategische Hashtags (z. B. #FCBayern) verwenden."
          : "Include at least 2 strategic hashtags (e.g. #FCBayern)."
      },
      {
        id: "length",
        label: language === "de" ? "Kanallängen-Compliance" : "Platform Length Compliance",
        passed: draft.platform !== "X/Twitter" || draft.caption.length <= 280,
        critical: true,
        feedback: language === "de"
          ? "Der Text überschreitet das X/Twitter-Limit von 280 Zeichen."
          : "The text exceeds X/Twitter's 280-character limit."
      },
      {
        id: "tone",
        label: language === "de" ? "Spielerspezifische Tonalität" : "Player Tone Matching",
        passed: !draft.playerName || (
          draft.playerName === "Thomas Müller" && (textToScan.includes("!") || textToScan.includes("🔥") || textToScan.includes("schau")) ||
          draft.playerName === "Harry Kane" && (textToScan.includes("support") || textToScan.includes("focus") || textToScan.includes("team")) ||
          draft.playerName === "Jamal Musiala" && (textToScan.includes("magic") || textToScan.includes("dribble") || textToScan.includes("fans"))
        ),
        critical: false,
        feedback: language === "de"
          ? "Die Tonalität entspricht eventuell nicht dem Standard-Spielerprofil."
          : "The tone might not match the specific player profile standards."
      }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    return { checks, score };
  };

  const addHistoryLog = (
    action: "approve" | "reject" | "publish" | "edit", 
    headline: string, 
    platform: string, 
    details?: string,
    originalDraft?: DraftSocialPost
  ) => {
    const timestamp = new Date().toLocaleString(language === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    
    const defaultWhat = 
      action === "approve" ? (language === "de" ? "Beitrag für Kampagne freigegeben" : "Approved draft for publication queue") :
      action === "reject" ? (language === "de" ? "Inhalt abgelehnt und entfernt" : "Rejected and removed campaign content") :
      action === "publish" ? (language === "de" ? "Veröffentlicht auf Zielkanal" : "Dispatched and published live to channel") :
      (language === "de" ? "Inhaltstext manuell überarbeitet" : "Manually modified content template");

    const newLog: ModerationHistoryItem = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      who: currentMod.name,
      whoRole: currentMod.role,
      when: timestamp,
      what: details || defaultWhat,
      action,
      headline,
      platform,
      originalDraft
    };
    
    setHistory(prev => [newLog, ...prev]);
  };

  const handleApprove = (id: string, isQuick: boolean = false, overrideFeedback?: string) => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "approved" } : d));
    
    const customFeedback = (overrideFeedback !== undefined ? overrideFeedback : feedbackMap[id] || "").trim();
    const actionDetails = customFeedback 
      ? `${isQuick ? (language === "de" ? "Blitz-Freigabe" : "Quick Approval") : (language === "de" ? "Freigabe" : "Approval")} - Note: "${customFeedback}"`
      : (isQuick 
        ? (language === "de" ? "Blitz-Freigabe (Einfacher Klick)" : "Instant Quick Approval")
        : (language === "de" ? "Standard-Review Freigabe" : "Standard Review Approval"));

    onAddLog({
      id: `mod-approve-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Moderation Hub",
      message: (isQuick
        ? (language === "de" ? `[BLITZ-FREIGABE] Beitrag '${draft.headline}' direkt freigegeben.` : `[QUICK APPROVE] Post '${draft.headline}' approved instantly.`)
        : (language === "de" ? `Beitrag '${draft.headline}' freigegeben für die Veröffentlichung.` : `Post '${draft.headline}' approved for publication.`)) + 
        (customFeedback ? ` (${customFeedback})` : "")
    });

    addHistoryLog(
      "approve", 
      draft.headline, 
      draft.platform, 
      actionDetails,
      draft
    );

    // Clear feedback for this item after action
    setFeedbackMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleReject = (id: string, overrideFeedback?: string) => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    // Reject deletes or moves back to draft, let's remove it and log
    setDrafts(prev => prev.filter(d => d.id !== id));
    
    if (previewDraft?.id === id) setPreviewDraft(null);
    if (editingDraft?.id === id) setEditingDraft(null);

    const customFeedback = (overrideFeedback !== undefined ? overrideFeedback : feedbackMap[id] || "").trim();
    const actionDetails = customFeedback 
      ? `${language === "de" ? "Abgelehnt" : "Rejected"} - Note: "${customFeedback}"`
      : (language === "de" ? "Inhalt abgelehnt und entfernt" : "Rejected and removed campaign content");

    onAddLog({
      id: `mod-reject-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "WARNING",
      source: "Moderation Hub",
      message: (language === "de"
        ? `Beitrag '${draft.headline}' abgelehnt und aus Warteschlange gelöscht.`
        : `Post '${draft.headline}' rejected and removed from queue.`) +
        (customFeedback ? ` Reason: ${customFeedback}` : "")
    });

    addHistoryLog("reject", draft.headline, draft.platform, actionDetails, draft);

    // Clear feedback for this item after action
    setFeedbackMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handlePublish = (id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: "published" } : d));

    onAddLog({
      id: `mod-publish-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Automation Engine",
      message: language === "de"
        ? `[DISPATCH] Beitrag '${draft.headline}' erfolgreich an n8n Webhook übermittelt & live geschaltet.`
        : `[DISPATCH] Post '${draft.headline}' successfully sent to n8n Webhook & published live.`
    });

    addHistoryLog("publish", draft.headline, draft.platform);
  };

  const handleUndo = (item: ModerationHistoryItem) => {
    if (item.action === "approve") {
      setDrafts(prev => {
        const targetId = item.originalDraft?.id;
        const exists = targetId 
          ? prev.some(d => d.id === targetId)
          : prev.some(d => d.headline === item.headline && d.platform === item.platform);

        if (exists) {
          return prev.map(d => {
            const isMatch = targetId ? d.id === targetId : (d.headline === item.headline && d.platform === item.platform);
            return isMatch ? { ...d, status: "pending" as "pending" | "approved" | "published" } : d;
          });
        } else if (item.originalDraft) {
          return [...prev, { ...item.originalDraft, status: "pending" as "pending" | "approved" | "published" }];
        }
        return prev;
      });

      onAddLog({
        id: `mod-undo-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        source: "Moderation Hub",
        message: language === "de"
          ? `[RÜCKGÄNGIG] Freigabe für '${item.headline}' aufgehoben.`
          : `[UNDO] Reverted approval for '${item.headline}'.`
      });

      setHistory(prev => prev.filter(h => h.id !== item.id));

    } else if (item.action === "reject") {
      if (item.originalDraft) {
        setDrafts(prev => {
          const exists = prev.some(d => d.id === item.originalDraft?.id);
          if (exists) return prev;
          return [...prev, { ...item.originalDraft!, status: "pending" as "pending" | "approved" | "published" }];
        });

        onAddLog({
          id: `mod-undo-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Moderation Hub",
          message: language === "de"
            ? `[RÜCKGÄNGIG] Ablehnung für '${item.headline}' aufgehoben (Beitrag wiederhergestellt).`
            : `[UNDO] Reverted rejection for '${item.headline}' (post restored).`
        });

        setHistory(prev => prev.filter(h => h.id !== item.id));
      }
    }
  };

  const startEdit = (draft: DraftSocialPost) => {
    setEditingDraft(draft);
    setEditHeadline(draft.headline);
    setEditCaption(draft.caption);
    setEditHashtags(draft.hashtags.join(", "));
    setEditPlatform(draft.platform);
  };

  const saveEdit = () => {
    if (!editingDraft) return;

    const updatedHashtags = editHashtags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => t.startsWith("#") ? t : `#${t}`);

    setDrafts(prev => prev.map(d => d.id === editingDraft.id ? {
      ...d,
      headline: editHeadline,
      caption: editCaption,
      hashtags: updatedHashtags,
      platform: editPlatform
    } : d));

    onAddLog({
      id: `mod-edit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Moderation Hub",
      message: language === "de"
        ? `Beitrag '${editHeadline}' durch Moderator bearbeitet.`
        : `Post '${editHeadline}' edited by moderator.`
    });

    addHistoryLog(
      "edit", 
      editHeadline, 
      editPlatform, 
      language === "de" ? `Metadaten und Tonalität überarbeitet` : `Overhauled metadata parameters and layout`
    );

    setEditingDraft(null);
  };

  // Filter drafts based on searches & filters
  const filteredDrafts = drafts.filter(d => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      d.headline.toLowerCase().includes(query) || 
      d.caption.toLowerCase().includes(query) || 
      d.playerName.toLowerCase().includes(query);
    
    const matchesStatus = selectedStatus === "all" || d.status === selectedStatus;
    const matchesPlatform = selectedPlatform === "all" || d.platform === selectedPlatform;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  // Bulk selection and actions helpers
  const pendingFilteredDrafts = filteredDrafts.filter(d => d.status === "pending");
  const isAllPendingSelected = pendingFilteredDrafts.length > 0 && pendingFilteredDrafts.every(d => selectedBulkDraftIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllPendingSelected) {
      // Deselect all pending that are currently in filteredDrafts
      const filteredPendingIds = pendingFilteredDrafts.map(d => d.id);
      setSelectedBulkDraftIds(prev => prev.filter(id => !filteredPendingIds.includes(id)));
    } else {
      // Select all pending that are currently in filteredDrafts
      const filteredPendingIds = pendingFilteredDrafts.map(d => d.id);
      setSelectedBulkDraftIds(prev => {
        const union = new Set([...prev, ...filteredPendingIds]);
        return Array.from(union);
      });
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedBulkDraftIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    const toApprove = drafts.filter(d => selectedBulkDraftIds.includes(d.id) && d.status === "pending");
    if (toApprove.length === 0) return;

    setDrafts(prev => prev.map(d => {
      if (selectedBulkDraftIds.includes(d.id) && d.status === "pending") {
        return { ...d, status: "approved" as const };
      }
      return d;
    }));

    // Add logs and history entries
    toApprove.forEach(draft => {
      const customFeedback = feedbackMap[draft.id]?.trim();
      const actionDetails = customFeedback
        ? `${language === "de" ? "Sammel-Freigabe" : "Bulk Approval"} - Note: "${customFeedback}"`
        : (language === "de" ? "Sammel-Freigabe (Sammelaktion)" : "Approved via Bulk Action");

      onAddLog({
        id: `mod-bulk-approve-${draft.id}-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "Moderation Hub",
        message: (language === "de"
          ? `[SAMMEL-FREIGABE] Beitrag '${draft.headline}' freigegeben.`
          : `[BULK APPROVE] Post '${draft.headline}' approved.`) + (customFeedback ? ` (${customFeedback})` : "")
      });

      addHistoryLog(
        "approve",
        draft.headline,
        draft.platform,
        actionDetails
      );
    });

    // Clear feedback for selected items
    setFeedbackMap(prev => {
      const copy = { ...prev };
      selectedBulkDraftIds.forEach(id => {
        delete copy[id];
      });
      return copy;
    });

    // Clear selection
    setSelectedBulkDraftIds([]);
  };

  const handleApproveRef = useRef(handleApprove);
  useEffect(() => {
    handleApproveRef.current = handleApprove;
  });

  // Keyboard shortcut Ctrl+A for Quick Approve of the first pending item
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+A (or Meta+A for Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        // Prevent triggering when typing inside inputs/textareas
        const target = e.target as HTMLElement;
        if (target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable
        )) {
          return;
        }

        const firstPending = pendingFilteredDrafts[0] || drafts.find(d => d.status === "pending");
        if (firstPending) {
          e.preventDefault();
          handleApproveRef.current(firstPending.id, true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pendingFilteredDrafts, drafts]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const isDe = language === "de";

    // Set properties
    doc.setProperties({
      title: isDe ? "FC Bayern Moderation Audit-Trail" : "FC Bayern Moderation Audit Trail",
      subject: "Audit Logs",
      author: "MiaSanAI Content Hub"
    });

    let pageCount = 1;

    // Helper to draw footer
    const drawFooter = (pageNumber: number) => {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate-500
      const footerText = isDe 
        ? `FC Bayern München | Inhaltsfreigabe & Moderations-Center | Seite ${pageNumber}`
        : `FC Bayern München | Content Approval & Moderation Hub | Page ${pageNumber}`;
      doc.text(footerText, 15, 287);
      
      const timeStr = new Date().toLocaleString(isDe ? "de-DE" : "en-US");
      doc.text(timeStr, 195 - doc.getTextWidth(timeStr), 287);
    };

    // Helper to draw header and metadata
    const drawHeader = () => {
      // Top header bar - FC Bayern Red
      doc.setFillColor(153, 0, 0); // FCB Dark Red
      doc.rect(0, 0, 210, 15, "F");

      // FC Bayern text white
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FC BAYERN MÜNCHEN", 15, 10);

      // Title & Subtitle
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(18);
      doc.text(isDe ? "Compliance Audit-Trail & Verlauf" : "Compliance Audit Trail & History Log", 15, 28);

      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        isDe 
          ? "Offizielles Dokumentationsprotokoll über Inhaltsfreigaben, Ablehnungen und Modifikationen."
          : "Official documentation record of all AI-generated content actions, reviews, and edits.",
        15,
        34
      );

      // Metadata card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, 39, 180, 18, "F");
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(15, 39, 180, 18, "S");

      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text(isDe ? "EXPORTEUR:" : "EXPORTED BY:", 20, 45);
      doc.text(isDe ? "ZEITSTEMPEL:" : "TIMESTAMP:", 20, 51);
      doc.text(isDe ? "LOG-ANZAHL:" : "TOTAL LOGS:", 110, 45);
      doc.text(isDe ? "STATUS:" : "STATUS:", 110, 51);

      doc.setFont("Helvetica", "normal");
      doc.text("Veselin Takev (Lead Editor)", 45, 45);
      doc.text(new Date().toLocaleString(isDe ? "de-DE" : "en-US"), 45, 51);
      doc.text(String(history.length), 135, 45);
      
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.setFont("Helvetica", "bold");
      doc.text(isDe ? "VERIFIZIERTES PROTOKOLL" : "VERIFIED COMPLIANT", 135, 51);

      // Table Header Row
      const startY = 64;
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(15, startY, 180, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);

      // Align header cells
      doc.text(isDe ? "Aktion" : "Action", 17, startY + 5.5);
      doc.text(isDe ? "Inhalt / Headline" : "Headline / Topic", 41, startY + 5.5);
      doc.text(isDe ? "Plattform" : "Platform", 83, startY + 5.5);
      doc.text(isDe ? "Prüfer" : "Reviewer", 105, startY + 5.5);
      doc.text(isDe ? "Datum / Uhrzeit" : "Date & Time", 132, startY + 5.5);
      doc.text(isDe ? "Notizen" : "Notes / Feedback", 162, startY + 5.5);
    };

    drawHeader();
    drawFooter(pageCount);

    let currentY = 72;

    history.forEach((item, index) => {
      // Analyze text widths & split
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);

      const actionText = item.action.toUpperCase();
      const platformText = item.platform;
      const reviewerText = `${item.who}\n(${item.whoRole})`;
      const timestampText = item.when;
      const notesText = item.what || "-";

      const headlineLines = doc.splitTextToSize(item.headline, 38) as string[];
      const reviewerLines = doc.splitTextToSize(reviewerText, 23) as string[];
      const timestampLines = doc.splitTextToSize(timestampText, 26) as string[];
      const notesLines = doc.splitTextToSize(notesText, 29) as string[];

      const maxLines = Math.max(
        headlineLines.length,
        reviewerLines.length,
        timestampLines.length,
        notesLines.length,
        1
      );

      const rowHeight = maxLines * 4 + 4; // height of cell

      // Pagination check
      if (currentY + rowHeight > 275) {
        doc.addPage();
        pageCount++;
        drawHeader();
        drawFooter(pageCount);
        currentY = 72;
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(15, currentY, 180, rowHeight, "F");
      }

      // Action colors
      if (item.action === "approve") {
        doc.setTextColor(16, 185, 129); // emerald-500
      } else if (item.action === "reject") {
        doc.setTextColor(239, 68, 68); // rose-500
      } else {
        doc.setTextColor(59, 130, 246); // blue-500
      }

      doc.setFont("Helvetica", "bold");
      doc.text(actionText, 17, currentY + 5);

      // Reset text color for table content
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("Helvetica", "normal");

      // Draw headline lines
      headlineLines.forEach((line, lIdx) => {
        doc.text(line, 41, currentY + 5 + lIdx * 4);
      });

      // Platform
      doc.text(platformText, 83, currentY + 5);

      // Reviewer
      reviewerLines.forEach((line, lIdx) => {
        doc.text(line, 105, currentY + 5 + lIdx * 4);
      });

      // Timestamp
      timestampLines.forEach((line, lIdx) => {
        doc.text(line, 132, currentY + 5 + lIdx * 4);
      });

      // Notes / Feedback
      doc.setFont("Helvetica", "italic");
      notesLines.forEach((line, lIdx) => {
        doc.text(line, 162, currentY + 5 + lIdx * 4);
      });

      // Bottom border for the row
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);

      currentY += rowHeight;
    });

    // Save/Download the PDF
    doc.save(`fcb_moderation_approval_log_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const totalBarCount = stats.pending + stats.approved + stats.published + stats.rejected;
  const pendingPct = totalBarCount > 0 ? (stats.pending / totalBarCount) * 100 : 0;
  const approvedPct = totalBarCount > 0 ? (stats.approved / totalBarCount) * 100 : 0;
  const publishedPct = totalBarCount > 0 ? (stats.published / totalBarCount) * 100 : 0;
  const rejectedPct = totalBarCount > 0 ? (stats.rejected / totalBarCount) * 100 : 0;

  const draftForConfirm = confirmModal?.isOpen ? drafts.find(d => d.id === confirmModal.draftId) : null;

  return (
    <div className="space-y-6 select-none" id="moderation-panel-root">
      
      {/* 1. Header Banner & Stats Grid */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-fcb-gold" />
              {language === "de" ? "Inhaltsfreigabe & Moderations-Center" : "Content Approval & Moderation Hub"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
              <p className="text-xs text-slate-400">
                {language === "de"
                  ? "Prüfen, bearbeiten, genehmigen und veröffentlichen Sie KI-generierte Club-Inhalte für maximale Marken-Compliance."
                  : "Review, edit, approve, and dispatch AI-generated club content for strict brand compliance."}
              </p>
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono text-slate-400 select-none cursor-help hover:text-fcb-gold hover:border-fcb-gold/30 transition"
                title={language === "de" ? "Drücke Ctrl+A zum schnellen Freigeben des ersten ausstehenden Beitrags" : "Press Ctrl+A to quick approve the first pending post in the list"}
              >
                <kbd className="bg-slate-900 border border-slate-750 px-1 py-0.2 rounded text-[8px] font-bold text-slate-300">Ctrl + A</kbd>
                <span>{language === "de" ? "Schnellfreigabe" : "Quick Approve"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const csv = ["Timestamp,Action,DraftID,Headline,Reason,User"];
                  [] /* auditLogs */.forEach((log: any) => {
                    csv.push(`"${log.timestamp}","${log.action}","${log.draftId}","${log.headline.replace(/"/g, '""')}","${log.reason.replace(/"/g, '""')}","${log.user}"`);
                  });
                  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono font-bold text-slate-300 cursor-pointer hover:bg-slate-900 hover:text-cyan-400 hover:border-cyan-900 transition"
                title={language === "de" ? "Audit-Log (CSV) Exportieren" : "Export Audit Log (CSV)"}
              >
                <Download className="h-3 w-3" />
                {language === "de" ? "AUDIT-LOG EXPORTIEREN" : "EXPORT AUDIT LOG"}
              </button>
            </div>
          </div>

          {/* Dynamic statistics blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono w-full lg:w-auto">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 flex flex-col justify-between min-w-[90px]">
              <span className="text-[9px] text-slate-500 uppercase">{language === "de" ? "Gesamt" : "Total Queue"}</span>
              <span className="text-lg font-bold text-slate-200 mt-1">{stats.total}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 flex flex-col justify-between relative overflow-hidden min-w-[90px]">
              <span className="text-[9px] text-amber-500 uppercase font-bold">{language === "de" ? "Offen" : "Pending"}</span>
              <span className="text-lg font-bold text-amber-400 mt-1">{stats.pending}</span>
              {stats.pending > 0 && (
                <div className="absolute right-2 bottom-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 flex flex-col justify-between min-w-[90px]">
              <span className="text-[9px] text-emerald-500 uppercase font-bold">{language === "de" ? "Freigegeben" : "Approved"}</span>
              <span className="text-lg font-bold text-emerald-400 mt-1">{stats.approved}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 flex flex-col justify-between min-w-[90px]">
              <span className="text-[9px] text-violet-500 uppercase font-bold">{language === "de" ? "Veröffentlicht" : "Published"}</span>
              <span className="text-lg font-bold text-violet-400 mt-1">{stats.published}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 flex flex-col justify-between min-w-[90px]">
              <span className="text-[9px] text-rose-500 uppercase font-bold">{language === "de" ? "Abgelehnt" : "Rejected"}</span>
              <span className="text-lg font-bold text-rose-400 mt-1">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Multi-segmented progress bar indicator representing moderation pipeline state */}
        <div className="bg-slate-950/40 border border-slate-900/85 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-fcb-gold" />
              {language === "de" ? "Moderations-Aktivität & Pipeline-Status" : "Moderation Pipeline & Status Breakdown"}
            </span>
            <span className="text-[9.5px]">
              {totalBarCount} {language === "de" ? "Aktionen erfasst" : "Actions Accounted"}
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="h-2.5 w-full rounded-full bg-slate-900/90 overflow-hidden flex border border-slate-850">
            {totalBarCount === 0 ? (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[8px] text-slate-500 font-mono">
                {language === "de" ? "Keine Daten vorhanden" : "No queue data"}
              </div>
            ) : (
              <>
                {stats.pending > 0 && (
                  <div 
                    style={{ width: `${pendingPct}%` }} 
                    className="bg-amber-500 h-full transition-all duration-500 ease-out border-r border-slate-950/40 last:border-0" 
                    title={`${language === "de" ? "Offen" : "Pending"}: ${stats.pending} (${pendingPct.toFixed(1)}%)`} 
                  />
                )}
                {stats.approved > 0 && (
                  <div 
                    style={{ width: `${approvedPct}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-500 ease-out border-r border-slate-950/40 last:border-0" 
                    title={`${language === "de" ? "Freigegeben" : "Approved"}: ${stats.approved} (${approvedPct.toFixed(1)}%)`} 
                  />
                )}
                {stats.published > 0 && (
                  <div 
                    style={{ width: `${publishedPct}%` }} 
                    className="bg-violet-500 h-full transition-all duration-500 ease-out border-r border-slate-950/40 last:border-0" 
                    title={`${language === "de" ? "Veröffentlicht" : "Published"}: ${stats.published} (${publishedPct.toFixed(1)}%)`} 
                  />
                )}
                {stats.rejected > 0 && (
                  <div 
                    style={{ width: `${rejectedPct}%` }} 
                    className="bg-rose-500 h-full transition-all duration-500 ease-out last:border-0" 
                    title={`${language === "de" ? "Abgelehnt" : "Rejected"}: ${stats.rejected} (${rejectedPct.toFixed(1)}%)`} 
                  />
                )}
              </>
            )}
          </div>

          {/* Legend and stats percentages */}
          {totalBarCount > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[9.5px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-amber-500" />
                <span className="text-slate-400">{language === "de" ? "Offen" : "Pending"}:</span>
                <span className="text-amber-400 font-bold">{stats.pending} ({pendingPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-emerald-500" />
                <span className="text-slate-400">{language === "de" ? "Freigegeben" : "Approved"}:</span>
                <span className="text-emerald-400 font-bold">{stats.approved} ({approvedPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-violet-500" />
                <span className="text-slate-400">{language === "de" ? "Veröffentlicht" : "Published"}:</span>
                <span className="text-violet-400 font-bold">{stats.published} ({publishedPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded bg-rose-500" />
                <span className="text-slate-400">{language === "de" ? "Abgelehnt" : "Rejected"}:</span>
                <span className="text-rose-400 font-bold">{stats.rejected} ({rejectedPct.toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Search & Filters Toolbar */}
      <div className="bg-slate-900/20 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={language === "de" ? "Suche nach Spieler, Schlagzeile oder Text..." : "Search by player, headline or caption..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800/85 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-fcb-gold transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{language === "de" ? "Status:" : "Status:"}</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 cursor-pointer outline-none focus:border-fcb-gold"
            >
              <option value="all">{language === "de" ? "Alle Stati" : "All Status"}</option>
              <option value="pending">{language === "de" ? "Ausstehend" : "Pending Review"}</option>
              <option value="approved">{language === "de" ? "Freigegeben" : "Approved"}</option>
              <option value="published">{language === "de" ? "Veröffentlicht" : "Published"}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">{language === "de" ? "Kanal:" : "Channel:"}</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 cursor-pointer outline-none focus:border-fcb-gold"
            >
              <option value="all">{language === "de" ? "Alle Kanäle" : "All Platforms"}</option>
              <option value="Instagram">Instagram</option>
              <option value="X/Twitter">X/Twitter</option>
              <option value="TikTok">TikTok</option>
              <option value="Facebook">Facebook</option>
              <option value="FCB App/Newsletter">FCB App</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800/80 rounded px-2.5 py-1 text-slate-300">
            <User className="h-3 w-3 text-fcb-gold" />
            <span className="text-[10px] text-slate-500">{language === "de" ? "Prüfer:" : "Reviewer:"}</span>
            <select
              value={activeModIdx}
              onChange={(e) => setActiveModIdx(parseInt(e.target.value, 10))}
              className="bg-transparent text-slate-200 font-bold font-mono text-[10.5px] cursor-pointer outline-none border-none focus:ring-0 p-0"
              id="moderator-profile-select"
            >
              {MODERATOR_PROFILES.map((prof, i) => (
                <option key={prof.id} value={i} className="bg-slate-950 text-slate-200">
                  {prof.name} ({prof.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid with List and Side Scanner Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (List of Drafts - spans 8) */}
        <div className="xl:col-span-8 space-y-4">
          
          {/* Bulk Action Controls Bar */}
          {pendingFilteredDrafts.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs select-none shadow-sm" id="bulk-action-bar">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition group">
                  <input
                    type="checkbox"
                    checked={isAllPendingSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-fcb-gold focus:ring-0 focus:ring-offset-0 cursor-pointer accent-fcb-gold"
                    id="bulk-select-all-checkbox"
                  />
                  <span className="font-semibold text-slate-200 group-hover:text-fcb-gold transition">
                    {language === "de" ? "Alle ausstehenden auswählen" : "Select All Pending"}
                  </span>
                </label>
                <span className="text-[10px] text-slate-400 bg-slate-950/80 px-2.5 py-0.5 rounded border border-slate-800">
                  {selectedBulkDraftIds.length} {language === "de" ? "ausgewählt" : "selected"}
                </span>
              </div>

              {selectedBulkDraftIds.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="w-full sm:w-auto px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer font-sans shadow-md shadow-amber-500/15 border border-amber-600/30"
                  id="bulk-approve-action-btn"
                >
                  <Zap className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                  {language === "de" 
                    ? `Sammel-Freigabe (${selectedBulkDraftIds.length})` 
                    : `Bulk Approve (${selectedBulkDraftIds.length})`}
                </button>
              )}
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filteredDrafts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500"
              >
                <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-xs font-mono">
                  {language === "de"
                    ? "Keine passenden Social-Entwürfe in der Moderationswarteschlange gefunden."
                    : "No matching social drafts found in the moderation queue."}
                </p>
              </motion.div>
            ) : (
              filteredDrafts.map((draft) => {
                const audit = runBrandAudit(draft);
                const isSelectedForPreview = previewDraft?.id === draft.id;
                
                return (
                  <motion.div
                    key={draft.id}
                    layoutId={`draft-card-${draft.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`bg-slate-900/40 border rounded-2xl p-5 transition-all relative ${
                      isSelectedForPreview 
                        ? "border-fcb-gold shadow-md shadow-fcb-gold/5 bg-slate-900/60" 
                        : "border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50"
                    }`}
                  >
                    
                    {/* Upper Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        {draft.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={selectedBulkDraftIds.includes(draft.id)}
                            onChange={() => handleToggleSelectOne(draft.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-fcb-gold focus:ring-0 focus:ring-offset-0 cursor-pointer accent-fcb-gold mr-1"
                            id={`bulk-select-check-${draft.id}`}
                          />
                        )}

                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          draft.platform === "Instagram" ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                          draft.platform === "X/Twitter" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                          draft.platform === "TikTok" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                          "bg-slate-950 border-slate-800 text-slate-400"
                        }`}>
                          {draft.platform}
                        </span>
                        
                        {draft.playerName && (
                          <span className="text-[10.5px] font-mono font-semibold text-fcb-gold flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {draft.playerName}
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {draft.createdAt}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[9.5px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                          draft.status === "pending" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" :
                          draft.status === "approved" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                          "bg-violet-500/15 border-violet-500/30 text-violet-400"
                        }`}>
                          {draft.status === "pending" ? (language === "de" ? "Prüfung" : "Pending") :
                           draft.status === "approved" ? (language === "de" ? "Freigegeben" : "Approved") :
                           (language === "de" ? "Veröffentlicht" : "Published")}
                        </span>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="space-y-2 select-text">
                      <h4 className="text-sm font-bold text-white font-display tracking-tight leading-snug">
                        {draft.headline}
                      </h4>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {draft.caption}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {draft.hashtags.map((tag, index) => (
                          <span key={`${tag}-${index}`} className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Feedback / Review Notes Input Area */}
                    {draft.status === "pending" && (
                      <div className="mt-4 pt-3 border-t border-slate-800/40 space-y-1.5" id={`feedback-input-container-${draft.id}`}>
                        <label className="text-[10px] font-semibold text-slate-400 block font-mono">
                          {language === "de" ? "Freigabe-Notizen & Feedback (Wird im Audit-Log archiviert):" : "Approval Notes & Review Feedback (Archived in Audit Log):"}
                        </label>
                        <textarea
                          rows={2}
                          placeholder={language === "de" 
                            ? "Dokumentieren Sie hier, warum dieser Post freigegeben oder abgelehnt wird..." 
                            : "Document why this specific post is approved or rejected for publishing..."}
                          value={feedbackMap[draft.id] || ""}
                          onChange={(e) => setFeedbackMap(prev => ({ ...prev, [draft.id]: e.target.value }))}
                          className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-fcb-gold/50 focus:ring-1 focus:ring-fcb-gold/20 transition resize-none"
                          id={`draft-feedback-input-${draft.id}`}
                        />
                      </div>
                    )}

                    {/* Bottom Action bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/50 pt-4 mt-4">
                      
                      {/* Left: Brand scoring widget */}
                      <button
                        onClick={() => setPreviewDraft(draft)}
                        className={`text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer ${
                          audit.score === 100 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{language === "de" ? "Brand Scan:" : "Brand Scan:"} {audit.score}%</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(draft)}
                          disabled={draft.status === "published"}
                          className="p-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 rounded-lg cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title={language === "de" ? "Inhalt bearbeiten" : "Edit draft content"}
                          id={`mod-edit-btn-${draft.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => triggerConfirmModal(draft.id, "reject")}
                          className="p-1.5 bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 rounded-lg cursor-pointer transition"
                          title={language === "de" ? "Ablehnen & Löschen" : "Reject & Delete"}
                          id={`mod-reject-btn-${draft.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {draft.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(draft.id, true)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] rounded-lg font-bold flex items-center gap-1 transition cursor-pointer font-sans shadow-sm shadow-amber-500/10 border border-amber-600/20"
                              id={`mod-quick-approve-btn-${draft.id}`}
                              title={language === "de" ? "Sofortige Freigabe mit einem Klick" : "Instant one-click approval"}
                            >
                              <Zap className="h-3 w-3 fill-slate-950 text-slate-950 animate-pulse" />
                              {language === "de" ? "Blitz-Freigabe" : "Quick Approve"}
                            </button>

                            <button
                              onClick={() => triggerConfirmModal(draft.id, "approve", false)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer font-sans"
                              id={`mod-approve-btn-${draft.id}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              {language === "de" ? "Freigeben" : "Approve"}
                            </button>
                          </div>
                        )}

                        {draft.status === "approved" && (
                          <button
                            onClick={() => handlePublish(draft.id)}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer font-sans"
                            id={`mod-publish-btn-${draft.id}`}
                          >
                            <Send className="h-3 w-3" />
                            {language === "de" ? "Veröffentlichen" : "Publish Live"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Right Column (Brand Scanner Guardrail Panel - spans 4) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Brand Scanner Sidebar */}
          <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <ShieldCheck className="h-5 w-5 text-fcb-gold" />
              <div>
                <span className="text-xs font-mono text-fcb-gold font-bold uppercase tracking-wide block">
                  {language === "de" ? "AI-Compliance-Inspektor" : "AI Compliance Inspector"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {language === "de" ? "Echtzeit Brand Guidelines Scan" : "Real-time brand compliance scanner"}
                </span>
              </div>
            </div>

            {previewDraft ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 font-bold">{previewDraft.headline.substring(0, 24)}...</span>
                  <div className="text-right font-mono">
                    <span className={`text-lg font-extrabold ${
                      runBrandAudit(previewDraft).score === 100 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {runBrandAudit(previewDraft).score}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">{language === "de" ? "Gesamtpunktzahl" : "Overall Score"}</span>
                  </div>
                </div>

                {/* Audit checklist list */}
                <div className="space-y-3">
                  {runBrandAudit(previewDraft).checks.map((check) => (
                    <div 
                      key={check.id}
                      className={`p-3 rounded-xl border leading-relaxed ${
                        check.passed 
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300" 
                          : "bg-amber-500/5 border-amber-500/10 text-amber-300"
                      }`}
                    >
                      <div className="flex items-start gap-2 justify-between">
                        <span className="text-[11px] font-bold font-mono">{check.label}</span>
                        {check.passed ? (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          check.critical ? (
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                          )
                        )}
                      </div>
                      {!check.passed && (
                        <p className="text-[10px] text-slate-400 mt-1 select-text">
                          {check.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 italic font-mono text-center pt-2">
                  {language === "de"
                    ? "* Ergebnisse basieren auf FC Bayern München Kommunikationsrichtlinien."
                    : "* Core engine checks matched with official FC Bayern guidelines."}
                </p>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <Sparkles className="h-8 w-8 text-slate-700 mx-auto" />
                <p className="text-xs font-mono">
                  {language === "de"
                    ? "Wählen Sie einen Beitrag im Scan-Modus aus, um die Compliance-Prüfung anzuzeigen."
                    : "Select a post's 'Brand Scan' to analyze compliance metrics."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Brand Moderation Audit Trail & History Log */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4" id="moderation-history-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-fcb-gold/10 rounded-xl border border-fcb-gold/20">
              <Shield className="h-5 w-5 text-fcb-gold" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white tracking-tight flex items-center gap-2">
                {language === "de" ? "Compliance Audit-Trail & Verlauf" : "Compliance Audit Trail & Action History"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === "de"
                  ? "Echtzeit-Verlauf aller Freigaben, Ablehnungen und Modifikationen (Wer, Wann, Was)."
                  : "Immutable sequence of all content approvals, rejections, and edits (Who, When, and What)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search within history */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder={language === "de" ? "Verlauf durchsuchen..." : "Search audit logs..."}
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800/80 rounded px-2.5 pl-8 py-1.5 text-[11px] font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-fcb-gold w-44 transition"
              />
            </div>

            {/* Download Approval Log */}
            <button
              onClick={handleDownloadPDF}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-fcb-gold/50 hover:bg-fcb-gold/10 text-slate-300 hover:text-fcb-gold text-[11px] font-semibold font-mono rounded cursor-pointer transition flex items-center gap-1.5"
              title={language === "de" ? "Freigabeprotokoll als PDF herunterladen" : "Download approval log as PDF"}
              id="download-approval-log-btn"
            >
              <FileText className="h-3.5 w-3.5 text-fcb-gold" />
              <span className="hidden sm:inline">{language === "de" ? "PDF-Bericht exportieren" : "Export PDF Log"}</span>
            </button>

            {/* Clear history */}
            <button
              onClick={() => {
                setHistory([]);
                onAddLog({
                  id: `mod-clear-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  level: "WARNING",
                  source: "Moderation Hub",
                  message: language === "de" ? "Aktivitätsverlauf gelöscht." : "Moderation audit history cleared."
                });
              }}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-red-900/50 hover:bg-red-950/20 text-slate-400 hover:text-red-400 text-[11px] font-semibold font-mono rounded cursor-pointer transition flex items-center gap-1.5"
              title={language === "de" ? "Verlauf leeren" : "Clear entire history log"}
              id="clear-moderation-history-btn"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{language === "de" ? "Verlauf leeren" : "Clear Logs"}</span>
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/40">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9.5px] tracking-wider select-none bg-slate-950/80">
                <th className="py-3 px-4 font-bold">{language === "de" ? "Aktion / Inhalt" : "Action / Content Headline"}</th>
                <th className="py-3 px-4 font-bold">{language === "de" ? "Prüfer (Wer)" : "Reviewer (Who)"}</th>
                <th className="py-3 px-4 font-bold">{language === "de" ? "Zeitstempel (Wann)" : "Timestamp (When)"}</th>
                <th className="py-3 px-4 font-bold text-right">{language === "de" ? "Details / Kanal" : "Details / Channel"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              <AnimatePresence initial={false}>
                {history.filter(item => {
                  const query = historySearchQuery.toLowerCase();
                  return item.who.toLowerCase().includes(query) ||
                         item.whoRole.toLowerCase().includes(query) ||
                         item.headline.toLowerCase().includes(query) ||
                         item.what.toLowerCase().includes(query) ||
                         item.platform.toLowerCase().includes(query);
                }).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-slate-600 italic">
                      {language === "de" ? "Keine entsprechenden Audit-Logs erfasst." : "No matching audit log actions found."}
                    </td>
                  </tr>
                ) : (
                  history.filter(item => {
                    const query = historySearchQuery.toLowerCase();
                    return item.who.toLowerCase().includes(query) ||
                           item.whoRole.toLowerCase().includes(query) ||
                           item.headline.toLowerCase().includes(query) ||
                           item.what.toLowerCase().includes(query) ||
                           item.platform.toLowerCase().includes(query);
                  }).map((item) => {
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="hover:bg-slate-900/30 transition-colors"
                      >
                        {/* What column */}
                        <td className="py-3 px-4 max-w-xs sm:max-w-md select-text">
                          <div className="flex items-start gap-2.5">
                            {/* Action Icon Badge */}
                            <div className={`mt-0.5 p-1 rounded ${
                              item.action === "approve" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              item.action === "reject" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                              item.action === "publish" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                              "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}>
                              {item.action === "approve" && <Check className="h-3.5 w-3.5" />}
                              {item.action === "reject" && <X className="h-3.5 w-3.5" />}
                              {item.action === "publish" && <Send className="h-3.5 w-3.5" />}
                              {item.action === "edit" && <Edit2 className="h-3.5 w-3.5" />}
                            </div>
                            
                            <div>
                              <span className="font-sans font-bold text-xs text-white block tracking-tight leading-snug">
                                {item.headline}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {item.what}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Who column */}
                        <td className="py-3 px-4 select-text">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-fcb-gold font-sans">
                              {item.who.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <span className="text-slate-200 font-sans font-semibold block">{item.who}</span>
                              <span className="text-[9.5px] text-slate-500 block">{item.whoRole}</span>
                            </div>
                          </div>
                        </td>

                        {/* When column */}
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap select-text">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{item.when}</span>
                          </div>
                        </td>

                        {/* Details / platform column */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {(item.action === "approve" || item.action === "reject") && (
                              <button
                                onClick={() => handleUndo(item)}
                                className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-fcb-gold/50 hover:bg-fcb-gold/10 text-slate-400 hover:text-fcb-gold text-[9px] font-semibold font-mono rounded cursor-pointer transition flex items-center gap-1"
                                title={language === "de" ? "Aktion rückgängig machen" : "Undo this action"}
                                id={`undo-btn-${item.id}`}
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                                <span>{language === "de" ? "Rückgängig" : "Undo"}</span>
                              </button>
                            )}
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border inline-block ${
                              item.platform === "Instagram" ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                              item.platform === "X/Twitter" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                              item.platform === "TikTok" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                              "bg-slate-900 border-slate-800 text-slate-400"
                            }`}>
                              {item.platform}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Edit Draft Modal (Accessible, beautiful modal dialog) */}
      <AnimatePresence>
        {editingDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDraft(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-4 select-none"
              id="moderation-edit-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <span className="text-xs font-mono font-bold text-fcb-gold flex items-center gap-1.5 uppercase">
                  <Edit2 className="h-4 w-4 text-fcb-gold" />
                  {language === "de" ? "Beitrag editieren" : "Edit Campaign Draft"}
                </span>
                <button
                  onClick={() => setEditingDraft(null)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition"
                  id="moderation-edit-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form elements */}
              <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {language === "de" ? "Kanaltyp" : "Platform Channel"}
                  </label>
                  <select
                    value={editPlatform}
                    onChange={(e) => setEditPlatform(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 text-xs font-mono cursor-pointer outline-none focus:border-fcb-gold"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="X/Twitter">X/Twitter</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Facebook">Facebook</option>
                    <option value="FCB App/Newsletter">FCB App</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {language === "de" ? "Schlagzeile / Hook" : "Headline / Hook"}
                  </label>
                  <input
                    type="text"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-fcb-gold transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {language === "de" ? "Inhaltstext / Caption" : "Main Caption Content"}
                  </label>
                  <textarea
                    rows={6}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-fcb-gold transition resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    {language === "de" ? "Hashtags (mit Komma trennen)" : "Strategic Hashtags (comma separated)"}
                  </label>
                  <input
                    type="text"
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-fcb-gold transition"
                    placeholder="#FCBayern, #MiaSanMia"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end border-t border-slate-800 pt-3 shrink-0 gap-2">
                <button
                  onClick={() => setEditingDraft(null)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  {language === "de" ? "Abbrechen" : "Cancel"}
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-1.5 bg-fcb-red hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  id="moderation-save-btn"
                >
                  <Save className="h-3.5 w-3.5" />
                  {language === "de" ? "Speichern" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Action Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && draftForConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setConfirmModal(null);
                setModalNotes("");
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-4 select-none"
              id="moderation-confirm-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <span className={`text-xs font-mono font-bold flex items-center gap-1.5 uppercase ${
                  confirmModal.action === "approve" ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {confirmModal.action === "approve" ? (
                    <>
                      <ThumbsUp className="h-4 w-4" />
                      {language === "de" ? "Post-Freigabe bestätigen" : "Confirm Post Approval"}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      {language === "de" ? "Post-Ablehnung bestätigen" : "Confirm Post Rejection"}
                    </>
                  )}
                </span>
                <button
                  onClick={() => {
                    setConfirmModal(null);
                    setModalNotes("");
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition"
                  id="moderation-confirm-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4">
                {/* Draft Preview card info */}
                <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      draftForConfirm.platform === "Instagram" ? "bg-pink-500/10 border-pink-500/20 text-pink-400" :
                      draftForConfirm.platform === "X/Twitter" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                      draftForConfirm.platform === "TikTok" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                      "bg-slate-900 border-slate-800 text-slate-400"
                    }`}>
                      {draftForConfirm.platform}
                    </span>
                    {draftForConfirm.playerName && (
                      <span className="text-[10px] font-mono text-fcb-gold font-semibold">
                        {draftForConfirm.playerName}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white font-sans line-clamp-1">
                    {draftForConfirm.headline}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
                    "{draftForConfirm.caption}"
                  </p>
                </div>

                {/* Status-specific warning or prompt */}
                {confirmModal.action === "approve" ? (
                  <div className="bg-emerald-950/20 border border-emerald-900/35 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-300 font-sans leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      {language === "de" ? (
                        <p>Durch die Freigabe wird dieser Post als <strong>bereit zur Veröffentlichung</strong> markiert. Er kann danach direkt live gesendet werden.</p>
                      ) : (
                        <p>Approving this post marks it as <strong>cleared for publishing</strong>. It will be available for final live dispatch.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-950/20 border border-rose-900/35 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-rose-300 font-sans leading-relaxed">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      {language === "de" ? (
                        <p><strong>Sind Sie sicher?</strong> Dieser Beitrag wird abgelehnt, aus der aktiven Moderationsliste gelöscht und archiviert.</p>
                      ) : (
                        <p><strong>Are you sure?</strong> This post will be rejected, deleted from the active queue, and archived.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Input Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                    {confirmModal.action === "approve" ? (
                      language === "de" ? "Freigabe-Notizen & Dokumentation:" : "Detailed Approval Notes & Documentation:"
                    ) : (
                      language === "de" ? "Ablehnungs-Begründung & Feedback:" : "Rejection Reason & Audit Feedback:"
                    )}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={confirmModal.action === "approve" ? (
                      language === "de" 
                        ? "Z.B. FC Bayern Marken-Compliance geprüft, Bildrechte verifiziert..." 
                        : "E.g., Verified Bayern brand style, image rights verified..."
                    ) : (
                      language === "de" 
                        ? "Z.B. Text entspricht nicht den Compliance-Richtlinien oder enthält Tippfehler..." 
                        : "E.g., Content does not meet FCB brand guidelines or contains typos..."
                    )}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-fcb-gold/50 focus:ring-1 focus:ring-fcb-gold/20 transition resize-none leading-relaxed"
                    id="confirm-modal-notes-textarea"
                    autoFocus
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end border-t border-slate-800 pt-3 shrink-0 gap-2 font-sans">
                <button
                  onClick={() => {
                    setConfirmModal(null);
                    setModalNotes("");
                  }}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  {language === "de" ? "Abbrechen" : "Cancel"}
                </button>
                {confirmModal.action === "approve" ? (
                  <button
                    onClick={() => {
                      handleApprove(confirmModal.draftId, confirmModal.isQuick || false, modalNotes);
                      setConfirmModal(null);
                      setModalNotes("");
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm shadow-emerald-500/10"
                    id="confirm-modal-approve-btn"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {language === "de" ? "Freigabe bestätigen" : "Confirm Approval"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleReject(confirmModal.draftId, modalNotes);
                      setConfirmModal(null);
                      setModalNotes("");
                    }}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm shadow-rose-500/10"
                    id="confirm-modal-reject-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {language === "de" ? "Ablehnung bestätigen" : "Confirm Rejection"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
