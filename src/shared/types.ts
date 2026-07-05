// ─── Chapter ─────────────────────────────────────────────────────────────────

export interface Chapter {
  id: string
  name: string                  // e.g. "London years", "Edinburgh masters"
  location?: string             // e.g. "London, UK"
  startYear?: number
  endYear?: number              // null = active/ongoing
  active: boolean
  coverPhotoPath?: string       // user-selected photo for chapter card
  confirmed?: boolean           // false = created by inference, not yet named by user
  crewContactIds?: string[]     // MAV-206: user-confirmed crew for this chapter
  echoAnniversary?: {
    years: number
    triggeredAt: string         // ISO date — when the echo was first detected
    seenAt?: string             // ISO date — set when user opens the card
  }
}

// ─── Invite code ─────────────────────────────────────────────────────────────

export interface InviteCode {
  code: string                  // e.g. "LOOP-A3X9K"
  usedAt?: string               // ISO date — set when someone redeems it
}

// ─── Chapter candidate (from WhatsApp group scoring) ─────────────────────────

export interface ChapterCandidate {
  waJid: string                 // WhatsApp group JID (ends in @g.us)
  name: string
  memberCount: number
  memberJids: string[]          // up to 4 JIDs for avatar display
  lastMessageAt: number         // unix seconds
  score: number                 // 0-100 computed score
  active: boolean               // inferred: last message < 90 days
  inferredStartYear?: number
  inferredEndYear?: number
}

// ─── On This Day memory ───────────────────────────────────────────────────────

export interface OnThisDayMemory {
  contactId: string
  contactName: string
  snippet: string               // template-generated warm one-liner
  yearsAgo: number
  date: string                  // ISO date of the original message
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export type WAConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'logged_out'
  | 'protocol_error'

export type WarmthTier = 'close' | 'warm'

export interface Contact {
  id: string                    // slug derived from name, e.g. "priya-sharma"
  name: string
  whatsappId?: string           // phone number or WA JID
  chapterIds: string[]
  tier: WarmthTier
  intervalDays?: number         // for close tier — e.g. 30
  birthday?: { month: number; day: number }
  createdAt: string
}

// ─── Story ───────────────────────────────────────────────────────────────────

export interface Story {
  generatedAt: string
  heroPhotoPath?: string        // local path from macOS Photos face-match
  contextLines: string[]        // template-generated context lines
  reasonToReachOut: string      // e.g. "It's [Name]'s birthday today. Even a short message counts."
  draftMessage?: string         // suggested opening message, template-generated
}

// ─── Occasion ────────────────────────────────────────────────────────────────

export interface Occasion {
  type: 'birthday' | 'interval' | 'milestone' | 'chapter-anniversary' | 'dead-thread'
  date: string
  label: string
}

// ─── Contact state ───────────────────────────────────────────────────────────

export interface ContactState {
  lastContactDate: string | null
  lastScanAt: string | null
  story: Story | null
  nextOccasion: Occasion | null
  storyOpenedAt?: string | null   // timestamp when story screen opened
  reachOutCount?: number          // increments each time user taps "Open in WhatsApp"
  lastReachOutAt?: string | null  // ISO timestamp of most recent reach-out
  reconnectedAt?: string | null   // ISO timestamp when reply detected after reach-out
  suppressNudge?: boolean         // true after 2 failed reach-outs
  nudgeDismissedAt?: string | null // ISO timestamp when user dismissed nudge card; resurfaces after 7 days
  nudgeDismissCount?: number      // MAV-210: cumulative dismiss count; drives escalating cooldowns
  autosuppressed?: boolean        // MAV-210: true once nudgeDismissCount >= 5
  snoozedUntil?: string           // MAV-205: ISO date; contact skipped from nudges until this date passes
  messageStrength?: 'high' | 'medium' | 'low'  // computed from WhatsApp chat recency at scan time
  reciprocityRatio?: number       // C1: min(sent,recv)/max(sent,recv), neutral 0.5 if <10 msgs
  temporalConsistency?: number    // C1: distinct ISO weeks / span in weeks
  relationshipStrength?: number   // C1: composite 0–1 score
}

// ─── App state ───────────────────────────────────────────────────────────────

export interface AppState {
  onboardingComplete: boolean
  whatsappConnected: boolean
  lastScanAt: string | null
  scanCooldownHours: number       // default 4
  scanDay: number                 // 0=Sun … 6=Sat, default 6 (Saturday)
  notificationsEnabled: boolean   // default true
  chapters: Chapter[]
  detectedChapters: ChapterCandidate[]    // top-5 from scoring, awaiting user review
  pendingChapters: ChapterCandidate[]     // rest, stored for later surfacing
  chapterDetectionComplete: boolean       // user has reviewed and confirmed
  onThisDayMemory?: OnThisDayMemory | null
  contacts: Record<string, ContactState>  // keyed by contactId
  emailCaptured?: boolean                 // true once user submits or skips email capture
  connectionFailureReason?: string
  stayCloseComplete?: boolean             // true once user completes Stay Close onboarding
  inviteCodes?: InviteCode[]              // 3 codes generated on first scan
  privacyAcceptedAt?: string               // ISO timestamp — set when user accepts privacy notice + LLM consent (MAV-179/180)
  manuallySelected?: string[]             // MAV-215: contact IDs chosen in Beat 3 contact picker
  telemetryEnabled?: boolean              // MAV-217: default true (private beta); opt-out in Settings
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export type AppScreen =
  | 'welcome'
  | 'whatsapp-connect'
  | 'chapter-inference'
  | 'chapter-confirm'
  | 'crew-detect'
  | 'stay-close'
  | 'your-loops'
  | 'chapter'
  | 'your-story'
  | 'settings'
