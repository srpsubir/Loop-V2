import { EventEmitter } from 'events'
import { join } from 'path'
import { promises as fs } from 'fs'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { createInterface } from 'readline'
import { app } from 'electron'
import { LOOP_DIR } from './store'
import MessageStore, {
  type MessageRecord,
  type ReceiptRecord,
  type CallRecord,
  type LabelRecord,
  type LabelAssociationRecord,
} from './messageStore'

// MAV-252: lives under LOOP_DIR (Application Support), not ~/Documents/Loop.
// MAV-265: Baileys-only from here on — dead weight post-cutover, kept only so
// task #6 (whatsapp-auth/ decommission step) has a path to delete. Not read
// or written by any code below; the live session now lives in
// WHATSMEOW_SESSION_DB_PATH.
export const AUTH_DIR = join(LOOP_DIR, 'whatsapp-auth')

// MAV-265 design.md Section 1: whatsmeow's own sqlstore-backed device/session
// store, owned entirely by the Go sidecar process — never read or written
// from Node directly, only passed as a path for the sidecar to open.
export const WHATSMEOW_SESSION_DB_PATH = join(LOOP_DIR, 'whatsmeow-session.db')

// Must match sidecar/protocol.go's ProtocolVersion. Bumped whenever the
// envelope/event/command shapes change non-additively (design.md Section 4,
// "IPC protocol version skew") — mismatches are a hard failure, not a silent
// mis-parse.
const SIDECAR_PROTOCOL_VERSION = 1

// MAV-265/task #7: prebuilt per-arch binaries, not a local Go toolchain
// requirement (user decision — see design.md's "Go not installed on a
// contributor's machine" edge case). `npm run build:sidecar`
// (scripts/build-sidecar.mjs) produces sidecar/dist/darwin-<arch>/loop-sidecar
// for both arm64 and x64, keyed on Node's process.arch naming.
//
// In a packaged app, electron-builder's extraResources (electron-builder.yml)
// copies the binary matching the build's own arch to
// process.resourcesPath/sidecar/loop-sidecar — no arch branching needed at
// runtime since each packaged build only ships its own arch's binary.
// In dev, resolve straight to the freshly-built per-arch dist path so
// `npm run dev` works after a plain `npm run build:sidecar` (or the
// predev-triggered one) without needing a packaged build.
function resolveSidecarBinaryPath(): string {
  if (process.env.LOOP_SIDECAR_BINARY_PATH) return process.env.LOOP_SIDECAR_BINARY_PATH
  if (app.isPackaged) return join(process.resourcesPath, 'sidecar', 'loop-sidecar')
  return join(process.cwd(), 'sidecar', 'dist', `darwin-${process.arch}`, 'loop-sidecar')
}

