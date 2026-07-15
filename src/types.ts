export interface SquadPlayer {
  name: string;
  number: number;
  position: string;
  nationality: string;
  personality: string;
  key_stats: string;
  imageUrl: string;
}

export interface SocialPost {
  headline: string;
  caption: string;
  hashtags: string[];
  visualSuggestion: string;
  engagementTriggers: string[];
}

export interface JourneyStage {
  id: string;
  name: string;
  description: string;
  color: string;
  triggers: { id: string; name: string; description: string }[];
  actions: { id: string; name: string; description: string }[];
}

export interface AutomatedStep {
  triggerDetected: string;
  automatedActionName: string;
  personalizedMessage: string;
  interactiveCTA: string;
  middlewarePayload: any;
}

export interface VideoScene {
  timestamp: string;
  visualPrompt: string;
  audioSoundtrack: string;
  voiceoverScript: string;
}

export interface VideoStoryboard {
  videoTitle: string;
  hookText: string;
  scenes: VideoScene[];
  aiToolchain: string;
}

export interface RagResult {
  retrievedDocs: { source: string; snippet: string }[];
  ragResponse: string;
  brandAlignmentRating: string;
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARNING" | "TRIGGER";
  source: string;
  message: string;
}

export interface DraftSocialPost {
  id: string;
  headline: string;
  caption: string;
  hashtags: string[];
  platform: string;
  playerName: string;
  status: "pending" | "approved" | "published";
  createdAt: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  triggerEvent: string;
  connector: "Zapier" | "n8n" | "Make.com" | "Internal";
  status: "active" | "inactive";
  executionsCount: number;
}
