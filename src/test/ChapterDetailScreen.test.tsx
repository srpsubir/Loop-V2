// MAV-184 — Chapter removal UI tests
// Verifies: "Remove chapter" button opens dialog, cancel bails cleanly,
// Escape bails cleanly, confirm patches state and deletes contacts, onBack fires.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const CHAPTER_ID = 'berlin-2018'
const CHAPTER_NAME = 'Berlin 2018'

const mockChapter = {
  id: CHAPTER_ID,
  name: CHAPTER_NAME,
  active: false,
  confirmed: true,
}

const mockContacts = [
  { id: 'alice', name: 'Alice', chapterIds: [CHAPTER_ID], tier: 'close', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'bob', name: 'Bob', chapterIds: [CHAPTER_ID], tier: 'warm', createdAt: '2024-01-01T00:00:00Z' },
]

const mockAppState = {
  onboardingComplete: true,
  whatsappConnected: false,
  lastScanAt: null,
  scanCooldownHours: 4,
  scanDay: 6,
  notificationsEnabled: true,
  chapters: [mockChapter],
  detectedChapters: [],
  pendingChapters: [],
  chapterDetectionComplete: true,
  onThisDayMemory: null,
  contacts: {
    alice: { lastContactDate: null, lastScanAt: null, story: null, nextOccasion: null },
    bob: { lastContactDate: null, lastScanAt: null, story: null, nextOccasion: null },
  },
}

const mockStatePatch = vi.fn().mockResolvedValue({})
const mockContactDelete = vi.fn().mockResolvedValue(undefined)

const mockLoop = {
  state: {
    get: vi.fn().mockResolvedValue(mockAppState),
    patch: mockStatePatch,
    onChange: vi.fn(() => () => {}),
  },
  contacts: {
    list: vi.fn().mockResolvedValue(mockContacts),
    save: vi.fn().mockResolvedValue({}),
    delete: mockContactDelete,
  },
  whatsapp: {
    status: vi.fn().mockResolvedValue({ status: 'disconnected', qr: null }),
    onConnected: vi.fn(() => () => {}),
    onDisconnected: vi.fn(() => () => {}),
  },
  photos: { pickChapter: vi.fn().mockResolvedValue(null) },
  chapters: { setName: vi.fn().mockResolvedValue(undefined) },
  analytics: { track: vi.fn() },
}

describe('ChapterDetailScreen — chapter removal (MAV-184)', () => {
  const onBack = vi.fn()
  const onOpenStory = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLoop.state.get.mockResolvedValue(mockAppState)
    mockLoop.contacts.list.mockResolvedValue(mockContacts)
    Object.defineProperty(window, 'loop', { value: mockLoop, writable: true })
  })

  async function renderScreen() {
    const { ChapterDetailScreen } = await import('../renderer/src/screens/ChapterDetailScreen')
    let result: ReturnType<typeof render>
    await act(async () => {
      result = render(
        React.createElement(ChapterDetailScreen, { chapterId: CHAPTER_ID, onBack, onOpenStory })
      )
    })
    return result!
  }

  it('shows the "Remove chapter" button', async () => {
    await renderScreen()
    expect(screen.getByRole('button', { name: /remove chapter/i })).toBeInTheDocument()
  })

  it('does not show the confirmation dialog initially', async () => {
    await renderScreen()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the confirmation dialog when "Remove chapter" is clicked', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/removing this chapter removes everyone in it/i)).toBeInTheDocument()
  })

  it('closes the dialog without patching state when "Keep chapter" is clicked', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /keep chapter/i }))
    })
    expect(mockStatePatch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the dialog without patching state when Escape is pressed', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })
    expect(mockStatePatch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('patches state to remove chapter and contacts on confirm', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    await act(async () => {
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove chapter/i }))
    })
    expect(mockStatePatch).toHaveBeenCalledWith(
      expect.objectContaining({
        chapters: expect.not.arrayContaining([expect.objectContaining({ id: CHAPTER_ID })]),
        contacts: expect.not.objectContaining({ alice: expect.anything() }),
      })
    )
  })

  it('deletes each contact file on confirm', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    await act(async () => {
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove chapter/i }))
    })
    expect(mockContactDelete).toHaveBeenCalledWith('alice')
    expect(mockContactDelete).toHaveBeenCalledWith('bob')
  })

  it('calls onBack after confirming removal', async () => {
    await renderScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove chapter/i }))
    })
    await act(async () => {
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove chapter/i }))
    })
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
