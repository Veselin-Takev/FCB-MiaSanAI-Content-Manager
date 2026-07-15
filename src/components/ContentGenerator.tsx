import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Calendar, Share2, Copy, Check, Download, 
  Smartphone, Eye, Settings, Heart, MessageSquare, RefreshCw, Layers,
  CheckSquare, Trash2, Plus, ChevronUp, ChevronDown, Shield, ShieldCheck
} from "lucide-react";
import { SocialPost, SquadPlayer, DraftSocialPost } from "../types";
import { FCB_PLAYERS } from "../data/mockData";
import { TokenCostEstimator } from "./TokenCostEstimator";
import { PdfRagUploader } from "./PdfRagUploader";

interface ContentGeneratorProps {
  onAddLog: (log: any) => void;
  drafts: DraftSocialPost[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftSocialPost[]>>;
}

export const ContentGenerator: React.FC<ContentGeneratorProps> = ({ 
  onAddLog,
  drafts,
  setDrafts 
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer>(FCB_PLAYERS[0]);
  const [matchEvent, setMatchEvent] = useState<string>("Champions League Sieg gegen Real Madrid in der Allianz Arena");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("Instagram");
  const [selectedTone, setSelectedTone] = useState<string>("Mia San Mia / Emotional");
  const [customPrompt, setCustomPrompt] = useState<string>("Focus on the fans' incredible energy in the South Stand (Südkurve)");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [postResult, setPostResult] = useState<SocialPost | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // AI Prompt Chain (Prompt-Kette) state variables
  const [generationMode, setGenerationMode] = useState<"standard" | "chain">("standard");
  const [chainStep1Output, setChainStep1Output] = useState<string>("");
  const [chainStep2Output, setChainStep2Output] = useState<string>("");
  const [chainProgress, setChainProgress] = useState<number>(0);
  const [activeChainInspectorTab, setActiveChainInspectorTab] = useState<1 | 2 | 3>(1);
  const [feedTab, setFeedTab] = useState<"final" | "chain">("final");

  // Batch campaign drawer states
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(true);
  const [isPublishingBatch, setIsPublishingBatch] = useState<boolean>(false);

  // Graphic Canvas Builder parameters
  const [canvasLayout, setCanvasLayout] = useState<string>("crimson");
  const [canvasScoreText, setCanvasScoreText] = useState<string>("FCB 3 - 1 RMA");
  const [canvasMainText, setCanvasMainText] = useState<string>("MIA SAN HALBFINALE!");
  const [canvasBadgeGlow, setCanvasBadgeGlow] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Image studio state variables
  const [imagePrompt, setImagePrompt] = useState<string>("Cinematic photo of Thomas Müller celebrating a spectacular Champions League victory inside the glowing Allianz Arena, professional sports photography, dynamic lighting, 8k resolution, high contrast, red sports jersey");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const [imageProvider, setImageProvider] = useState<string>("");
  const [isSimulatedImage, setIsSimulatedImage] = useState<boolean>(false);
  const [isSimulatedText, setIsSimulatedText] = useState<boolean>(false);
  const [pdfContext, setPdfContext] = useState<string>("");
  const [openaiKeyConfigured, setOpenaiKeyConfigured] = useState<boolean>(false);
  const [leonardoKeyConfigured, setLeonardoKeyConfigured] = useState<boolean>(false);
  const [activeBackupModel, setActiveBackupModel] = useState<string>("none");

  // Read backup model from localStorage on mount and periodically (or whenever focused)
  useEffect(() => {
    const updateModel = () => {
      const saved = localStorage.getItem("miasanai_backup_model") || "none";
      setActiveBackupModel(saved);
    };
    updateModel();
    window.addEventListener("focus", updateModel);
    return () => window.removeEventListener("focus", updateModel);
  }, []);

  // Check secret key status on mount
  useEffect(() => {
    fetch("/api/secrets/status", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } })
      .then(res => { if (!res.ok && res.headers.get("content-type")?.indexOf("application/json") === -1) { throw new Error("Not JSON"); } return res.json(); })
      .then(data => {
        if (data && data.secrets) {
          if (data.secrets.OPENAI_API_KEY) {
            setOpenaiKeyConfigured(data.secrets.OPENAI_API_KEY.configured);
          }
          if (data.secrets.LEONARDO_API_KEY) {
            setLeonardoKeyConfigured(data.secrets.LEONARDO_API_KEY.configured);
          }
        }
      })
      .catch(err => {
        if (err.message !== "Not JSON") {
          console.error("Error reading key status:", err);
        }
      });
  }, []);

  // Auto-sync image prompt with active selections for maximum helper productivity
  useEffect(() => {
    setImagePrompt(`Cinematic photo of ${selectedPlayer.name} during "${matchEvent}", professional football photography, highly detailed, dramatic stadium lighting under the Allianz Arena dome, premium quality, red jersey`);
  }, [selectedPlayer, matchEvent]);

