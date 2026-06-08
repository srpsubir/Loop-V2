import { BrowserWindow, ipcMain, shell } from 'electron'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
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

  // ── Calendar ──────────────────────────────────────────────────────────────

  ipcMain.handle('calendar:addEvent', async (_e, payload: {
    contactName: string
    occasionType?: string | null
    occasionDate?: string | null
    reasonToReachOut: string
    contextLine?: string
  }): Promise<void> => {
    const { contactName, occasionType, occasionDate, reasonToReachOut, contextLine } = payload

    // Birthday → use the occasion date at 9am; anything else → next weekday at 10am
    let eventDate: Date
    if (occasionType === 'birthday' && occasionDate) {
      eventDate = new Date(occasionDate)
      eventDate.setHours(9, 0, 0, 0)
    } else {
      eventDate = new Date()
      eventDate.setDate(eventDate.getDate() + 1)
      while (eventDate.getDay() === 0 || eventDate.getDay() === 6) {
        eventDate.setDate(eventDate.getDate() + 1)
      }
      eventDate.setHours(10, 0, 0, 0)
    }

    const endDate = new Date(eventDate.getTime() + 15 * 60 * 1000)

    const title = occasionType === 'birthday'
      ? `${contactName}'s birthday — say something`
      : `Reach out to ${contactName}`

    const notes = [reasonToReachOut, contextLine].filter(Boolean).join('\n\n')

    function formatIcsDate(d: Date): string {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0]
    }

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@loop`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Loop//Loop//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatIcsDate(eventDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${notes.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const tmpPath = path.join(os.tmpdir(), `loop-${Date.now()}.ics`)
    await fs.promises.writeFile(tmpPath, ics, 'utf8')
    await shell.openPath(tmpPath)
    // Calendar.app reads the file synchronously on open; clean up after a beat
    setTimeout(() => fs.promises.unlink(tmpPath).catch(() => {}), 3000)
  })
}
