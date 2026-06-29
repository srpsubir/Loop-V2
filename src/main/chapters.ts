import type { ChapterCandidate } from '../shared/types'
import type { ContactCluster } from './whatsapp'

interface GroupMeta {
  id: string
  name: string
  members: string[]
  lastMessageAt: number  // unix seconds
  highTieMemberCount: number
  highTieMemberFraction: number
  topTieMemberNames: string[]
}

const TOP_N = 5
const MAX_MEMBERS = 50  // garbage filter already removed communities/broadcast; 50 is the ceiling for real chapters
const MIN_MEMBERS = 3

// Keywords that appear in real chapter names (crews, life contexts)
const CHAPTER_KEYWORDS = /\b(crew|gang|squad|fam|boys|girls|guys|friends|family|mates|lads|pals|amigos|posse|uni|college|school|office)\b/i

// Broadcast/admin/noise group name patterns — secondary guard (primary is in listGroupsWithMeta)
const GARBAGE_NAME_RE = /\b(broadcast|announce|announcement|update|updates|news|newsletter|society|alumni|association|residents|colony|welfare|committee|notices?|info|helpdesk|support|class of|batch of|school of|investor meet|networking event)\b/i

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
      if (GARBAGE_NAME_RE.test(g.name)) return false
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

      // Tie strength bonus: high fraction of close 1:1 contacts in group = more likely a real chapter
      let tieBonus = 0
      if (g.highTieMemberFraction >= 0.3) tieBonus = 15
      else if (g.highTieMemberFraction >= 0.15) tieBonus = 8
      // Rescue dormant groups: even without message history, strong 1:1 ties signal real chapter
      else if (ageDays >= 365 && g.highTieMemberFraction >= 0.25) tieBonus = 12

      const score = Math.min(100, recency + size + closedBonus + nameQuality + tieBonus)
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

// ─── TF-IDF chapter namer ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','in','at','of','to','for','is','are','was','were',
  'with','on','by','from','as','we','my','our','your','this','that','it','be',
  'have','has','had','will','would','can','could','not','no','but','if','so',
  'all','just','out','up','do','did','get','got','go','gone','let','new','old',
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'group','chat','whatsapp','subir', // app-specific noise
])

function extractKeywords(groupNames: string[]): string[] {
  // Strip emoji and punctuation, lowercase, split into words
  const termFreq = new Map<string, number>()
  const docFreq = new Map<string, number>()
  const docs = groupNames.map(name => {
    const words = name
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')  // strip emoji
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // fold umlauts: ü→u, ä→a
      .replace(/[^a-zA-Z\s]/g, ' ')  // keep only letters
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    const unique = new Set(words)
    for (const w of unique) docFreq.set(w, (docFreq.get(w) ?? 0) + 1)
    for (const w of words) termFreq.set(w, (termFreq.get(w) ?? 0) + 1)
    return words
  })

  // TF-IDF: score = termFreq × log(N / docFreq)
  const N = docs.length || 1
  const scored = [...termFreq.entries()].map(([term, tf]) => {
    const df = docFreq.get(term) ?? 1
    return { term, score: tf * Math.log(N / df + 1) }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 2).map(s => s.term.charAt(0).toUpperCase() + s.term.slice(1))
}

function nameCluster(cluster: ContactCluster): string {
  const keywords = extractKeywords(
    cluster.sharedGroups.length > 0
      ? [cluster.bestGroupName, ...cluster.sharedGroups.map(() => cluster.bestGroupName)]
      : [cluster.bestGroupName]
  )
  const eraStartYear = cluster.eraStart > 0 ? new Date(cluster.eraStart * 1000).getFullYear() : null
  const eraEndYear = cluster.eraEnd ? new Date(cluster.eraEnd * 1000).getFullYear() : null

  const label = keywords.length > 0 ? keywords.join(' ') : cluster.bestGroupName
  const era = eraStartYear
    ? eraEndYear && eraEndYear !== eraStartYear
      ? `${eraStartYear}–${eraEndYear}`
      : eraEndYear === eraStartYear ? `${eraStartYear}` : `${eraStartYear}–now`
    : null

  return era ? `${label} · ${era}` : label
}

// ─── Cluster-based chapter detection ─────────────────────────────────────────

export function clustersToCandidates(
  clusters: ContactCluster[],
  groups: GroupMeta[],
): { top: ChapterCandidate[]; rest: ChapterCandidate[] } {
  // Fallback: not enough clusters → use legacy group scoring
  if (clusters.length < 3) return scoreGroups(groups)

  const nowSec = Math.floor(Date.now() / 1000)
  const groupById = new Map(groups.map(g => [g.id, g]))

  const scored: ChapterCandidate[] = clusters.map(cluster => {
    const representativeGroup = groupById.get(cluster.bestGroupJid)
    const memberCount = cluster.contacts.length
    const lastMessageAt = representativeGroup?.lastMessageAt ?? cluster.eraEnd ?? cluster.eraStart ?? 0
    const ageDays = lastMessageAt > 0 ? (nowSec - lastMessageAt) / 86400 : 9999
    const active = ageDays < 90

    const highTieFraction = representativeGroup?.highTieMemberFraction ?? 0

    // Score: cohesion (0–50) + recency (0–30) + tie strength (0–20)
    const cohesionScore = Math.round(cluster.cohesion * 50)
    const recencyScore = ageDays < 90 ? 30 : ageDays < 365 ? 20 : ageDays < 730 ? 12 : ageDays < 1095 ? 6 : 2
    const tieScore = Math.round(highTieFraction * 20)
    const score = Math.min(100, cohesionScore + recencyScore + tieScore)

    const eraStartYear = cluster.eraStart > 0 ? new Date(cluster.eraStart * 1000).getFullYear() : undefined
    const eraEndYear = cluster.eraEnd ? new Date(cluster.eraEnd * 1000).getFullYear() : undefined

    return {
      waJid: cluster.bestGroupJid,
      name: nameCluster(cluster),
      memberCount,
      memberJids: cluster.contacts.slice(0, 4).map(c => c.jid),
      lastMessageAt,
      score,
      active,
      inferredStartYear: eraStartYear,
      inferredEndYear: active ? undefined : eraEndYear,
      clusterCohesion: cluster.cohesion,
      topMemberNames: cluster.contacts.filter(c => c.displayName).slice(0, 3).map(c => c.displayName),
    }
  }).sort((a, b) => b.score - a.score)

  return {
    top: scored.slice(0, TOP_N),
    rest: scored.slice(TOP_N),
  }
}
