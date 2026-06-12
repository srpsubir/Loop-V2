import { describe, it, expect } from 'vitest'
import { isRealMessage, computeNextOccasion } from '../main/scanner'
import type { Contact } from '../shared/types'

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
