import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE'),
  },
}))

// ─── Mock window.loop ─────────────────────────────────────────────────────────

type QRHandler = (qr: string) => void
type ConnectedHandler = () => void
type DisconnectedHandler = (loggedOut: boolean) => void

let qrHandlers: QRHandler[] = []
let connectedHandlers: ConnectedHandler[] = []
let disconnectedHandlers: DisconnectedHandler[] = []

const mockLoop = {
  whatsapp: {
    start: vi.fn().mockResolvedValue('connecting'),
    status: vi.fn().mockResolvedValue({ status: 'connecting', qr: null }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listGroups: vi.fn().mockResolvedValue([]),
    onQR: vi.fn((cb: QRHandler) => {
      qrHandlers.push(cb)
      return () => { qrHandlers = qrHandlers.filter((h) => h !== cb) }
    }),
    onConnected: vi.fn((cb: ConnectedHandler) => {
      connectedHandlers.push(cb)
      return () => { connectedHandlers = connectedHandlers.filter((h) => h !== cb) }
    }),
    onDisconnected: vi.fn((cb: DisconnectedHandler) => {
      disconnectedHandlers.push(cb)
      return () => { disconnectedHandlers = disconnectedHandlers.filter((h) => h !== cb) }
    }),
  },
  state: {
    // privacyAcceptedAt is set so tests bypass the privacy notice screen (MAV-179/180)
    get: vi.fn().mockResolvedValue({ onboardingComplete: false, whatsappConnected: false, privacyAcceptedAt: '2026-01-01T00:00:00.000Z' }),
    patch: vi.fn().mockResolvedValue({}),
    onChange: vi.fn(() => () => {}),
  },
  chapters: {
    detect: vi.fn().mockResolvedValue([]),
    confirm: vi.fn().mockResolvedValue(undefined),
  },
  contacts: { list: vi.fn().mockResolvedValue([]) },
  scan: { run: vi.fn(), onProgress: vi.fn(() => () => {}), onComplete: vi.fn(() => () => {}) },
  shell: { openWhatsApp: vi.fn() },
  photos: { pickHero: vi.fn(), pickChapter: vi.fn() },
  calendar: { addEvent: vi.fn() },
  story: { open: vi.fn() },
  analytics: { track: vi.fn() },
  data: { getDir: vi.fn().mockResolvedValue('~/Documents/Loop'), deleteAll: vi.fn() },
}

const fireQR = (qr: string) => qrHandlers.forEach((h) => h(qr))
const fireConnected = () => connectedHandlers.forEach((h) => h())
const fireDisconnected = (loggedOut: boolean) => disconnectedHandlers.forEach((h) => h(loggedOut))

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('WhatsApp connect screen', () => {
  beforeEach(() => {
    qrHandlers = []
    connectedHandlers = []
    disconnectedHandlers = []
    vi.clearAllMocks()
    mockLoop.whatsapp.start.mockResolvedValue('connecting')
    mockLoop.whatsapp.status.mockResolvedValue({ status: 'connecting', qr: null })
    mockLoop.state.get.mockResolvedValue({ onboardingComplete: false, whatsappConnected: false, privacyAcceptedAt: '2026-01-01T00:00:00.000Z' })
    Object.defineProperty(window, 'loop', { value: mockLoop, writable: true })
  })

  async function renderConnectScreen() {
    const { default: App } = await import('../renderer/src/App')
    let result: ReturnType<typeof render>
    await act(async () => {
      result = render(React.createElement(App))
    })
    return result!
  }

  it('shows Connect WhatsApp button on welcome screen', async () => {
    await renderConnectScreen()
    expect(screen.getByRole('button', { name: 'Connect WhatsApp' })).toBeInTheDocument()
  })

  it('shows Starting… after clicking Connect WhatsApp', async () => {
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    expect(screen.getByText(/Starting/)).toBeInTheDocument()
  })

  it('shows QR code area when QR event fires', async () => {
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    await act(async () => {
      fireQR('some-qr-string')
      // Wait for qrcode.toDataURL promise to resolve
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(screen.getByAltText('WhatsApp QR code')).toBeInTheDocument()
  })

  it('shows Connected when connected event fires', async () => {
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    await act(async () => {
      fireConnected()
    })
    expect(screen.getByText('Connected.')).toBeInTheDocument()
  })

  it('shows error state when disconnected event fires (not logged out)', async () => {
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    await act(async () => {
      fireDisconnected(false)
    })
    expect(screen.getByText(/Could not connect/)).toBeInTheDocument()
    expect(screen.getByText('Scan QR code')).toBeInTheDocument()
  })

  it('shows session expired state when logged out', async () => {
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    await act(async () => {
      fireDisconnected(true)
    })
    expect(screen.getByText(/session expired/i)).toBeInTheDocument()
  })

  it('does not navigate twice if connected fires and status poll also returns connected', async () => {
    mockLoop.whatsapp.status.mockResolvedValue({ status: 'connected', qr: null })
    mockLoop.state.patch.mockResolvedValue({})
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    await act(async () => {
      fireConnected()
    })
    // state.patch should be called at most once for whatsappConnected
    const calls = mockLoop.state.patch.mock.calls.filter(
      (c) => c[0] && 'whatsappConnected' in c[0]
    )
    expect(calls.length).toBeLessThanOrEqual(1)
  })

  it('silent reconnect: advances when status poll returns connected without event', async () => {
    mockLoop.whatsapp.status.mockResolvedValue({ status: 'connected', qr: null })
    await renderConnectScreen()
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Connect WhatsApp' }))
    })
    // Connected event never fires — but status poll should catch it
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(screen.getByText('Connected.')).toBeInTheDocument()
  })
})
