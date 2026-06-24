import { describe, it, expect } from 'vitest'
import { scoreGroups } from '../main/chapters'

const now = Math.floor(Date.now() / 1000)
const daysAgo = (d: number) => now - d * 86400

function group(overrides: Partial<{ id: string; name: string; members: string[]; lastMessageAt: number }> = {}) {
  return {
    id: 'g1@g.us',
    name: 'Test Group',
    members: ['a', 'b', 'c', 'd'],
    lastMessageAt: daysAgo(10),
    ...overrides,
  }
}

describe('scoreGroups', () => {
  it('returns at most 5 in top', () => {
    const groups = Array.from({ length: 20 }, (_, i) =>
      group({ id: `g${i}@g.us`, name: `Group ${i}`, lastMessageAt: daysAgo(i * 10) })
    )
    const { top } = scoreGroups(groups)
    expect(top.length).toBeLessThanOrEqual(5)
  })

  it('filters groups with fewer than 3 members', () => {
    const { top, rest } = scoreGroups([group({ members: ['a', 'b'] })])
    expect(top.length + rest.length).toBe(0)
  })

  it('filters mega-groups with more than 80 members', () => {
    const { top, rest } = scoreGroups([group({ members: Array.from({ length: 81 }, (_, i) => `m${i}`) })])
    expect(top.length + rest.length).toBe(0)
  })

  it('filters groups with no real name (just numbers)', () => {
    const { top, rest } = scoreGroups([group({ name: '+447700900123' })])
    expect(top.length + rest.length).toBe(0)
  })

  it('filters groups with empty name', () => {
    const { top, rest } = scoreGroups([group({ name: '' })])
    expect(top.length + rest.length).toBe(0)
  })

  it('ranks recently active groups higher than old ones', () => {
    const recent = group({ id: 'recent@g.us', name: 'Recent Crew', lastMessageAt: daysAgo(5) })
    const old = group({ id: 'old@g.us', name: 'Old Crew', lastMessageAt: daysAgo(800) })
    const { top } = scoreGroups([old, recent])
    expect(top[0].waJid).toBe('recent@g.us')
  })

  it('marks groups active if last message < 90 days ago', () => {
    const { top } = scoreGroups([group({ lastMessageAt: daysAgo(30) })])
    expect(top[0].active).toBe(true)
  })

  it('marks groups inactive if last message >= 90 days ago', () => {
    const { top } = scoreGroups([group({ lastMessageAt: daysAgo(200) })])
    expect(top[0].active).toBe(false)
  })

  it('sets inferredEndYear for inactive groups', () => {
    const msgDate = daysAgo(400)
    const { top } = scoreGroups([group({ lastMessageAt: msgDate })])
    const expectedYear = new Date(msgDate * 1000).getFullYear()
    expect(top[0].inferredEndYear).toBe(expectedYear)
  })

  it('does not set inferredEndYear for active groups', () => {
    const { top } = scoreGroups([group({ lastMessageAt: daysAgo(10) })])
    expect(top[0].inferredEndYear).toBeUndefined()
  })

  it('slices memberJids to 4', () => {
    const { top } = scoreGroups([group({ members: ['a', 'b', 'c', 'd', 'e', 'f'] })])
    expect(top[0].memberJids.length).toBe(4)
  })

  it('puts overflow into rest', () => {
    const groups = Array.from({ length: 10 }, (_, i) =>
      group({ id: `g${i}@g.us`, name: `Group ${i}`, lastMessageAt: daysAgo(i * 5) })
    )
    const { top, rest } = scoreGroups(groups)
    expect(top.length).toBe(5)
    expect(rest.length).toBe(5)
  })

  it('gives closed chapter bonus to groups silent 180-730 days with 3-20 members', () => {
    const withBonus = group({ lastMessageAt: daysAgo(300), members: ['a', 'b', 'c'] })
    const withoutBonus = group({ id: 'g2@g.us', name: 'No Bonus', lastMessageAt: daysAgo(300), members: Array.from({ length: 40 }, (_, i) => `m${i}`) })
    const { top } = scoreGroups([withBonus, withoutBonus])
    expect(top[0].waJid).toBe('g1@g.us')
  })

  it('scores large groups (41-80 members) with size=4 (the uncovered branch)', () => {
    const large = group({ members: Array.from({ length: 60 }, (_, i) => `m${i}`) })
    const { top, rest } = scoreGroups([large])
    expect(top.length + rest.length).toBe(1)
    expect((top[0] ?? rest[0]).score).toBeGreaterThan(0)
  })

  it('second closed chapter bonus tier: 730-1095 days', () => {
    const veryOld = group({ lastMessageAt: daysAgo(800), members: ['a', 'b', 'c'] })
    const { top } = scoreGroups([veryOld])
    expect(top[0].score).toBeGreaterThan(0)
  })

  it('filters @newsletter groups', () => {
    const newsletter = group({ id: 'news@newsletter' })
    const { top, rest } = scoreGroups([newsletter])
    expect(top.length + rest.length).toBe(0)
  })

  // ─── MAV-104: name quality improvements ──────────────────────────────────────

  it('gives emoji-only names 0 name quality points', () => {
    const emojiGroup = group({ name: '🔥💪' })
    const regularGroup = group({ id: 'g2@g.us', name: 'Edinburgh mates', lastMessageAt: daysAgo(10) })
    const { top } = scoreGroups([emojiGroup, regularGroup])
    // regularGroup should score higher due to better name quality
    expect(top[0].waJid).toBe('g2@g.us')
  })

  it('gives year-only names 0 name quality points', () => {
    const yearGroup = group({ name: '2019' })
    const regularGroup = group({ id: 'g2@g.us', name: 'Uni friends', lastMessageAt: daysAgo(10) })
    const { top } = scoreGroups([yearGroup, regularGroup])
    expect(top[0].waJid).toBe('g2@g.us')
  })

  it('gives chapter-keyword names (crew/friends/etc) full 15 name quality points', () => {
    const chapterGroup = group({ name: 'Edinburgh crew' })
    const plainGroup = group({ id: 'g2@g.us', name: 'Edinburgh trip', lastMessageAt: daysAgo(10) })
    const { top } = scoreGroups([chapterGroup, plainGroup])
    // chapterGroup should score higher (15 vs 10 name quality)
    expect(top[0].waJid).toBe('g1@g.us')
  })

  it('gives regular real-word names 10 name quality points (not 15)', () => {
    const plainGroup = group({ name: 'Trip Planning' })
    const { top } = scoreGroups([plainGroup])
    // score = recency(40) + size(30) + nameQuality(10) = 80
    expect(top[0].score).toBe(80)
  })

  it('gives chapter-keyword name 15 name quality points', () => {
    const chapterGroup = group({ name: 'Zalando gang' })
    const { top } = scoreGroups([chapterGroup])
    // score = recency(40) + size(30) + nameQuality(15) = 85
    expect(top[0].score).toBe(85)
  })

  // ─── MAV-104: smoother recency decay ─────────────────────────────────────────

  it('recency cliff between 29 and 31 days is at most 6 pts', () => {
    const day29 = group({ id: 'g1@g.us', name: 'A', lastMessageAt: daysAgo(29) })
    const day31 = group({ id: 'g2@g.us', name: 'A', lastMessageAt: daysAgo(31) })
    const { top: top1 } = scoreGroups([day29])
    const { top: top2 } = scoreGroups([day31])
    const diff = top1[0].score - top2[0].score
    expect(diff).toBeLessThanOrEqual(6)
  })

  it('groups < 14 days old score max recency (40 pts)', () => {
    const fresh = group({ name: 'New crew', lastMessageAt: daysAgo(5) })
    const { top } = scoreGroups([fresh])
    // recency=40 + size=30 + nameQuality=15 = 85
    expect(top[0].score).toBe(85)
  })

  it('groups 14-30 days old score recency=36', () => {
    const g = group({ name: 'Trip Planning', lastMessageAt: daysAgo(20) })
    const { top } = scoreGroups([g])
    // recency=36 + size=30 + nameQuality=10 = 76
    expect(top[0].score).toBe(76)
  })

  it('score never exceeds 100', () => {
    const perfect = group({ name: 'Edinburgh crew', lastMessageAt: daysAgo(5), members: ['a','b','c','d'] })
    const { top } = scoreGroups([perfect])
    expect(top[0].score).toBeLessThanOrEqual(100)
  })
})
