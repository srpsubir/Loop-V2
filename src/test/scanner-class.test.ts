import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import type { Contact, AppState } from '../shared/types'

// ─── Mock dependencies before importing scanner ───────────────────────────────

const mockListContacts = vi.fn()
const mockReadState = vi.fn()
const mockPatchState = vi.fn().mockResolvedValue(undefined)

vi.mock('../main/store', () => ({
  listContacts: () => mockListContacts(),
  readState: () => mockReadState(),
  patchState: (...args: unknown[]) => mockPatchState(...args),
}))

const mockWAInstance = {
  isConnected: vi.fn().mockReturnValue(false),
  buildTieStrengthMap: vi.fn().mockResolvedValue(new Map()),
  getMessages: vi.fn().mockResolvedValue([]),
}

vi.mock('../main/whatsapp', () => ({
  default: { getInstance: () => mockWAInstance },
}))

const mockTrack = vi.fn()
vi.mock('../main/analytics', () => ({ track: (...args: unknown[]) => mockTrack(...args) }))

import Scanner, { registerScanHandlers } from '../main/scanner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PartialContact = Partial<Contact> & { id: string; name: string; chapterIds: string[]; tier: 'close' | 'warm' }

function makeContact(overrides: Partial<PartialContact> = {}): Contact {
  return {
    id: 'c1',
    name: 'Alice Test',
    whatsappId: '447700900000@s.whatsapp.net',
    tier: 'close',
    chapterIds: [],
    intervalDays: 14,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Contact
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    onboardingComplete: true,
    whatsappConnected: true,
    lastScanAt: null,
    scanCooldownHours: 4,
    scanDay: 6,
    notificationsEnabled: true,
    chapters: [],
    detectedChapters: [],
    pendingChapters: [],
    chapterDetectionComplete: false,
    onThisDayMemory: null,
    contacts: {},
    ...overrides,
  } as unknown as AppState
}

// ─── Reset singleton between tests ───────────────────────────────────────────

let mockSend: ReturnType<typeof vi.fn>
let getWindow: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockPatchState.mockResolvedValue(undefined)

  mockSend = vi.fn()
  getWindow = vi.fn().mockReturnValue({ webContents: { send: mockSend } })

  const scanner = Scanner.getInstance() as unknown as { running: boolean; getWindow: unknown }
  scanner.running = false
  scanner.getWindow = null

  mockWAInstance.isConnected.mockReturnValue(false)
  mockWAInstance.buildTieStrengthMap.mockResolvedValue(new Map())
  mockWAInstance.getMessages.mockResolvedValue([])
})

// ─── Scanner.getInstance ──────────────────────────────────────────────────────

describe('Scanner.getInstance', () => {
  it('returns the same instance on every call (singleton)', () => {
    expect(Scanner.getInstance()).toBe(Scanner.getInstance())
  })
})

// ─── registerScanHandlers ─────────────────────────────────────────────────────

describe('registerScanHandlers', () => {
  it('registers without throwing', () => {
    expect(() => registerScanHandlers(getWindow)).not.toThrow()
  })

  it('stores the getWindow function on the scanner instance', () => {
    registerScanHandlers(getWindow)
    const scanner = Scanner.getInstance() as unknown as { getWindow: unknown }
    expect(scanner.getWindow).toBe(getWindow)
  })
})

// ─── Scanner.run — running guard ──────────────────────────────────────────────

describe('Scanner.run — running guard', () => {
  it('returns immediately if already running without touching listContacts', async () => {
    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    ;(scanner as unknown as { running: boolean }).running = true

    await scanner.run()

    expect(mockListContacts).not.toHaveBeenCalled()
    ;(scanner as unknown as { running: boolean }).running = false
  })
})

// ─── Scanner.run — empty contacts ─────────────────────────────────────────────

describe('Scanner.run — empty contacts list', () => {
  it('completes scan:complete + state:changed with no contacts', async () => {
    mockListContacts.mockResolvedValue([])
    mockReadState.mockResolvedValue(makeState())

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockSend).toHaveBeenCalledWith('scan:complete')
    expect(mockSend).toHaveBeenCalledWith('state:changed')
    expect(mockPatchState).toHaveBeenCalledWith(
      expect.objectContaining({ contacts: {}, lastScanAt: expect.any(String) })
    )
  })
})

