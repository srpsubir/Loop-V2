/**
 * MAV-171: WhatsApp connection lifecycle — failure-path test suite
 *
 * Covers 11 cases: QR emission, connection open, pre-connect closes (silent
 * retry), post-connect disconnect, loggedOut, retry budget exhaustion,
 * waitForStore variants, and disconnect() state reset.
 *
 * Baileys is mocked entirely — no network I/O occurs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// ─── Mock variables ───────────────────────────────────────────────────────────
// Vitest hoists vi.mock() calls to the top of the file; variables whose names
// start with "mock" are also hoisted so they can be referenced inside the
// factory without TDZ errors.

const mockMakeWASocket = vi.fn()
const mockUseMultiFileAuthState = vi.fn()
const mockFetchLatestBaileysVersion = vi.fn()
const mockMakeCacheableSignalKeyStore = vi.fn()
const mockFsMkdir = vi.fn()
const mockFsReaddir = vi.fn()
const mockFsUnlink = vi.fn()

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@whiskeysockets/baileys', () => ({
  default: mockMakeWASocket,
  useMultiFileAuthState: mockUseMultiFileAuthState,
  DisconnectReason: {
    loggedOut: 401,
    connectionClosed: 428,
    connectionLost: 408,
    timedOut: 408,
  },
  fetchLatestBaileysVersion: mockFetchLatestBaileysVersion,
  makeCacheableSignalKeyStore: mockMakeCacheableSignalKeyStore,
}))

vi.mock('fs', () => {
  const promises = {
    mkdir: mockFsMkdir,
    readdir: mockFsReaddir,
    unlink: mockFsUnlink,
  }
  return { default: { promises }, promises }
})

vi.mock('pino', () => ({
  default: vi.fn().mockReturnValue({ level: 'silent' }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a fresh fake Baileys socket with an EventEmitter for .ev. */
function makeSocket() {
  const ev = new EventEmitter()
  const logout = vi.fn().mockResolvedValue(undefined)
  return { ev, logout }
}

/** Build a `connection.update` close payload with the given status code. */
function closeUpdate(statusCode: number) {
  return {
    connection: 'close' as const,
    lastDisconnect: { error: { output: { statusCode } } },
  }
}

