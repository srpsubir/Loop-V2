import { app, shell, BrowserWindow, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import Scanner from './scanner'
import { initAnalytics, track, shutdownAnalytics } from './analytics'

initAnalytics()

// Allow loop-file:// to serve local filesystem paths for photos
protocol.registerSchemesAsPrivileged([
  { scheme: 'loop-file', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } },
])

let mainWindow: BrowserWindow | null = null

function getWindow(): BrowserWindow | null {
  return mainWindow
}

async function createWindow(): Promise<void> {
  if (process.platform === 'darwin' && is.dev) {
    app.dock.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F9F5EE',
    title: 'Loop',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
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
  protocol.handle('loop-file', (request) => {
    const path = decodeURIComponent(request.url.slice('loop-file://'.length))
    return net.fetch('file://' + path)
  })

  electronApp.setAppUserModelId('com.loop.app')
  app.setName('Loop')

  track('app_opened', { version: app.getVersion(), platform: process.platform })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAllHandlers(getWindow)

  await createWindow()

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
