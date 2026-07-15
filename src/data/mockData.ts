import { SquadPlayer, JourneyStage, AutomationWorkflow, PipelineLog } from "../types";

export const FCB_PLAYERS: SquadPlayer[] = [
  {
    name: "Thomas Müller",
    number: 25,
    position: "Forward / Midfielder",
    nationality: "German",
    personality: "Charismatic, witty, local icon, ultimate communicator, passionate organizer",
    key_stats: "Over 700 Club Matches, 12x Bundesliga Champion, 2x Champions League Winner",
    imageUrl: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=150&auto=format&fit=crop&q=80"
  },
  {
    name: "Harry Kane",
    number: 9,
    position: "Striker",
    nationality: "English",
    personality: "Clinical, modest, professional, model professional, natural leader",
    key_stats: "Highest debut season scorer in Bundesliga history, European Golden Shoe winner",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  },
  {
    name: "Jamal Musiala",
    number: 42,
    position: "Attacking Midfielder",
    nationality: "German",
    personality: "Creative, modest, exceptional dribbler, youthful, spectacular speed",
    key_stats: "German National, double-digit goals and assists, ultimate playmaker",
    imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
  },
  {
    name: "Joshua Kimmich",
    number: 6,
    position: "Defensive Midfielder / RB",
    nationality: "German",
    personality: "Determined, fierce competitor, highly tactical strategist, orchestrator",
    key_stats: "Treble winner 2020, over 350 appearances, unmatched passing accuracy",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    name: "Manuel Neuer",
    number: 1,
    position: "Goalkeeper",
    nationality: "German",
    personality: "Calm, commanding, legendary leader, pioneer sweeper keeper",
    key_stats: "2x Champions League winner, World Goalkeeper of the decade, ultimate wall",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  }
];

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "awareness",
    name: "1. Awareness & Reach",
    description: "Capture casual fan attention and viral social impressions around matchdays.",
    color: "from-blue-600 to-cyan-500",
    triggers: [
      { id: "match_win", name: "Full-Time Victory Trigger", description: "Fires when FCB wins a competitive match." },
      { id: "player_goal", name: "Player Goal/Highlight Trigger", description: "Fires instantly when a player scores a goal." },
      { id: "stadium_lit", name: "Allianz Arena Light-up Trigger", description: "Fires when the Allianz Arena displays custom LED light themes." }
    ],
    actions: [
      { id: "gen_viral_tweet", name: "Generate Post-Match Tweet", description: "Drafts high-energy reaction Twitter post." },
      { id: "gen_insta_carousel", name: "Generate Instagram Carousel Draft", description: "Creates a storyboard carousel post with key stats." },
      { id: "push_hype_video", name: "Generate Runway/Pika Shorts Video Storyboard", description: "Drafts dynamic TikTok concepts." }
    ]
  },
  {
    id: "engagement",
    name: "2. Active Engagement",
    description: "Get social followers to actively interact, sign up, or test their trivia skills.",
    color: "from-yellow-500 to-amber-600",
    triggers: [
      { id: "fan_comment", name: "Fan Instagram Comment Trigger", description: "Fires when a fan comments with a specific hashtag." },
      { id: "trivia_signup", name: "MiaSanAI Interactive Poll Participation", description: "Fires when fans play the daily app trivia game." },
      { id: "photo_upload", name: "Fan Shirt Selfie Upload", description: "Fires when fans share a picture wearing their jersey." }
    ],
    actions: [
      { id: "send_personalized_dm", name: "Send Automated Fan DM", description: "Triggers a personalized greeting using the player's voice tone." },
      { id: "issue_fan_badge", name: "Generate Custom Fan Badge Asset", description: "Produces a customized FC Bayern badge graphic with the fan's name." },
      { id: "invite_to_predict", name: "Send Predictor Game Invitation", description: "Invites fans to submit match score predictions." }
    ]
  },
  {
    id: "conversion",
    name: "3. Fan Shop & Ticket Conversion",
    description: "Drive merchandise sales, membership registrations, and Allianz Arena ticket bookings.",
    color: "from-red-600 to-rose-500",
    triggers: [
      { id: "trivia_winner", name: "Fan Trivia Highscore achieved", description: "Fires when a fan scores 5/5 on the MiaSanAI game." },
      { id: "cart_abandon", name: "FCB Online Shop Cart Abandonment", description: "Fires when a fan leaves a jersey in the shopping cart." },
      { id: "birthday_trigger", name: "Fan Registered Birthday", description: "Fires on the fan's registered birthdate." }
    ],
    actions: [
      { id: "generate_discount_offer", name: "Generate Personalized Discount Ticket", description: "Creates custom jersey coupon (e.g. 'MUELLER25') with visual coupon mock." },
      { id: "send_audio_jersey_pitch", name: "Send Voice-Note Invitation", description: "Simulates an ElevenLabs vocal note inviting them back." },
      { id: "exclusive_pre_sale", name: "Offer Champions League Presale Access", description: "Delivers limited ticket reservation codes." }
    ]
  },
  {
    id: "loyalty",
    name: "4. Loyalty & Fan Club Retention",
    description: "Turn transactional buyers into lifetime Club Members and official Fan Club leaders.",
    color: "from-purple-600 to-fuchsia-500",
    triggers: [
      { id: "membership_anniversary", name: "Club Membership Anniversary", description: "Fires on the exact year anniversary of official membership." },
      { id: "match_visit", name: "stadium Beacon Check-In", description: "Fires when fan checks in via NFC/Bluetooth at the Allianz Arena." },
      { id: "fan_club_founded", name: "New Official Fan Club Registration", description: "Fires when a new local fan club registers in our network." }
    ],
    actions: [
      { id: "gen_custom_video_greeting", name: "Generate Custom AI Video Storyboard", description: "Creates a personalized video plan greeting the specific fan club." },
      { id: "send_captain_audio", name: "Generate Captain Voice Note", description: "Simulates a cloned thank-you audio message from Manuel Neuer." },
      { id: "gold_membership_upgrade", name: "Deliver Gold Supporter Digital Certificate", description: "Drafts a personalized premium certificate of loyalty." }
    ]
  }
];

