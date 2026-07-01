// MAV-178 — Confirmation gate for data:deleteAll
// Verifies that the IPC call only fires after the user explicitly confirms
// in the dialog, and is suppressed on cancel / Escape.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const mockDeleteAll = vi.fn().mockResolvedValue(undefined)

const mockLoop = {
  state: {
    get: vi.fn().mockResolvedValue({
      whatsappConnected: false,
      chapters: [],
      contacts: {},
      detectedChapters: [],
      pendingChapters: [],
      chapterDetectionComplete: false,
      onboardingComplete: true,
    }),
    patch: vi.fn().mockResolvedValue({}),
    onChange: vi.fn(() => () => {}),
  },
  contacts: {
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  data: {
    getDir: vi.fn().mockResolvedValue('~/Documents/Loop'),
    deleteAll: mockDeleteAll,
  },
  invite: {
    generate: vi.fn().mockResolvedValue([]),
    redeem: vi.fn().mockResolvedValue(false),
  },
  whatsapp: {
    start: vi.fn(),
    status: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listGroups: vi.fn().mockResolvedValue([]),
    onQR: vi.fn(() => () => {}),
    onConnected: vi.fn(() => () => {}),
    onDisconnected: vi.fn(() => () => {}),
  },
  scan: { run: vi.fn(), onProgress: vi.fn(() => () => {}), onComplete: vi.fn(() => () => {}) },
  shell: { openWhatsApp: vi.fn(), openExternal: vi.fn() },
  photos: { pickHero: vi.fn(), pickChapter: vi.fn() },
  calendar: { addEvent: vi.fn() },
  story: { open: vi.fn() },
  analytics: { track: vi.fn() },
  chapters: {
    detect: vi.fn().mockResolvedValue([]),
    confirm: vi.fn().mockResolvedValue(undefined),
    setName: vi.fn().mockResolvedValue(undefined),
  },
  onReconnection: vi.fn(() => () => {}),
  model: { status: vi.fn().mockResolvedValue({ exists: false, ready: false, downloading: false }) },
}

describe('SettingsScreen — data:deleteAll confirmation gate (MAV-178)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoop.state.get.mockResolvedValue({
      whatsappConnected: false,
      chapters: [],
      contacts: {},
      detectedChapters: [],
      pendingChapters: [],
      chapterDetectionComplete: false,
      onboardingComplete: true,
    })
    mockLoop.data.getDir.mockResolvedValue('~/Documents/Loop')
    mockLoop.invite.generate.mockResolvedValue([])
    mockLoop.contacts.list.mockResolvedValue([])
    Object.defineProperty(window, 'loop', { value: mockLoop, writable: true })
  })

  async function renderSettings() {
    const { SettingsScreen } = await import('../renderer/src/screens/SettingsScreen')
    let result: ReturnType<typeof render>
    await act(async () => {
      result = render(React.createElement(SettingsScreen))
    })
    return result!
  }

  it('does not call deleteAll when the "Delete all data" button is first clicked', async () => {
    await renderSettings()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }))
    })
    expect(mockDeleteAll).not.toHaveBeenCalled()
  })

  it('shows the confirmation dialog after clicking "Delete all data"', async () => {
    await renderSettings()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/delete everything\?/i)).toBeInTheDocument()
  })

  it('does not call deleteAll when "Keep everything" is clicked in the dialog', async () => {
    await renderSettings()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }))
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /keep everything/i }))
    })
    expect(mockDeleteAll).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls deleteAll exactly once when "Delete it all" is confirmed', async () => {
    await renderSettings()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }))
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete it all/i }))
    })
    expect(mockDeleteAll).toHaveBeenCalledTimes(1)
  })

  it('closes the dialog and does not call deleteAll when Escape is pressed', async () => {
    await renderSettings()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await act(async () => {
      await userEvent.keyboard('{Escape}')
    })
    expect(mockDeleteAll).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
