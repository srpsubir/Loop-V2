import type { ChapterCandidate } from '../shared/types'

interface GroupMeta {
  id: string
  name: string
  members: string[]
  lastMessageAt: number  // unix seconds
}

const TOP_N = 5
const MAX_MEMBERS = 80  // skip mega-groups (company-wide, news, etc.)
const MIN_MEMBERS = 3

// Keywords that appear in real chapter names (crews, life contexts)
const CHAPTER_KEYWORDS = /\b(crew|gang|squad|fam|boys|girls|guys|friends|family|mates|lads|pals|amigos|posse|uni|college|school|office)\b/i

// Names that are purely numeric/year-based — not real chapter names
const NUMERIC_ONLY = /^[\d\s\/\-]+$/

function isEmojiOnly(name: string): boolean {
  const stripped = name.replace(/[\u{FE0F}\u{20E3}\u{200D}\s]/gu, '')
  return stripped.length > 0 && /^\p{Emoji}+$/u.test(stripped)
}

// 0-15 pts: name quality — finer-grained than the old flat 15 for name.length > 2
function nameQualityScore(name: string): number {
  const t = name.trim()
  if (!t || t.length <= 2) return 0
  if (NUMERIC_ONLY.test(t)) return 0          // "2019", "2018/19" etc.
  if (isEmojiOnly(t)) return 0                 // 🔥💪 etc.
  if (!/[a-zA-Z]{2,}/.test(t)) return 3        // symbols/mixed but no real words
  if (CHAPTER_KEYWORDS.test(t)) return 15      // explicit chapter language
  return 10                                    // regular real-word name
}

export function scoreGroups(groups: GroupMeta[]): {
  top: ChapterCandidate[]
  rest: ChapterCandidate[]
} {
  const nowSeconds = Math.floor(Date.now() / 1000)

  const scored: ChapterCandidate[] = groups
    .filter((g) => {
      if (g.id.endsWith('@newsletter')) return false
      if (g.members.length < MIN_MEMBERS) return false
      if (g.members.length > MAX_MEMBERS) return false
      if (!g.name || /^\+?\d[\d\s\-()]+$/.test(g.name.trim())) return false
      return true
    })
    .map((g): ChapterCandidate => {
      const ageDays = (nowSeconds - g.lastMessageAt) / 86400
      const memberCount = g.members.length

      // Recency: 0-40 pts — smoother decay, max 7pt cliff between adjacent bands
      // (was 10pt cliff between <30 and 30-90 days in the old formula)
      let recency = 0
      if (ageDays < 14)        recency = 40
      else if (ageDays < 30)   recency = 36
      else if (ageDays < 60)   recency = 30
      else if (ageDays < 90)   recency = 26
      else if (ageDays < 180)  recency = 22
      else if (ageDays < 365)  recency = 15
      else if (ageDays < 730)  recency = 8
      else if (ageDays < 1095) recency = 4

      // Group size sweet spot: 3-12 = tight crew, 0-30 pts
      let size = 0
      if (memberCount >= 3 && memberCount <= 12) size = 30
      else if (memberCount <= 20) size = 22
      else if (memberCount <= 40) size = 12
      else if (memberCount <= 80) size = 4

      // Closed chapter bonus: meaningfully quiet groups were likely real chapters
      // 0-15 pts; age bands are approximate pending empirical data from confirmed chapters
      let closedBonus = 0
      if (ageDays >= 180 && ageDays < 730 && memberCount >= 3 && memberCount <= 20) closedBonus = 15
      else if (ageDays >= 730 && ageDays < 1095 && memberCount >= 3 && memberCount <= 20) closedBonus = 10

      // Name quality: finer-grained scoring (0, 3, 10, or 15 pts)
      const nameQuality = nameQualityScore(g.name)

      // NOTE: message frequency and group minimum-age signals require Baileys to surface
      // createdAt and message count per group — implement once that data is available (MAV-104).

      const score = Math.min(100, recency + size + closedBonus + nameQuality)
      const active = ageDays < 90

      const lastYear = g.lastMessageAt > 0
        ? new Date(g.lastMessageAt * 1000).getFullYear()
        : undefined

      return {
        waJid: g.id,
        name: g.name,
        memberCount,
        memberJids: g.members.slice(0, 4),
        lastMessageAt: g.lastMessageAt,
        score,
        active,
        inferredEndYear: active ? undefined : lastYear,
      }
    })
    .sort((a, b) => b.score - a.score)

  return {
    top: scored.slice(0, TOP_N),
    rest: scored.slice(TOP_N),
  }
}
