// ─── Chapter ─────────────────────────────────────────────────────────────────

export interface Chapter {
  id: string
  name: string                  // e.g. "London years", "Edinburgh masters"
  location?: string             // e.g. "London, UK"
  startYear?: number
  endYear?: number              // null = active/ongoing
  active: boolean
  coverPhotoPath?: string       // user-selected photo for chapter card
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
  snippet: string               // Claude-generated warm one-liner
  yearsAgo: number
  date: string                  // ISO date of the original message
}

// ─── Contact ─────────────────────────────────────────────────────────────────

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

// ─── Brief ───────────────────────────────────────────────────────────────────

export interface Brief {
  generatedAt: string
  heroPhotoPath?: string        // local path from macOS Photos face-match
  contextLines: string[]        // 2-3 lines from Claude
  reasonToReachOut: string      // "Birthday in 3 days" / "7 weeks since you spoke"
}

// ─── Occasion ────────────────────────────────────────────────────────────────

export interface Occasion {
  type: 'birthday' | 'interval' | 'milestone' | 'chapter-anniversary'
  date: string
  label: string
}

// ─── Contact state ───────────────────────────────────────────────────────────

export interface ContactState {
  lastContactDate: string | null
  lastScanAt: string | null
  brief: Brief | null
  nextOccasion: Occasion | null
  briefOpenedAt?: string | null   // timestamp when brief was opened (reach-out detection)
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
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export type AppScreen =
  | 'welcome'
  | 'whatsapp-connect'
  | 'chapter-inference'
  | 'chapter-confirm'
  | 'crew-detect'
  | 'garden'
  | 'chapter'
  | 'brief'
  | 'settings'
