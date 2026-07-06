import { BrowserWindow, ipcMain, shell, app } from 'electron'
import { installUpdateNow } from './updater'
import * as path from 'path'
import * as fs from 'fs'
import { readState, patchState, listContacts, saveContact, deleteContact, LOOP_DIR, STATE_FILE, CONTACTS_DIR } from './store'
import WhatsAppManager from './whatsapp'
import Scanner, { registerScanHandlers } from './scanner'
import { registerPhotosHandlers } from './photos'
import { track, initAnalytics, initSentry } from './analytics'
import { scoreGroups, clustersToCandidates } from './chapters'
import type { AppState, Contact, Chapter, Story } from '../shared/types'

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

  let lastFailureTime = 0

  wa.on('connection-failed', ({ statusCode, reason }: { statusCode?: number; reason?: string } = {}) => {
    lastFailureTime = Date.now()
    getWindow()?.webContents.send('whatsapp:connection-failed', { statusCode, reason })
    track('whatsapp_connection_failed', { status_code: statusCode, reason })
  })

  wa.on('reconnecting', ({ attempt, max }: { attempt: number; max: number }) => {
    getWindow()?.webContents.send('whatsapp:reconnecting', { attempt, max })
  })

  wa.on('logged-out', () => {
    getWindow()?.webContents.send('whatsapp:logged-out')
  })

  wa.on('protocol-error', ({ reason }: { reason?: string }) => {
    getWindow()?.webContents.send('whatsapp:protocol-error', { reason })
  })

  app.on('browser-window-focus', () => {
    const status = wa.getStatus()
    if (status === 'failed' && Date.now() - lastFailureTime >= 5 * 60 * 1000) {
      ;(wa as any).retry().catch(console.error)
    }
  })

  wa.on('disconnected', async ({ statusCode, loggedOut }: { statusCode?: number; loggedOut?: boolean } = {}) => {
    try {
      // Read current state before patching — a loggedOut event must never reset
      // onboardingComplete or chapters, only flip whatsappConnected.
      await patchState({ whatsappConnected: false })
    } catch (err) {
      console.error('[ipc] Failed to patch state on disconnect:', err)
    }
    getWindow()?.webContents.send('state:changed')
    getWindow()?.webContents.send('whatsapp:disconnected', { loggedOut: loggedOut ?? false })
    track('whatsapp_disconnected', { status_code: statusCode, logged_out: loggedOut })
  })

  ipcMain.handle('whatsapp:retry', async (): Promise<void> => {
    await (wa as any).retry()
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

  let detecting = false
  ipcMain.handle('chapters:detect', async () => {
    if (detecting) return []
    detecting = true
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('chapters:detect timed out after 30s')), 30_000)
      )
      const { clusters, groups } = await Promise.race([wa.buildContactClusters(), timeout])
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
    } finally {
      detecting = false
    }
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

    const existingIds = new Set(state.chapters.map((c) => c.id))
    const dedupedChapters = newChapters.filter((c) => !existingIds.has(c.id))
    await patchState({
      chapters: [...state.chapters, ...dedupedChapters],
      chapterDetectionComplete: true,
    })
    track('chapters_confirmed', { count: confirmed.length })
    getWindow()?.webContents.send('state:changed')
  })

  ipcMain.handle('chapters:setName', async (_e, chapterId: string, name: string) => {
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) return
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

  // ── Nudge snooze (MAV-205) ────────────────────────────────────────────────

  ipcMain.handle('nudge:snooze', async (_e, { contactId, days }: { contactId: string; days: number }): Promise<void> => {
    if (!Number.isFinite(days) || days <= 0 || days > 365) return
    const state = await readState()
    const cs = state.contacts[contactId]
    if (!cs) return
    const snoozedUntil = new Date(Date.now() + days * 86400000).toISOString()
    await patchState({
      contacts: {
        ...state.contacts,
        [contactId]: { ...cs, snoozedUntil },
      },
    })
    getWindow()?.webContents.send('state:changed')
  })

  // ── Shell ─────────────────────────────────────────────────────────────────

  ipcMain.handle('shell:openWhatsApp', async (_e, whatsappId: string, contactId?: string) => {
    const phone = whatsappId.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    track('suggestion_acted_on', { action: 'open_whatsapp' })
    // MAV-212: record reach-out timestamp so the contact is gated from nudges for 7 days
    if (contactId) {
      try {
        const state = await readState()
        const cs = state.contacts[contactId]
        if (cs) {
          await patchState({
            contacts: {
              ...state.contacts,
              [contactId]: { ...cs, lastReachOutAt: new Date().toISOString() },
            },
          })
          getWindow()?.webContents.send('state:changed')
        }
      } catch { /* non-fatal — open WhatsApp regardless */ }
    }
    await shell.openExternal(`https://wa.me/${phone}`)
  })

  // ── Data ─────────────────────────────────────────────────────────────────

  ipcMain.handle('data:getDir', () => LOOP_DIR)

  ipcMain.handle('data:deleteAll', async (_e, opts?: { confirmed?: boolean }) => {
    // MAV-178: require explicit confirmation flag — rejects accidental or unauthenticated IPC calls
    if (opts?.confirmed !== true) return

    // Snapshot before deletion so the user can recover manually if needed
    try {
      const backupDir = path.join(LOOP_DIR, 'backups')
      await fs.promises.mkdir(backupDir, { recursive: true })
      const [state, contacts] = await Promise.all([readState(), listContacts()])
      const backup = { timestamp: new Date().toISOString(), state, contacts }
      await fs.promises.writeFile(
        path.join(backupDir, `backup_${Date.now()}.json`),
        JSON.stringify(backup, null, 2)
      )
    } catch { /* backup failure must never block the delete */ }

    try {
      const files = await fs.promises.readdir(CONTACTS_DIR)
      await Promise.all(files.map((f) => fs.promises.unlink(path.join(CONTACTS_DIR, f)).catch(() => {})))
    } catch { /* dir may not exist */ }
    try { await fs.promises.unlink(STATE_FILE) } catch { /* may not exist */ }
    getWindow()?.webContents.reload()
  })

  // ── WhatsApp send (MAV-228) ───────────────────────────────────────────────────

  ipcMain.handle('whatsapp:sendMessage', async (_e, jid: string, text: string, contactId?: string): Promise<{ ok: boolean; error?: string }> => {
    if (typeof jid !== 'string' || !jid.trim()) return { ok: false, error: 'Invalid JID' }
    // Normalise first so we can validate the final form
    const normalisedJid = jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`
    if (!/^\d+@(s\.whatsapp\.net|g\.us)$/.test(normalisedJid)) return { ok: false, error: 'Invalid JID' }
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'Message cannot be empty' }
    if (text.length > 4096) return { ok: false, error: 'Message too long' }
    try {
      await wa.sendMessage(normalisedJid, text)
      if (contactId && typeof contactId === 'string') {
        try {
          const state = await readState()
          const cs = state.contacts[contactId]
          if (cs) {
            await patchState({
              contacts: { ...state.contacts, [contactId]: { ...cs, lastReachOutAt: new Date().toISOString() } },
            })
            getWindow()?.webContents.send('state:changed')
          }
        } catch { /* non-fatal — message was sent */ }
      }
      return { ok: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      // Strip internal details (JIDs, phone numbers) before surfacing to renderer
      const safe = /@|\b\d{7,}\b/.test(msg) ? 'Send failed. Try opening WhatsApp directly.' : msg
      return { ok: false, error: safe }
    }
  })

  // ── Telemetry (MAV-217) ───────────────────────────────────────────────────

  ipcMain.handle('telemetry:setEnabled', async (_e, enabled: boolean): Promise<void> => {
    await patchState({ telemetryEnabled: enabled })
    initSentry(enabled)
    initAnalytics(enabled)
  })

  // ── Account: Google Sign-In (MAV-216) ────────────────────────────────────
  let googleSignInInProgress = false
  ipcMain.handle('account:signInWithGoogle', async (): Promise<{ email: string; googleId: string } | null> => {
    if (googleSignInInProgress) return null
    googleSignInInProgress = true
    try {
      return await _doGoogleSignIn()
    } catch {
      return null
    } finally {
      googleSignInInProgress = false
    }
  })

  async function _doGoogleSignIn(): Promise<{ email: string; googleId: string } | null> {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) return null

    const { randomBytes, createHash } = await import('crypto')
    const http = await import('http')
    const { URLSearchParams } = await import('url')

    // PKCE
    const verifier = randomBytes(48).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')

    // Find a free port in 9000-9999; return null cleanly if all occupied
    let port: number
    try {
      port = await new Promise<number>((resolve, reject) => {
        let attempt = 9000
        const tryPort = () => {
          const s = http.createServer()
          s.listen(attempt, '127.0.0.1', () => {
            const p = (s.address() as { port: number }).port
            s.close(() => resolve(p))
          })
          s.on('error', () => { if (++attempt > 9999) reject(new Error('no free port')); else tryPort() })
        }
        tryPort()
      })
    } catch {
      return null
    }

    const redirectUri = `http://127.0.0.1:${port}`
    const authUrl = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'select_account',
    })

    await shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${authUrl.toString()}`)

    // Wait for callback (5 min timeout)
    const code = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => { server.close(); reject(new Error('OAuth timeout')) }, 5 * 60 * 1000)
      const server = http.createServer((req, res) => {
        const params = new URLSearchParams(req.url?.split('?')[1] ?? '')
        const code = params.get('code')
        const error = params.get('error')
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body style="font-family:sans-serif;padding:40px"><h2>Signed in to Loop.</h2><p>You can close this tab.</p></body></html>')
        clearTimeout(timeout)
        server.close()
        if (code) resolve(code)
        else reject(new Error(error ?? 'no code'))
      })
      server.listen(port, '127.0.0.1')
    })

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }).toString(),
    })
    if (!tokenRes.ok) return null
    const tokens = await tokenRes.json() as { id_token?: string }
    if (!tokens.id_token) return null

    // Decode JWT payload (no signature verification — we trust Google's token endpoint)
    const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()) as {
      sub: string; email: string
    }
    const { sub: googleId, email } = payload
    if (!googleId || !email) return null

    await patchState({ email, googleId, licenseStatus: 'beta' })
    getWindow()?.webContents.send('state:changed')
    return { email, googleId }
  }

  // ── Shell: open external URL ──────────────────────────────────────────────

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (!/^https:\/\//i.test(url)) return
    await shell.openExternal(url)
  })

  // ── Analytics bridge ──────────────────────────────────────────────────────

  const ALLOWED_EVENTS = new Set([
    'app_opened', 'whatsapp_connected', 'whatsapp_disconnected', 'whatsapp_connection_failed',
    'scan_completed', 'chapters_detected', 'chapters_confirmed',
    'onboarding_step_completed', 'nudge_acted_on', 'suggestion_acted_on',
  ])

  ipcMain.handle('analytics:track', (_e, event: string, properties?: Record<string, unknown>) => {
    if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) return
    // Strip non-primitive values — prevents accidental object exfiltration
    const safe = properties
      ? Object.fromEntries(
          Object.entries(properties).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
        )
      : undefined
    track(event, safe)
  })

  // ── Photos ────────────────────────────────────────────────────────────────

  registerPhotosHandlers()

  // ── Auto-update ───────────────────────────────────────────────────────────

  ipcMain.handle('update:install-now', () => installUpdateNow())

}
