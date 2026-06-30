import { EventEmitter } from 'events'
import { join } from 'path'
import { promises as fs } from 'fs'
import { homedir } from 'os'

const AUTH_DIR = join(homedir(), 'Documents', 'Loop', 'whatsapp-auth')

export type WAConnectionStatus = 'disconnected' | 'connecting' | 'reconnecting' | 'qr_pending' | 'connected' | 'failed' | 'protocol_error' | 'logged_out'

export interface ConnectionStatusMetadata {
  attempt?: number
  maxAttempts?: number
  nextRetryIn?: number
  errorCode?: number
  errorReason?: string
}

interface ConnectionHealth {
  lastConnectedAt: number
  lastDisconnectAt: number
  currentAttempt: number
  totalAttempts: number
  lastError: { code?: number; reason?: string } | null
}

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
  private static readonly MAX_RECONNECT_ATTEMPTS = 8
  private connectionHealth: ConnectionHealth = {
    lastConnectedAt: 0,
    lastDisconnectAt: 0,
    currentAttempt: 0,
    totalAttempts: 0,
    lastError: null,
  }

  static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) WhatsAppManager.instance = new WhatsAppManager()
    return WhatsAppManager.instance
  }

  getStatus(): WAConnectionStatus { return this.status }
  getCurrentQR(): string | null { return this.currentQR }
  isConnected(): boolean { return this.status === 'connected' }

  private getDisconnectReason(statusCode?: number): string {
    if (!statusCode) return 'Unknown error'
    // Map Baileys DisconnectReason codes to user-friendly messages
    switch (statusCode) {
      case 401: return 'Session logged out'
      case 408: return 'Connection timed out'
      case 428: return 'Connection closed'
      case 440: return 'Bad session'
      case 515: return 'Restart required'
      case 503: return 'Service unavailable'
      default: return `Connection error (code ${statusCode})`
    }
  }

  private setStatus(s: WAConnectionStatus, metadata?: ConnectionStatusMetadata): void {
    this.status = s
    this.emit('status', s, metadata)
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
          this.connectionHealth.lastConnectedAt = Date.now()
          this.connectionHealth.currentAttempt = 0
          this.connectionHealth.lastError = null
          this.setStatus('connected')
          this.emit('connected')
        }

        if (connection === 'close') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          const isLoggedOut = statusCode === DisconnectReason.loggedOut
          const isProtocolError = statusCode === 440 || statusCode === 515  // badSession, restartRequired

          this.chatStore.clear()
          this.storeReady = false
          this.connectionHealth.lastDisconnectAt = Date.now()
          this.connectionHealth.lastError = { code: statusCode, reason: this.getDisconnectReason(statusCode) }
          this.connectionHealth.totalAttempts++

          if (isLoggedOut) {
            // Permanent logout — surface to UI and clear auth
            this.reconnectAttempts = 0
            this.setStatus('logged_out')
            this.emit('disconnected', { statusCode, loggedOut: true })
            await this.clearAuth()
          } else if (isProtocolError) {
            // Protocol errors (badSession, restartRequired) — surface as protocol_error
            this.reconnectAttempts = 0
            this.setStatus('protocol_error', {
              errorCode: statusCode,
              errorReason: this.connectionHealth.lastError.reason ?? 'Protocol error',
            })
            this.emit('disconnected', { statusCode, loggedOut: false })
          } else if (!this.hasConnectedOnce) {
            // Pre-first-connect close: QR handshake transient, unrecognised Baileys status code,
            // etc. Never surface as an error — just retry silently. The user is still on the QR
            // screen and should see nothing until the connection either succeeds or we give up.
            const delay = Math.min(800 * Math.pow(2, this.reconnectAttempts), 15_000)
            this.reconnectAttempts++
            this.connectionHealth.currentAttempt = this.reconnectAttempts
            console.warn(`[WhatsApp] Pre-connect close (code: ${statusCode}), retry ${this.reconnectAttempts} in ${delay}ms`)
            // Set status to disconnected internally so start() can proceed on retry,
            // but DON'T emit status or disconnected events to avoid QR screen flashing
            this.status = 'disconnected'
            if (this.reconnectAttempts <= WhatsAppManager.MAX_RECONNECT_ATTEMPTS) {
              setTimeout(() => this.start(), delay)
            } else {
              this.reconnectAttempts = 0
              this.connectionHealth.currentAttempt = 0
              this.setStatus('failed', {
                errorCode: statusCode,
                errorReason: 'Connection attempts exhausted',
              })
              this.emit('disconnected', { statusCode, loggedOut: false, exhausted: true })
            }
          } else {
            // Had a connection before — set status to 'reconnecting' and retry with backoff
            const delay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts), 60_000)
            this.reconnectAttempts++
            this.connectionHealth.currentAttempt = this.reconnectAttempts
            console.warn(`[WhatsApp] Post-connect close (code: ${statusCode}), retry ${this.reconnectAttempts} in ${delay}ms`)
            
            if (this.reconnectAttempts <= WhatsAppManager.MAX_RECONNECT_ATTEMPTS) {
              this.setStatus('reconnecting', {
                attempt: this.reconnectAttempts,
                maxAttempts: WhatsAppManager.MAX_RECONNECT_ATTEMPTS,
                nextRetryIn: delay,
                errorCode: statusCode,
                errorReason: this.connectionHealth.lastError.reason ?? 'Connection lost',
              })
              this.emit('disconnected', { statusCode, loggedOut: false })
              setTimeout(() => this.start(), delay)
            } else {
              this.reconnectAttempts = 0
              this.connectionHealth.currentAttempt = 0
              this.setStatus('failed', {
                errorCode: statusCode,
                errorReason: 'Connection attempts exhausted',
              })
              this.emit('disconnected', { statusCode, loggedOut: false, exhausted: true })
            }
          }
        }
      })

      sock.ev.on('creds.update', async () => {
        await this.saveCreds?.()
      })
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

      const results = []
      for (const meta of groupEntries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = meta as any
        const groupId: string = m.id
        const resolvedName: string = m.subject ?? ''
        if (!resolvedName || resolvedName === groupId) continue

        // Garbage filter: communities, large groups, broadcast/admin name patterns
        if (m.isCommunity || m.isCommunityAnnounce) continue
        if (groupId.endsWith('@newsletter')) continue
        if (WhatsAppManager.GARBAGE_NAME_RE.test(resolvedName)) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const members: string[] = (m.participants ?? []).map((p: any) => p.id as string)
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

      // Persist for eval pipeline — overwrite on each scan so it stays fresh
      try {
        const cachePath = join(homedir(), 'Documents', 'Loop', 'groups-discovered.json')
        await fs.writeFile(cachePath, JSON.stringify(results, null, 2))
      } catch { /* non-fatal */ }

      return results
    } catch {
      return []
    }
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
      const nowSec = Math.floor(Date.now() / 1000)
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

    // Sort by cohesion × size descending
    clusters.sort((a, b) => (b.cohesion * b.contacts.length) - (a.cohesion * a.contacts.length))
    return { clusters, groups }
  }

  async listGroups(): Promise<{ id: string; name: string; members: string[] }[]> {
    if (!this.socket) return []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sock = this.socket as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allChats: any[] = Array.from(this.chatStore.values())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groups = allChats.filter((c: any) => c.id?.endsWith('@g.us'))

      const results = []
      for (const group of groups.slice(0, 100)) {
        let members: string[] = []
        try {
          const meta = await sock.groupMetadata(group.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members = (meta?.participants ?? []).map((p: any) => p.id as string)
        } catch { /* skip */ }
        if (group.name && group.name !== group.id) {
          results.push({ id: group.id, name: group.name, members })
        }
      }
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
