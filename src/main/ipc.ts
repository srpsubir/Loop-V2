import { BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { readState, patchState, listContacts, saveContact, deleteContact, LOOP_DIR, STATE_FILE, CONTACTS_DIR } from './store'
import WhatsAppManager from './whatsapp'
import Scanner, { registerScanHandlers } from './scanner'
import { registerPhotosHandlers } from './photos'
import { track } from './analytics'
import { scoreGroups, clustersToCandidates } from './chapters'
import type { AppState, Contact, Chapter, InviteCode, Story } from '../shared/types'

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

    // DIAGNOSTIC — remove after chat store audit
    try {
      const sock = (wa as any).socket as any
      const allChats: any[] = sock?.chats?.all?.() ?? []

      const groups = allChats.filter((c: any) => c.id?.endsWith('@g.us'))
      const dms = allChats.filter((c: any) => !c.id?.endsWith('@g.us') && !c.id?.endsWith('@newsletter'))

      const byYear: Record<number, number> = {}
      for (const c of allChats) {
        const ts = Number(c.conversationTimestamp ?? 0)
        if (!ts) continue
        const year = new Date(ts * 1000).getFullYear()
        byYear[year] = (byYear[year] ?? 0) + 1
      }

      const sorted = [...allChats]
        .filter((c: any) => Number(c.conversationTimestamp ?? 0) > 0)
        .sort((a: any, b: any) => Number(a.conversationTimestamp) - Number(b.conversationTimestamp))

      const oldest5 = sorted.slice(0, 5).map((c: any) => ({
        date: new Date(Number(c.conversationTimestamp) * 1000).toISOString().slice(0, 10),
        id: c.id,
        name: c.name ?? c.id,
        isGroup: c.id?.endsWith('@g.us'),
      }))

      const nowSec = Date.now() / 1000
      const dmsOlderThan2yr = dms.filter((c: any) => (nowSec - Number(c.conversationTimestamp ?? 0)) > 2 * 365 * 86400).length
      const dmsOlderThan5yr = dms.filter((c: any) => (nowSec - Number(c.conversationTimestamp ?? 0)) > 5 * 365 * 86400).length

      console.log('\n[DIAG] ── Chat store contents ──────────────────────────')
      console.log(`  Total chats : ${allChats.length}`)
      console.log(`  Groups      : ${groups.length}`)
      console.log(`  DMs         : ${dms.length}`)
      console.log('\n  By year (conversationTimestamp):')
      for (const year of Object.keys(byYear).sort()) {
        console.log(`    ${year}: ${byYear[Number(year)]} chats`)
      }
      console.log('\n  Oldest 5 chats:')
      for (const c of oldest5) {
        console.log(`    [${c.date}] ${c.isGroup ? 'Group' : 'DM'}: ${c.name}`)
      }
      console.log(`\n  DMs older than 2 years : ${dmsOlderThan2yr}`)
      console.log(`  DMs older than 5 years : ${dmsOlderThan5yr}`)
      console.log('[DIAG] ──────────────────────────────────────────────────\n')
    } catch (e) {
      console.warn('[DIAG] Chat store read failed:', e)
    }
    // END DIAGNOSTIC
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
    const { clusters, groups } = await wa.buildContactClusters()
    const { top, rest } = clustersToCandidates(clusters, groups)
    await patchState({ detectedChapters: top, pendingChapters: rest })
    track('chapters_detected', {
      count_shown: top.length,
      count_total: top.length + rest.length,
      used_clusters: clusters.length >= 3,
      cluster_count: clusters.length,
    })
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
      confirmed: false,
    }))

    await patchState({
      chapters: [...state.chapters, ...newChapters],
      chapterDetectionComplete: true,
    })
    track('chapters_confirmed', { count: confirmed.length })
    getWindow()?.webContents.send('state:changed')
  })

  ipcMain.handle('chapters:setName', async (_e, chapterId: string, name: string) => {
    const state = await readState()
    const chapters = state.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, name, confirmed: true } : ch
    )
    await patchState({ chapters })
    getWindow()?.webContents.send('state:changed')
  })

  // ── Scan ─────────────────────────────────────────────────────────────────

  registerScanHandlers(getWindow)

  // ── Story ─────────────────────────────────────────────────────────────────

  ipcMain.handle('story:open', async (_e, contactId: string): Promise<Story | null> => {
    const state = await readState()
    const cs = state.contacts[contactId]
    if (!cs) return null

    await patchState({
      contacts: {
        ...state.contacts,
        [contactId]: { ...cs, storyOpenedAt: new Date().toISOString() },
      },
    })

    return cs.story ?? null
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

  // ── Invite codes ─────────────────────────────────────────────────────────────

  function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return 'LOOP-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  ipcMain.handle('invite:generate', async (): Promise<InviteCode[]> => {
    const state = await readState()
    if (state.inviteCodes && state.inviteCodes.length > 0) return state.inviteCodes
    const codes: InviteCode[] = [generateCode(), generateCode(), generateCode()].map((code) => ({ code }))
    await patchState({ inviteCodes: codes })
    return codes
  })

  ipcMain.handle('invite:redeem', async (_e, code: string): Promise<boolean> => {
    const upper = code.toUpperCase().trim()
    try {
      const res = await fetch('https://srpsubir.app.n8n.cloud/webhook/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: upper }),
      })
      const json = await res.json() as { valid: boolean }
      return json.valid
    } catch {
      return /^LOOP-[A-Z0-9]{5}$/.test(upper)
    }
  })

  // ── Shell: open external URL ──────────────────────────────────────────────

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    await shell.openExternal(url)
  })

  // ── Analytics bridge ──────────────────────────────────────────────────────

  ipcMain.handle('analytics:track', (_e, event: string, properties?: Record<string, unknown>) => {
    track(event, properties)
  })

  // ── Photos ────────────────────────────────────────────────────────────────

  registerPhotosHandlers()

}