export const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  { id: "wf1", name: "Instagram Win-Hype Auto-Draft", triggerEvent: "Full-Time Victory Trigger", connector: "n8n", status: "active", executionsCount: 142 },
  { id: "wf2", name: "Fan Trivia Reward Pipeline", triggerEvent: "Fan Trivia Highscore achieved", connector: "Zapier", status: "active", executionsCount: 521 },
  { id: "wf3", name: "Personalized Player Voice notes", triggerEvent: "Club Membership Anniversary", connector: "Internal", status: "active", executionsCount: 89 },
  { id: "wf4", name: "Abandoned Cart Retargeting", triggerEvent: "FCB Online Shop Cart Abandonment", connector: "Make.com", status: "inactive", executionsCount: 312 },
  { id: "wf5", name: "Allianz Arena Welcome Hook", triggerEvent: "stadium Beacon Check-In", connector: "n8n", status: "active", executionsCount: 1045 }
];

export const INITIAL_LOGS: PipelineLog[] = [
  { id: "log-1", timestamp: "12:45:02", level: "INFO", source: "System", message: "MiaSanAI Pipeline initialized. RAG Vector Database online." },
  { id: "log-2", timestamp: "12:45:15", level: "SUCCESS", source: "Vite/Express", message: "Connectors: Zapier and n8n webhooks healthy and listening." },
  { id: "log-3", timestamp: "12:52:10", level: "TRIGGER", source: "Allianz Arena", message: "NFC Beacon check-in detected: Fan 'Felix' checked in at Gate 4." },
  { id: "log-4", timestamp: "12:52:11", level: "SUCCESS", source: "Automation Engine", message: "Triggered 'Allianz Arena Welcome Hook' (wf5) -> Custom DM generated." },
  { id: "log-5", timestamp: "13:00:00", level: "INFO", source: "Scheduler", message: "Running pre-match RAG ingestion for upcoming Champions League tie." }
];

export const FCB_BRAND_RULES = [
  "Core Motto: Always include 'Mia San Mia'. Respect the values of unity, extreme confidence, and local Bavarian pride.",
  "Red Color Usage: Always lead with deep Crimson red accents and dark navy space backdrops for modern enterprise-grade social feeds.",
  "Visual Language: No stock imagery. Direct, authentic action photographs of players on pitch combined with clean, gold-rimmed structural overlays.",
  "Tone variations: Thomas Müller should read witty, cheerful and local. Harry Kane is elite, humble, focused on English/German supporters. Jamal Musiala is fresh, exciting, creative, fan-focused.",
  "Platform constraints: TikTok requires sound effect recommendations. X is restricted to short-form hooks. newsletters require long story-telling details."
];