  // Handler to call real image generation backend
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    
    onAddLog({
      id: `img-gen-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "AI Image Studio",
      message: `Requesting real-time image generation via backend. Selected engine will analyze details...`
    });

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt + (pdfContext ? `\n\n--- STYLEGUIDE/RAG CONTEXT ---\n${pdfContext}` : ""),
          player: selectedPlayer.name,
          matchEvent: matchEvent
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate image via API");
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
      setImageProvider(data.provider);
      setIsSimulatedImage(!!data.isSimulated);

      onAddLog({
        id: `img-gen-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: data.isSimulated ? "INFO" : "SUCCESS",
        source: "AI Image Studio",
        message: `Image synthesized successfully via ${data.provider}! Dimension: 1024x1024.`
      });

    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `img-gen-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "AI Image Studio",
        message: `Image generation error: ${err.message}`
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Auto-generate a beautiful caption on first mount to look rich
  useEffect(() => {
    handleGenerate();
  }, []);

  // Listen to voice commands to trigger generation
  useEffect(() => {
    const handleVoiceGenerate = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail || {};
      
      if (detail.player) {
        const found = FCB_PLAYERS.find(p => p.name.toLowerCase().includes(detail.player.toLowerCase()));
        if (found) {
          setSelectedPlayer(found);
          onAddLog({
            id: `voice-p-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "INFO",
            source: "Voice Control",
            message: `Voice selected Player: ${found.name}`
          });
        }
      }
      if (detail.platform) {
        const platforms = ["Instagram", "X/Twitter", "TikTok", "Facebook", "FCB App/Newsletter"];
        const foundPlat = platforms.find(p => p.toLowerCase().includes(detail.platform.toLowerCase()));
        if (foundPlat) {
          setSelectedPlatform(foundPlat);
          onAddLog({
            id: `voice-plat-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "INFO",
            source: "Voice Control",
            message: `Voice selected Channel: ${foundPlat}`
          });
        }
      }
      if (detail.tone) {
        const tones = ["Mia San Mia / Emotional", "Witty / Playful", "Tactical / Analytical", "Hype / Energetic"];
        const foundTone = tones.find(t => t.toLowerCase().includes(detail.tone.toLowerCase()));
        if (foundTone) {
          setSelectedTone(foundTone);
          onAddLog({
            id: `voice-tone-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: "INFO",
            source: "Voice Control",
            message: `Voice selected Acoustic Tone: ${foundTone}`
          });
        }
      }
      if (detail.matchEvent) {
        setMatchEvent(detail.matchEvent);
      }
      if (detail.customPrompt) {
        setCustomPrompt(detail.customPrompt);
      }

      // Slightly delay execution to let state updates apply
      setTimeout(() => {
        handleGenerate();
      }, 150);
    };

    window.addEventListener("miasanai-voice-generate", handleVoiceGenerate);
    return () => {
      window.removeEventListener("miasanai-voice-generate", handleVoiceGenerate);
    };
  }, [selectedPlayer, matchEvent, selectedPlatform, selectedTone, customPrompt]);

  // Update canvas when state changes
  useEffect(() => {
    drawSocialGraphic();
  }, [selectedPlayer, canvasLayout, canvasScoreText, canvasMainText, canvasBadgeGlow]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setPostResult(null);
    setChainStep1Output("");
    setChainStep2Output("");
    setChainProgress(0);
    setFeedTab("final");

    // Add logging
    onAddLog({
      id: `gen-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "AI Content Studio",
      message: generationMode === "chain" 
        ? `Initiating sequential 3-stage Prompt Chain for ${selectedPlatform} centering ${selectedPlayer.name}...`
        : `Generating ${selectedPlatform} draft centering ${selectedPlayer.name} with event context: "${matchEvent}"`
    });

    try {
      if (generationMode === "chain") {
        // Step 1 progress
        setChainProgress(1);
        onAddLog({
          id: `chain-s1-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Prompt Chain",
          message: "Stage 1/3: Extracting high-impact factual narratives & tactical RAG insights..."
        });

        const response = await fetch("/api/generate/prompt-chain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player: selectedPlayer.name,
            matchEvent,
            platform: selectedPlatform,
            tone: selectedTone,
            customPrompt: customPrompt + (pdfContext ? `\n\n--- STYLEGUIDE/RAG CONTEXT ---\n${pdfContext}` : ""),
            backupModel: activeBackupModel
          })
        });

        if (!response.ok) {
          throw new Error("Failed to execute prompt chain");
        }

        const data = await response.json();
        
        // Wait a small delay to simulate step-by-step visual feedback in UI for high-end craft
        await new Promise(resolve => setTimeout(resolve, 1200));
        setChainStep1Output(data.step1);
        
        // Step 2 progress
        setChainProgress(2);
        onAddLog({
          id: `chain-s2-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Prompt Chain",
          message: "Stage 2/3: Harmonizing facts into core brand tone and Bavarian emotion..."
        });
        await new Promise(resolve => setTimeout(resolve, 1200));
        setChainStep2Output(data.step2);

        // Step 3 progress
        setChainProgress(3);
        onAddLog({
          id: `chain-s3-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "INFO",
          source: "Prompt Chain",
          message: "Stage 3/3: Synthesizing platform-specific CTAs, emojis, and hashtag taxonomy..."
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setChainProgress(4);

        setPostResult(data.step3);

        // Automatically sync canvas text to headline for smooth UX
        if (data.step3.headline) {
          setCanvasMainText(data.step3.headline.slice(0, 30).toUpperCase());
        }

        setFeedTab("chain"); // automatically shift to chain inspector view to show off the sequence!

        onAddLog({
          id: `gen-success-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Prompt Chain",
          message: `Sequential Prompt Chain completed! ${selectedPlatform} post synthesized successfully.`
        });

      } else {
        const response = await fetch("/api/generate/caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player: selectedPlayer.name,
            matchEvent,
            platform: selectedPlatform,
            tone: selectedTone,
            customPrompt: customPrompt + (pdfContext ? `\n\n--- STYLEGUIDE/RAG CONTEXT ---\n${pdfContext}` : ""),
            backupModel: activeBackupModel
          })
        });

        if (!response.ok) {
          throw new Error("Failed to generate captions");
        }

        const data: SocialPost = await response.json();
        setPostResult(data);

        // Automatically sync canvas text to headline for smooth UX
        if (data.headline) {
          setCanvasMainText(data.headline.slice(0, 30).toUpperCase());
        }

        onAddLog({
          id: `gen-success-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "SUCCESS",
          source: "Gemini 3.5 Flash",
          message: `Bespoke ${selectedPlatform} copy generated successfully. Length: ${data.caption.length} characters.`
        });
      }
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `gen-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "AI Content Studio",
        message: `Error executing generator: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Canvas Drawing Engine
  const drawSocialGraphic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 600;

    // 1. Draw Background Layout Gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 600);
    if (canvasLayout === "crimson") {
      grad.addColorStop(0, "#8c031c"); // deep wine red
      grad.addColorStop(0.5, "#dc052d"); // bright fcb red
      grad.addColorStop(1, "#050811"); // dark slate
    } else if (canvasLayout === "neon") {
      grad.addColorStop(0, "#1e1b4b"); // indigo
      grad.addColorStop(0.5, "#0d9488"); // teal neon
      grad.addColorStop(1, "#020617"); // dark
    } else {
      // bavarian gold theme
      grad.addColorStop(0, "#001f46"); // fcb dark blue
      grad.addColorStop(0.5, "#1e293b"); // slate
      grad.addColorStop(1, "#c3a164"); // gold
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);

    // 2. Draw Allianz Arena Light Overlay (Mock structure grid)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(600 - i, 600);
      ctx.stroke();
    }

    // 3. Draw Brand Border / Frame
    ctx.strokeStyle = canvasLayout === "gold" ? "#c3a164" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 588, 588);

    // 4. Draw Header: "MIA SAN MIA"
    ctx.fillStyle = canvasLayout === "gold" ? "#c3a164" : "#ffffff";
    ctx.font = "bold 16px 'Space Grotesk', sans-serif";
    ctx.fillText("MIA SAN MIA  |  FC BAYERN MÜNCHEN", 40, 50);

    // 5. Draw Decorative Glowing Badge Logo Box
    if (canvasBadgeGlow) {
      ctx.shadowColor = "#dc052d";
      ctx.shadowBlur = 15;
    }
    ctx.fillStyle = "#dc052d";
    ctx.fillRect(500, 30, 60, 60);
    ctx.shadowBlur = 0; // Reset shadow

    // White stripes inside badge
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(510, 40, 4, 40);
    ctx.fillRect(520, 40, 4, 40);
    ctx.fillRect(530, 40, 4, 40);
    ctx.fillRect(540, 40, 4, 40);

    // 6. Draw Player Vignette Background (Circular)
    ctx.save();
    ctx.beginPath();
    ctx.arc(300, 260, 110, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw placeholder player photo background
    const gradientCircle = ctx.createRadialGradient(300, 260, 30, 300, 260, 110);
    gradientCircle.addColorStop(0, "rgba(255,255,255,0.2)");
    gradientCircle.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = gradientCircle;
    ctx.fillRect(190, 150, 220, 220);

    // Draw Player's Name inside the vignette
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(selectedPlayer.name.toUpperCase(), 300, 265);
    
    ctx.restore();

    // 7. Render Custom Interactive Text
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    
    // Scoreboard Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 48px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(canvasScoreText, 300, 450);

    // Headline Text overlay
    ctx.fillStyle = canvasLayout === "gold" ? "#c3a164" : "#ffffff";
    ctx.font = "bold 28px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(canvasMainText, 300, 505);

    // Footer metadata
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "500 11px 'JetBrains Mono', sans-serif";
    ctx.fillText("GENERATED BY MIASANAI CONTENT AUTOMATION ENGINE", 300, 560);
  };

  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `fcb_miasanai_${selectedPlayer.name.toLowerCase().replace(/\s+/g, "_")}.png`;
    link.href = url;
    link.click();
    
    onAddLog({
      id: `download-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "SUCCESS",
      source: "Local Disk",
      message: `Exported high-fidelity on-brand social media asset for ${selectedPlayer.name}.`
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="generator-tab">
      
      {/* 1. Left Form Parameters (Span 4) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fcb-red" />
              <h3 className="font-bold text-white font-display">Generation parameters</h3>
            </div>
            {activeBackupModel === "nano_banana" ? (
              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                <span>🍌 Nano Banana v2</span>
              </span>
            ) : activeBackupModel === "bavarian_llama" ? (
              <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>🥨 Llama 3B Local</span>
              </span>
            ) : (
              <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                <span>Gemini 3.5</span>
              </span>
            )}
          </div>

          {/* Generation Mode Selector */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setGenerationMode("standard")}
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                generationMode === "standard"
                  ? "bg-fcb-red text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              Standard (Single-Shot)
            </button>
            <button
              onClick={() => setGenerationMode("chain")}
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                generationMode === "chain"
                  ? "bg-fcb-red text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
              }`}
              id="prompt-chain-mode-btn"
            >
              <Layers className="h-3.5 w-3.5 text-fcb-gold" /> Prompt Chain
            </button>
          </div>

          {generationMode === "chain" && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 space-y-2.5 font-mono text-[10px]">
              <span className="block text-[9px] text-fcb-gold uppercase tracking-wider font-bold">
                PROMPT CHAIN PIPELINE CONFIGURATION:
              </span>
              <div className="space-y-2 text-slate-400">
                <div className="flex items-start gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] border flex-shrink-0 ${
                    isLoading && chainProgress === 1 
                      ? "bg-amber-500/15 border-amber-500 text-amber-400 animate-pulse" 
                      : chainProgress > 1 
                        ? "bg-green-500/15 border-green-500 text-green-400" 
                        : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}>
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-300 block">1. Fact & Theme Extraction (RAG)</span>
                    <p className="text-[9px] text-slate-500 leading-normal">Extracts 3 major narrative and tactical pillars from match data.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] border flex-shrink-0 ${
                    isLoading && chainProgress === 2 
                      ? "bg-amber-500/15 border-amber-500 text-amber-400 animate-pulse" 
                      : chainProgress > 2 
                        ? "bg-green-500/15 border-green-500 text-green-400" 
                        : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}>
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-300 block">2. Bavarian Tone Adjustment</span>
                    <p className="text-[9px] text-slate-500 leading-normal">Fuses extracted themes into raw copywriting in the voice of "{selectedTone}".</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] border flex-shrink-0 ${
                    isLoading && chainProgress === 3 
                      ? "bg-amber-500/15 border-amber-500 text-amber-400 animate-pulse" 
                      : chainProgress === 4 
                        ? "bg-green-500/15 border-green-500 text-green-400" 
                        : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}>
                    3
                  </span>
                  <div>
                    <span className="font-bold text-slate-300 block">3. Platform Specific CTA & Hashtags</span>
                    <p className="text-[9px] text-slate-500 leading-normal">Enriches with channel cues for {selectedPlatform}, hashtags, and emojis.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Player */}
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
              Featured Player
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FCB_PLAYERS.map((p) => {
                const isSel = selectedPlayer.name === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPlayer(p)}
                    className={`p-1.5 rounded-lg border transition text-[10px] text-center font-medium ${
                      isSel 
                        ? "bg-fcb-red/20 border-fcb-red text-white" 
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                    title={p.name}
                    id={`player-select-${p.name.replace(/\s+/g, "-")}`}
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden mx-auto mb-1 border border-slate-800">
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="truncate block max-w-full">{p.name.split(" ")[1] || p.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
              Grounds tone of voice to {selectedPlayer.name}'s character.
            </p>
          </div>

          {/* Match Context / Event */}
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
              Matchday Event Context
            </label>
            <textarea
              rows={2}
              value={matchEvent}
              onChange={(e) => setMatchEvent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              placeholder="e.g., Champions League match completion, goal highlights, pre-match training..."
            />
          </div>

          {/* Platform & Tone Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Channel
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              >
                <option value="Instagram">Instagram</option>
                <option value="X/Twitter">X/Twitter</option>
                <option value="TikTok">TikTok</option>
                <option value="Facebook">Facebook</option>
                <option value="FCB App/Newsletter">FCB Newsletter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Acoustic Tone
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              >
                <option value="Mia San Mia / Emotional">Mia San Mia</option>
                <option value="Witty / Playful">Witty / Playful</option>
                <option value="Tactical / Analytical">Tactical</option>
                <option value="Hype / Energetic">Hype</option>
              </select>
            </div>
          </div>

          {/* Custom Prompt Instructions */}
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
              Custom Direction / Focus
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              placeholder="e.g. emphasize Harry Kane's team values..."
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-fcb-red hover:bg-fcb-red/95 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition shadow-md shadow-fcb-red/10 cursor-pointer disabled:opacity-55"
            id="generate-posts-btn"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {generationMode === "chain" ? "Executing Prompt Chain..." : "Interrogating MiaSanAI Gemini..."}
              </>
            ) : (
              <>
                {generationMode === "chain" ? (
                  <>
                    <Layers className="h-4 w-4 text-fcb-gold" /> Execute 3-Stage Prompt Chain
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Generate Platform Post
                  </>
                )}
              </>
            )}
          </button>
        </div>

        {/* Selected Player profile info box */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          <h4 className="font-bold text-white font-display uppercase tracking-wide text-[10px] text-fcb-gold flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> Cloned Voice Model Characteristics
          </h4>
          <p className="text-slate-300"><span className="text-slate-400 font-mono">Player:</span> {selectedPlayer.name} ({selectedPlayer.position})</p>
          <p className="text-slate-300"><span className="text-slate-400 font-mono">Bio-Tone:</span> {selectedPlayer.personality}</p>
          <p className="text-slate-400 italic font-mono text-[10.5px]">"{selectedPlayer.key_stats}"</p>
        </div>
      </div>

      {/* 2. Middle AI Text Generator Output (Span 4) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 h-full flex flex-col min-h-[480px]">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 uppercase font-semibold">
                <Smartphone className="h-4 w-4 text-cyan-400" /> Platform Feed Draft
              </span>
              <span className="bg-slate-950 border border-slate-800 text-[10px] px-2 py-0.5 rounded-md font-mono text-fcb-gold">
                {selectedPlatform}
              </span>
            </div>

            {generationMode === "chain" && (
              <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-900 mt-2">
                <button
                  onClick={() => setFeedTab("final")}
                  className={`flex-1 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer text-center ${
                    feedTab === "final"
                      ? "bg-slate-800 text-white border border-slate-700/50"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Final Output Post
                </button>
                <button
                  onClick={() => setFeedTab("chain")}
                  className={`flex-1 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                    feedTab === "chain"
                      ? "bg-fcb-red text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  id="inspect-prompt-chain-btn"
                >
                  <Layers className="h-3 w-3" /> Chain Inspector
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
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
                {/* Profile Header skeleton */}
                <div className="flex items-center gap-3">
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4, scale: 0.95 },
                      animate: { opacity: [0.4, 0.8, 0.4], scale: 1, transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
                    }}
                    className="h-10 w-10 rounded-full bg-slate-800/80 border border-slate-750 flex-shrink-0" 
                  />
                  <div className="space-y-2 flex-1">
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
                      }}
                      className="h-3.5 bg-slate-800/80 rounded-md w-1/3" 
                    />
                    <motion.div 
                      variants={{
                        initial: { opacity: 0.4 },
                        animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 } }
                      }}
                      className="h-2 bg-slate-800/40 rounded-md w-1/4" 
                    />
                  </div>
                </div>

                {/* Headline skeleton */}
                <div className="space-y-1">
                  <div className="h-2 bg-slate-800/40 rounded-md w-1/5 mb-2" />
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.1 } }
                    }}
                    className="h-10 bg-slate-800/60 rounded-lg border border-slate-800/30 w-full" 
                  />
                </div>

                {/* Content area skeleton */}
                <div className="space-y-2">
                  <div className="h-2 bg-slate-800/40 rounded-md w-1/4 mb-2" />
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 } }
                    }}
                    className="h-4 bg-slate-800/60 rounded-md w-11/12" 
                  />
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.3 } }
                    }}
                    className="h-4 bg-slate-800/60 rounded-md w-full" 
                  />
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.4 },
                      animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.4 } }
                    }}
                    className="h-4 bg-slate-800/60 rounded-md w-10/12" 
                  />
                </div>

                {/* Tags skeleton */}
                <div className="space-y-2">
                  <div className="h-2 bg-slate-800/40 rounded-md w-1/5 mb-2" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <motion.div 
                        key={i}
                        variants={{
                          initial: { opacity: 0.4 },
                          animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.1 * i } }
                        }}
                        className="h-6 bg-slate-800/50 rounded-md w-16" 
                      />
                    ))}
                  </div>
                </div>

                {/* Engagement panel skeleton */}
                <div className="space-y-2 pt-2 border-t border-slate-800/40">
                  <div className="h-2 bg-slate-800/40 rounded-md w-2/5 mb-3" />
                  <motion.div 
                    variants={{
                      initial: { opacity: 0.3 },
                      animate: { opacity: [0.3, 0.7, 0.3], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.5 } }
                    }}
                    className="h-16 bg-slate-800/30 rounded-xl border border-slate-850/40 w-full" 
                  />
                </div>
              </motion.div>
            )}

            {!isLoading && !postResult && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Sparkles className="h-10 w-10 text-slate-700 mb-2" />
                <p className="text-xs">Select your parameters and trigger generation.</p>
              </div>
            )}

            {postResult && generationMode === "chain" && feedTab === "chain" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-1 rounded-lg border border-slate-900">
                  <span className="text-[9px] font-mono font-bold text-fcb-gold px-2">CHAIN SEQUENCES:</span>
                  <div className="flex gap-1 pr-1 py-0.5">
                    {[1, 2, 3].map((stepNum) => (
                      <button
                        key={stepNum}
                        onClick={() => setActiveChainInspectorTab(stepNum as any)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                          activeChainInspectorTab === stepNum
                            ? "bg-fcb-red text-white font-bold shadow"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                        id={`inspect-step-${stepNum}-btn`}
                      >
                        Step {stepNum}
                      </button>
                    ))}
                  </div>
                </div>

                {activeChainInspectorTab === 1 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                        1. Themen-Extraktion (RAG Context)
                      </span>
                      <div className="bg-slate-950/60 border border-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-500 font-mono leading-relaxed">
                        Extracts 3 key narrative pillars, player stats, and tactical facts from the raw data.
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1 font-semibold">
                        Factual Themes Output
                      </span>
                      <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-text">
                        {chainStep1Output || "Extracting raw themes..."}
                      </div>
                    </div>
                  </div>
                )}

                {activeChainInspectorTab === 2 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                        2. Tonalitäts-Anpassung
                      </span>
                      <div className="bg-slate-950/60 border border-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-500 font-mono leading-relaxed">
                        Take raw themes and facts, and reshape them into cohesive copy using brand voice: "{selectedTone}".
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1 font-semibold">
                        Brand Voice Output
                      </span>
                      <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap select-text">
                        {chainStep2Output || "Adjusting tone and feeling..."}
                      </div>
                    </div>
                  </div>
                )}

                {activeChainInspectorTab === 3 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                        3. Call-to-Action-Generierung
                      </span>
                      <div className="bg-slate-950/60 border border-slate-900/60 p-2.5 rounded-lg text-[10px] text-slate-500 font-mono leading-relaxed">
                        Polish caption specifically for {selectedPlatform}, adding official emojis, hashtags, and Call-To-Actions.
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-xs text-slate-200 space-y-2.5 select-text">
                      {isSimulatedText && (
                        <div className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-2 mb-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                          SIMULATED FALLBACK
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Synthesized Hook:</span>
                        <p className="text-white font-bold text-xs font-display border border-slate-900 bg-slate-950/40 p-2 rounded-md mt-0.5">{postResult.headline}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Platform Caption:</span>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mt-0.5 bg-slate-950/20 border border-slate-900/40 p-2 rounded-md font-sans">{postResult.caption}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Hashtag Taxonomy:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {postResult.hashtags.map((tag, index) => (
                            <span key={`${tag}-${index}`} className="text-[10px] font-mono bg-fcb-red/5 text-fcb-red px-2 py-0.5 rounded border border-fcb-red/15 font-semibold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add to campaign queue */}
                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const newDraft: DraftSocialPost = {
                        id: `draft-${Date.now()}`,
                        headline: postResult.headline,
                        caption: postResult.caption,
                        hashtags: postResult.hashtags,
                        platform: selectedPlatform,
                        playerName: selectedPlayer.name,
                        status: "pending",
                        createdAt: "Just now"
                      };
                      setDrafts(prev => [newDraft, ...prev]);
                      onAddLog({
                        id: `draft-add-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "SUCCESS",
                        source: "Draft Manager",
                        message: `Added new ${selectedPlatform} draft for ${selectedPlayer.name} to the campaign queue.`
                      });
                    }}
                    className="w-full bg-[#16171b] hover:bg-[#1a1b1e] text-fcb-gold border border-white/5 hover:border-white/10 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-fcb-gold" /> Add Draft to Campaign Queue
                  </button>
                </div>
              </div>
            ) : postResult && (
              <div className="space-y-4">
                {isSimulatedText && (
                  <div className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
                    TEXT SIMULATED FALLBACK ACTIVE
                  </div>
                )}
                {/* Headline Hook */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Generated Hook</span>
                  <h4 className="text-sm font-bold text-white font-display border border-slate-800 bg-slate-950/40 p-2.5 rounded-lg">
                    {postResult.headline}
                  </h4>
                </div>

                {/* Main Body */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Caption Content</span>
                  <div className="relative border border-slate-800 bg-slate-950 p-4 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {postResult.caption}
                    
                    <button
                      onClick={() => handleCopyText(postResult.caption)}
                      className="absolute right-2 top-2 bg-slate-900 hover:bg-slate-800 p-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Copy Caption"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Strategic Hashtags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {postResult.hashtags.map((tag, index) => (
                      <span key={`${tag}-${index}`} className="text-[10.5px] font-mono bg-fcb-red/5 text-fcb-red px-2 py-0.5 rounded border border-fcb-red/15 font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Engagement Prompts */}
                <div>
                  <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-1">Fan Engagement Triggers (RAG Optimizations)</span>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                    {postResult.engagementTriggers.map((trig, idx) => (
                      <li key={idx} className="leading-relaxed">{trig}</li>
                    ))}
                  </ul>
                </div>

                {/* Add to campaign queue */}
                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const newDraft: DraftSocialPost = {
                        id: `draft-${Date.now()}`,
                        headline: postResult.headline,
                        caption: postResult.caption,
                        hashtags: postResult.hashtags,
                        platform: selectedPlatform,
                        playerName: selectedPlayer.name,
                        status: "pending",
                        createdAt: "Just now"
                      };
                      setDrafts(prev => [newDraft, ...prev]);
                      onAddLog({
                        id: `draft-add-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "SUCCESS",
                        source: "Draft Manager",
                        message: `Added new ${selectedPlatform} draft for ${selectedPlayer.name} to the campaign queue.`
                      });
                    }}
                    className="w-full bg-[#16171b] hover:bg-[#1a1b1e] text-fcb-gold border border-white/5 hover:border-white/10 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-fcb-gold" /> Add Draft to Campaign Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Right Interactive Canvas Designer (Span 4) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 uppercase font-semibold">
              <Layers className="h-4 w-4 text-fcb-gold" /> Template Designer
            </span>
            <button
              onClick={handleDownloadCanvas}
              className="text-xs bg-slate-950 hover:bg-slate-900 text-fcb-gold border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export Post
            </button>
          </div>

          {/* Canvas Render box */}
          <div className="flex justify-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-900 shadow-inner">
            <canvas 
              ref={canvasRef} 
              className="w-full max-w-[320px] aspect-square rounded-lg shadow-xl border border-slate-800" 
            />
          </div>

          {/* Canvas Interactive Controllers */}
          <div className="space-y-3.5 pt-2 border-t border-slate-800/80 text-xs">
            {/* Background design selector */}
            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Layout Theme</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCanvasLayout("crimson")}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition cursor-pointer ${
                    canvasLayout === "crimson" ? "bg-fcb-red text-white border-fcb-red" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  FCB Crimson
                </button>
                <button
                  onClick={() => setCanvasLayout("neon")}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition cursor-pointer ${
                    canvasLayout === "neon" ? "bg-teal-500/20 text-teal-400 border-teal-500" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Neon UCL
                </button>
                <button
                  onClick={() => setCanvasLayout("gold")}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition cursor-pointer ${
                    canvasLayout === "gold" ? "bg-amber-500/20 text-fcb-gold border-fcb-gold" : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  Bavarian Gold
                </button>
              </div>
            </div>

            {/* Custom scores and text */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">Scoreboard Overlay</label>
                <input
                  type="text"
                  value={canvasScoreText}
                  onChange={(e) => setCanvasScoreText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-fcb-red font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">Heading Overlay</label>
                <input
                  type="text"
                  value={canvasMainText}
                  onChange={(e) => setCanvasMainText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-fcb-red"
                />
              </div>
            </div>

            {/* Glowing badge toggle */}
            <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded border border-slate-800">
              <span className="text-[11px] text-slate-300">Glow FCB Emblem</span>
              <button
                onClick={() => setCanvasBadgeGlow(!canvasBadgeGlow)}
                className={`w-10 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  canvasBadgeGlow ? "bg-fcb-red flex justify-end" : "bg-slate-800 flex justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
              </button>
            </div>
          </div>
        </div>

        {/* Generative AI Image Studio */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white font-display">Generative AI Image Studio</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Create high-fidelity graphic assets directly via <span className="text-white font-medium">OpenAI DALL-E 3</span>, <span className="text-white font-medium">Leonardo AI</span>, or <span className="text-white font-medium">Imagen 3</span>.
          </p>

          <div className="space-y-3 text-xs">
            {/* Prompt Textarea */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide mb-1">
                Visual Art Prompt
              </label>
              <textarea
                rows={3}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
                placeholder="Describe the cinematic visual scene you want to generate..."
              />
            </div>

            <PdfRagUploader onTextExtracted={setPdfContext} />
            <TokenCostEstimator promptText={imagePrompt} type="image" pdfContextLength={pdfContext.length} />

            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 rounded flex items-center justify-center gap-1.5 transition disabled:opacity-55 cursor-pointer shadow-md shadow-cyan-500/10"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Asset...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Real AI Image
                </>
              )}
            </button>

            {/* Generated Image Preview Area */}
            {generatedImage && (
              <div className="space-y-3 pt-2">
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group">
                  <img
                    src={generatedImage}
                    alt="AI Generated"
                    className="w-full h-auto aspect-square object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Provider tag overlay */}
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider backdrop-blur-sm">
                    {imageProvider}
                  </div>

                  {isSimulatedImage && (
                    <div className="absolute top-2 right-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">
                      Simulation Mode
                    </div>
                  )}
                </div>

                {isSimulatedImage && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 text-left ${
                    (openaiKeyConfigured || leonardoKeyConfigured) 
                      ? "bg-green-500/10 border-green-500/30 text-green-400" 
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                  }`}>
                    {(openaiKeyConfigured || leonardoKeyConfigured) ? (
                      <ShieldCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Shield className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    )}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">
                        {(openaiKeyConfigured || leonardoKeyConfigured) ? "GCP SECRET MANAGER CONNECTED" : "GCP SECRET MANAGER LINK REQUIRED"}
                      </span>
                      <p className="text-[11.5px] leading-relaxed text-slate-300">
                        {(openaiKeyConfigured || leonardoKeyConfigured) 
                          ? "API credentials successfully validated via Google Cloud Secret Manager. High-speed generation active."
                          : "Configure OPENAI_API_KEY or LEONARDO_API_KEY in Settings to execute live API production calls."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Integration triggers */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      // Apply generated image as heading or log
                      setCanvasMainText(selectedPlayer.name.toUpperCase());
                      onAddLog({
                        id: `canvas-sync-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString(),
                        level: "SUCCESS",
                        source: "Canvas Sync",
                        message: `Successfully synchronized generative asset with template designer layer.`
                      });
                    }}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] py-1.5 rounded transition cursor-pointer font-medium text-center"
                  >
                    Sync to Canvas
                  </button>
                  <button
                    onClick={() => {
                      if (postResult) {
                        setPostResult({
                          ...postResult,
                          imageUrl: generatedImage
                        });
                        onAddLog({
                          id: `post-sync-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "SUCCESS",
                          source: "Post Editor",
                          message: `Injected generated image into the active ${selectedPlatform} post preview.`
                        });
                      } else {
                        onAddLog({
                          id: `post-sync-fail-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "WARNING",
                          source: "Post Editor",
                          message: `Generate a social post first to inject the visual asset.`
                        });
                      }
                    }}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] py-1.5 rounded transition cursor-pointer font-medium text-center"
                  >
                    Inject into Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Campaign Queue Section (Takes full width 12 spans) */}
      <div className="lg:col-span-12 mt-6">
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-fcb-red" />
              <div>
                <h3 className="font-bold text-white font-display text-sm uppercase tracking-wider">Live Campaign Drafts Queue</h3>
                <p className="text-xs text-slate-400">Manage and queue multiple AI-generated social platform posts for official approval and dispatch.</p>
              </div>
            </div>
            
            {/* Quick stats & select actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedDraftIds.length === drafts.length) {
                    setSelectedDraftIds([]);
                  } else {
                    setSelectedDraftIds(drafts.map(d => d.id));
                  }
                }}
                className="text-[11px] font-mono bg-slate-950 hover:bg-[#1a1b1e] border border-slate-800 px-2.5 py-1.5 rounded text-slate-300 transition cursor-pointer"
              >
                {selectedDraftIds.length === drafts.length ? "Deselect All" : "Select All"}
              </button>
              
              <span className="bg-fcb-red/10 border border-fcb-red/25 text-fcb-red text-[11px] font-mono px-2.5 py-1.5 rounded font-bold">
                {drafts.length} DRAFTS QUEUED
              </span>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-xs">The drafts queue is currently empty. Generate a draft above and click "Add Draft to Campaign Queue" to start scheduling.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse select-text">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12">Select</th>
                    <th className="py-3 px-4 w-32">Channel</th>
                    <th className="py-3 px-4 w-44">Featured Player</th>
                    <th className="py-3 px-4">Caption Headline & Snippet</th>
                    <th className="py-3 px-4 w-32">Added</th>
                    <th className="py-3 px-4 w-32 text-center">Status</th>
                    <th className="py-3 px-4 w-20 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {drafts.map((draft) => {
                    const isSelected = selectedDraftIds.includes(draft.id);
                    
                    let statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    if (draft.status === "approved") {
                      statusColor = "bg-blue-500/10 text-cyan-400 border-blue-500/20";
                    } else if (draft.status === "published") {
                      statusColor = "bg-green-500/10 text-green-400 border-green-500/20";
                    }

                    return (
                      <tr 
                        key={draft.id} 
                        className={`hover:bg-slate-950/40 transition-colors ${isSelected ? "bg-fcb-red/5" : ""}`}
                      >
                        {/* Checkbox select */}
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedDraftIds(prev => 
                                prev.includes(draft.id)
                                  ? prev.filter(id => id !== draft.id)
                                  : [...prev, draft.id]
                              );
                            }}
                            className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-fcb-red focus:ring-0 focus:ring-offset-0 accent-fcb-red cursor-pointer"
                          />
                        </td>

                        {/* Channel / Platform */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold bg-slate-950 text-fcb-gold border border-white/5 px-2 py-0.5 rounded text-[10.5px]">
                            {draft.platform}
                          </span>
                        </td>

                        {/* Player */}
                        <td className="py-3 px-4 font-semibold text-white">
                          {draft.playerName}
                        </td>

                        {/* Snippet */}
                        <td className="py-3 px-4 pr-6">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-100 block truncate max-w-md">{draft.headline}</span>
                            <span className="text-slate-400 text-[11px] block truncate max-w-lg">{draft.caption}</span>
                          </div>
                        </td>

                        {/* Added time */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {draft.createdAt}
                        </td>

                        {/* Status badge */}
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-mono uppercase font-bold border px-2 py-0.5 rounded ${statusColor}`}>
                            {draft.status}
                          </span>
                        </td>

                        {/* Delete single draft */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setDrafts(prev => prev.filter(d => d.id !== draft.id));
                              setSelectedDraftIds(prev => prev.filter(id => id !== draft.id));
                              onAddLog({
                                id: `draft-del-${Date.now()}`,
                                timestamp: new Date().toLocaleTimeString(),
                                level: "INFO",
                                source: "Draft Manager",
                                message: `Removed draft from queue: "${draft.headline}"`
                              });
                            }}
                            className="text-slate-500 hover:text-fcb-red transition cursor-pointer p-1 rounded hover:bg-slate-950"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. Collapsible Floating Batch Action Drawer */}
      <AnimatePresence>
        {selectedDraftIds.length > 0 && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[480px] z-50 bg-[#111114] border border-fcb-red/50 shadow-[0_10px_50px_rgba(220,5,45,0.15)] rounded-2xl overflow-hidden"
          >
            {/* Header / Title bar with expand button */}
            <div className="bg-gradient-to-r from-fcb-red to-rose-700 px-4 py-3.5 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4.5 w-4.5" />
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider block font-bold">Batch Campaign Manager</span>
                  <span className="text-[10px] text-white/80 block">{selectedDraftIds.length} drafts selected</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                  className="p-1 hover:bg-white/10 rounded transition cursor-pointer"
                  title={isDrawerExpanded ? "Collapse Details" : "Expand Details"}
                >
                  {isDrawerExpanded ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronUp className="h-4.5 w-4.5" />}
                </button>
                <button
                  onClick={() => setSelectedDraftIds([])}
                  className="p-1 hover:bg-white/10 rounded transition text-white/80 hover:text-white font-mono text-xs cursor-pointer"
                >
                  [x]
                </button>
              </div>
            </div>

            {/* Collapsible Content Area */}
            {isDrawerExpanded && (
              <div className="p-4 bg-[#111114] border-t border-white/5 space-y-4">
                {/* Selected items list */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Selected Drafts</span>
                  {drafts.filter(d => selectedDraftIds.includes(d.id)).map(draft => (
                    <div key={draft.id} className="bg-slate-950 p-2 rounded-lg border border-white/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[9px] font-bold bg-fcb-red/10 text-fcb-red px-1.5 py-0.5 rounded border border-fcb-red/10">{draft.platform}</span>
                        <span className="text-xs text-slate-300 font-medium truncate">{draft.headline || draft.playerName}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">{draft.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>

                {/* Batch Actions Group */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Execute Batch Commands</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Approve Selected */}
                    <button
                      onClick={() => {
                        setDrafts(prev => prev.map(d => selectedDraftIds.includes(d.id) ? { ...d, status: "approved" } : d));
                        onAddLog({
                          id: `batch-app-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "SUCCESS",
                          source: "Batch Approval Engine",
                          message: `Bulk approved ${selectedDraftIds.length} social campaigns. Brand compliance verified.`
                        });
                        setSelectedDraftIds([]);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="h-4 w-4" /> Batch Approve
                    </button>

                    {/* Publish Selected */}
                    <button
                      onClick={async () => {
                        setIsPublishingBatch(true);
                        onAddLog({
                          id: `batch-pub-start-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "TRIGGER",
                          source: "Batch Publish Router",
                          message: `Initiating concurrent social dispatch APIs for ${selectedDraftIds.length} campaigns...`
                        });

                        setTimeout(() => {
                          setDrafts(prev => prev.map(d => selectedDraftIds.includes(d.id) ? { ...d, status: "published" } : d));
                          onAddLog({
                            id: `batch-pub-success-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString(),
                            level: "SUCCESS",
                            source: "Enterprise Publisher",
                            message: `Successfully published ${selectedDraftIds.length} campaigns. Live feed updated.`
                          });
                          setIsPublishingBatch(false);
                          setSelectedDraftIds([]);
                        }, 1500);
                      }}
                      disabled={isPublishingBatch}
                      className="bg-fcb-red hover:bg-fcb-red/90 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isPublishingBatch ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Batch Publish Live
                        </>
                      )}
                    </button>
                  </div>

                  {/* Secondary operations: Schedule, Archive, Download */}
                  <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                    {/* Schedule */}
                    <button
                      onClick={() => {
                        onAddLog({
                          id: `batch-sched-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "INFO",
                          source: "Campaign Scheduler",
                          message: `Scheduled ${selectedDraftIds.length} campaigns for next matchday kick-off slot.`
                        });
                        setSelectedDraftIds([]);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Calendar className="h-3 w-3 text-amber-500" /> Schedule
                    </button>

                    {/* Export */}
                    <button
                      onClick={() => {
                        const selectedItems = drafts.filter(d => selectedDraftIds.includes(d.id));
                        const blob = new Blob([JSON.stringify(selectedItems, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `fcb_campaign_batch_${Date.now()}.json`;
                        a.click();
                        
                        onAddLog({
                          id: `batch-exp-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "SUCCESS",
                          source: "JSON Export",
                          message: `Exported ${selectedDraftIds.length} campaign drafts configuration file.`
                        });
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="h-3 w-3 text-cyan-400" /> Export
                    </button>

                    {/* Delete Selected */}
                    <button
                      onClick={() => {
                        const count = selectedDraftIds.length;
                        setDrafts(prev => prev.filter(d => !selectedDraftIds.includes(d.id)));
                        setSelectedDraftIds([]);
                        onAddLog({
                          id: `batch-del-${Date.now()}`,
                          timestamp: new Date().toLocaleTimeString(),
                          level: "INFO",
                          source: "Batch Approval Engine",
                          message: `Archived/Deleted ${count} campaigns from the active queue.`
                        });
                      }}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-fcb-red py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Archive
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
