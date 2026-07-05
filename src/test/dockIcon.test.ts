import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Track whenReady resolution ───────────────────────────────────────────────

let resolveWhenReady: () => void
const whenReadyPromise = () =>
  new Promise<void>((resolve) => {
    resolveWhenReady = resolve
  })

const setIconMock = vi.fn()
const setNameMock = vi.fn()

vi.mock('electron', () => ({
  app: {
    dock: { setIcon: setIconMock },
    whenReady: whenReadyPromise,
    on: vi.fn(),
    setName: setNameMock,
    getVersion: () => '0.1.0',
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
  },
  BrowserWindow: class {
    on = vi.fn()
    loadURL = vi.fn()
    loadFile = vi.fn()
    webContents = { setWindowOpenHandler: vi.fn(), send: vi.fn() }
    static getAllWindows = () => []
  },
  shell: { openExternal: vi.fn() },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() },
  net: { fetch: vi.fn() },
  default: {},
}))

// Stub everything index.ts pulls in so the import doesn't blow up
vi.mock('../main/analytics', () => ({
  initAnalytics: vi.fn(),
  initSentry: vi.fn(),
  track: vi.fn(),
  shutdownAnalytics: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../main/ipc', () => ({ registerAllHandlers: vi.fn() }))
vi.mock('../main/scanner', () => ({
  default: {
    getInstance: () => ({ init: vi.fn(), maybeRunOnLaunch: vi.fn().mockResolvedValue(undefined) }),
  },
}))
vi.mock('@electron-toolkit/utils', () => ({
  electronApp: { setAppUserModelId: vi.fn() },
  optimizer: { watchWindowShortcuts: vi.fn() },
  is: { dev: true },
}))

describe('dock icon', () => {
  beforeEach(() => {
    setIconMock.mockClear()
    setNameMock.mockClear()
    vi.resetModules()
  })

  it('sets the dock icon synchronously before whenReady resolves', async () => {
    // Import index — this runs module-level code synchronously
    await import('../main/index')

    // setIcon and setName must already be called — whenReady has NOT resolved yet
    expect(setIconMock).toHaveBeenCalledTimes(1)
    expect(setIconMock.mock.calls[0][0]).toMatch(/resources\/icon\.png$/)
    expect(setNameMock).toHaveBeenCalledWith('Loop')

    // Resolve whenReady so the process doesn't hang
    resolveWhenReady()
  })
})
