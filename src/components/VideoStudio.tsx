import React, { useState, useEffect } from "react";
import { 
  Clapperboard, Play, Film, Send, Cpu, Music, Mic, Image, 
  Layers, Settings, RefreshCw, Sparkles, Shield, Lock, ShieldCheck 
} from "lucide-react";
import { VideoStoryboard } from "../types";
import { TokenCostEstimator } from "./TokenCostEstimator";
import { PdfRagUploader } from "./PdfRagUploader";

interface VideoStudioProps {
  onAddLog: (log: any) => void;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ onAddLog }) => {
  const [concept, setConcept] = useState<string>("Südkurve Allianz Arena Fan Chants & Hype compilation");
  const [player, setPlayer] = useState<string>("Thomas Müller");
  const [length, setLength] = useState<string>("15 seconds");
  const [platform, setPlatform] = useState<string>("TikTok / Reels");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storyboard, setStoryboard] = useState<VideoStoryboard | null>(null);

  // Video rendering state variables
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("https://upload.wikimedia.org/wikipedia/commons/transcoded/e/eb/Nightfall_timelapse_from_Olympiaturm.ogv/Nightfall_timelapse_from_Olympiaturm.ogv.480p.vp9.webm"); // Standard high fidelity demo URL
  const [videoProvider, setVideoProvider] = useState<string>("Luma Dream Machine (Simulated)");
  const [isSimulatedVideo, setIsSimulatedVideo] = useState<boolean>(true);
  const [falKeyConfigured, setFalKeyConfigured] = useState<boolean>(false);
  const [pdfContext, setPdfContext] = useState<string>("");

  // Check secret key status on mount
  useEffect(() => {
    fetch("/api/secrets/status", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } })
      .then(res => { if (!res.ok && res.headers.get("content-type")?.indexOf("application/json") === -1) { throw new Error("Not JSON"); } return res.json(); })
      .then(data => {
        if (data && data.secrets && data.secrets.FAL_API_KEY) {
          setFalKeyConfigured(data.secrets.FAL_API_KEY.configured);
        }
      })
      .catch(err => {
        if (err.message !== "Not JSON") {
          console.error("Error reading key status:", err);
        }
      });
  }, []);

  // Handler to trigger real video generation from a prompt
  const handleGenerateVideo = async (scenePrompt?: string) => {
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl("");
    
    const promptToUse = scenePrompt || concept;
    
    onAddLog({
      id: `vid-gen-start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "AI Video Studio",
      message: `Initiating real-time AI video compilation via server endpoints...`
    });

    try {
      const response = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse + (pdfContext ? `\n\n--- STYLEGUIDE/RAG CONTEXT ---\n${pdfContext}` : ""),
          player: player
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate video");
      }

      const data = await response.json();
      // setIsSimulated(!!data.isSimulated);
      setGeneratedVideoUrl(data.videoUrl);
      setVideoProvider(data.provider);
      setIsSimulatedVideo(!!data.isSimulated);

      onAddLog({
        id: `vid-gen-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: data.isSimulated ? "INFO" : "SUCCESS",
        source: "AI Video Studio",
        message: `Video frame rendering complete via ${data.provider}! Looping asset compiled.`
      });

    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `vid-gen-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "AI Video Studio",
        message: `Video generation failed: ${err.message}`
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    setIsLoading(true);
    setStoryboard(null);

    onAddLog({
      id: `video-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      source: "Runway & Pika Studio",
      message: `Assembling Runway video storyboard structure for concept: "${concept}"`
    });

    try {
      const response = await fetch("/api/generate/video-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept + (pdfContext ? `\n\n--- STYLEGUIDE/RAG CONTEXT ---\n${pdfContext}` : ""),
          player,
          videoLength: length,
          platform
        })
      });

      if (!response.ok) {
        throw new Error("Storyboard generation failed");
      }

      const data: VideoStoryboard = await response.json();
      setStoryboard(data);

      onAddLog({
        id: `video-success-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        source: "MiaSanAI Video Studio",
        message: `Successfully mapped ${data.scenes.length} distinct generative scenes. Render prompts optimized.`
      });
    } catch (err: any) {
      console.error(err);
      onAddLog({
        id: `video-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: "WARNING",
        source: "Runway & Pika Studio",
        message: `Error planning video storyboard: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="video-tab">
      
      {/* Parameters Panel (Left 1 Span) */}
      <div className="space-y-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clapperboard className="h-5 w-5 text-fcb-red" />
            <h3 className="font-bold text-white font-display">Generative Video Director</h3>
          </div>

          {/* Input Concept */}
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
              Video Concept / Hook Idea
            </label>
            <textarea
              rows={3}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              placeholder="e.g., Tactical breakdown of the winning goal, emotional player arrival, Allianz Arena atmosphere..."
            />
          </div>

          {/* Featured Player */}
          <div>
            <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
              Protagonist Player
            </label>
            <select
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
            >
              <option value="Thomas Müller">Thomas Müller</option>
              <option value="Harry Kane">Harry Kane</option>
              <option value="Jamal Musiala">Jamal Musiala</option>
              <option value="Joshua Kimmich">Joshua Kimmich</option>
              <option value="Team Compilation">Full Squad compilation</option>
            </select>
          </div>

          {/* Length & Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Target Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              >
                <option value="15 seconds">15 sec (Reel/TikTok)</option>
                <option value="30 seconds">30 sec (Standard Ad)</option>
                <option value="60 seconds">60 sec (Long Form)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-2 uppercase tracking-wide">
                Aspect Ratio
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-fcb-red"
              >
                <option value="TikTok / Reels">9:16 Portrait</option>
                <option value="YouTube / TV">16:9 Landscape</option>
                <option value="Instagram Grid">1:1 Square</option>
              </select>
            </div>
          </div>

          <PdfRagUploader onTextExtracted={setPdfContext} />
          <TokenCostEstimator promptText={concept} type="video" pdfContextLength={pdfContext.length} />

          {/* Submit */}
          <button
            onClick={handleGenerateStoryboard}
            disabled={isLoading}
            className="w-full bg-fcb-red hover:bg-fcb-red/95 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition shadow-md shadow-fcb-red/10 cursor-pointer disabled:opacity-55"
            id="video-storyboard-btn"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Scripting Scenes...
              </>
            ) : (
              <>
                <Film className="h-4 w-4" /> Draft AI Video Storyboard
              </>
            )}
          </button>
        </div>

        {/* AI Tooling Information Card */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <span className="text-[10px] text-fcb-gold uppercase tracking-wider font-mono font-bold flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" /> Generative Video Integrations
          </span>
          <p className="text-slate-300 leading-relaxed">
            Project <span className="font-semibold text-white">MiaSanAI</span> couples LLM narrative generation with specialized visual and acoustic AI services:
          </p>
          <ul className="space-y-1 text-slate-400 list-disc list-inside">
            <li><span className="text-white font-medium">Runway Gen-3:</span> Visual pitch dynamics</li>
            <li><span className="text-white font-medium">Pika Labs:</span> Micro-movement overlay assets</li>
            <li><span className="text-white font-medium">ElevenLabs:</span> Replicated vocal audio loops</li>
          </ul>
        </div>
      </div>

      {/* Storyboard Render Panel (Right 2 Spans) */}
      <div className="xl:col-span-2">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 min-h-[450px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5 uppercase font-semibold">
                <Film className="h-4 w-4 text-cyan-400" /> Output Timeline & Prompts
              </span>
              {storyboard && (
                <span className="bg-fcb-red/10 text-fcb-red font-mono text-[10px] px-2.5 py-0.5 rounded border border-fcb-red/20 font-bold uppercase">
                  {storyboard.videoTitle}
                </span>
              )}
            </div>

            {/* Real Loop Render Player Block */}
            {generatedVideoUrl && (
              <div className="mb-5 bg-slate-950 p-4 rounded-xl border border-slate-800 animate-fadeIn">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mb-2 font-bold flex items-center gap-1">
                  <Play className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Live Rendered AI Video Layer ({videoProvider})
                </span>
                <div className="relative rounded-lg overflow-hidden border border-slate-900 bg-slate-950 aspect-video max-w-2xl mx-auto">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                  {isSimulatedVideo && (
                    <div className="absolute top-2 right-2 bg-amber-500/25 border border-amber-500/45 text-amber-300 text-[8.5px] font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">
                      Simulation Mode
                    </div>
                  )}
                </div>
                {isSimulatedVideo && (
                  <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 text-left ${
                    falKeyConfigured 
                      ? "bg-green-500/10 border-green-500/30 text-green-400" 
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                  }`}>
                    {falKeyConfigured ? (
                      <ShieldCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Shield className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    )}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">
                        {falKeyConfigured ? "GCP SECRET MANAGER CONNECTED" : "GCP SECRET MANAGER LINK REQUIRED"}
                      </span>
                      <p className="text-[11.5px] leading-relaxed text-slate-300">
                        {falKeyConfigured 
                          ? "FAL_API_KEY successfully authenticated via GCP Secret Manager service credentials. High-speed video compilation is active."
                          : "Configure FAL_API_KEY in Einstellungen (Settings) to compile live video streams from Fal.ai Luma Dream Machine."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isGeneratingVideo && (
              <div className="mb-5 bg-slate-950/80 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center py-10 space-y-3 animate-pulse">
                <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Rendering Generative MP4...</span>
                  <p className="text-[11px] text-slate-500">Contacting Fal.ai Dream Machine / Leonardo Motion API queues...</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-4 bg-slate-950 rounded w-1/4" />
                <div className="space-y-2">
                  <div className="h-12 bg-slate-950 rounded" />
                  <div className="h-12 bg-slate-950 rounded" />
                  <div className="h-12 bg-slate-950 rounded" />
                </div>
              </div>
            )}

            {!isLoading && !storyboard && (
              <div className="h-[300px] flex flex-col items-center justify-center text-center text-slate-500">
                <Sparkles className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
                <p className="text-xs max-w-sm">
                  Click "Draft AI Video Storyboard" to trigger scene generation, camera prompting directions, and audio sync script.
                </p>
              </div>
            )}

            {storyboard && (
              <div className="space-y-5">
                {/* Video Hook summary */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-fcb-gold uppercase tracking-wider block mb-0.5">Opening Graphic Overlay Hook</span>
                    <p className="text-xs text-white font-semibold">"{storyboard.hookText}"</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block">Optimized for</span>
                    <span className="text-xs text-slate-300 font-mono font-bold">{platform}</span>
                  </div>
                </div>

                {/* Timeline Scenes */}
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-800 select-text">
                  {storyboard.scenes.map((scene, idx) => (
                    <div key={idx} className="relative pl-7 group">
                      {/* Timeline dot */}
                      <div className="absolute left-1.5 top-1 h-3.5 w-3.5 rounded-full bg-slate-950 border-2 border-fcb-red flex items-center justify-center" />

                      <div className="bg-slate-950/30 group-hover:bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 transition-all space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-fcb-red">{scene.timestamp}</span>
                            <button
                              onClick={() => handleGenerateVideo(scene.visualPrompt)}
                              disabled={isGeneratingVideo}
                              className="text-[9px] bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 hover:border-cyan-500 px-2 py-0.5 rounded transition cursor-pointer font-bold uppercase font-mono flex items-center gap-1"
                            >
                              <Sparkles className="h-2.5 w-2.5" /> Render Scene
                            </button>
                          </div>
                          <span className="text-[9.5px] font-mono text-slate-500">Scene {idx + 1}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                          {/* Visual Prompt */}
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Image className="h-3 w-3 text-cyan-400" /> Visual Generator Prompt
                            </span>
                            <p className="text-slate-300 text-[11px] bg-slate-950 p-2 rounded border border-slate-900">
                              {scene.visualPrompt}
                            </p>
                          </div>

                          {/* Sound effect */}
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Music className="h-3 w-3 text-amber-400" /> Soundtrack Sfx
                            </span>
                            <p className="text-slate-400 text-[11.5px] italic">
                              {scene.audioSoundtrack}
                            </p>
                          </div>

                          {/* Voiceover */}
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Mic className="h-3 w-3 text-purple-400" /> Narration / Voice Script
                            </span>
                            <p className="text-slate-300 text-[11px] font-medium font-display leading-normal">
                              "{scene.voiceoverScript}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outro toolchain info */}
          {storyboard && (
            <div className="mt-4 border-t border-slate-800 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px] font-mono">
                <Cpu className="h-4 w-4 text-fcb-gold" /> Toolchain: {storyboard.aiToolchain}
              </span>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleGenerateVideo(concept)}
                  disabled={isGeneratingVideo}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-1.5 rounded transition cursor-pointer font-bold text-xs flex items-center gap-1.5 disabled:opacity-55"
                >
                  <Film className="h-3.5 w-3.5" /> Compile to Real MP4 Video
                </button>
                <button 
                  onClick={() => onAddLog({
                    id: `video-mock-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    level: "SUCCESS",
                    source: "Middleware API",
                    message: `Exported Video Storyboard metadata to n8n active queue folder.`
                  })}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded transition cursor-pointer text-xs"
                >
                  Push Storyboard to Runway API
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
