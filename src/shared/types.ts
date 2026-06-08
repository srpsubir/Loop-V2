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
  chapters: Chapter[]
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
