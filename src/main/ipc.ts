import { BrowserWindow, ipcMain, shell } from 'electron'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { readState, patchState, listContacts, saveContact, deleteContact, LOOP_DIR, STATE_FILE, CONTACTS_DIR } from './store'
import ClaudeClient from './claude'
import WhatsAppManager from './whatsapp'
import Scanner, { registerScanHandlers } from './scanner'
import { registerPhotosHandlers } from './photos'
import { track } from './analytics'
import { scoreGroups } from './chapters'
import type { AppState, Contact, Chapter } from '../shared/types'

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

  const waConnectStart: { time: number } = { time: 0 }

  wa.on('qr', () => { waConnectStart.time = Date.now() })

  wa.on('connected', async () => {
    getWindow()?.webContents.send('whatsapp:connected')
    await patchState({ whatsappConnected: true })
    getWindow()?.webContents.send('state:changed')
    track('whatsapp_connected', {
      duration_to_connect_ms: waConnectStart.time ? Date.now() - waConnectStart.time : undefined,
    })
    Scanner.getInstance().run().catch(console.error)
  })

  wa.on('disconnected', async ({ statusCode, loggedOut }: { statusCode?: number; loggedOut?: boolean } = {}) => {
    await patchState({ whatsappConnected: false })
    getWindow()?.webContents.send('state:changed')
    getWindow()?.webContents.send('whatsapp:disconnected', { loggedOut: loggedOut ?? false })
    track('whatsapp_disconnected', { status_code: statusCode, logged_out: loggedOut })
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

  // ── Chapter detection ─────────────────────────────────────────────────────

  ipcMain.handle('chapters:detect', async () => {
    const groups = await wa.listGroupsWithMeta()
    const { top, rest } = scoreGroups(groups)
    await patchState({ detectedChapters: top, pendingChapters: rest })
    track('chapters_detected', { count_shown: top.length, count_total: top.length + rest.length })
    getWindow()?.webContents.send('state:changed')
    return top
  })

  ipcMain.handle('chapters:confirm', async (_e, confirmedJids: string[]) => {
    const state = await readState()
    const confirmed = state.detectedChapters.filter((c) => confirmedJids.includes(c.waJid))

    const newChapters: Chapter[] = confirmed.map((c) => ({
      id: c.waJid.replace(/@g\.us$/, '').replace(/[^a-z0-9]+/gi, '-'),
      name: c.name,
      active: c.active,
      startYear: c.inferredStartYear,
      endYear: c.inferredEndYear,
    }))

    await patchState({
      chapters: [...state.chapters, ...newChapters],
      chapterDetectionComplete: true,
    })
    track('chapters_confirmed', { count: confirmed.length })
    getWindow()?.webContents.send('state:changed')
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
    const phone = whatsappId.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    track('suggestion_acted_on', { action: 'open_whatsapp' })
    await shell.openExternal(`https://wa.me/${phone}`)
  })

  // ── Data ─────────────────────────────────────────────────────────────────

  ipcMain.handle('data:getDir', () => LOOP_DIR)

  ipcMain.handle('data:deleteAll', async () => {
    try {
      const files = await fs.promises.readdir(CONTACTS_DIR)
      await Promise.all(files.map((f) => fs.promises.unlink(path.join(CONTACTS_DIR, f)).catch(() => {})))
    } catch { /* dir may not exist */ }
    try { await fs.promises.unlink(STATE_FILE) } catch { /* may not exist */ }
    getWindow()?.webContents.reload()
  })

  // ── Analytics bridge ──────────────────────────────────────────────────────

  ipcMain.handle('analytics:track', (_e, event: string, properties?: Record<string, unknown>) => {
    track(event, properties)
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

    track('reminder_set', { occasion_type: occasionType ?? 'manual' })
    const tmpPath = path.join(os.tmpdir(), `loop-${Date.now()}.ics`)
    await fs.promises.writeFile(tmpPath, ics, 'utf8')
    await shell.openPath(tmpPath)
    // Calendar.app reads the file synchronously on open; clean up after a beat
    setTimeout(() => fs.promises.unlink(tmpPath).catch(() => {}), 3000)
  })
}
