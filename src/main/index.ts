import { app, shell, BrowserWindow, protocol, net, Menu } from 'electron'
import { join, resolve, sep } from 'path'
import { promises as fs } from 'fs'
import { homedir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import Scanner from './scanner'
import { initAnalytics, initSentry, track, shutdownAnalytics } from './analytics'
import WhatsAppManager, { AUTH_DIR } from './whatsapp'
import { readState, patchState, LOOP_DIR, migrateLegacyLoopDir } from './store'
import { initAutoUpdater } from './updater'
import { TRAFFIC_LIGHT_POSITION } from '../shared/layout'

/**
 * MAV-192: Guard against stale dev state persisting across installs.
 * If state claims WA is connected but the Baileys auth directory is
 * missing or empty, the session is gone — reset connection flags so
 * the user is sent back through onboarding rather than seeing seed data.
 */
async function validateSessionState(): Promise<void> {
  try {
    const state = await readState()
    if (!state.onboardingComplete && !state.whatsappConnected) return

    // Check whether a real Baileys session exists
    let authFiles: string[] = []
    try {
      authFiles = await fs.readdir(AUTH_DIR)
    } catch {
      // Directory missing entirely
    }

    const hasSession = authFiles.some((f) => f.endsWith('.json') && f !== 'wa-cache.json')

    if (!hasSession && (state.whatsappConnected || state.onboardingComplete)) {
      console.warn('[main] No Baileys session found but state claims connected — resetting onboarding flags')
      await patchState({
        whatsappConnected: false,
        onboardingComplete: false,
        chapterDetectionComplete: false,
      })
    }
  } catch (err) {
    console.error('[main] validateSessionState error (non-fatal):', err)
  }
}

// Registered before initSentry/initAnalytics so startup errors in those paths
// are logged rather than crashing before any handler exists.
process.on('uncaughtException', (err) => {
  const logPath = join(LOOP_DIR, 'crash.log')
  const entry = `[${new Date().toISOString()}] uncaughtException: ${err.stack ?? err.message}\n`
  try {
    require('fs').mkdirSync(LOOP_DIR, { recursive: true })
    require('fs').appendFileSync(logPath, entry)
  } catch { /* best-effort — never let crash logging itself crash the crash handler */ }
  throw err
})

// MAV-252: migrate any legacy ~/Documents/Loop data before anything else
// touches LOOP_DIR (analytics' install-id, Sentry, etc.), so we don't create
// an empty new-location directory that then blocks migration from running.
// Bundled as CJS (no top-level await) — bounded IIFE instead; init calls
// below still run within a few ms in the common (nothing-to-migrate) case.
void (async () => {
  await migrateLegacyLoopDir()
  initSentry()
  initAnalytics()
})()

// Suppress EPIPE errors from stdout/stderr (libsignal writes to a closed pipe on quit)
process.stdout.on('error', (err: NodeJS.ErrnoException) => { if (err.code !== 'EPIPE') throw err })
process.stderr.on('error', (err: NodeJS.ErrnoException) => { if (err.code !== 'EPIPE') throw err })

// MAV-199: Prevent multiple instances — second launch focuses the existing window instead
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Set name and dock icon synchronously — before app.whenReady() to avoid flash
app.setName('Loop')
if (process.platform === 'darwin' && is.dev) {
  app.dock.setIcon(join(__dirname, '../../resources/icon.png'))
}

// Allow loop-file:// to serve local filesystem paths for photos
protocol.registerSchemesAsPrivileged([
  { scheme: 'loop-file', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } },
])

let mainWindow: BrowserWindow | null = null

function getWindow(): BrowserWindow | null {
  return mainWindow
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    // MAV-253: explicit, not left to Electron's undocumented default — see
    // src/shared/layout.ts, which the renderer uses to reserve matching space.
    trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    backgroundColor: '#00000000',
    title: 'Loop',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,         // required: preload uses Node APIs (ipcRenderer)
      contextIsolation: true,
      nodeIntegration: false, // explicit — never allow renderer Node access
    },
  })

  mainWindow.on('ready-to-show', () => {
    if (process.env.LOOP_TEST) {
      mainWindow!.showInactive()
    } else {
      mainWindow!.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https:\/\//i.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Serve local files (photos) via loop-file:// protocol
  // Restricted to allowed roots — prevents renderer reading arbitrary filesystem paths
  const ALLOWED_ROOTS = [
    LOOP_DIR,
    join(homedir(), 'Pictures'),
  ]
  protocol.handle('loop-file', (request) => {
    const raw = decodeURIComponent(request.url.slice('loop-file://'.length))
    const resolved = resolve(raw)
    const allowed = ALLOWED_ROOTS.some((root) => resolved.startsWith(root + sep) || resolved === root)
    if (!allowed) return new Response('Forbidden', { status: 403 })
    return net.fetch('file://' + resolved)
  })

  electronApp.setAppUserModelId('com.loop.app')

  track('app_opened', { version: app.getVersion(), platform: process.platform })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllHandlers(getWindow)

  // macOS application menu with custom "About Loop" item
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: app.getName(),
        submenu: [
          {
            label: 'About Loop',
            click: () => {
              getWindow()?.webContents.executeJavaScript(
                'window.__loop_showAbout && window.__loop_showAbout()'
              )
            },
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]))
  }

  // MAV-192: Validate session before window opens so renderer never sees stale state
  await validateSessionState()

  await createWindow()

  initAutoUpdater(getWindow)

  // Auto-reconnect WhatsApp for returning users — wa.start() is otherwise only
  // called from the WhatsAppConnectScreen, so it never ran on re-launch.
  // Errors are swallowed here: a failed reconnect must never corrupt state.json.
  readState().then((state) => {
    if (state.whatsappConnected) {
      WhatsAppManager.getInstance().start().catch((err) => {
        console.error('[main] WhatsApp auto-reconnect failed (state unchanged):', err)
      })
    }
  }).catch(console.error)

  // Trigger launch scan if WhatsApp is connected and cooldown has elapsed
  Scanner.getInstance().maybeRunOnLaunch().catch(console.error)

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

app.on('before-quit', () => {
  shutdownAnalytics().catch(console.error)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
