import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks declared first so vi.mock factories contain no outer-variable refs ──

vi.mock('node-llama-cpp', () => ({
  getLlama: vi.fn(),
  LlamaChatSession: vi.fn(),
}))

vi.mock('fs', async (importActual) => {
  const actual = await importActual<typeof import('fs')>()
  return {
    ...actual,
    accessSync: vi.fn(),
    promises: { ...actual.promises, mkdir: vi.fn().mockResolvedValue(undefined) },
    createWriteStream: vi.fn().mockReturnValue({ write: vi.fn(), end: vi.fn(), destroy: vi.fn() }),
    rename: vi.fn((_a: string, _b: string, cb: (e: Error | null) => void) => cb(null)),
  }
})

// ─── Static imports of mocked modules (resolved after vi.mock is registered) ──

import * as nodeLlamaCpp from 'node-llama-cpp'
import * as fs from 'fs'
import type { Contact, Chapter, Occasion } from '../shared/types'

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const mockSequence = { dispose: vi.fn() }
const mockCtx      = { getSequence: vi.fn(() => mockSequence) }

const contact: Contact = {
  id: 'c1',
  name: 'James Smith',
  whatsappId: '447700900000@s.whatsapp.net',
  tier: 'close',
  chapterIds: ['ch1'],
  intervalDays: 30,
}

const chapters: Chapter[] = [{ id: 'ch1', name: 'University', active: false }]

const msgs = [
  { id: '1', fromMe: false, timestamp: Math.floor(Date.now() / 1000) - 86400, text: 'Hey how are you?' },
  { id: '2', fromMe: true,  timestamp: Math.floor(Date.now() / 1000) - 3600,  text: 'All good, you?' },
]

const occasion: Occasion = { type: 'interval', date: new Date().toISOString(), label: 'Worth checking in' }

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('inference — initial state', () => {
  beforeEach(async () => {
    const { _resetModelStateForTest } = await import('../main/inference')
    _resetModelStateForTest()
  })

  it('isModelReady() is false before init', async () => {
    const { isModelReady } = await import('../main/inference')
    expect(isModelReady()).toBe(false)
  })

  it('isDownloading() is false initially', async () => {
    const { isDownloading } = await import('../main/inference')
    expect(isDownloading()).toBe(false)
  })
})

describe('inference — modelExists', () => {
  it('returns true when fs.accessSync does not throw', async () => {
    vi.mocked(fs.accessSync).mockImplementation(() => undefined)
    const { modelExists } = await import('../main/inference')
    expect(modelExists()).toBe(true)
  })

  it('returns false when fs.accessSync throws', async () => {
    vi.mocked(fs.accessSync).mockImplementation(() => { throw new Error('ENOENT') })
    const { modelExists } = await import('../main/inference')
    expect(modelExists()).toBe(false)
  })
})

describe('inference — generateStoryWithSLM', () => {
  let mockPrompt: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { _resetModelStateForTest, _setModelReadyForTest } = await import('../main/inference')
    _resetModelStateForTest()
    _setModelReadyForTest(mockCtx)
    mockSequence.dispose.mockClear()
    mockCtx.getSequence.mockClear()

    // Fresh prompt mock per test; set LlamaChatSession to return it
    mockPrompt = vi.fn()
    vi.mocked(nodeLlamaCpp.LlamaChatSession).mockImplementation(function () {
      return { prompt: mockPrompt } as unknown as InstanceType<typeof nodeLlamaCpp.LlamaChatSession>
    })
  })

  it('returns Story on valid JSON output', async () => {
    mockPrompt.mockResolvedValue(
      '{"contextLines":["You and James go back.","You spoke recently."],"reasonToReachOut":"Worth checking in."}'
    )
    const { generateStoryWithSLM } = await import('../main/inference')
    const story = await generateStoryWithSLM(contact, msgs, chapters, occasion)
    expect(story.contextLines).toEqual(['You and James go back.', 'You spoke recently.'])
    expect(story.reasonToReachOut).toBe('Worth checking in.')
    expect(typeof story.generatedAt).toBe('string')
  })

  it('uses occasion label as fallback when reasonToReachOut missing from output', async () => {
    mockPrompt.mockResolvedValue('{"contextLines":["Line one.","Line two."]}')
    const { generateStoryWithSLM } = await import('../main/inference')
    const story = await generateStoryWithSLM(contact, msgs, chapters, occasion)
    expect(story.reasonToReachOut).toBe('Worth checking in')
  })

  it('falls back to contact name when both SLM reasonToReachOut and occasion are null', async () => {
    mockPrompt.mockResolvedValue('{"contextLines":["Line."]}')
    const { generateStoryWithSLM } = await import('../main/inference')
    const story = await generateStoryWithSLM(contact, msgs, chapters, null)
    expect(story.reasonToReachOut).toContain('James')
  })

  it('throws when JSON cannot be parsed', async () => {
    mockPrompt.mockResolvedValue('not json at all')
    const { generateStoryWithSLM } = await import('../main/inference')
    await expect(generateStoryWithSLM(contact, msgs, chapters, occasion)).rejects.toThrow()
  })

  it('throws when contextLines is empty array', async () => {
    mockPrompt.mockResolvedValue('{"contextLines":[],"reasonToReachOut":"r"}')
    const { generateStoryWithSLM } = await import('../main/inference')
    await expect(generateStoryWithSLM(contact, msgs, chapters, occasion)).rejects.toThrow()
  })

  it('disposes sequence even on parse failure', async () => {
    mockPrompt.mockResolvedValue('garbage')
    const { generateStoryWithSLM } = await import('../main/inference')
    await expect(generateStoryWithSLM(contact, msgs, chapters, occasion)).rejects.toThrow()
    expect(mockSequence.dispose).toHaveBeenCalled()
  })

  it('slices contextLines to max 3', async () => {
    mockPrompt.mockResolvedValue(
      '{"contextLines":["A","B","C","D","E"],"reasonToReachOut":"r"}'
    )
    const { generateStoryWithSLM } = await import('../main/inference')
    const story = await generateStoryWithSLM(contact, msgs, chapters, occasion)
    expect(story.contextLines.length).toBeLessThanOrEqual(3)
  })

  it('throws when model not ready', async () => {
    const { _resetModelStateForTest, generateStoryWithSLM } = await import('../main/inference')
    _resetModelStateForTest()
    await expect(generateStoryWithSLM(contact, msgs, chapters, occasion)).rejects.toThrow('Model not ready')
  })
})