// ─── Scanner.run — WA not connected ──────────────────────────────────────────

describe('Scanner.run — WA not connected', () => {
  it('emits scan:progress per contact without calling getMessages', async () => {
    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(false)

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockWAInstance.getMessages).not.toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledWith('scan:progress', 'Alice Test', 1, 1)
  })
})

// ─── Scanner.run — WA connected ──────────────────────────────────────────────

describe('Scanner.run — WA connected', () => {
  it('fetches 50 messages per contact when WA is connected', async () => {
    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'm1', fromMe: false, timestamp: Math.floor(Date.now() / 1000) - 100, text: 'hello there friend today' },
      { id: 'm2', fromMe: true,  timestamp: Math.floor(Date.now() / 1000) - 50,  text: 'hey how are you doing' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockWAInstance.getMessages).toHaveBeenCalledWith('447700900000@s.whatsapp.net', 50)
    expect(mockSend).toHaveBeenCalledWith('scan:complete')
  })

  it('continues gracefully when getMessages throws', async () => {
    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockRejectedValue(new Error('WA timeout'))

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockSend).toHaveBeenCalledWith('scan:complete')
  })
})

// ─── Scanner.run — reconnection detection ────────────────────────────────────

describe('Scanner.run — reconnection detection', () => {
  it('emits reconnection:detected when an incoming message arrives after last reach-out', async () => {
    const reachOutAt = new Date(Date.now() - 2 * 3600000).toISOString()

    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState({
      contacts: {
        c1: {
          lastContactDate: null, lastScanAt: null, story: null, nextOccasion: null,
          lastReachOutAt: reachOutAt, reconnectedAt: null,
        },
      },
    }))
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'm1', fromMe: false, timestamp: Math.floor(Date.now() / 1000) - 3600, text: 'thanks for reaching out!' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockSend).toHaveBeenCalledWith('reconnection:detected', 'c1')
  })
})

// ─── Scanner.run — occasion tracking ─────────────────────────────────────────

describe('Scanner.run — occasion tracking', () => {
  it('calls track(suggestion_shown) when a contact has a nextOccasion', async () => {
    const contact = makeContact({ tier: 'close', intervalDays: 7 })
    const oldDate = new Date(Date.now() - 30 * 86400000).toISOString()

    mockListContacts.mockResolvedValue([contact])
    mockReadState.mockResolvedValue(makeState({
      contacts: { c1: { lastContactDate: oldDate, lastScanAt: null, story: null, nextOccasion: null } },
    }))
    mockWAInstance.isConnected.mockReturnValue(false)

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockTrack).toHaveBeenCalledWith('suggestion_shown', expect.objectContaining({ suggestion_type: 'interval' }))
  })
})

// ─── Scanner.run — C1 signal accumulation (isoWeek coverage) ─────────────────

