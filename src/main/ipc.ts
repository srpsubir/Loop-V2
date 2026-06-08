import { BrowserWindow, ipcMain, shell } from 'electron'
import { readState, patchState, listContacts, saveContact, deleteContact } from './store'
import ClaudeClient from './claude'
import WhatsAppManager from './whatsapp'
import Scanner, { registerScanHandlers } from './scanner'
import { registerPhotosHandlers } from './photos'
import type { AppState, Contact } from '../shared/types'

export function registerAllHandlers(getWindow: () => BrowserWindow | null): void {
  // ── State ─────────────────────────────────────────────────────────────────

  ipcMain.handle('state:get', async (): Promise<AppState> => {
    return readState()
  })

  ipcMain.handle('state:patch', async (_e, patch: Partial<AppState>): Promise<AppState> => {
    const next = await patchState(patch)
    getWindow()?.webContents.send('state:changed')
    return next
  })

  // ── Contacts ─────────────────────────────────────────────────────────────

  ipcMain.handle('contacts:list', async (): Promise<Contact[]> => {
    return listContacts()
  })

  ipcMain.handle('contacts:save', async (_e, contact: Contact): Promise<Contact> => {
    return saveContact(contact)
  })

  ipcMain.handle('contacts:delete', async (_e, id: string): Promise<void> => {
    return deleteContact(id)
  })

  // ── WhatsApp ──────────────────────────────────────────────────────────────

  const wa = WhatsAppManager.getInstance()

  wa.on('qr', (qr: string) => {
    getWindow()?.webContents.send('whatsapp:qr', qr)
  })

  wa.on('connected', async () => {
    getWindow()?.webContents.send('whatsapp:connected')
    await patchState({ whatsappConnected: true })
    getWindow()?.webContents.send('state:changed')
    // Trigger scan after connecting
    Scanner.getInstance().run().catch(console.error)
  })

  wa.on('disconnected', async () => {
    await patchState({ whatsappConnected: false })
    getWindow()?.webContents.send('state:changed')
  })

  ipcMain.handle('whatsapp:start', async () => {
    await wa.start()
    return wa.getStatus()
  })

  ipcMain.handle('whatsapp:status', async () => ({
    status: wa.getStatus(),
    qr: wa.getCurrentQR(),
  }))

  ipcMain.handle('whatsapp:disconnect', async () => {
    await wa.disconnect()
    await patchState({ whatsappConnected: false })
    getWindow()?.webContents.send('state:changed')
  })

  ipcMain.handle('whatsapp:listGroups', async () => {
    return wa.listGroups()
  })

  // ── Scan ─────────────────────────────────────────────────────────────────

  registerScanHandlers(getWindow)

  // ── Claude ────────────────────────────────────────────────────────────────

  ipcMain.handle('claude:ask', async (_e, system: string, user: string): Promise<string> => {
    return ClaudeClient.getInstance().ask(system, user)
  })

  // ── Brief ─────────────────────────────────────────────────────────────────

  ipcMain.handle('brief:open', async (_e, contactId: string) => {
    const state = await readState()
    const cs = state.contacts[contactId]
    if (!cs) return null

    // Stamp open time for reach-out detection on next scan
    await patchState({
      contacts: {
        ...state.contacts,
        [contactId]: { ...cs, briefOpenedAt: new Date().toISOString() },
      },
    })

    return cs.brief
  })

  // ── Shell ─────────────────────────────────────────────────────────────────

  ipcMain.handle('shell:openWhatsApp', async (_e, whatsappId: string) => {
    // Strip @s.whatsapp.net suffix and any country code formatting
    const phone = whatsappId.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    await shell.openExternal(`https://wa.me/${phone}`)
  })

  // ── Photos ────────────────────────────────────────────────────────────────

  registerPhotosHandlers()
}
