// MAV-260: shared "what's actually new" computation for returning-user chapter
// review — used by SettingsScreen's tappable rescan toast and AppSidebar's
// badge count, so the dedup/snooze rule only lives in one place.
import type { AppState, ChapterCandidate } from '@shared/types'

// Same JID -> chapter-id derivation already used in App.tsx's crew-detection
// completion handler — kept identical so a candidate and its resulting
// Chapter always resolve to the same id.
export function jidToId(jid: string): string {
  return jid.replace(/@g\.us$/, '').replace(/[^a-z0-9]+/gi, '-')
}

const DISMISS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export function getNewChapterCandidates(state: Pick<AppState, 'detectedChapters' | 'chapters' | 'dismissedChapterCandidates'>): ChapterCandidate[] {
  const existingChapterIds = new Set(state.chapters.map((ch) => ch.id))
  const dismissed = state.dismissedChapterCandidates ?? {}
  const now = Date.now()

  return state.detectedChapters.filter((c) => {
    if (existingChapterIds.has(jidToId(c.waJid))) return false
    const dismissedAt = dismissed[c.waJid]
    if (dismissedAt && now - new Date(dismissedAt).getTime() < DISMISS_SNOOZE_MS) return false
    return true
  })
}