/** Flush all pending microtasks so async event-handler code can complete. */
async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('WhatsApp connection lifecycle', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wa: any
  let sock: ReturnType<typeof makeSocket>

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()

    // Fresh socket for each test — start() returns this one on first call.
    sock = makeSocket()
    mockMakeWASocket.mockReset().mockReturnValue(sock)
    mockUseMultiFileAuthState.mockReset().mockResolvedValue({
      state: { creds: {}, keys: {} },
      saveCreds: vi.fn(),
    })
    mockFetchLatestBaileysVersion.mockReset().mockResolvedValue({ version: [2, 3000, 1] })
    mockMakeCacheableSignalKeyStore.mockReset().mockReturnValue({})
    mockFsMkdir.mockReset().mockResolvedValue(undefined)
    mockFsReaddir.mockReset().mockResolvedValue([])
    mockFsUnlink.mockReset().mockResolvedValue(undefined)

    // Re-import after resetModules() to get a fresh singleton.
    const { default: WhatsAppManager } = await import('../main/whatsapp')
    wa = WhatsAppManager.getInstance()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Case 1: QR event ─────────────────────────────────────────────────────────

  it('1: QR present in connection.update → status qr_pending + qr event fired', async () => {
    await wa.start()

    const qrHandler = vi.fn()
    wa.on('qr', qrHandler)

    sock.ev.emit('connection.update', { qr: 'fake-qr-string' })

    expect(wa.getStatus()).toBe('qr_pending')
    expect(wa.getCurrentQR()).toBe('fake-qr-string')
    expect(qrHandler).toHaveBeenCalledOnce()
    expect(qrHandler).toHaveBeenCalledWith('fake-qr-string')
  })

  // ── Case 2: Connection open ───────────────────────────────────────────────────

  it('2: connection=open → status connected, hasConnectedOnce=true, connected event fired', async () => {
    await wa.start()

    const connectedHandler = vi.fn()
    wa.on('connected', connectedHandler)

    sock.ev.emit('connection.update', { connection: 'open' })

    expect(wa.getStatus()).toBe('connected')
    expect(wa.isConnected()).toBe(true)
    expect(wa.getCurrentQR()).toBeNull()
    expect(connectedHandler).toHaveBeenCalledOnce()
    expect(wa.hasConnectedOnce).toBe(true)
  })

  // ── Case 3: Pre-connect close with a recognisable transient code ──────────────
  //   connectionClosed (428) is a recoverable code. Before hasConnectedOnce the
  //   manager retries silently with an 800 ms initial backoff.

  it('3: pre-connect close (recoverable code 428) → silent 800 ms retry, no disconnected event', async () => {
    await wa.start()

    const disconnectedHandler = vi.fn()
    wa.on('disconnected', disconnectedHandler)

    sock.ev.emit('connection.update', closeUpdate(428))

    // Status changes to disconnected internally but the 'disconnected' event
    // must NOT be emitted — the QR screen should show nothing.
    expect(wa.getStatus()).toBe('disconnected')
    expect(disconnectedHandler).not.toHaveBeenCalled()

    // A retry timer must have been scheduled.
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    // Advance 800 ms — start() fires again → second makeWASocket call.
    const sock2 = makeSocket()
    mockMakeWASocket.mockReturnValueOnce(sock2)
    await vi.advanceTimersByTimeAsync(800)
    expect(mockMakeWASocket).toHaveBeenCalledTimes(2)
  })

  // ── Case 4: Pre-connect close with an unknown / non-standard status code ──────
  //   Post-QR-blink-fix (commit aee2ab7): ALL pre-first-connect closes are
  //   retried silently regardless of status code. Unknown codes no longer emit
  //   'disconnected' or flash a failure banner on the QR screen.

  it('4: pre-connect close (unknown code 999) → also silently retried, no disconnected event', async () => {
    await wa.start()

    const disconnectedHandler = vi.fn()
    wa.on('disconnected', disconnectedHandler)

    sock.ev.emit('connection.update', closeUpdate(999))

    expect(wa.getStatus()).toBe('disconnected')
    expect(disconnectedHandler).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    // Advance 800 ms — retry fires.
    const sock2 = makeSocket()
    mockMakeWASocket.mockReturnValueOnce(sock2)
    await vi.advanceTimersByTimeAsync(800)
    expect(mockMakeWASocket).toHaveBeenCalledTimes(2)
  })

  // ── Case 5: Close after a successful connect ──────────────────────────────────

  it('5: close after successful connect → disconnected event emitted, reconnect at 3 s', async () => {
    await wa.start()

    // Establish the first connection.
    sock.ev.emit('connection.update', { connection: 'open' })
    expect(wa.hasConnectedOnce).toBe(true)

    const disconnectedHandler = vi.fn()
    wa.on('disconnected', disconnectedHandler)

    // Prepare the socket the reconnect will create before advancing timers.
    const sock2 = makeSocket()
    mockMakeWASocket.mockReturnValueOnce(sock2)

    sock.ev.emit('connection.update', closeUpdate(428))

    // 'disconnected' fires synchronously inside the handler.
    expect(disconnectedHandler).toHaveBeenCalledOnce()
    expect(disconnectedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ loggedOut: false }),
    )
    expect(wa.getStatus()).toBe('disconnected')

    // Advance 3 s — reconnect timer fires → start() → second makeWASocket call.
    await vi.advanceTimersByTimeAsync(3000)
    expect(mockMakeWASocket).toHaveBeenCalledTimes(2)
  })

  // ── Case 6: loggedOut close ───────────────────────────────────────────────────

  it('6: loggedOut close → disconnected{loggedOut:true} emitted, clearAuth() called, no reconnect', async () => {
    await wa.start()

    // A prior successful connection makes this scenario realistic.
    sock.ev.emit('connection.update', { connection: 'open' })

    const disconnectedHandler = vi.fn()
    wa.on('disconnected', disconnectedHandler)

    // statusCode 401 = DisconnectReason.loggedOut as set in our mock.
    sock.ev.emit('connection.update', closeUpdate(401))

    // 'disconnected' fires before the async clearAuth() suspends on await.
    expect(disconnectedHandler).toHaveBeenCalledOnce()
    expect(disconnectedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ loggedOut: true }),
    )

    // Flush microtasks so clearAuth() can complete.
    await flushMicrotasks()

    expect(mockFsReaddir).toHaveBeenCalled()

    // No reconnect timer should be pending after flushing.
    await vi.runAllTimersAsync()
    expect(mockMakeWASocket).toHaveBeenCalledTimes(1) // only the original start()
  })

  // ── Case 7: Retry budget exhausted (MAV-172) ──────────────────────────────────
  //   The production code currently emits disconnected{exhausted:true} after 8
  //   failed attempts. MAV-172 will add a dedicated 'connection-failed' event.
  //   The test is left as todo until that event lands.

  it.todo(
    '7: retry budget exhausted → connection-failed event emitted, no further retries (MAV-172)',
  )

  // ── Case 8: waitForStore resolves immediately when storeReady = true ──────────

  it('8: waitForStore resolves immediately when storeReady is already true', async () => {
    await wa.start()

    // Trigger the internal chats.set handler so storeReady becomes true.
    sock.ev.emit('chats.set', { chats: [{ id: 'chat1@s.whatsapp.net' }] })
    expect(wa.storeReady).toBe(true)

    let resolved = false
    await wa.waitForStore().then(() => { resolved = true })

    expect(resolved).toBe(true)
  })

  // ── Case 9: waitForStore resolves after store-ready event fires ───────────────

  it('9: waitForStore resolves after store-ready event fires', async () => {
    await wa.start()

    // Store is NOT ready yet.
    expect(wa.storeReady).toBe(false)

    let resolved = false
    const waitPromise = wa.waitForStore().then(() => { resolved = true })

    // Still pending.
    await flushMicrotasks()
    expect(resolved).toBe(false)

    // Fire chats.set → manager emits 'store-ready' → waitForStore resolves.
    sock.ev.emit('chats.set', { chats: [] })

    await waitPromise
    expect(resolved).toBe(true)
  })

  // ── Case 10: waitForStore resolves after timeout ──────────────────────────────

  it('10: waitForStore resolves after timeout when store never arrives (warning logged)', async () => {
    await wa.start()

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let resolved = false
    const waitPromise = wa.waitForStore(2000).then(() => { resolved = true })

    // Still pending before the timeout.
    await flushMicrotasks()
    expect(resolved).toBe(false)

    // Advance past the 2 s timeout.
    await vi.advanceTimersByTimeAsync(2001)
    await waitPromise

    expect(resolved).toBe(true)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('waitForStore timed out'),
    )

    warnSpy.mockRestore()
  })

  // ── Case 11: disconnect() resets all lifecycle flags ─────────────────────────

  it('11: disconnect() resets hasConnectedOnce, storeReady, currentQR to clean state', async () => {
    await wa.start()

    // Build up state: connected once, store ready, QR set.
    sock.ev.emit('connection.update', { connection: 'open' })
    sock.ev.emit('connection.update', { qr: 'leftover-qr' })
    sock.ev.emit('chats.set', { chats: [{ id: 'chat@s.whatsapp.net' }] })
    await flushMicrotasks()

    expect(wa.hasConnectedOnce).toBe(true)
    expect(wa.storeReady).toBe(true)
    expect(wa.getCurrentQR()).toBe('leftover-qr')

    await wa.disconnect()

    expect(wa.hasConnectedOnce).toBe(false)
    expect(wa.storeReady).toBe(false)
    expect(wa.getCurrentQR()).toBeNull()
    expect(wa.getStatus()).toBe('disconnected')
  })
})