// One line of sidecar stdout, matching sidecar/protocol.go's OutEnvelope.
interface SidecarOutEnvelope {
  v: number
  type: string
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
}

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
  // MAV-265: replaces the Baileys `socket`. Two independent conditions now
  // gate "connected" (design.md Section 1, state.json's whatsappConnected
  // flag): the sidecar OS process must be alive AND the sidecar's whatsmeow
  // client must have reported connection-update{state:"connected"}. Neither
  // alone is sufficient — a spawned-but-not-yet-connected sidecar must not
  // be reported as connected.
  private sidecarProcess: ChildProcessWithoutNullStreams | null = null
  private sidecarConnected = false
  // Set before intentionally killing the sidecar (disconnect() or app quit)
  // so the exit handler doesn't mistake a deliberate shutdown for a crash
  // and try to respawn it.
  private intentionalShutdown = false
  private status: WAConnectionStatus = 'disconnected'
  private currentQR: string | null = null
  private hasConnectedOnce = false
  private reconnectAttempts = 0
  private consecutiveProtocolErrors = 0
  private static readonly MAX_RECONNECT_ATTEMPTS = 8
  private static readonly MAX_CIRCUIT_BREAKER_RETRIES = 3
  private static readonly CIRCUIT_BREAKER_BACKOFF = [800, 2000, 5000]
  // MAV-265: best-effort display-name cache, populated incrementally from
  // messages-upsert's pushName field (WhatsApp's own WebMessageInfo.PushName)
  // as messages arrive. Replaces Baileys' sock.contacts[] lookup, which had
  // no whatsmeow/sidecar equivalent — not persisted, rebuilt each session.
  private displayNameCache = new Map<string, string>()

  // MAV-256: in-memory mirror of GROUP_CACHE_PATH, lazily loaded once per
  // process and kept warm afterward by passive groups.upsert/groups.update/
  // group-participants.update listeners (registered in start()) plus full
  // rewrites whenever listGroups()/listGroupsWithMeta() do a real fetch.
  private groupCache = new Map<string, CachedGroup>()
  private groupCacheWrittenAt: number | null = null
  private groupCacheLoaded = false

  // MAV-263: real per-message record, source for buildTieStrengthMap()'s
  // messageCount — replaces the hardcoded 150/30/5 recency-bucket proxy.
  private messageStore = MessageStore.getInstance()
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
  // MAV-265/task #4: sidecar process alive AND whatsmeow client connected —
  // both conditions, not either alone.
  isConnected(): boolean { return this.status === 'connected' && this.sidecarConnected }

  // MAV-255, ported to whatsmeow (MAV-265): originally backed by Baileys'
  // chats.set/chats.upsert events, which have no whatsmeow/sidecar
  // equivalent (design.md flagged this sidecar-side: send-message is an
  // unguarded pass-through, guard must live here). Re-derived from
  // messageStore instead — a JID with at least one real ingested message
  // (via messages-upsert or history-sync-chunk) is, by construction, a real
  // conversation that happened on the connected account. Arguably a
  // stronger guarantee than the old chats.set snapshot, since it requires
  // actual message traffic rather than a bulk chat-list entry.
  hasChatWith(jid: string): boolean {
    return this.messageStore.getMessageCount(jid) > 0
  }

  // MAV-265/task #10: whatsmeow's Client.SendMessage is itself a synchronous
  // call returning (SendResponse, error) directly — confirmed against
  // mautrix-whatsapp's own send path (pkg/connector/handlematrix.go), which
  // just propagates that error straight to its caller rather than treating
  // sends as fire-and-forget. The sidecar now correlates that result back
  // over IPC via cmdId (sidecar/commands.go's handleSendMessage), so this can
  // throw on a real send failure again, same as the old `await
  // sock.sendMessage()` could.
  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.sidecarProcess || !this.sidecarConnected) throw new Error('WhatsApp not connected')
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
    await this.sendCommandAwaitAck('send-message', { jid: normalised, text })
  }

  private setStatus(s: WAConnectionStatus): void {
    this.status = s
    this.emit('status', s)
  }

  async retry(): Promise<void> {
    this.reconnectAttempts = 0
    this.consecutiveProtocolErrors = 0
    await this.start()
  }

  // MAV-265: sends one NDJSON command line to the sidecar's stdin, matching
  // sidecar/protocol.go's InEnvelope shape. Returns the command's correlation
  // id — callers that don't care about the result (fetch-history, logout,
  // both of which signal completion via their own events) can just ignore
  // it; callers that do (send-message, list-groups) use
  // sendCommandAwaitAck() instead, which wraps this and resolves off the
  // sidecar's command-ack/command-error events.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendCommand(cmd: string, payload: any): string {
    const id = String(this.commandSeq++)
    if (!this.sidecarProcess?.stdin?.writable) {
      console.warn(`[WhatsApp] sendCommand(${cmd}): sidecar not running, dropped`)
      return id
    }
    const line = JSON.stringify({
      v: SIDECAR_PROTOCOL_VERSION,
      type: 'command',
      cmd,
      id,
      payload,
    })
    this.sidecarProcess.stdin.write(line + '\n')
    return id
  }

  private commandSeq = 0

  // MAV-265/task #10: pending command-ack/command-error correlation, keyed by
  // cmdId (sidecar/protocol.go's EventCommandAck/EventCommandError). Only
  // send-message and list-groups use this path today — see sendCommand()'s
  // comment for why fetch-history/logout don't need it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingCommands = new Map<string, { resolve: (payload: any) => void; reject: (err: Error) => void }>()

  private static readonly COMMAND_ACK_TIMEOUT_MS = 15_000

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendCommandAwaitAck(cmd: string, payload: any): Promise<any> {
    if (!this.sidecarProcess || !this.sidecarConnected) {
      return Promise.reject(new Error('WhatsApp not connected'))
    }
    const id = this.sendCommand(cmd, payload)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(id)
        reject(new Error(`${cmd}: sidecar did not respond within ${WhatsAppManager.COMMAND_ACK_TIMEOUT_MS}ms`))
      }, WhatsAppManager.COMMAND_ACK_TIMEOUT_MS)
      this.pendingCommands.set(id, {
        resolve: (p) => { clearTimeout(timer); resolve(p) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
    })
  }

  async start(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return
    this.setStatus('connecting')
    this.intentionalShutdown = false

    if (this.sidecarProcess) {
      try { this.sidecarProcess.removeAllListeners(); this.sidecarProcess.kill() } catch { /* ignore */ }
      this.sidecarProcess = null
    }
    this.sidecarConnected = false

    try {
      await fs.mkdir(LOOP_DIR, { recursive: true })

      const child = spawn(resolveSidecarBinaryPath(), [], {
        env: { ...process.env, LOOP_WHATSMEOW_DB_PATH: WHATSMEOW_SESSION_DB_PATH },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      this.sidecarProcess = child

      const rl = createInterface({ input: child.stdout })
      rl.on('line', (line) => this.handleSidecarLine(line))

      // Sidecar's own stderr is Go's internal whatsmeow/sqlstore log output
      // (waLog.Stdout(..., "ERROR", true) per sidecar/main.go), not part of
      // the JSON protocol — surfaced for debugging only.
      child.stderr.on('data', (chunk: Buffer) => {
        console.warn('[WhatsApp][sidecar stderr]', chunk.toString().trim())
      })

      child.on('error', (err) => {
        console.error('[WhatsApp] sidecar process error:', err)
        this.handleSidecarExit()
      })

      child.on('exit', (code, signal) => {
        console.warn(`[WhatsApp] sidecar process exited (code=${code}, signal=${signal})`)
        this.handleSidecarExit()
      })
    } catch (err) {
      console.error('[WhatsApp] Failed to start sidecar:', err)
      this.setStatus('disconnected')
      this.emit('disconnected', { loggedOut: false })
    }
  }

  // design.md Section 3, "Sidecar crash / unexpected exit": detect exit,
  // treat exactly like Baileys' old connection.close handling — respawn
  // with the same exponential-backoff budget (MAX_RECONNECT_ATTEMPTS = 8,
  // pattern from aee2ab7) now applied to process respawns instead of socket
  // reconnects. A deliberate shutdown (disconnect()/app quit) skips all of
  // this via intentionalShutdown.
  private handleSidecarExit(): void {
    this.sidecarProcess = null
    this.sidecarConnected = false
    this.rejectAllPendingCommands('WhatsApp sidecar exited before responding')
    if (this.intentionalShutdown) return

    if (!this.hasConnectedOnce) {
      this.setStatus('disconnected')
      const delay = Math.min(800 * Math.pow(2, this.reconnectAttempts), 15_000)
      this.reconnectAttempts++
      console.warn(`[WhatsApp] Sidecar exited pre-connect, retry ${this.reconnectAttempts} in ${delay}ms`)
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

    if (this.reconnectAttempts >= WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES) {
      this.reconnectAttempts = 0
      this.consecutiveProtocolErrors = 0
      this.setStatus('failed')
      this.emit('connection-failed', { reason: 'sidecar-exit' })
      return
    }

    const delay = WhatsAppManager.CIRCUIT_BREAKER_BACKOFF[this.reconnectAttempts] ?? 5000
    this.reconnectAttempts++
    this.setStatus('reconnecting')
    this.emit('reconnecting', { attempt: this.reconnectAttempts, max: WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES })
    console.warn(`[WhatsApp] Post-connect sidecar exit, retry ${this.reconnectAttempts} in ${delay}ms`)
    setTimeout(() => this.start(), delay)
  }

  // MAV-265: routes one parsed NDJSON line from the sidecar to the matching
  // handler, mirroring the 11 event names in sidecar/protocol.go. A
  // malformed/unparseable line or a protocol version mismatch is logged and
  // dropped, never allowed to crash the main process (design.md Section 4,
  // "IPC protocol version skew").
  private handleSidecarLine(line: string): void {
    if (!line.trim()) return
    let env: SidecarOutEnvelope
    try {
      env = JSON.parse(line)
    } catch (err) {
      console.warn('[WhatsApp] sidecar emitted unparseable line:', err, line.slice(0, 200))
      return
    }
    if (env.v !== SIDECAR_PROTOCOL_VERSION) {
      console.error(
        `[WhatsApp] sidecar protocol version mismatch: got v${env.v}, want v${SIDECAR_PROTOCOL_VERSION} ` +
        `(event: ${env.event}) — dropping message, sidecar binary may be stale`
      )
      return
    }
    const p = env.payload ?? {}
    switch (env.event) {
      case 'qr':
        this.currentQR = p.code
        this.setStatus('qr_pending')
        this.emit('qr', p.code)
        break
      case 'connection-update':
        this.handleConnectionUpdate(p)
        break
      case 'history-sync-chunk':
        this.handleSidecarHistorySyncChunk(p)
        break
      case 'messages-upsert':
        this.handleSidecarMessageUpsert(p)
        break
      case 'receipt-update':
        this.handleSidecarReceiptUpdate(p)
        break
      case 'call':
        this.handleSidecarCall(p)
        break
      case 'labels-edit':
        this.handleSidecarLabelsEdit(p)
        break
      case 'labels-association':
        this.handleSidecarLabelsAssociation(p)
        break
      case 'groups-upsert':
        this.handleSidecarGroupsUpsert(p)
        break
      case 'groups-update':
        this.handleSidecarGroupsUpdate(p)
        break
      case 'group-participants-update':
        this.handleSidecarGroupParticipantsUpdate(p)
        break
      case 'log':
        console.log('[WhatsApp][sidecar]', p.message)
        break
      case 'fatal':
        console.error('[WhatsApp][sidecar fatal]', p.message)
        break
      case 'command-ack':
        this.resolvePendingCommand(p.cmdId, p)
        break
      case 'command-error':
        this.rejectPendingCommand(p.cmdId, new Error(p.error ?? `${p.cmd ?? 'command'} failed`))
        break
      default:
        console.warn('[WhatsApp] unknown sidecar event:', env.event)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolvePendingCommand(cmdId: string | undefined, payload: any): void {
    if (!cmdId) return
    const pending = this.pendingCommands.get(cmdId)
    if (!pending) return // already timed out, or a fetch-history/logout with no correlation
    this.pendingCommands.delete(cmdId)
    pending.resolve(payload)
  }

  private rejectPendingCommand(cmdId: string | undefined, err: Error): void {
    if (!cmdId) return
    const pending = this.pendingCommands.get(cmdId)
    if (!pending) return
    this.pendingCommands.delete(cmdId)
    pending.reject(err)
  }

  // Sidecar died (crash/respawn) with commands still in flight — those
  // promises must not hang until COMMAND_ACK_TIMEOUT_MS for no reason.
  private rejectAllPendingCommands(reason: string): void {
    for (const [id, pending] of this.pendingCommands) {
      pending.reject(new Error(reason))
      this.pendingCommands.delete(id)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleConnectionUpdate(p: { state: string; reason?: string }): void {
    switch (p.state) {
      case 'connecting':
        this.setStatus('connecting')
        break
      case 'connected':
        this.currentQR = null
        this.sidecarConnected = true
        this.hasConnectedOnce = true
        this.reconnectAttempts = 0
        this.consecutiveProtocolErrors = 0
        this.setStatus('connected')
        this.emit('connected')
        this.decommissionBaileysAuth()
        break
      case 'disconnected':
        // whatsmeow's own Client auto-reconnects transient drops internally
        // (design.md Section 3 discussion) — this is a signal, not
        // necessarily a failure requiring our own respawn logic. Surface it
        // to the renderer as 'reconnecting' UX, but don't tear down the
        // sidecar process; a genuine process death is handled separately by
        // handleSidecarExit().
        this.sidecarConnected = false
        this.setStatus('reconnecting')
        this.emit('reconnecting', { attempt: this.reconnectAttempts, max: WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES })
        break
      case 'logged-out':
        this.sidecarConnected = false
        this.reconnectAttempts = 0
        this.consecutiveProtocolErrors = 0
        this.setStatus('logged_out')
        this.emit('logged-out')
        this.clearWhatsmeowSession().catch(() => {})
        break
      case 'connect-failure':
        this.sidecarConnected = false
        this.setStatus('protocol_error')
        this.emit('protocol-error', { reason: p.reason ?? 'connect-failure' })
        break
      case 'qr-timeout':
        this.setStatus('disconnected')
        this.emit('reconnecting', { attempt: this.reconnectAttempts, max: WhatsAppManager.MAX_CIRCUIT_BREAKER_RETRIES })
        break
      default:
        console.warn('[WhatsApp] unknown connection-update state:', p.state)
    }
  }

  // MAV-265/task #3: app quit must not unlink the WhatsApp device — only
  // disconnect() (an explicit user "log out" action) should ever send the
  // sidecar's `logout` command. This just asks the sidecar to exit cleanly:
  // sidecar/main.go already handles SIGTERM by calling whatsmeow's
  // Disconnect() (not Logout()) before exiting, so the session persists in
  // whatsmeow-session.db for the next launch. Directly informed by the
  // spike incident where two orphaned sidecar binaries were left running
  // simultaneously (design.md Section 4, "App quit / clean shutdown") — that
  // class of bug must not ship.
  shutdownForAppQuit(): void {
    this.intentionalShutdown = true
    if (!this.sidecarProcess) return
    try {
      this.sidecarProcess.kill('SIGTERM')
    } catch { /* ignore — process may already be gone */ }
  }

  async disconnect(): Promise<void> {
    this.intentionalShutdown = true
    if (this.sidecarProcess) {
      this.sendCommand('logout', {})
      // Give the sidecar a moment to run whatsmeow's Client.Logout() before
      // killing the process — logout is a network call, not instantaneous.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      try { this.sidecarProcess.kill() } catch { /* ignore */ }
      this.sidecarProcess = null
    }
    this.sidecarConnected = false
    this.setStatus('disconnected')
    this.currentQR = null
    this.hasConnectedOnce = false
    this.displayNameCache.clear()
    // MAV-256: a full disconnect/logout can be followed by linking a
    // different WhatsApp account — don't let that account inherit this one's
    // cached group data.
    this.groupCache.clear()
    this.groupCacheWrittenAt = null
    this.groupCacheLoaded = false
    try {
      await fs.unlink(GROUP_CACHE_PATH)
    } catch { /* fine if it never existed */ }
    // MAV-263: same reasoning — a second account linked in the same install
    // must never inherit the first account's message history.
    this.messageStore.clearAll()
    await this.clearWhatsmeowSession()
  }

  // MAV-265: replaces clearAuth() (Baileys-specific, see AUTH_DIR comment
  // above) — wipes whatsmeow's sqlite session store so a subsequent start()
  // begins a fresh QR pairing instead of reusing a logged-out session.
  // better-sqlite3/modernc.org-sqlite can leave -wal/-shm sidecar files
  // alongside the main db; remove all three.
  async clearWhatsmeowSession(): Promise<void> {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        await fs.unlink(WHATSMEOW_SESSION_DB_PATH + suffix)
      } catch { /* fine if it never existed */ }
    }
  }

  // MAV-265/task #6: the old Baileys credential directory is dead weight
  // once whatsmeow has a confirmed working connection (design.md Section 1)
  // — this only removes Loop's local files. It does not and cannot unlink
  // the old Baileys device from WhatsApp's Linked Devices on the server side
  // (no API for that once Baileys itself is gone); that remains a manual
  // step for the user. Fire-and-forget from the 'connected' handler:
  // deletion failing must never block or unwind a successful connect.
  private decommissionBaileysAuth(): void {
    fs.rm(AUTH_DIR, { recursive: true, force: true })
      .then(() => console.log('[WhatsApp] Decommissioned old Baileys auth directory:', AUTH_DIR))
      .catch((err) => console.warn('[WhatsApp] Failed to decommission Baileys auth directory (non-fatal):', err))
  }

  // MAV-265: Baileys' sock.fetchMessagesFromWA() (a live per-chat query) has
  // no whatsmeow/sidecar command equivalent (design.md's command set is
  // fetch-history/logout/send-message only, and fetch-history's result
  // arrives asynchronously as a history-sync-chunk event, not a return
  // value this method could await). Reimplemented as a synchronous local
  // read from messageStore, which already has every message ingested via
  // messages-upsert/history-sync-chunk — no network call, and actually
  // faster than the old live-fetch path. Requires MessageStore.getMessages()
  // (new, additive method — see report).
  async getMessages(jid: string, limit = 50): Promise<WAMessage[]> {
    const records = this.messageStore.getMessages(jid, limit)
    return records
      .filter((r) => r.text !== null)
      .map((r) => ({ id: r.id, fromMe: r.fromMe, timestamp: r.timestamp, text: r.text }))
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  // MAV-265: previously sourced from Baileys' chatStore (chats.set/upsert),
  // which has no whatsmeow/sidecar equivalent. Rebuilt from messageStore's
  // own accumulated data instead: every DM chat Loop has ever ingested a
  // message for, with recency computed from the latest stored message
  // timestamp rather than Baileys' conversationTimestamp field. Requires
  // MessageStore.getDmChatSummaries() (new, additive method — see report).
  // displayName now comes from displayNameCache (populated from
  // messages-upsert's pushName field), not sock.contacts[] — best-effort,
  // may be blank for contacts Loop hasn't seen a live message from yet.
  async buildTieStrengthMap(): Promise<Map<string, { strength: 'high' | 'medium' | 'low'; messageCount: number; displayName: string }>> {
    const map = new Map<string, { strength: 'high' | 'medium' | 'low'; messageCount: number; displayName: string }>()
    try {
      const nowSec = Date.now() / 1000
      const dmChats = this.messageStore.getDmChatSummaries()
      for (const chat of dmChats) {
        const daysSince = chat.lastTimestamp > 0 ? (nowSec - chat.lastTimestamp) / 86400 : Infinity
        const strength: 'high' | 'medium' | 'low' =
          daysSince <= 30  ? 'high' :
          daysSince <= 180 ? 'medium' : 'low'
        const messageCount = this.messageStore.getMessageCount(chat.chatId)
        const displayName = this.displayNameCache.get(chat.chatId) ?? ''
        map.set(chat.chatId, { strength, messageCount, displayName })
      }
    } catch { /* non-fatal */ }
    return map
  }

  // Patterns that indicate broadcast/admin/noise groups rather than real social chapters
  private static readonly GARBAGE_NAME_RE = /\b(broadcast|announce|announcement|update|updates|news|newsletter|society|alumni|association|residents|colony|welfare|committee|notices?|info|helpdesk|support|class of|batch of|school of|investor meet|networking event)\b/i

  // MAV-265/task #10: sidecar's `list-groups` command wraps whatsmeow's
  // client.GetJoinedGroups() (sidecar/commands.go's handleListGroups),
  // mirroring mautrix-whatsapp's chatinfo.go pattern — group membership is
  // fetched on demand, not assembled purely from passive events. Refreshes
  // groupCache for every joined group in one round trip, so a group the
  // account joined before the sidecar's current run is no longer stuck
  // unresolved (the gap flagged when task #2 first shipped).
  private async listJoinedGroupsFromSidecar(): Promise<void> {
    if (!this.sidecarProcess || !this.sidecarConnected) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ack: { groups: Array<{ chatId: string; name?: string; participants?: string[] }> } =
      await this.sendCommandAwaitAck('list-groups', {})
    for (const g of ack.groups ?? []) {
      const existing = this.groupCache.get(g.chatId)
      this.groupCache.set(g.chatId, {
        id: g.chatId,
        name: g.name ?? existing?.name ?? '',
        members: g.participants ?? existing?.members ?? [],
        lastMessageAt: existing?.lastMessageAt ?? 0,
        createdAt: existing?.createdAt ?? null,
      })
    }
    await this.saveGroupCache()
  }

  private async fetchRealGroupMembers(groupIds: string[]): Promise<Map<string, string[]>> {
    await this.loadGroupCache()

    const missing = groupIds.filter((id) => {
      const cached = this.groupCache.get(id)
      return !cached || cached.members.length === 0
    })
    if (missing.length > 0) {
      try {
        await this.listJoinedGroupsFromSidecar()
      } catch (err) {
        console.warn('[WA] fetchRealGroupMembers: list-groups active fetch failed, falling back to cache:', err)
      }
    }

    const membersByGroup = new Map<string, string[]>()
    let unresolved = 0
    for (const groupId of groupIds) {
      const cached = this.groupCache.get(groupId)
      if (cached && cached.members.length > 0) {
        membersByGroup.set(groupId, cached.members)
      } else {
        unresolved++
      }
    }
    if (unresolved > 0) {
      console.warn(
        `[WA] fetchRealGroupMembers: ${unresolved}/${groupIds.length} groups still unresolved after an active ` +
        `list-groups fetch — likely not joined groups (e.g. broadcast lists) or sidecar not connected`
      )
    }
    return membersByGroup
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

  // MAV-265: sidecar's groups-upsert (events.JoinedGroup) fires on actively
  // joining a group, with `join` carrying the *initial* member list — unlike
  // Baileys' groups.upsert, which delivered an array of full group metas.
  // One event per group now, not a batch.
  private handleSidecarGroupsUpsert(p: { chatId: string; name?: string; join?: string[] }): void {
    const existing = this.groupCache.get(p.chatId)
    this.groupCache.set(p.chatId, {
      id: p.chatId,
      name: p.name ?? existing?.name ?? '',
      members: p.join ?? existing?.members ?? [],
      lastMessageAt: existing?.lastMessageAt ?? 0,
      createdAt: existing?.createdAt ?? null,
    })
    this.saveGroupCache().catch(() => {})
  }

  // sidecar's groups-update (events.GroupInfo) carries name/metadata only —
  // membership deltas from the same underlying whatsmeow event are handled
  // separately by handleSidecarGroupParticipantsUpdate, mirroring the old
  // Baileys split (handleGroupsUpdate = name only, handleGroupParticipantsUpdate
  // = membership).
  private handleSidecarGroupsUpdate(p: { chatId: string; name?: string }): void {
    const existing = this.groupCache.get(p.chatId)
    if (!existing) return // not cached yet — no active fetch path exists to backfill (see MAV-265 gap above)
    if (p.name) this.groupCache.set(p.chatId, { ...existing, name: p.name })
    this.saveGroupCache().catch(() => {})
  }

  private handleSidecarGroupParticipantsUpdate(p: {
    chatId: string
    join?: string[]
    leave?: string[]
  }): void {
    const existing = this.groupCache.get(p.chatId)
    if (!existing) return // not cached yet — the next passive groups-upsert will pick it up
    let members = existing.members
    if (p.join?.length) members = [...new Set([...members, ...p.join])]
    if (p.leave?.length) members = members.filter((m) => !p.leave!.includes(m))
    this.groupCache.set(p.chatId, { ...existing, members })
    this.saveGroupCache().catch(() => {})
  }

  // ─── MAV-263: message persistence ──────────────────────────────────────────

  // Maps a whatsmeow WebMessageInfo (protojson, from a history-sync-chunk
  // event's chats[].messages[]) into a MessageRecord, or null if it lacks
  // the minimum fields needed to key/dedup a row (chat_id, id). WebMessageInfo
  // shares the same field names as Baileys' WAMessage (both are generated
  // from the same underlying WhatsApp WebMessageInfo protobuf spec), so this
  // mapping is unchanged from the pre-MAV-265 Baileys version.
  // Deliberately does NOT apply getMessages()'s text-only filter — a
  // chat that's mostly voice notes/photos would otherwise be systematically
  // under-counted, biasing the frequency signal downstream. Every message is
  // inserted (text = null when not text-representable).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapHistorySyncMessage(m: any): MessageRecord | null {
    const chatId: string = m.key?.remoteJid ?? ''
    const id: string = m.key?.id ?? ''
    if (!chatId || !id) return null
    const fromMe: boolean = m.key?.fromMe ?? false
    // key.participant is the real sender only for group messages; for DMs,
    // key.remoteJid (== chatId) is both the chat and the sender when !fromMe.
    const senderJid: string = fromMe ? 'me' : (m.key?.participant ?? chatId)
    const timestamp: number = Number(m.messageTimestamp ?? 0)
    const text: string | null = m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? null
    return { id, chatId, senderJid, fromMe, timestamp, text }
  }

  // MAV-265: sidecar's history-sync-chunk payload (sidecar/events.go) is
  // pre-batched (~300 messages/chunk) and grouped by chat — shape:
  // { syncType, progress, isLast, chats: [{ chatId, name, messages: [...] }] }.
  private handleSidecarHistorySyncChunk(p: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chats?: { chatId: string; name?: string; messages: any[] }[]
    isLast?: boolean
    progress?: number
  }): void {
    const records: MessageRecord[] = []
    for (const chat of p.chats ?? []) {
      for (const m of chat.messages ?? []) {
        const r = this.mapHistorySyncMessage(m)
        if (r) records.push(r)
      }
    }
    this.messageStore.insertMessages(records)
    if (p.isLast) {
      console.log(`[WhatsApp] history-sync-chunk: callback flush complete (${records.length} messages this chunk, progress=${p.progress})`)
    }
  }

  // MAV-265: sidecar's messages-upsert payload (sidecar/events.go) is a
  // single live message already flattened by the sidecar — chatId/senderId/
  // id/isFromMe/timestamp as top-level fields, not nested under `.key` like
  // Baileys/history-sync messages. `message` is protojson-encoded
  // waE2E.Message (content only, no envelope).
  private handleSidecarMessageUpsert(p: {
    chatId: string
    senderId: string
    id: string
    isFromMe: boolean
    timestamp: number
    pushName?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message?: any
  }): void {
    if (!p.chatId || !p.id) return
    if (p.pushName) this.displayNameCache.set(p.chatId, p.pushName)
    const senderJid = p.isFromMe ? 'me' : p.senderId
    const text: string | null = p.message?.conversation ?? p.message?.extendedTextMessage?.text ?? null
    this.messageStore.insertMessages([
      { id: p.id, chatId: p.chatId, senderJid, fromMe: p.isFromMe, timestamp: p.timestamp, text },
    ])
  }

  // ─── MAV-264: remaining Baileys capability wiring ──────────────────────────

  // MAV-265: sidecar's receipt-update payload is one event per receipt
  // (chatId/senderId/messageIds[]/type/timestamp), not Baileys' array-of-
  // updates shape. `type` is whatsmeow's types.ReceiptType (e.g. "read",
  // "read-self", "delivered", "played", "sender") — mapped here to the same
  // receiptTimestamp/readTimestamp split the old Baileys handler produced,
  // since messageStore's schema (unchanged) only has those two columns.
  private handleSidecarReceiptUpdate(p: {
    chatId: string
    senderId: string
    messageIds: string[]
    type: string
    timestamp: number
  }): void {
    if (!p.chatId || !p.senderId || !Array.isArray(p.messageIds)) return
    const isRead = p.type.includes('read')
    const records: ReceiptRecord[] = p.messageIds
      .filter((messageId) => !!messageId)
      .map((messageId) => ({
        chatId: p.chatId,
        messageId,
        userJid: p.senderId,
        receiptTimestamp: isRead ? null : p.timestamp,
        readTimestamp: isRead ? p.timestamp : null,
      }))
    this.messageStore.insertReceipts(records)
  }

  // Call history — a graph-strength signal fully independent of text.
  // calls.chat_jid has no FK dependency on messages.chat_id: a call can
  // exist for a JID Loop has never seen a message from. MAV-265: sidecar
  // emits one call event per call-related whatsmeow event (offer/offer-
  // notice/terminate/reject), not Baileys' batched array — `kind` replaces
  // Baileys' `status` field, `groupJid || from` replaces `from ?? chatId`.
  private handleSidecarCall(p: {
    callId: string
    from: string
    groupJid?: string
    timestamp: number
    kind: string
  }): void {
    const chatJid = p.groupJid || p.from
    if (!p.callId || !chatJid) return
    this.messageStore.insertCalls([
      { id: p.callId, chatJid, status: p.kind, isVideo: false, timestamp: p.timestamp },
    ])
  }

  // labels.edit can mark a label deleted (deleted: true) without removing
  // existing label_associations rows — messageStore.upsertLabel never
  // cascades a delete, only flips the flag on the label itself.
  private handleSidecarLabelsEdit(p: { labelId: string; name?: string; deleted?: boolean }): void {
    if (!p.labelId) return
    const record: LabelRecord = { id: p.labelId, name: p.name ?? '', deleted: Boolean(p.deleted) }
    this.messageStore.upsertLabel(record)
  }

  // MAV-265: sidecar's labels-association payload carries a `labeled`
  // boolean (add vs. remove). messageStore.upsertLabelAssociation has no
  // removal counterpart (unchanged schema, out of this task's scope) — a
  // `labeled: false` (removal) event is logged but not applied, a known
  // gap flagged for follow-up rather than silently dropped.
  private handleSidecarLabelsAssociation(p: {
    labelId: string
    chatId: string
    msgId?: string
    labeled: boolean
  }): void {
    if (!p.labelId || !p.chatId) return
    if (!p.labeled) {
      console.warn(`[WhatsApp] labels-association removal for label ${p.labelId} on ${p.chatId} — no removal path in messageStore, skipped`)
      return
    }
    const record: LabelAssociationRecord = {
      labelId: p.labelId,
      chatId: p.chatId,
      messageId: p.msgId ?? null,
    }
    this.messageStore.upsertLabelAssociation(record)
  }

  // On-demand per-chat deep-backfill pull, independent of the sync-payload
  // mechanism entirely — the fallback lever if the shouldSyncHistoryMessage
  // fix alone doesn't get real depth. MAV-265: now a fire-and-forget sidecar
  // command (fetch-history); the result arrives asynchronously via the same
  // history-sync-chunk event already wired (sidecar/commands.go), this
  // method's job is purely to trigger the additional sync, not process a
  // return value — same contract as the pre-MAV-265 version.
  // messageStore.getOldestMessage() doesn't track fromMe, so
  // oldestKnownFromMe is approximated as false — a known limitation (see
  // report); it only affects whatsmeow's internal history-request anchor,
  // not what's persisted.
  async fetchOlderMessages(chatId: string, count = 50): Promise<void> {
    if (!this.sidecarProcess || !this.sidecarConnected) return
    const oldest = this.messageStore.getOldestMessage(chatId)
    if (!oldest) {
      console.log(`[WhatsApp] fetchOlderMessages: no stored messages for ${chatId}, nothing to anchor to — no-op`)
      return
    }
    this.sendCommand('fetch-history', {
      chatId,
      oldestKnownMessageId: oldest.id,
      oldestKnownFromMe: false,
      oldestKnownTimestamp: oldest.timestamp,
      count,
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
    if (!this.sidecarProcess || !this.sidecarConnected) return []
    try {
      const tieMap = await this.buildTieStrengthMap()

      // MAV-265: groupFetchAllParticipating() (a live bulk RPC) has no
      // sidecar equivalent (see fetchRealGroupMembers's MAV-265 gap comment
      // above) — candidate discovery is now the groupCache itself, built
      // entirely from passive groups-upsert/groups-update/
      // group-participants-update events since this sidecar session
      // started. A group the account joined before this run and that has
      // had no membership-changing activity since will not appear here.
      await this.loadGroupCache()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateEntries: any[] = []
      for (const g of this.groupCache.values()) {
        const groupId = g.id
        const resolvedName = g.name ?? ''
        if (!resolvedName || resolvedName === groupId) continue
        if (groupId.endsWith('@newsletter')) continue
        if (WhatsAppManager.GARBAGE_NAME_RE.test(resolvedName)) continue
        candidateEntries.push(g)
      }

      const realMembersByGroup = await this.fetchRealGroupMembers(
        candidateEntries.map((m) => m.id as string)
      )

      const results = []
      for (const m of candidateEntries) {
        const groupId: string = m.id
        const resolvedName: string = m.name ?? ''

        const members: string[] = realMembersByGroup.get(groupId) ?? []
        if (members.length === 0) continue // MAV-257: never resolved in any pass — genuinely unknown, skip
        if (members.length > 50) continue
        const createdAt: number | null = m.createdAt ?? null
        // MAV-265: whatsmeow's GroupInfo carries OwnerJID, but the sidecar's
        // groups-upsert/groups-update events don't emit it yet (events.go
        // gap, alongside the MAV-265 group-query gap above) — defaults to
        // false rather than guessing.
        const userIsCreator = false

        const lastMessageAt = Number(m.lastMessageAt ?? createdAt ?? 0)

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

  // MAV-265: previously did a live groupFetchAllParticipating() RPC on a
  // cache miss/stale-cache (see the MAV-265 gap comment on
  // fetchRealGroupMembers above — no sidecar equivalent exists). Now purely
  // cache-driven: returns whatever groupCache has accumulated from passive
  // sidecar group events, fresh or not, since there is no live alternative
  // to fall back to.
  async listGroups(): Promise<{ id: string; name: string; members: string[] }[]> {
    if (!this.sidecarProcess || !this.sidecarConnected) return []
    await this.loadGroupCache()
    if (!this.isGroupCacheFresh()) {
      try {
        await this.listJoinedGroupsFromSidecar()
      } catch (err) {
        console.warn('[WA] listGroups: active list-groups refresh failed, serving stale/cached data:', err)
      }
    }
    return [...this.groupCache.values()].map(({ id, name, members }) => ({ id, name, members }))
  }
}

export default WhatsAppManager