describe('Scanner.run — C1 relationship signal accumulation', () => {
  it('computes reciprocityRatio and relationshipStrength from messages', async () => {
    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)

    const now = Math.floor(Date.now() / 1000)
    const weekAgo = now - 7 * 86400
    // 10 messages (5 sent + 5 received) across 2 weeks → reciprocity = 1.0, temporal > 0
    mockWAInstance.getMessages.mockResolvedValue([
      { id: '1',  fromMe: true,  timestamp: now - 86400,         text: 'hello there friend again' },
      { id: '2',  fromMe: false, timestamp: now - 86400 * 2,     text: 'hello there friend again' },
      { id: '3',  fromMe: true,  timestamp: now - 86400 * 3,     text: 'hello there friend today' },
      { id: '4',  fromMe: false, timestamp: now - 86400 * 4,     text: 'hello there friend today' },
      { id: '5',  fromMe: true,  timestamp: now - 86400 * 5,     text: 'hello there friend today' },
      { id: '6',  fromMe: false, timestamp: weekAgo - 86400,     text: 'hello there friend here' },
      { id: '7',  fromMe: true,  timestamp: weekAgo - 86400 * 2, text: 'hello there friend here' },
      { id: '8',  fromMe: false, timestamp: weekAgo - 86400 * 3, text: 'hello there friend here' },
      { id: '9',  fromMe: true,  timestamp: weekAgo - 86400 * 4, text: 'hello there friend here' },
      { id: '10', fromMe: false, timestamp: weekAgo - 86400 * 5, text: 'hello there friend here' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const patchArg = mockPatchState.mock.calls[0][0]
    const cs = patchArg.contacts['c1']
    expect(cs.reciprocityRatio).toBeCloseTo(1.0)
    expect(cs.temporalConsistency).toBeGreaterThan(0)
    expect(cs.relationshipStrength).toBeGreaterThan(0)
  })

  it('uses messageStrength from tie strength map when WA is connected', async () => {
    const tieMap = new Map([['447700900000@s.whatsapp.net', { strength: 'high' as const }]])
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.buildTieStrengthMap.mockResolvedValue(tieMap)
    mockWAInstance.getMessages.mockResolvedValue([])

    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const cs = mockPatchState.mock.calls[0][0].contacts['c1']
    expect(cs.messageStrength).toBe('high')
  })
})

// ─── Scanner.run — OnThisDay detection ───────────────────────────────────────

describe('Scanner.run — OnThisDay detection', () => {
  it('sets onThisDayMemory when a real message from 1-5 years ago falls in the ±7-day window', async () => {
    const today = new Date()
    const anniversary = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate(), 12, 0, 0)

    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'ann1', fromMe: false, timestamp: Math.floor(anniversary.getTime() / 1000), text: 'This was such a great day together' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const patchArg = mockPatchState.mock.calls[0][0]
    expect(patchArg.onThisDayMemory).not.toBeNull()
    expect(patchArg.onThisDayMemory?.contactId).toBe('c1')
    expect(patchArg.onThisDayMemory?.yearsAgo).toBe(2)
  })

  it('does not set onThisDayMemory for messages outside the ±7-day anniversary window', async () => {
    const today = new Date()
    // 30 days before today's calendar position, 2 years ago — clearly outside ±7
    const nonAnniversary = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate() - 30)

    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'msg1', fromMe: false, timestamp: Math.floor(nonAnniversary.getTime() / 1000), text: 'This was such a great day together' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const patchArg = mockPatchState.mock.calls[0][0]
    expect(patchArg.onThisDayMemory).toBeNull()
  })

  it('skips messages younger than 1 year or older than 5 years', async () => {
    const today = new Date()
    const tooRecent = new Date(today.getFullYear(), today.getMonth(), today.getDate()) // 0 years ago
    const tooOld    = new Date(today.getFullYear() - 6, today.getMonth(), today.getDate()) // 6 years ago

    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'r1', fromMe: false, timestamp: Math.floor(tooRecent.getTime() / 1000), text: 'This was such a great day together' },
      { id: 'r2', fromMe: false, timestamp: Math.floor(tooOld.getTime() / 1000),    text: 'This was such a great day together' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    expect(mockPatchState.mock.calls[0][0].onThisDayMemory).toBeNull()
  })
})

// ─── Scanner.run — Echo anniversary ──────────────────────────────────────────

describe('Scanner.run — Echo anniversary', () => {
  it('marks a chapter with echoAnniversary when its earliest message is today in a prior year', async () => {
    const today = new Date()
    const firstMsg = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 10, 0, 0)

    const contact = makeContact({ chapterIds: ['ch1'] })
    mockListContacts.mockResolvedValue([contact])
    mockReadState.mockResolvedValue(makeState({
      chapters: [{ id: 'ch1', name: 'University', active: false }],
    }))
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'first', fromMe: false, timestamp: Math.floor(firstMsg.getTime() / 1000), text: 'Hey glad we met today' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const updatedChapter = mockPatchState.mock.calls[0][0].chapters.find((c: { id: string }) => c.id === 'ch1')
    expect(updatedChapter?.echoAnniversary?.years).toBe(1)
    expect(updatedChapter?.echoAnniversary?.triggeredAt).toBeTruthy()
  })

  it('does not overwrite echoAnniversary already seen this year', async () => {
    const today = new Date()
    const firstMsg = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 10, 0, 0)
    const seenAt = `${today.getFullYear()}-01-01T00:00:00.000Z`

    const contact = makeContact({ id: 'c2', chapterIds: ['ch2'] })
    mockListContacts.mockResolvedValue([contact])
    mockReadState.mockResolvedValue(makeState({
      chapters: [{
        id: 'ch2', name: 'Berlin Crew', active: false,
        echoAnniversary: { years: 1, triggeredAt: seenAt, seenAt },
      }],
    }))
    mockWAInstance.isConnected.mockReturnValue(true)
    mockWAInstance.getMessages.mockResolvedValue([
      { id: 'first', fromMe: false, timestamp: Math.floor(firstMsg.getTime() / 1000), text: 'Hey glad we met today' },
    ])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)
    await scanner.run()

    const updatedChapter = mockPatchState.mock.calls[0][0].chapters.find((c: { id: string }) => c.id === 'ch2')
    expect(updatedChapter?.echoAnniversary?.seenAt).toBe(seenAt)
  })
})

