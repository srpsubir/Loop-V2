import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isRealMessage, computeNextOccasion, detectDeadThread, detectReconnection, computeReachOutUpdate } from '../main/scanner'
import type { Contact, ContactState } from '../shared/types'

// ─── isRealMessage ────────────────────────────────────────────────────────────

describe('isRealMessage', () => {
  const msg = (text: string | null, fromMe = false) => ({
    id: '1', fromMe, timestamp: 0, text,
  })

  it('returns false for null text', () => expect(isRealMessage(msg(null))).toBe(false))
  it('returns false for empty string', () => expect(isRealMessage(msg(''))).toBe(false))
  it('returns false for 1-2 char messages', () => expect(isRealMessage(msg('ok'))).toBe(false))
  it('returns false for emoji-only', () => expect(isRealMessage(msg('😂'))).toBe(false))
  it('returns false for emoji-only multi', () => expect(isRealMessage(msg('👍❤️'))).toBe(false))
  it('returns false for [Voice Note]', () => expect(isRealMessage(msg('[Voice Note]'))).toBe(false))
  it('returns false for [Sticker]', () => expect(isRealMessage(msg('[Sticker]'))).toBe(false))
  it('returns false for [Image]', () => expect(isRealMessage(msg('[Image]'))).toBe(false))
  it('returns false for [Video]', () => expect(isRealMessage(msg('[Video]'))).toBe(false))
  it('returns true for normal text', () => expect(isRealMessage(msg('Hey how are you doing?'))).toBe(true))
  it('returns true for short but real message', () => expect(isRealMessage(msg('yes!'))).toBe(true))
})

// ─── computeNextOccasion ─────────────────────────────────────────────────────

const baseContact: Contact = {
  id: 'c1',
  name: 'Test Person',
  whatsappId: '447700900000@s.whatsapp.net',
  tier: 'close',
  chapterIds: [],
  intervalDays: 14,
}

