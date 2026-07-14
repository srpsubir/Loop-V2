import { EventEmitter } from 'events'
import { join } from 'path'
import { promises as fs } from 'fs'
import { LOOP_DIR } from './store'

// MAV-252: lives under LOOP_DIR (Application Support), not ~/Documents/Loop.
export const AUTH_DIR = join(LOOP_DIR, 'whatsapp-auth')

export type WAConnectionStatus = 'disconnected' | 'connecting' | 'qr_pending' | 'connected' | 'reconnecting' | 'failed' | 'logged_out' | 'protocol_error'

export interface ContactCluster {
  contacts: Array<{ jid: string; displayName: string; tieStrength: 'high' | 'medium' | 'low' }>
  sharedGroups: string[]
  bestGroupJid: string
  bestGroupName: string
  eraStart: number        // unix seconds
  eraEnd: number | null   // null = active
  cohesion: number        // 0–1: fraction of contact pairs sharing 2+ groups
}

export interface WAMessage {
  id: string
  fromMe: boolean
  timestamp: number  // unix seconds
  text: string | null
}

// MAV-256: persistent cache for listGroups()'s broad group listing — before
// this, every call re-ran the full rate-limited per-group fetch from scratch,
// even seconds after an identical fetch (e.g. back-to-back onboarding steps).
// Separate from groups-discovered.json (see EVAL_DUMP_PATH below): that file
// is written by the narrower, always-fresh listGroupsWithMeta() candidate set
// used for chapter detection, and mixing the two shapes/filters into one
// cache would make listGroups() silently under-report groups on a hit.
interface CachedGroup {
  id: string
  name: string
  members: string[]
  lastMessageAt: number
  createdAt: number | null
}

interface GroupCacheFile {
  writtenAt: number
  groups: CachedGroup[]
}

const GROUP_CACHE_PATH = join(LOOP_DIR, 'groups-cache.json')
const EVAL_DUMP_PATH = join(LOOP_DIR, 'groups-discovered.json')