// ─── Scanner.run — no getWindow ───────────────────────────────────────────────

describe('Scanner.run — no getWindow registered', () => {
  it('completes normally even with no window (sends are no-ops)', async () => {
    mockListContacts.mockResolvedValue([makeContact()])
    mockReadState.mockResolvedValue(makeState())

    const scanner = Scanner.getInstance()
    // Deliberately skip scanner.init() so getWindow stays null
    await scanner.run()

    expect(mockPatchState).toHaveBeenCalled()
  })
})

// ─── Scanner.maybeRunOnLaunch ─────────────────────────────────────────────────

describe('Scanner.maybeRunOnLaunch', () => {
  it('skips run when onboarding is not complete', async () => {
    vi.useFakeTimers()
    mockReadState.mockResolvedValue(makeState({ onboardingComplete: false }))

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)

    const p = scanner.maybeRunOnLaunch()
    await vi.advanceTimersByTimeAsync(30_000)
    await p

    expect(mockListContacts).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('skips run when whatsapp is not connected', async () => {
    vi.useFakeTimers()
    mockReadState.mockResolvedValue(makeState({ whatsappConnected: false }))

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)

    const p = scanner.maybeRunOnLaunch()
    await vi.advanceTimersByTimeAsync(30_000)
    await p

    expect(mockListContacts).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('skips run when last scan was within 1 hour', async () => {
    vi.useFakeTimers()
    mockReadState.mockResolvedValue(makeState({
      lastScanAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    }))

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)

    const p = scanner.maybeRunOnLaunch()
    await vi.advanceTimersByTimeAsync(30_000)
    await p

    expect(mockListContacts).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('triggers run when onboarded and last scan was over 1 hour ago', async () => {
    vi.useFakeTimers()
    mockReadState.mockResolvedValue(makeState({
      lastScanAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    }))
    mockListContacts.mockResolvedValue([])

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)

    const p = scanner.maybeRunOnLaunch()
    await vi.advanceTimersByTimeAsync(30_000)
    await p
    await vi.runAllTimersAsync()

    expect(mockListContacts).toHaveBeenCalled()
    vi.useRealTimers()
  })
})

// ─── Scanner.run — outer catch handler (line 528) ────────────────────────────

describe('Scanner.run — outer error catch', () => {
  it('does not throw when patchState rejects (error swallowed by outer catch)', async () => {
    mockListContacts.mockResolvedValue([])
    mockReadState.mockResolvedValue(makeState())
    mockPatchState.mockRejectedValue(new Error('disk full'))

    const scanner = Scanner.getInstance()
    scanner.init(getWindow)

    // Should resolve without throwing — outer catch swallows the error
    await expect(scanner.run()).resolves.toBeUndefined()
    // running flag must be reset via finally
    expect((scanner as unknown as { running: boolean }).running).toBe(false)
  })
})

// ─── registerScanHandlers — IPC callback body (line 558) ─────────────────────

describe('registerScanHandlers — IPC scan:run callback', () => {
  it('invokes scanner.run() when the scan:run IPC handler fires', async () => {
    mockListContacts.mockResolvedValue([])
    mockReadState.mockResolvedValue(makeState())

    const handleSpy = vi.spyOn(ipcMain, 'handle')
    registerScanHandlers(getWindow)

    // Find the callback registered for 'scan:run'
    const call = handleSpy.mock.calls.find(([channel]) => channel === 'scan:run')
    expect(call).toBeDefined()
    const callback = call![1] as () => Promise<void>

    // Invoke the callback — this hits line 558 (fire-and-forget run().catch())
    await expect(callback()).resolves.toBeUndefined()
    // Flush the fire-and-forget promise so run() completes before teardown
    await new Promise((r) => setTimeout(r, 0))
    handleSpy.mockRestore()
  })
})
