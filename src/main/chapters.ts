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

export function scoreGroups(groups: GroupMeta[]): {
  top: ChapterCandidate[]
  rest: ChapterCandidate[]
} {
  const nowSeconds = Math.floor(Date.now() / 1000)

  const scored: ChapterCandidate[] = groups
    .filter((g) => {
      if (g.members.length < MIN_MEMBERS) return false
      if (g.members.length > MAX_MEMBERS) return false
      if (!g.name || /^\+?\d[\d\s\-()]+$/.test(g.name.trim())) return false
      return true
    })
    .map((g): ChapterCandidate => {
      const ageDays = (nowSeconds - g.lastMessageAt) / 86400
      const memberCount = g.members.length

      // Recency: 0-40 pts
      let recency = 0
      if (ageDays < 30) recency = 40
      else if (ageDays < 90) recency = 30
      else if (ageDays < 180) recency = 22
      else if (ageDays < 365) recency = 15
      else if (ageDays < 730) recency = 8
      else if (ageDays < 1095) recency = 4

      // Group size sweet spot: 3-12 = tight crew, 0-30 pts
      let size = 0
      if (memberCount >= 3 && memberCount <= 12) size = 30
      else if (memberCount <= 20) size = 22
      else if (memberCount <= 40) size = 12
      else if (memberCount <= 80) size = 4

      // Closed chapter bonus: meaningfully quiet groups score higher (were real chapters)
      // 0-15 pts
      let closedBonus = 0
      if (ageDays >= 180 && ageDays < 730 && memberCount >= 3 && memberCount <= 20) closedBonus = 15
      else if (ageDays >= 730 && ageDays < 1095 && memberCount >= 3 && memberCount <= 20) closedBonus = 10

      // Name quality: real name (not just numbers) — 0 or 15 pts
      const nameQuality = g.name.length > 2 ? 15 : 0

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
