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
})
