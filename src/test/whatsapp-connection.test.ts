/**
 * MAV-171, ported to whatsmeow (MAV-265): WhatsApp connection lifecycle —
 * failure-path test suite.
 *
 * Covers: QR emission, connection open, pre-connect sidecar-process exits
 * (silent retry), post-connect exits (circuit-breaker reconnect), logged-out,
 * retry-budget exhaustion (both pre- and post-connect), and disconnect()
 * state reset.
 *
 * The Go sidecar itself is mocked entirely via a fake child_process — no
 * real process is spawned. Two independent triggers exist now, unlike
 * Baileys' single socket-close event: (1) a `connection-update` event over
 * the sidecar's stdout (handled directly via handleSidecarLine(), since
 * these tests never route through the real stdout/readline stream) and (2)
 * the sidecar OS *process* itself exiting (simulated via the mock child's
 * real 'exit' event — whatsapp.ts attaches this listener directly to the
 * child, not via readline, so no stream plumbing is needed for it either).
 *
 * MAV-265 note: the pre-migration suite also covered `waitForStore()` /
 * `storeReady` — those do not exist anywhere in the current WhatsAppManager
 * (confirmed by reading the full class) and are not part of this migration's
 * scope to reintroduce; they are omitted here as obsolete, not silently
 * dropped from coverage of something still real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockSidecarProcess, type MockSidecarProcess } from './mocks/sidecarProcess'

const mockSpawn = vi.fn()
const mockFsMkdir = vi.fn()
const mockFsReaddir = vi.fn()
const mockFsUnlink = vi.fn()
const mockFsRm = vi.fn()

vi.mock('child_process', () => ({ spawn: mockSpawn, default: { spawn: mockSpawn } }))

vi.mock('fs', () => {
  const promises = {
    mkdir: mockFsMkdir,
    readdir: mockFsReaddir,
    unlink: mockFsUnlink,
    rm: mockFsRm,
  }
  return { default: { promises }, promises }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dispatch(wa: any, event: string, payload: any = {}): void {
  wa.handleSidecarLine(JSON.stringify({ v: 1, type: 'event', event, payload }))
}

/** Flush pending microtasks — used for fire-and-forget async work (e.g. clearWhatsmeowSession()'s .catch()). */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('WhatsApp connection lifecycle', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wa: any
  let proc: MockSidecarProcess

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()

    mockSpawn.mockReset()
    proc = createMockSidecarProcess()
    mockSpawn.mockReturnValue(proc)
    mockFsMkdir.mockReset().mockResolvedValue(undefined)
    mockFsReaddir.mockReset().mockResolvedValue([])
    mockFsUnlink.mockReset().mockResolvedValue(undefined)
    mockFsRm.mockReset().mockResolvedValue(undefined)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    wa = WhatsAppManager.getInstance()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Case 1: QR event ─────────────────────────────────────────────────────

  it('1: qr event → status qr_pending + qr event fired', async () => {
    await wa.start()

    const qrHandler = vi.fn()
    wa.on('qr', qrHandler)

    dispatch(wa, 'qr', { code: 'fake-qr-string' })

    expect(wa.getStatus()).toBe('qr_pending')
    expect(wa.getCurrentQR()).toBe('fake-qr-string')
    expect(qrHandler).toHaveBeenCalledOnce()
    expect(qrHandler).toHaveBeenCalledWith('fake-qr-string')
  })

  // ── Case 2: Connection open ───────────────────────────────────────────────

  it('2: connection-update:connected → status connected, hasConnectedOnce=true, connected event fired', async () => {
    await wa.start()

    const connectedHandler = vi.fn()
    wa.on('connected', connectedHandler)

    dispatch(wa, 'connection-update', { state: 'connected' })

    expect(wa.getStatus()).toBe('connected')
    expect(wa.isConnected()).toBe(true)
    expect(wa.getCurrentQR()).toBeNull()
    expect(connectedHandler).toHaveBeenCalledOnce()
    expect(wa.hasConnectedOnce).toBe(true)
  })

  // ── Case 3: Sidecar process exits before ever connecting ──────────────────
  //   Mirrors Baileys' old "pre-connect close" behavior, but the trigger is
  //   now the OS process dying, not a connection.update close event — the
  //   sidecar's whatsmeow client handles transient connection drops
  //   internally without exiting (design.md Section 3).

  it('3: sidecar exits pre-connect → silent 800 ms retry, status disconnected (no connection-failed event)', async () => {
    await wa.start()
    expect(mockSpawn).toHaveBeenCalledTimes(1)

    const failedHandler = vi.fn()
    wa.on('connection-failed', failedHandler)

    const proc2 = createMockSidecarProcess()
    mockSpawn.mockReturnValueOnce(proc2)

    proc.emit('exit', 1, null)

    expect(wa.getStatus()).toBe('disconnected')
    expect(failedHandler).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    await vi.advanceTimersByTimeAsync(800)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
  })

  // ── Case 4: Pre-connect retry budget exhausted ─────────────────────────────

  it('4: pre-connect retry budget exhausted → connection-failed event, status failed, no further retries', async () => {
    await wa.start()

    const failedHandler = vi.fn()
    wa.on('connection-failed', failedHandler)

    // Jump straight to the boundary (MAX_RECONNECT_ATTEMPTS = 8) rather than
    // looping 9 real exit/backoff cycles — the interesting behavior is what
    // happens exactly at exhaustion, not re-deriving the backoff curve.
    wa.reconnectAttempts = 8

    proc.emit('exit', 1, null)

    expect(failedHandler).toHaveBeenCalledOnce()
    expect(failedHandler).toHaveBeenCalledWith({ reason: 'exhausted' })
    expect(wa.getStatus()).toBe('failed')

    const callCount = mockSpawn.mock.calls.length
    await vi.runAllTimersAsync()
    expect(mockSpawn.mock.calls.length).toBe(callCount)
  })

  // ── Case 5: Sidecar exits after a successful connect ───────────────────────

  it('5: sidecar exits post-connect → reconnecting status + event emitted, respawn at 800 ms', async () => {
    await wa.start()
    dispatch(wa, 'connection-update', { state: 'connected' })
    expect(wa.hasConnectedOnce).toBe(true)

    const reconnectingHandler = vi.fn()
    wa.on('reconnecting', reconnectingHandler)

    const proc2 = createMockSidecarProcess()
    mockSpawn.mockReturnValueOnce(proc2)

    proc.emit('exit', 1, null)

    expect(reconnectingHandler).toHaveBeenCalledOnce()
    expect(reconnectingHandler).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, max: 3 }),
    )
    expect(wa.getStatus()).toBe('reconnecting')

    await vi.advanceTimersByTimeAsync(800)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
  })

  // ── Case 6: logged-out connection-update ───────────────────────────────────

  it('6: connection-update:logged-out → logged_out status + logged-out event, clears whatsmeow session, no reconnect', async () => {
    await wa.start()
    dispatch(wa, 'connection-update', { state: 'connected' })

    const loggedOutHandler = vi.fn()
    wa.on('logged-out', loggedOutHandler)

    dispatch(wa, 'connection-update', { state: 'logged-out' })

    expect(loggedOutHandler).toHaveBeenCalledOnce()
    expect(wa.getStatus()).toBe('logged_out')

    // clearWhatsmeowSession() is fire-and-forget (.catch(() => {})) — flush
    // its sequential unlink(main/-wal/-shm) awaits.
    await flushMicrotasks()
    expect(mockFsUnlink).toHaveBeenCalled()

    // logged-out is a connection-update event, not a process exit — it never
    // touches handleSidecarExit()'s reconnect machinery, so no timer/respawn.
    await vi.runAllTimersAsync()
    expect(mockSpawn).toHaveBeenCalledTimes(1) // only the original start()
  })

  // ── Case 7: Post-connect retry budget exhausted (circuit breaker) ─────────

  it('7: post-connect retry budget exhausted → connection-failed event, no further retries', async () => {
    await wa.start()
    dispatch(wa, 'connection-update', { state: 'connected' })

    const failedHandler = vi.fn()
    wa.on('connection-failed', failedHandler)

    // CIRCUIT_BREAKER_BACKOFF = [800, 2000, 5000] — 3 retries allowed.
    let current = proc
    for (let i = 0; i < 3; i++) {
      const next = createMockSidecarProcess()
      mockSpawn.mockReturnValueOnce(next)
      current.emit('exit', 1, null)
      await vi.advanceTimersByTimeAsync(10_000)
      current = next
    }

    // 4th exit hits reconnectAttempts >= MAX_CIRCUIT_BREAKER_RETRIES → exhausted.
    current.emit('exit', 1, null)
    await flushMicrotasks()

    expect(failedHandler).toHaveBeenCalledOnce()
    expect(wa.getStatus()).toBe('failed')

    const callCount = mockSpawn.mock.calls.length
    await vi.runAllTimersAsync()
    expect(mockSpawn.mock.calls.length).toBe(callCount)
  })

  // ── Case 8: connect-failure connection-update ──────────────────────────────
  //   No whatsmeow/sidecar equivalent to Baileys' distinction between
  //   "recoverable" vs. "unknown" close codes (that whole class of Baileys-
  //   specific status-code plumbing — the QR-blink fix from aee2ab7 — has no
  //   analogue: the sidecar only ever reports a small fixed set of named
  //   connection-update states). This covers the one failure state whatsmeow
  //   does surface explicitly.

  it('8: connection-update:connect-failure → protocol_error status + protocol-error event', async () => {
    await wa.start()

    const protocolErrorHandler = vi.fn()
    wa.on('protocol-error', protocolErrorHandler)

    dispatch(wa, 'connection-update', { state: 'connect-failure', reason: 'stream-error' })

    expect(wa.getStatus()).toBe('protocol_error')
    expect(protocolErrorHandler).toHaveBeenCalledWith({ reason: 'stream-error' })
    expect(wa.isConnected()).toBe(false)
  })

  // ── Case 9: disconnect() resets lifecycle flags ────────────────────────────

  it('9: disconnect() resets hasConnectedOnce and currentQR to a clean state', async () => {
    await wa.start()

    dispatch(wa, 'connection-update', { state: 'connected' })
    dispatch(wa, 'qr', { code: 'leftover-qr' })

    expect(wa.hasConnectedOnce).toBe(true)
    expect(wa.getCurrentQR()).toBe('leftover-qr')

    // disconnect() waits 1500ms (a real setTimeout) for the sidecar's
    // whatsmeow Client.Logout() to run before killing the process — must
    // advance fake timers concurrently or the awaited promise never settles.
    const disconnectPromise = wa.disconnect()
    await vi.advanceTimersByTimeAsync(1500)
    await disconnectPromise

    expect(wa.hasConnectedOnce).toBe(false)
    expect(wa.getCurrentQR()).toBeNull()
    expect(wa.getStatus()).toBe('disconnected')
  })
})
