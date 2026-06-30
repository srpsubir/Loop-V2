import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import type { BrowserWindow } from 'electron'

export function initAutoUpdater(getWindow: () => BrowserWindow | null): void {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const send = (channel: string, payload?: unknown): void => {
    getWindow()?.webContents.send(channel, payload)
  }

  autoUpdater.on('checking-for-update', () => send('update:checking'))
  autoUpdater.on('update-available', (info) => send('update:available', { version: info.version }))
  autoUpdater.on('update-not-available', () => send('update:not-available'))
  autoUpdater.on('download-progress', (p) => send('update:downloading', { percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => send('update:ready', { version: info.version }))
  autoUpdater.on('error', (err) => send('update:error', { message: err.message }))

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[updater] check failed:', err)
    })
  }, 60_000)
}

export function installUpdateNow(): void {
  autoUpdater.quitAndInstall()
}