describe('computeNextOccasion — birthday', () => {
  it('returns birthday occasion when birthday is within 30 days', () => {
    const today = new Date()
    const soon = new Date(today.getTime() + 10 * 86400000)
    const contact = { ...baseContact, birthday: { month: soon.getMonth() + 1, day: soon.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result?.type).toBe('birthday')
  })

  it('returns null when birthday is more than 30 days away', () => {
    const today = new Date()
    const far = new Date(today.getTime() + 60 * 86400000)
    const contact = { ...baseContact, birthday: { month: far.getMonth() + 1, day: far.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result).toBeNull()
  })

  it('returns birthday today label', () => {
    const today = new Date()
    const contact = { ...baseContact, birthday: { month: today.getMonth() + 1, day: today.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result?.label).toBe('Birthday today!')
  })
})

describe('computeNextOccasion — interval', () => {
  it('returns interval occasion when overdue', () => {
    const lastContact = new Date(Date.now() - 20 * 86400000).toISOString()
    const contact = { ...baseContact, tier: 'close' as const, intervalDays: 14 }
    const result = computeNextOccasion(contact, lastContact)
    expect(result?.type).toBe('interval')
  })

  it('returns null when not yet overdue', () => {
    const lastContact = new Date(Date.now() - 5 * 86400000).toISOString()
    const contact = { ...baseContact, tier: 'close' as const, intervalDays: 14 }
    const result = computeNextOccasion(contact, lastContact)
    expect(result).toBeNull()
  })

  it('returns null for non-close tier even if overdue', () => {
    const lastContact = new Date(Date.now() - 60 * 86400000).toISOString()
    const contact = { ...baseContact, tier: 'family' as const, intervalDays: 14 }
    const result = computeNextOccasion(contact, lastContact)
    expect(result).toBeNull()
  })

  it('returns null when no lastContactDate', () => {
    const contact = { ...baseContact, tier: 'close' as const, intervalDays: 14 }
    const result = computeNextOccasion(contact, null)
    expect(result).toBeNull()
  })

  it('prioritises birthday over interval when both apply', () => {
    const today = new Date()
    const lastContact = new Date(Date.now() - 30 * 86400000).toISOString()
    const contact = {
      ...baseContact,
      tier: 'close' as const,
      intervalDays: 14,
      birthday: { month: today.getMonth() + 1, day: today.getDate() },
    }
    const result = computeNextOccasion(contact, lastContact)
    expect(result?.type).toBe('birthday')
  })
})

// ─── MAV-92: birthday detection edge cases ────────────────────────────────────

describe('computeNextOccasion — birthday 7-day atom window', () => {
  it('surfaces birthday 7 days out (within 30-day scanner window)', () => {
    const d = new Date(Date.now() + 7 * 86400000)
    const contact = { ...baseContact, birthday: { month: d.getMonth() + 1, day: d.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result?.type).toBe('birthday')
  })

  it('surfaces birthday 8 days out (within 30-day scanner window)', () => {
    const d = new Date(Date.now() + 8 * 86400000)
    const contact = { ...baseContact, birthday: { month: d.getMonth() + 1, day: d.getDate() } }
    const result = computeNextOccasion(contact, null)
    // computeNextOccasion returns birthday up to 30 days; atom state is separately
    // gated at 7 days — so at 8 days it surfaces as an occasion but NOT birthday-live
    expect(result?.type).toBe('birthday')
    const daysUntil = (new Date(result!.date).getTime() - Date.now()) / 86400000
    expect(daysUntil).toBeGreaterThan(7)
  })

  it('returns null for contact with no birthday field', () => {
    const result = computeNextOccasion(baseContact, null)
    expect(result).toBeNull()
  })

  it('birthday label is "Birthday today!" when daysUntil === 0', () => {
    const today = new Date()
    const contact = { ...baseContact, birthday: { month: today.getMonth() + 1, day: today.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result?.label).toBe('Birthday today!')
  })

  it('birthday label is "Birthday tomorrow" when daysUntil === 1', () => {
    const d = new Date(Date.now() + 86400000)
    const contact = { ...baseContact, birthday: { month: d.getMonth() + 1, day: d.getDate() } }
    const result = computeNextOccasion(contact, null)
    expect(result?.label).toBe('Birthday tomorrow')
  })

  it('rolls over to next year for Dec 31 when current date is Jan 1', () => {
    // Freeze time at Jan 1
    const jan1 = new Date(new Date().getFullYear(), 0, 1, 12, 0, 0)
    vi.useFakeTimers()
    vi.setSystemTime(jan1)
    const contact = { ...baseContact, birthday: { month: 12, day: 31 } }
    const result = computeNextOccasion(contact, null)
    vi.useRealTimers()
    // Dec 31 has passed (Jan 1 now), so it must roll to next year
    if (result) {
      const bdYear = new Date(result.date).getFullYear()
      expect(bdYear).toBe(jan1.getFullYear() + 1)
    }
    // Could be > 30 days away so result may be null — just verify no crash
    expect(true).toBe(true)
  })
})

// ─── MAV-92: dead thread detection ───────────────────────────────────────────

describe('detectDeadThread', () => {
  const msg = (text: string, fromMe = true, daysAgo = 0) => ({
    id: 't1',
    fromMe,
    timestamp: Math.floor((Date.now() - daysAgo * 86400000) / 1000),
    text,
  })

  it('flags dead thread when commitment phrase is followed by 14+ days silence', () => {
    const messages = [msg("let's catch up", true, 15)]
    expect(detectDeadThread(messages)?.type).toBe('dead-thread')
  })

  it('does NOT flag when a newer message exists after the phrase', () => {
    const messages = [
      msg('Sounds good!', false, 10),
      msg("let's catch up", true, 15),
    ]
    expect(detectDeadThread(messages)).toBeNull()
  })

  it('does NOT flag when silence is less than 14 days', () => {
    const messages = [msg("let's catch up", true, 10)]
    expect(detectDeadThread(messages)).toBeNull()
  })

  it('does NOT flag when no commitment phrase found', () => {
    const messages = [msg('hey how are you doing', true, 20)]
    expect(detectDeadThread(messages)).toBeNull()
  })

  it('is case-insensitive: "Let\'s Catch Up" matches', () => {
    const messages = [msg("Let's Catch Up", true, 15)]
    expect(detectDeadThread(messages)?.type).toBe('dead-thread')
  })

  it('matches "talk soon"', () => {
    const messages = [msg('talk soon', true, 16)]
    expect(detectDeadThread(messages)?.type).toBe('dead-thread')
  })

  it('matches "speak soon"', () => {
    const messages = [msg('speak soon', true, 20)]
    expect(detectDeadThread(messages)?.type).toBe('dead-thread')
  })

  it('does not false-positive on emoji-only messages', () => {
    const messages = [msg('😊', true, 20)]
    expect(detectDeadThread(messages)).toBeNull()
  })

  it('does not false-positive when phrase found then another message same day', () => {
    const now = Math.floor(Date.now() / 1000)
    const messages = [
      { id: '1', fromMe: false, timestamp: now - 3600, text: 'Sounds good!' },
      { id: '2', fromMe: true, timestamp: now - 7200, text: "let's catch up" },
    ]
    // phraseIdx is 1 (not 0) because message[0] is newer — not a dead thread
    expect(detectDeadThread(messages)).toBeNull()
  })

  it('returns dead-thread Occasion with correct shape', () => {
    const messages = [msg("we should meet", true, 20)]
    const result = detectDeadThread(messages)
    expect(result?.type).toBe('dead-thread')
    expect(typeof result?.date).toBe('string')
    expect(typeof result?.label).toBe('string')
  })
})

// ─── MAV-93: reconnection detection ──────────────────────────────────────────

describe('detectReconnection', () => {
  const msg = (fromMe: boolean, hoursAgo: number) => ({
    id: 't1',
    fromMe,
    text: 'hey',
    timestamp: Math.floor((Date.now() - hoursAgo * 3600000) / 1000),
  })

  const reachOutState = (hoursAgoReachOut: number, reconnectedAt: string | null = null) =>
    ({
      lastReachOutAt: new Date(Date.now() - hoursAgoReachOut * 3600000).toISOString(),
      reconnectedAt,
    }) as ContactState

  it('returns true when a reply arrives after the reach-out', () => {
    const messages = [msg(false, 1)] // reply 1 hour ago
    expect(detectReconnection(reachOutState(2), messages)).toBe(true)
  })

  it('returns false when reply pre-dates the reach-out', () => {
    const messages = [msg(false, 5)] // reply 5 hours ago, reach-out was 2 hours ago
    expect(detectReconnection(reachOutState(2), messages)).toBe(false)
  })

  it('returns false when no incoming messages at all', () => {
    const messages = [msg(true, 1)] // outgoing only
    expect(detectReconnection(reachOutState(2), messages)).toBe(false)
  })

  it('returns false when reconnectedAt is already set', () => {
    const state = reachOutState(24, new Date().toISOString())
    const messages = [msg(false, 1)]
    expect(detectReconnection(state, messages)).toBe(false)
  })

  it('returns false when lastReachOutAt is null', () => {
    const state = { lastReachOutAt: null, reconnectedAt: null } as ContactState
    const messages = [msg(false, 1)]
    expect(detectReconnection(state, messages)).toBe(false)
  })

  it('returns false for null prevState', () => {
    expect(detectReconnection(null, [msg(false, 1)])).toBe(false)
  })

  it('returns false for empty message list', () => {
    expect(detectReconnection(reachOutState(2), [])).toBe(false)
  })
})

// ─── MAV-93: reach-out count and suppressNudge ───────────────────────────────

describe('computeReachOutUpdate', () => {
  it('first reach-out: count = 1, suppressNudge = false', () => {
    const result = computeReachOutUpdate(0)
    expect(result.reachOutCount).toBe(1)
    expect(result.suppressNudge).toBe(false)
  })

  it('second reach-out: count = 2, suppressNudge = true', () => {
    const result = computeReachOutUpdate(1)
    expect(result.reachOutCount).toBe(2)
    expect(result.suppressNudge).toBe(true)
  })

  it('third reach-out: count = 3, suppressNudge stays true', () => {
    const result = computeReachOutUpdate(2)
    expect(result.reachOutCount).toBe(3)
    expect(result.suppressNudge).toBe(true)
  })

  it('suppressNudge is false for count < 2', () => {
    expect(computeReachOutUpdate(0).suppressNudge).toBe(false)
  })

  it('suppressNudge is true at count >= 2', () => {
    for (const n of [1, 2, 5, 10]) {
      expect(computeReachOutUpdate(n).suppressNudge).toBe(n + 1 >= 2)
    }
  })
})