// Louvain modularity optimisation (Blondel et al. 2008).
// graph: node → (neighbor → weight). Returns node → communityLabel.
// Maximises Q = fraction of intra-community edges minus random-graph expectation.
// High-cohesion clusters (wedding group 0.93) score high; diffuse scenes (salsa 0.07) get split.
function louvain(graph: Map<string, Map<string, number>>): Map<string, string> {
  const nodes = [...graph.keys()]
  if (nodes.length === 0) return new Map()

  const community = new Map<string, string>(nodes.map(n => [n, n]))

  let m = 0
  for (const neighbors of graph.values()) for (const w of neighbors.values()) m += w
  m /= 2
  if (m === 0) return community

  // ki[n] = sum of edge weights incident to n
  const ki = new Map<string, number>()
  for (const [node, neighbors] of graph) {
    let s = 0; for (const w of neighbors.values()) s += w
    ki.set(node, s)
  }

  // sigTot[comm] = sum of ki for all nodes in comm
  const sigTot = new Map<string, number>()
  for (const [node, comm] of community)
    sigTot.set(comm, (sigTot.get(comm) ?? 0) + (ki.get(node) ?? 0))

  let improved = true
  while (improved) {
    improved = false
    for (const node of nodes) {
      const currComm = community.get(node)!
      const ki_node = ki.get(node) ?? 0

      // Edges from node to current community members (excluding self)
      let ki_in_curr = 0
      for (const [nb, w] of graph.get(node) ?? [])
        if (community.get(nb) === currComm) ki_in_curr += w

      // Temporarily remove node from its community
      sigTot.set(currComm, (sigTot.get(currComm) ?? 0) - ki_node)
      community.set(node, '\x00')

      // k_i,in per candidate community
      const candIn = new Map<string, number>()
      for (const [nb, w] of graph.get(node) ?? []) {
        const nc = community.get(nb)!
        if (nc !== '\x00') candIn.set(nc, (candIn.get(nc) ?? 0) + w)
      }
      candIn.set(currComm, ki_in_curr) // always consider original community

      // Pick community maximising ΔQ = k_i,in(C)/m − sigTot(C)·ki/(2m²)
      let bestComm = currComm
      let bestScore = ki_in_curr / m - (sigTot.get(currComm) ?? 0) * ki_node / (2 * m * m)
      for (const [comm, ki_in] of candIn) {
        if (comm === currComm) continue
        const score = ki_in / m - (sigTot.get(comm) ?? 0) * ki_node / (2 * m * m)
        if (score > bestScore) { bestScore = score; bestComm = comm }
      }

      community.set(node, bestComm)
      sigTot.set(bestComm, (sigTot.get(bestComm) ?? 0) + ki_node)
      if (bestComm !== currComm) improved = true
    }
  }

  return community
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class WhatsAppManager extends EventEmitter {
  private static instance: WhatsAppManager
  private socket: unknown = null
  private status: WAConnectionStatus = 'disconnected'
  private currentQR: string | null = null
  private saveCreds: (() => Promise<void>) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chatStore = new Map<string, any>()
  private storeReady = false
  private hasConnectedOnce = false
  private reconnectAttempts = 0
  private consecutiveProtocolErrors = 0
  private static readonly MAX_RECONNECT_ATTEMPTS = 8
  private static readonly MAX_CIRCUIT_BREAKER_RETRIES = 3
  private static readonly CIRCUIT_BREAKER_BACKOFF = [800, 2000, 5000]

  // MAV-256: in-memory mirror of GROUP_CACHE_PATH, lazily loaded once per
  // process and kept warm afterward by passive groups.upsert/groups.update/
  // group-participants.update listeners (registered in start()) plus full
  // rewrites whenever listGroups()/listGroupsWithMeta() do a real fetch.
  private groupCache = new Map<string, CachedGroup>()
  private groupCacheWrittenAt: number | null = null
  private groupCacheLoaded = false
  // Freshness window: group membership doesn't need to be more current than
  // this for the app's actual use cases (occasional chapter detection / group
  // scan, not live chat) — picked as "a day" per MAV-256, not tuned further.
  private static readonly GROUP_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

  static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) WhatsAppManager.instance = new WhatsAppManager()
    return WhatsAppManager.instance
  }

  getStatus(): WAConnectionStatus { return this.status }
  getCurrentQR(): string | null { return this.currentQR }
  isConnected(): boolean { return this.status === 'connected' }

  // MAV-255: chatStore is populated only from Baileys' own chats.set/chats.upsert
  // events — i.e. conversations that genuinely exist on the connected WhatsApp
  // account. Used as a real technical guarantee that a send target is a real
  // contact, not e.g. externally-injected/fabricated contact data (which has no
  // representation in chatStore since it never came from a real WhatsApp sync).
  hasChatWith(jid: string): boolean {
    return this.chatStore.has(jid)
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.socket) throw new Error('WhatsApp not connected')
    const normalised = jid.includes('@') ? jid : `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`
    // Reject JIDs that don't conform to WhatsApp's known address format
    if (!/^\d+@(s\.whatsapp\.net|g\.us)$/.test(normalised)) {
      throw new Error(`Invalid WhatsApp JID: ${normalised}`)
    }
    // MAV-255: never send to a JID with no existing conversation on the real
    // connected account — the incident this guards against was fabricated
    // contact data (seeded outside the app) reaching a real WhatsApp send.
    if (!this.hasChatWith(normalised)) {
      throw new Error('No existing WhatsApp conversation with this contact — refusing to send to an unverified number.')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.socket as any).sendMessage(normalised, { text })
  }

  private setStatus(s: WAConnectionStatus): void {
    this.status = s
    this.emit('status', s)
  }

  private classifyCloseCode(statusCode: number | undefined): 'logged_out' | 'protocol' | 'transient' {
    if (statusCode === 401 || statusCode === 440) return 'logged_out'
    if (statusCode === 500 || statusCode === 411 || statusCode === 403 || statusCode === 405) return 'protocol'
    return 'transient'
  }

  async retry(): Promise<void> {
    this.reconnectAttempts = 0
    this.consecutiveProtocolErrors = 0
    await this.start()
  }

  async start(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return
    this.setStatus('connecting')

    // Clean up the previous socket's listeners before creating a new one.
    // Baileys accumulates event listeners on reconnect if not explicitly removed.
    if (this.socket) {
      try { (this.socket as any).ev.removeAllListeners() } catch { /* ignore */ }
      this.socket = null
    }

    try {
      await fs.mkdir(AUTH_DIR, { recursive: true })

      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = await import('@whiskeysockets/baileys') as any

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
      this.saveCreds = saveCreds

      const { version } = await fetchLatestBaileysVersion()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, console),
        },
        browser: ['Loop', 'Desktop', '3.0.0'],
        printQRInTerminal: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: (await import('pino') as any).default({ level: 'silent' }),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any

      this.socket = sock

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('chats.set', ({ chats }: { chats: any[] }) => {
        this.chatStore.clear()
        for (const c of chats) this.chatStore.set(c.id, c)
        this.storeReady = true
        this.emit('store-ready')
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('chats.upsert', (chats: any[]) => {
        for (const c of chats) this.chatStore.set(c.id, c)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.currentQR = qr
          this.setStatus('qr_pending')
          this.emit('qr', qr)
        }

        if (connection === 'open') {
          this.currentQR = null
          this.hasConnectedOnce = true
          this.reconnectAttempts = 0
          this.consecutiveProtocolErrors = 0
          this.setStatus('connected')
          this.emit('connected')
        }

        if (connection === 'close') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          this.chatStore.clear()
          this.storeReady = false

          if (!this.hasConnectedOnce) {
            this.setStatus('disconnected')
            const delay = Math.min(800 * Math.pow(2, this.reconnectAttempts), 15_000)
            this.reconnectAttempts++
            console.warn(`[WhatsApp] Pre-connect close (code: ${statusCode}), retry ${this.reconnectAttempts} in ${delay}ms`)
            if (this.reconnectAttempts <= WhatsAppManager.MAX_RECONNECT_ATTEMPTS) {
              setTimeout(() => this.start(), delay)
            } else {
              this.reconnectAttempts = 0
              this.consecutiveProtocolErrors = 0
              this.setStatus('failed')
              this.emit('connection-failed', { reason: 'exhausted' })
            }
            return
          }

          const classification = this.classifyCloseCode(statusCode)

          if (classification === 'logged_out') {
            this.reconnectAttempts = 0
            this.consecutiveProtocolErrors = 0
            this.setStatus('logged_out')
            this.emit('logged-out')
            await this.clearAuth()
            return
          }

          if (classification === 'protocol') {
            this.consecutiveProtocolErrors++
          } else {
            if (statusCode === 515 && this.consecutiveProtocolErrors >= 2) {
              this.consecutiveProtocolErrors++
            } else {
              this.consecutiveProtocolErrors = 0
            }
          }

          if (this.consecutiveProtocolErrors >= 3) {
            this.reconnectAttempts = 0
            this.consecutiveProtocolErrors = 0
            this.setStatus('protocol_error')
            this.emit('protocol-error', { reason: `code:${statusCode}` })
            return
          }

          if (this.reconnectAttempts >= WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES) {
            this.reconnectAttempts = 0
            this.consecutiveProtocolErrors = 0
            this.setStatus('failed')
            this.emit('connection-failed', { reason: `code:${statusCode}` })
            return
          }

          const delay = WhatsAppManager.CIRCUIT_BREAKER_BACKOFF[this.reconnectAttempts] ?? 5000
          this.reconnectAttempts++
          this.setStatus('reconnecting')
          this.emit('reconnecting', { attempt: this.reconnectAttempts, max: WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES })
          console.warn(`[WhatsApp] Post-connect close (code: ${statusCode}), retry ${this.reconnectAttempts} in ${delay}ms`)
          setTimeout(() => this.start(), delay)
        }
      })

      sock.ev.on('creds.update', async () => {
        await this.saveCreds?.()
      })

      // MAV-256: keep the group cache warm incrementally between full
      // fetches. These only fire for changes that happen while connected —
      // they cannot backfill history on a fresh connection, so listGroups()
      // must still be able to do a real fetch on a cache miss; this is a
      // top-up, not a replacement for that fetch. Handlers are extracted
      // methods (rather than inline closures) so they're unit-testable
      // without going through the full start()/makeWASocket() flow.
      sock.ev.on('groups.upsert', this.handleGroupsUpsert.bind(this))
      sock.ev.on('groups.update', this.handleGroupsUpdate.bind(this))
      sock.ev.on('group-participants.update', this.handleGroupParticipantsUpdate.bind(this))
    } catch (err) {
      console.error('[WhatsApp] Failed to start:', err)
      this.setStatus('disconnected')
      this.emit('disconnected', { loggedOut: false })
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.socket as any).logout()
      } catch { /* ignore */ }
      this.socket = null
    }
    this.setStatus('disconnected')
    this.currentQR = null
    this.hasConnectedOnce = false
    this.storeReady = false
    // MAV-256: a full disconnect/logout can be followed by linking a
    // different WhatsApp account — don't let that account inherit this one's
    // cached group data.
    this.groupCache.clear()
    this.groupCacheWrittenAt = null
    this.groupCacheLoaded = false
    try {
      await fs.unlink(GROUP_CACHE_PATH)
    } catch { /* fine if it never existed */ }
    await this.clearAuth()
  }

  async clearAuth(): Promise<void> {
    try {
      const files = await fs.readdir(AUTH_DIR)
      await Promise.all(files.map((f) => fs.unlink(join(AUTH_DIR, f))))
    } catch { /* ignore */ }
  }

  async getMessages(jid: string, limit = 50): Promise<WAMessage[]> {
    if (!this.socket) return []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      const result = await sock.fetchMessagesFromWA(jid, limit)
      return this.normalizeMessages(result)
    } catch {
      return []
    }
  }

  async buildTieStrengthMap(): Promise<Map<string, { strength: 'high' | 'medium' | 'low'; messageCount: number; displayName: string }>> {
    const map = new Map<string, { strength: 'high' | 'medium' | 'low'; messageCount: number; displayName: string }>()
    if (!this.socket) return map
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      const nowSec = Date.now() / 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allChats: any[] = Array.from(this.chatStore.values())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dmChats = allChats.filter((c: any) => c.id?.endsWith('@s.whatsapp.net'))
      for (const chat of dmChats) {
        const ts = Number(chat.conversationTimestamp ?? 0)
        const daysSince = ts > 0 ? (nowSec - ts) / 86400 : Infinity
        const strength: 'high' | 'medium' | 'low' =
          daysSince <= 30  ? 'high' :
          daysSince <= 180 ? 'medium' : 'low'
        const messageCount = strength === 'high' ? 150 : strength === 'medium' ? 30 : 5
        const contactMeta = sock.contacts?.[chat.id]
        const displayName: string = contactMeta?.name ?? contactMeta?.notify ?? chat.name ?? ''
        map.set(chat.id, { strength, messageCount, displayName })
      }
    } catch { /* non-fatal */ }
    return map
  }

  // Patterns that indicate broadcast/admin/noise groups rather than real social chapters
  private static readonly GARBAGE_NAME_RE = /\b(broadcast|announce|announcement|update|updates|news|newsletter|society|alumni|association|residents|colony|welfare|committee|notices?|info|helpdesk|support|class of|batch of|school of|investor meet|networking event)\b/i

  // MAV: groupFetchAllParticipating()'s bulk `participants` field is frequently
  // incomplete/stale right after a fresh session (a known Baileys limitation) —
  // observed returning exactly 2 participants for every group regardless of real
  // size, which made every group fail chapters.ts's MIN_MEMBERS=3 gate and
  // produced a guaranteed zero-chapter-candidate outcome. Real membership needs
  // a per-group sock.groupMetadata() fetch (the pattern listGroups() already
  // uses below) — but doing that for up to 200 groups against a real, live
  // connected account requires explicit pacing to avoid WhatsApp rate-limiting
  // or flagging the account. Batched with a delay between batches, a per-call
  // timeout, and an overall budget so a stuck fetch can't hang chapter detection
  // indefinitely; individual failures are skipped, not fatal to the whole pass.
  private static readonly GROUP_META_BATCH_SIZE = 8
  private static readonly GROUP_META_BATCH_DELAY_MS = 1500
  private static readonly GROUP_META_PER_CALL_TIMEOUT_MS = 8_000
  private static readonly GROUP_META_TOTAL_BUDGET_MS = 90_000
  // One below chapters.ts's MIN_MEMBERS=3 gate — a real fetch returning this
  // few participants is already too small to ever produce a usable chapter
  // candidate, so it's a reasonable bar for "plausibly a genuinely tiny group"
  // vs. "likely a truncated rate-limited response."
  private static readonly SUSPICIOUS_MEMBER_THRESHOLD = 2

  // MAV-257: WhatsApp's own rate limiter (`rate-overlimit`, not a timeout)
  // consistently lets through only ~1/3 of groups per pass — confirmed via
  // live logs across multiple separate runs. Every group whose fetch fails
  // used to be dropped outright by callers (`if (members.length === 0)
  // continue`), so "found N groups" was really "whichever third got through
  // the rate limiter this specific run" — a group could be visible one scan
  // and gone the next for no reason the user could see. Fix: consult and
  // update the shared MAV-256 group cache per-group inside this fetch, so a
  // group resolved on an earlier pass stays known even when a later pass
  // fails to re-resolve it. Benefits both callers (listGroups() and
  // listGroupsWithMeta()) since both route through this one method — a group
  // resolved via chapter detection also helps the crew-detection group scan
  // on its next cache hit, and vice versa.
  private async fetchRealGroupMembers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sock: any,
    groupIds: string[]
  ): Promise<Map<string, string[]>> {
    await this.loadGroupCache()
    const membersByGroup = new Map<string, string[]>()
    const budgetDeadline = Date.now() + WhatsAppManager.GROUP_META_TOTAL_BUDGET_MS
    const totalBatches = Math.ceil(groupIds.length / WhatsAppManager.GROUP_META_BATCH_SIZE)

    for (let i = 0; i < groupIds.length; i += WhatsAppManager.GROUP_META_BATCH_SIZE) {
      if (Date.now() >= budgetDeadline) {
        console.warn(
          `[WA] group metadata fetch budget (${WhatsAppManager.GROUP_META_TOTAL_BUDGET_MS}ms) exhausted — ` +
          `${membersByGroup.size}/${groupIds.length} groups fetched, remaining groups skipped for this pass`
        )
        break
      }

      const batch = groupIds.slice(i, i + WhatsAppManager.GROUP_META_BATCH_SIZE)
      const batchNum = Math.floor(i / WhatsAppManager.GROUP_META_BATCH_SIZE) + 1
      console.log(`[WA] fetching group metadata: batch ${batchNum}/${totalBatches} (${batch.length} groups)`)

      await Promise.all(batch.map(async (groupId) => {
        try {
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('groupMetadata timeout')), WhatsAppManager.GROUP_META_PER_CALL_TIMEOUT_MS)
          )
          const meta = await Promise.race([sock.groupMetadata(groupId), timeout])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const participants = (meta?.participants ?? []).map((p: any) => p.id as string)
          const existing = this.groupCache.get(groupId)

          // A groupMetadata() call can resolve without throwing yet still be
          // truncated — WhatsApp's rate limiter sometimes returns only the
          // requester's own participant entry under load instead of a real
          // error. That doesn't hit the catch block below, so without this
          // check a truncated-but-"successful" response would silently
          // overwrite a previously-good, fuller cached member list. Cross-check
          // against Baileys' own meta.size (participant count) when present,
          // and never let an implausibly small result regress a cache entry
          // that already has more members than this fetch returned.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const declaredSize = typeof (meta as any)?.size === 'number' ? (meta as any).size : undefined
          const suspiciouslySmall = participants.length <= WhatsAppManager.SUSPICIOUS_MEMBER_THRESHOLD
          const disagreesWithDeclaredSize = declaredSize !== undefined && declaredSize > participants.length
          const regressesKnownGoodCache = existing !== undefined && existing.members.length > participants.length
          const looksTruncated = suspiciouslySmall && (disagreesWithDeclaredSize || regressesKnownGoodCache)

          if (looksTruncated && existing && existing.members.length > 0) {
            console.warn(
              `[WA] groupMetadata for ${groupId} returned ${participants.length} participants` +
              `${declaredSize !== undefined ? ` (declared size ${declaredSize})` : ''} — looks truncated, keeping ` +
              `previously-cached ${existing.members.length} instead of overwriting`
            )
            membersByGroup.set(groupId, existing.members)
          } else {
            // First-ever sighting of this group, or a result that isn't
            // suspicious — accept it. An incomplete first sighting is still
            // better than leaving the group unresolved entirely.
            if (looksTruncated) {
              console.warn(
                `[WA] groupMetadata for ${groupId} returned only ${participants.length} participants` +
                `${declaredSize !== undefined ? ` (declared size ${declaredSize})` : ''} and no prior cache exists — ` +
                `accepting anyway as a first sighting`
              )
            }
            membersByGroup.set(groupId, participants)
            this.groupCache.set(groupId, {
              id: groupId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              name: (meta as any)?.subject ?? existing?.name ?? '',
              members: participants,
              lastMessageAt: existing?.lastMessageAt ?? 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              createdAt: (meta as any)?.creation ?? existing?.createdAt ?? null,
            })
          }
        } catch (err) {
          console.warn(`[WA] groupMetadata failed for ${groupId}, skipping:`, err instanceof Error ? err.message : err)
          // Don't let a rate-limited/failed fetch erase a group resolved on
          // an earlier pass — fall back to last-known real membership rather
          // than letting the caller drop the group entirely.
          const cached = this.groupCache.get(groupId)
          if (cached && cached.members.length > 0) {
            membersByGroup.set(groupId, cached.members)
          }
        }
      }))

      const isLastBatch = i + WhatsAppManager.GROUP_META_BATCH_SIZE >= groupIds.length
      if (!isLastBatch) {
        await new Promise((resolve) => setTimeout(resolve, WhatsAppManager.GROUP_META_BATCH_DELAY_MS))
      }
    }

    await this.saveGroupCache().catch(() => {})
    console.log(`[WA] group metadata fetch complete: ${membersByGroup.size}/${groupIds.length} groups resolved`)
    return membersByGroup
  }

  private waitForStore(timeoutMs = 10_000): Promise<void> {
    if (this.storeReady) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.off('store-ready', onReady)
        console.warn('[WhatsApp] waitForStore timed out — proceeding without full chat store')
        resolve()
      }, timeoutMs)
      const onReady = () => {
        clearTimeout(timer)
        resolve()
      }
      this.once('store-ready', onReady)
    })
  }

  // ─── MAV-256: group cache ───────────────────────────────────────────────────

  private async loadGroupCache(): Promise<void> {
    if (this.groupCacheLoaded) return
    this.groupCacheLoaded = true
    try {
      const raw = await fs.readFile(GROUP_CACHE_PATH, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      // Back-compat: the pre-MAV-256 file was a bare array with no freshness
      // metadata (it was write-only, never read back). Load its contents but
      // treat them as stale so the first real call still does a fresh fetch.
      if (Array.isArray(parsed)) {
        for (const g of parsed as CachedGroup[]) this.groupCache.set(g.id, g)
        this.groupCacheWrittenAt = null
        return
      }
      const file = parsed as GroupCacheFile
      for (const g of file.groups ?? []) this.groupCache.set(g.id, g)
      this.groupCacheWrittenAt = file.writtenAt ?? null
    } catch {
      // No cache file yet, or unreadable/corrupt — proceed with an empty
      // cache, same as a fresh install. Not fatal; the cache is a perf
      // optimisation on top of the real fetch path, never a source of truth.
    }
  }

  private async saveGroupCache(): Promise<void> {
    this.groupCacheWrittenAt = Date.now()
    const file: GroupCacheFile = {
      writtenAt: this.groupCacheWrittenAt,
      groups: [...this.groupCache.values()],
    }
    try {
      await fs.writeFile(GROUP_CACHE_PATH, JSON.stringify(file, null, 2))
    } catch { /* non-fatal — see loadGroupCache() */ }
  }

  private isGroupCacheFresh(): boolean {
    return (
      this.groupCacheWrittenAt !== null &&
      Date.now() - this.groupCacheWrittenAt < WhatsAppManager.GROUP_CACHE_MAX_AGE_MS &&
      this.groupCache.size > 0
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleGroupsUpsert(metas: any[]): void {
    for (const m of metas) {
      const existing = this.groupCache.get(m.id)
      this.groupCache.set(m.id, {
        id: m.id,
        name: m.subject ?? existing?.name ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: (m.participants ?? []).map((p: any) => p.id as string),
        lastMessageAt: existing?.lastMessageAt ?? 0,
        createdAt: m.creation ?? existing?.createdAt ?? null,
      })
    }
    this.saveGroupCache().catch(() => {})
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleGroupsUpdate(partials: any[]): void {
    for (const p of partials) {
      // A partial update for a group we haven't cached yet carries no
      // reliable member list — wait for a real fetch instead of guessing.
      const existing = this.groupCache.get(p.id)
      if (!existing) continue
      this.groupCache.set(p.id, { ...existing, name: p.subject ?? existing.name })
    }
    this.saveGroupCache().catch(() => {})
  }

  private handleGroupParticipantsUpdate({
    id,
    participants,
    action,
  }: {
    id: string
    participants: string[]
    action: string
  }): void {
    const existing = this.groupCache.get(id)
    if (!existing) return // not cached yet — the next full fetch will pick it up
    const members =
      action === 'add'
        ? [...new Set([...existing.members, ...participants])]
        : action === 'remove'
          ? existing.members.filter((m) => !participants.includes(m))
          : existing.members
    this.groupCache.set(id, { ...existing, members })
    this.saveGroupCache().catch(() => {})
  }

  async listGroupsWithMeta(): Promise<{
    id: string
    name: string
    members: string[]
    lastMessageAt: number
    createdAt: number | null
    userIsCreator: boolean
    highTieMemberCount: number
    highTieMemberFraction: number
    topTieMemberNames: string[]
  }[]> {
    if (!this.socket) return []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      const myJid = (sock.user?.id ?? '').replace(/:\d+@/, '@')
      const tieMap = await this.buildTieStrengthMap()

      // groupFetchAllParticipating() fetches groups directly from WA servers —
      // unlike chatStore which only populates on first QR scan with syncFullHistory:false.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let groupMap: Record<string, any> = {}
      try {
        console.log('[WA] fetching all participating groups...')
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('groupFetchAllParticipating timeout')), 20000)
        )
        groupMap = await Promise.race([sock.groupFetchAllParticipating(), timeout])
        console.log(`[WA] groupFetchAllParticipating returned ${Object.keys(groupMap).length} groups`)
      } catch (err) {
        console.error('[WA] groupFetchAllParticipating failed:', err)
        return []
      }

      const groupEntries = Object.values(groupMap).slice(0, 200)

      // Cheap filters first (name/community/newsletter/garbage-regex) so the
      // rate-limited per-group metadata fetch below only runs against groups
      // that could plausibly become a chapter candidate, not all 200.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateEntries: any[] = []
      for (const meta of groupEntries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = meta as any
        const groupId: string = m.id
        const resolvedName: string = m.subject ?? ''
        if (!resolvedName || resolvedName === groupId) continue
        if (m.isCommunity || m.isCommunityAnnounce) continue
        if (groupId.endsWith('@newsletter')) continue
        if (WhatsAppManager.GARBAGE_NAME_RE.test(resolvedName)) continue
        candidateEntries.push(m)
      }

      // groupFetchAllParticipating()'s bulk `participants` field is unreliable
      // right after a fresh session — fetch real per-group membership instead,
      // rate-limited (see fetchRealGroupMembers doc comment).
      const realMembersByGroup = await this.fetchRealGroupMembers(
        sock,
        candidateEntries.map((m) => m.id as string)
      )

      const results = []
      for (const m of candidateEntries) {
        const groupId: string = m.id
        const resolvedName: string = m.subject ?? ''

        const members: string[] = realMembersByGroup.get(groupId) ?? []
        if (members.length === 0) continue // MAV-257: never resolved in any pass — genuinely unknown, skip
        if (members.length > 50) continue
        const createdAt: number | null = m.creation ?? null
        const ownerJid = (m.owner ?? '').replace(/:\d+@/, '@')
        const userIsCreator = !!ownerJid && ownerJid === myJid

        // lastMessageAt from chatStore if available, fallback to creation time
        const chatEntry = this.chatStore.get(groupId)
        const lastMessageAt = Number(
          chatEntry?.conversationTimestamp ?? chatEntry?.lastMessageTimestamp ?? createdAt ?? 0
        )

        const memberTieData = members.map(jid => tieMap.get(jid) ?? { strength: 'low' as const, messageCount: 0, displayName: '' })
        const highTieMembers = memberTieData.filter(d => d.strength === 'high')
        const highTieMemberCount = highTieMembers.length
        const highTieMemberFraction = members.length > 0 ? highTieMemberCount / members.length : 0
        const topTieMemberNames = memberTieData
          .filter(d => d.displayName)
          .sort((a, b) => b.messageCount - a.messageCount)
          .slice(0, 3)
          .map(d => d.displayName)

        results.push({
          id: groupId,
          name: resolvedName,
          members,
          lastMessageAt,
          createdAt,
          userIsCreator,
          highTieMemberCount,
          highTieMemberFraction,
          topTieMemberNames,
        })
      }

      // Persist for eval pipeline — overwrite on each scan so it stays fresh.
      // Deliberately NOT the same file/shape as the MAV-256 group cache below:
      // this method's candidateEntries filter (GARBAGE_NAME_RE, <=50 members)
      // is strictly narrower than listGroups()'s, so writing this narrower
      // result set into the shared cache would make listGroups() silently
      // under-report groups on a cache hit. This method also always does a
      // real fetch regardless of cache state (chapter-inference — its only
      // caller via buildContactClusters() — represents a deliberate,
      // explicit user request for fresh results every time it's reached).
      try {
        await fs.writeFile(EVAL_DUMP_PATH, JSON.stringify(results, null, 2))
      } catch { /* non-fatal */ }

      return results
    } catch {
      return []
    }
  }

  // ─── Post-Louvain merge pass ───────────────────────────────────────────────
  // Louvain has a resolution limit (Fortunato & Barthélemy 2007): small clusters
  // with low membership overlap end up as separate communities even when they
  // represent the same life era. This greedy merge pass fixes over-fragmentation.

  private static _mergeScore(a: ContactCluster, b: ContactCluster, nowSec: number): number {
    // Temporal overlap fraction
    const aEnd = a.eraEnd ?? nowSec
    const bEnd = b.eraEnd ?? nowSec
    const overlapStart = Math.max(a.eraStart, b.eraStart)
    const overlapEnd = Math.min(aEnd, bEnd)
    let temporalScore = 0
    if (overlapEnd > overlapStart) {
      const overlapDuration = overlapEnd - overlapStart
      const longerSpan = Math.max(aEnd - a.eraStart, bEnd - b.eraStart)
      temporalScore = Math.min(overlapDuration / Math.max(longerSpan, 1), 1)
    }

    // Jaccard on contact jids
    const aJids = new Set(a.contacts.map(c => c.jid))
    const bJids = new Set(b.contacts.map(c => c.jid))
    const intersection = [...aJids].filter(j => bJids.has(j)).length
    const union = new Set([...aJids, ...bJids]).size
    const jaccardScore = union > 0 ? intersection / union : 0

    // Shared word score between bestGroupNames
    const words = (name: string) =>
      name.toLowerCase().split(/\W+/).filter(w => w.length >= 3)
    const aWords = new Set(words(a.bestGroupName))
    const bWords = words(b.bestGroupName)
    const sharedWords = bWords.filter(w => aWords.has(w)).length
    const totalUniqueWords = new Set([...aWords, ...bWords]).size
    const nameScore = totalUniqueWords > 0 ? sharedWords / totalUniqueWords : 0

    return temporalScore * 0.6 + jaccardScore * 0.3 + nameScore * 0.1
  }

  private static _mergePair(a: ContactCluster, b: ContactCluster, nowSec: number): ContactCluster {
    // Contacts: union by jid
    const seen = new Set<string>()
    const contacts: ContactCluster['contacts'] = []
    for (const c of [...a.contacts, ...b.contacts]) {
      if (!seen.has(c.jid)) { seen.add(c.jid); contacts.push(c) }
    }

    // sharedGroups: union
    const sharedGroups = [...new Set([...a.sharedGroups, ...b.sharedGroups])]

    // Era bounds
    const eraStart = Math.min(a.eraStart, b.eraStart)
    const eraEnd = (a.eraEnd !== null && b.eraEnd !== null)
      ? Math.max(a.eraEnd, b.eraEnd)
      : null

    // Keep bestGroup from whichever cluster has higher cohesion
    const primary = a.cohesion >= b.cohesion ? a : b

    // Weighted-average cohesion (approximation — adjacency map not in scope)
    const totalContacts = a.contacts.length + b.contacts.length
    const cohesion = totalContacts > 0
      ? (a.cohesion * a.contacts.length + b.cohesion * b.contacts.length) / totalContacts
      : 0

    void nowSec  // not needed for field computation but kept for API symmetry
    return {
      contacts,
      sharedGroups,
      bestGroupJid: primary.bestGroupJid,
      bestGroupName: primary.bestGroupName,
      eraStart,
      eraEnd,
      cohesion,
    }
  }

  private static _mergeClusters(clusters: ContactCluster[], nowSec: number): ContactCluster[] {
    let result = [...clusters]
    let changed = true

    while (changed) {
      changed = false
      let bestScore = 0
      let bestI = -1, bestJ = -1

      for (let i = 0; i < result.length; i++) {
        for (let j = i + 1; j < result.length; j++) {
          const score = WhatsAppManager._mergeScore(result[i], result[j], nowSec)
          if (score > bestScore) {
            bestScore = score; bestI = i; bestJ = j
          }
        }
      }

      if (bestScore >= 0.5) {
        const merged = WhatsAppManager._mergePair(result[bestI], result[bestJ], nowSec)
        result = result.filter((_, idx) => idx !== bestI && idx !== bestJ)
        result.push(merged)
        changed = true
      }
    }

    return result
  }

  async buildContactClusters(): Promise<{ clusters: ContactCluster[]; groups: Awaited<ReturnType<WhatsAppManager['listGroupsWithMeta']>> }> {
    const [tieMap, groups] = await Promise.all([
      this.buildTieStrengthMap(),
      this.listGroupsWithMeta(),
    ])

    if (groups.length === 0) return { clusters: [], groups: [] }

    // Build contact → groups index (only contacts that appear in at least 1 group)
    const contactGroups = new Map<string, string[]>()  // jid → [groupId, ...]
    for (const g of groups) {
      for (const jid of g.members) {
        if (!contactGroups.has(jid)) contactGroups.set(jid, [])
        contactGroups.get(jid)!.push(g.id)
      }
    }

    // Bipartite projection → weighted contact graph.
    // Edge weight = jaccard × (1 + log(1 + dmCount)) so contacts you actually DM
    // have much stronger edges than strangers who happen to share groups.
    // Jaccard ≥ 0.2 gate keeps truly unrelated contacts disconnected.
    const weightedGraph = new Map<string, Map<string, number>>()

    for (const g of groups) {
      const members = g.members
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i], b = members[j]
          const ga = new Set(contactGroups.get(a) ?? [])
          const gb = new Set(contactGroups.get(b) ?? [])
          const intersection = [...ga].filter(gid => gb.has(gid)).length
          const union = new Set([...ga, ...gb]).size
          const jaccard = union > 0 ? intersection / union : 0
          if (jaccard < 0.2) continue
          const dmBoost = Math.max(
            tieMap.get(a)?.messageCount ?? 0,
            tieMap.get(b)?.messageCount ?? 0,
          )
          const weight = jaccard * (1 + Math.log(1 + dmBoost))
          if (!weightedGraph.has(a)) weightedGraph.set(a, new Map())
          if (!weightedGraph.has(b)) weightedGraph.set(b, new Map())
          const prev = weightedGraph.get(a)!.get(b) ?? 0
          if (weight > prev) {
            weightedGraph.get(a)!.set(b, weight)
            weightedGraph.get(b)!.set(a, weight)
          }
        }
      }
    }

    // Louvain modularity optimisation — finds communities by maximising the ratio of
    // intra-community edge density to what you'd expect in a random graph of the same degree.
    // Naturally dissolves low-cohesion mega-clusters (Son Cubano problem).
    const communityOf = louvain(weightedGraph)

    // Group nodes by community label → rawClusters
    const communityMembers = new Map<string, string[]>()
    for (const [node, comm] of communityOf) {
      if (!communityMembers.has(comm)) communityMembers.set(comm, [])
      communityMembers.get(comm)!.push(node)
    }
    const rawClusters = [...communityMembers.values()].filter(c => c.length >= 2)

    // Build a binary adjacency view for cohesion computation (Jaccard ≥ 0.2 edge exists)
    const adjacency = new Map<string, Set<string>>()
    for (const [a, neighbors] of weightedGraph) {
      if (!adjacency.has(a)) adjacency.set(a, new Set())
      for (const [b] of neighbors) adjacency.get(a)!.add(b)
    }

    const groupById = new Map(groups.map(g => [g.id, g]))
    const nowSec = Math.floor(Date.now() / 1000)

    const clusters: ContactCluster[] = []
    for (const members of rawClusters) {
      // Find all groups this cluster shares
      const groupCounts = new Map<string, number>()
      for (const jid of members) {
        for (const gid of contactGroups.get(jid) ?? []) {
          groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1)
        }
      }
      // Shared groups = groups where ≥2 cluster members appear
      const sharedGroupIds = [...groupCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([gid]) => gid)

      // Require 2+ shared groups — single-group clusters are weak signal
      if (sharedGroupIds.length < 2) continue

      // Drop clusters that are too large — likely a community scene, not a personal chapter
      if (members.length > 100) continue

      // Drop clusters whose shared groups are all large (>40 members) — broadcast/event noise
      const allLarge = sharedGroupIds.every(gid => (groupById.get(gid)?.members.length ?? 0) > 40)
      if (allLarge) continue

      // Best representative group: highest overlap fraction with this cluster
      const memberSet = new Set(members)
      let bestGroupJid = sharedGroupIds[0]
      let bestOverlap = 0
      for (const gid of sharedGroupIds) {
        const g = groupById.get(gid)
        if (!g) continue
        const overlap = g.members.filter(m => memberSet.has(m)).length / g.members.length
        if (overlap > bestOverlap) { bestOverlap = overlap; bestGroupJid = gid }
      }

      // Era detection: K-means-like median split on createdAt timestamps
      const timestamps = sharedGroupIds
        .map(gid => groupById.get(gid)?.createdAt ?? groupById.get(gid)?.lastMessageAt ?? 0)
        .filter(t => t > 0)
        .sort((a, b) => a - b)

      const eraStart = timestamps.length > 0 ? timestamps[0] : 0
      const lastActivity = Math.max(...sharedGroupIds.map(gid => groupById.get(gid)?.lastMessageAt ?? 0))
      const eraEnd = (nowSec - lastActivity) > 90 * 86400 ? lastActivity : null

      // Cohesion: fraction of contact pairs that share 2+ groups
      let linkedPairs = 0, totalPairs = 0
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalPairs++
          if (adjacency.get(members[i])?.has(members[j])) linkedPairs++
        }
      }
      const cohesion = totalPairs > 0 ? linkedPairs / totalPairs : 0

      const contactDetails = members.map(jid => {
        const tie = tieMap.get(jid)
        return { jid, displayName: tie?.displayName ?? '', tieStrength: tie?.strength ?? 'low' as const }
      })

      clusters.push({
        contacts: contactDetails,
        sharedGroups: sharedGroupIds,
        bestGroupJid,
        bestGroupName: groupById.get(bestGroupJid)?.name ?? '',
        eraStart,
        eraEnd,
        cohesion,
      })
    }

    // Post-Louvain merge pass: fix resolution-limit over-fragmentation
    const mergedClusters = WhatsAppManager._mergeClusters(clusters, nowSec)

    // Sort by cohesion × size descending
    mergedClusters.sort((a, b) => (b.cohesion * b.contacts.length) - (a.cohesion * a.contacts.length))
    return { clusters: mergedClusters, groups }
  }

  async listGroups(): Promise<{ id: string; name: string; members: string[] }[]> {
    if (!this.socket) return []

    // MAV-256: serve from cache when fresh — skips the rate-limited fetch
    // entirely (previously always 60-120s+, hitting rate-overlimit on most
    // groups, even for back-to-back calls seconds apart).
    await this.loadGroupCache()
    if (this.isGroupCacheFresh()) {
      return [...this.groupCache.values()].map(({ id, name, members }) => ({ id, name, members }))
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any

      // Fetch directly from WA servers, not this.chatStore — chatStore only
      // populates passively as chats sync/receive messages and is unreliable
      // right after a fresh session (same reasoning as listGroupsWithMeta()).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let groupMap: Record<string, any> = {}
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('groupFetchAllParticipating timeout')), 20000)
        )
        groupMap = await Promise.race([sock.groupFetchAllParticipating(), timeout])
      } catch (err) {
        console.error('[WA] listGroups: groupFetchAllParticipating failed:', err)
        return []
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateEntries: any[] = []
      for (const meta of Object.values(groupMap).slice(0, 200)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = meta as any
        const groupId: string = m.id
        const resolvedName: string = m.subject ?? ''
        if (!resolvedName || resolvedName === groupId) continue
        if (m.isCommunity || m.isCommunityAnnounce) continue
        if (groupId.endsWith('@newsletter')) continue
        candidateEntries.push(m)
      }

      // groupFetchAllParticipating()'s bulk `participants` field is unreliable
      // right after a fresh session — fetch real per-group membership instead,
      // rate-limited (see fetchRealGroupMembers doc comment).
      const realMembersByGroup = await this.fetchRealGroupMembers(
        sock,
        candidateEntries.map((m) => m.id as string)
      )

      const results = []
      for (const m of candidateEntries) {
        const groupId: string = m.id
        const members = realMembersByGroup.get(groupId) ?? []
        if (members.length === 0) continue // MAV-257: never resolved in any pass — genuinely unknown, skip
        results.push({ id: groupId, name: m.subject as string, members })
      }

      // MAV-256: refresh the cache with this real result set so the next
      // call (within GROUP_CACHE_MAX_AGE_MS, or kept fresh incrementally by
      // the groups.upsert/update and group-participants.update listeners
      // registered in start()) can skip the fetch entirely.
      for (const r of results) {
        this.groupCache.set(r.id, { id: r.id, name: r.name, members: r.members, lastMessageAt: 0, createdAt: null })
      }
      await this.saveGroupCache()

      return results
    } catch {
      return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeMessages(raw: any[]): WAMessage[] {
    if (!Array.isArray(raw)) return []
    return raw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({
        id: m.key?.id ?? '',
        fromMe: m.key?.fromMe ?? false,
        timestamp: m.messageTimestamp ?? 0,
        text: m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? null,
      }))
      .filter((m) => m.text !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
}

export default WhatsAppManager
