import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSidecarProcess, sentCommands, type MockSidecarProcess } from './mocks/sidecarProcess'

const readdirMock = vi.fn()
const unlinkMock = vi.fn()
const readFileMock = vi.fn()
const writeFileMock = vi.fn()
const rmMock = vi.fn()

vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: readdirMock,
    unlink: unlinkMock,
    readFile: readFileMock,
    writeFile: writeFileMock,
    rm: rmMock,
  }
  return { default: { promises }, promises }
})

// MAV-265/task #8: `sendMessage()`/`fetchRealGroupMembers()` now go through
// `sendCommandAwaitAck()`, which requires a "connected" sidecar
// (`sidecarProcess` set + `sidecarConnected: true`) or it rejects immediately
// with "WhatsApp not connected" — poke both private fields directly, same
// style the pre-migration tests used for `(wa as any).socket`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function connectMockSidecar(wa: any): MockSidecarProcess {
  const proc = createMockSidecarProcess()
  wa.sidecarProcess = proc
  wa.sidecarConnected = true
  return proc
}

// Feeds one sidecar event straight into handleSidecarLine(), bypassing the
// stdout/readline plumbing entirely — these tests inject sidecarProcess
// directly rather than going through start()'s spawn(), so nothing is
// actually reading proc.stdout. (whatsapp-connection.test.ts exercises the
// real stdout/readline path via a mocked child_process.spawn().)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dispatch(wa: any, event: string, payload: any = {}): void {
  wa.handleSidecarLine(JSON.stringify({ v: 1, type: 'event', event, payload }))
}

// Waits for the sidecar command to actually hit stdin. loadGroupCache()'s
// mocked fs.readFile() await, plus the outer async fn's own resolution,
// take more than one microtask tick — a bare `await Promise.resolve()`
// intermittently races ahead of the write. A macrotask tick guarantees the
// entire microtask queue drains first.
function flushToCommand(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('WhatsAppManager', () => {
  beforeEach(() => {
    vi.resetModules()
    readdirMock.mockReset()
    unlinkMock.mockReset().mockResolvedValue(undefined)
    readFileMock.mockReset().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    writeFileMock.mockReset().mockResolvedValue(undefined)
    rmMock.mockReset().mockResolvedValue(undefined)
  })

  // MAV-265: disconnect() now wipes the whatsmeow session db (clearWhatsmeowSession(),
  // 3 unlink attempts for the main file + -wal/-shm sidecars) plus the MAV-256
  // group-cache-file unlink — the Baileys AUTH_DIR readdir/unlink path is gone
  // entirely (see AUTH_DIR's comment in whatsapp.ts: kept only for task #6's
  // decommissionBaileysAuth(), which fires on 'connected', not disconnect()).
  it('disconnect() clears the whatsmeow session db and the group cache file', async () => {
    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    // whatsmeow-session.db, .db-wal, .db-shm + groups-cache.json = 4 unlink calls
    expect(unlinkMock).toHaveBeenCalledTimes(4)
  })

  it('disconnect() does not throw if the whatsmeow session db does not exist', async () => {
    unlinkMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await expect(wa.disconnect()).resolves.not.toThrow()
  })

  // MAV-255: a fabricated/externally-injected contact with no real WhatsApp
  // conversation must never reach a real send — this is the guard that failed
  // in the incident that prompted this ticket. MAV-265/task #10: re-derived
  // from messageStore.getMessageCount() instead of Baileys' chatStore (see
  // hasChatWith()'s comment in whatsapp.ts) and now round-trips through the
  // sidecar's command-ack/command-error correlation instead of a fire-and-
  // forget sock.sendMessage() call.
  describe('sendMessage() refuses unverified contacts (MAV-255)', () => {
    it('throws if there is no existing chat for the JID, even with a connected sidecar', async () => {
      const { default: MessageStore } = await import('../main/messageStore')
      const store = MessageStore.getInstance()
      await store.init(':memory:')

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      await expect(wa.sendMessage('447700900001@s.whatsapp.net', 'hi')).rejects.toThrow(
        /no existing whatsapp conversation/i
      )
      expect(sentCommands(proc)).toHaveLength(0)
    })

    it('sends when the JID has a real, known chat, resolving on the sidecar\'s command-ack', async () => {
      const { default: MessageStore } = await import('../main/messageStore')
      const store = MessageStore.getInstance()
      await store.init(':memory:')
      const jid = '447700900003@s.whatsapp.net'
      store.insertMessages([{ id: 'm1', chatId: jid, senderJid: jid, fromMe: false, timestamp: 1, text: 'hey' }])

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const sendPromise = wa.sendMessage(jid, 'hi')
      // sendMessage() awaits the sidecar's ack — simulate it arriving async,
      // same as the real process would.
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      expect(cmd).toMatchObject({ cmd: 'send-message', payload: { jid, text: 'hi' } })
      dispatch(wa, 'command-ack', { cmdId: cmd.id, messageId: 'wamid.abc', timestamp: 123 })
      await expect(sendPromise).resolves.toBeUndefined()
    })

    it('sendMessage() rejects when the sidecar reports a command-error', async () => {
      const { default: MessageStore } = await import('../main/messageStore')
      const store = MessageStore.getInstance()
      await store.init(':memory:')
      const jid = '447700900005@s.whatsapp.net'
      store.insertMessages([{ id: 'm1', chatId: jid, senderJid: jid, fromMe: false, timestamp: 1, text: 'hey' }])

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const sendPromise = wa.sendMessage(jid, 'hi')
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarLine(
        JSON.stringify({ v: 1, type: 'event', event: 'command-error', payload: { cmdId: cmd.id, cmd: 'send-message', error: 'not-registered' } })
      )

      await expect(sendPromise).rejects.toThrow(/not-registered/)
    })

    it('hasChatWith() reflects messageStore membership directly', async () => {
      const { default: MessageStore } = await import('../main/messageStore')
      const store = MessageStore.getInstance()
      await store.init(':memory:')
      const jid = '447700900004@s.whatsapp.net'
      store.insertMessages([{ id: 'm1', chatId: jid, senderJid: jid, fromMe: false, timestamp: 1, text: 'hey' }])

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()

      expect(wa.hasChatWith(jid)).toBe(true)
      expect(wa.hasChatWith('447700900099@s.whatsapp.net')).toBe(false)
    })
  })

  // MAV-256: listGroups() used to re-run the full rate-limited fetch on
  // every single call, even seconds apart, because groups-discovered.json
  // was write-only. These tests cover the read-write cache, now refreshed
  // via the sidecar's `list-groups` command (MAV-265/task #10) instead of
  // Baileys' live groupFetchAllParticipating()/groupMetadata() RPCs.
  describe('listGroups() group cache (MAV-256)', () => {
    it('serves from cache and skips the active list-groups fetch when the cache is fresh', async () => {
      readFileMock.mockResolvedValue(JSON.stringify({
        writtenAt: Date.now(),
        groups: [{ id: 'g1@g.us', name: 'Cached Group', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null }],
      }))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const result = await wa.listGroups()

      expect(result).toEqual([{ id: 'g1@g.us', name: 'Cached Group', members: ['a@s.whatsapp.net'] }])
      expect(sentCommands(proc)).toHaveLength(0)
    })

    it('ignores a stale cache (older than 24h) and issues an active list-groups command', async () => {
      const staleWrittenAt = Date.now() - 25 * 60 * 60 * 1000
      readFileMock.mockResolvedValue(JSON.stringify({
        writtenAt: staleWrittenAt,
        groups: [{ id: 'stale@g.us', name: 'Stale Group', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null }],
      }))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const resultPromise = wa.listGroups()
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      expect(cmd).toMatchObject({ cmd: 'list-groups' })
      dispatch(wa, 'command-ack', { cmdId: cmd.id, groups: [] })

      const result = await resultPromise
      expect(result).toEqual([{ id: 'stale@g.us', name: 'Stale Group', members: ['a@s.whatsapp.net'] }])
    })

    it('treats a legacy bare-array cache file (pre-MAV-256 shape) as present but stale', async () => {
      readFileMock.mockResolvedValue(JSON.stringify([
        { id: 'legacy@g.us', name: 'Legacy', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null },
      ]))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const resultPromise = wa.listGroups()
      await flushToCommand()
      const [cmd] = sentCommands(proc)

      // Must not crash on the old shape, and must still treat it as stale
      // (no writtenAt in the legacy file) rather than serving it as fresh.
      expect(cmd).toMatchObject({ cmd: 'list-groups' })
      dispatch(wa, 'command-ack', { cmdId: cmd.id, groups: [] })
      await resultPromise
    })

    it('returns [] without touching the cache when there is no connected sidecar', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).sidecarProcess = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).sidecarConnected = false

      const result = await wa.listGroups()

      expect(result).toEqual([])
      expect(readFileMock).not.toHaveBeenCalled()
    })

    // These call the real private sidecar-event handlers directly, mirroring
    // what handleSidecarLine() dispatches to for groups-upsert/groups-update/
    // group-participants-update (sidecar/events.go's JoinedGroup/GroupInfo
    // mapping) — one event per group now, not Baileys' batched array.
    it('handleSidecarGroupParticipantsUpdate "join" merges new participants into a cached group', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { members: string[] }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupParticipantsUpdate({ chatId: 'g1@g.us', join: ['b@s.whatsapp.net'] })

      expect(cache.get('g1@g.us')).toMatchObject({ members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'] })
    })

    it('handleSidecarGroupParticipantsUpdate "leave" drops participants from a cached group', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { members: string[] }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupParticipantsUpdate({ chatId: 'g1@g.us', leave: ['b@s.whatsapp.net'] })

      expect(cache.get('g1@g.us')).toMatchObject({ members: ['a@s.whatsapp.net'] })
    })

    it('handleSidecarGroupParticipantsUpdate is a no-op for a group not yet in the cache', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, unknown>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupParticipantsUpdate({ chatId: 'unknown@g.us', join: ['b@s.whatsapp.net'] })

      expect(cache.has('unknown@g.us')).toBe(false)
    })

    it('handleSidecarGroupsUpsert adds a new group to the cache with its initial member list', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { name: string; members: string[] }>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupsUpsert({ chatId: 'new@g.us', name: 'New Group', join: ['a@s.whatsapp.net', 'b@s.whatsapp.net'] })

      expect(cache.get('new@g.us')).toMatchObject({
        name: 'New Group',
        members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'],
      })
    })

    it('handleSidecarGroupsUpdate renames a cached group but ignores updates for uncached groups', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { name: string }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'Old Name', members: [], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupsUpdate({ chatId: 'g1@g.us', name: 'New Name' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarGroupsUpdate({ chatId: 'never-cached@g.us', name: 'Should Be Ignored' })

      expect(cache.get('g1@g.us')).toMatchObject({ name: 'New Name' })
      expect(cache.has('never-cached@g.us')).toBe(false)
    })
  })

  // MAV-265/task #10: fetchRealGroupMembers() no longer takes a `sock`
  // parameter — it issues (at most) one active `list-groups` sidecar command
  // for whatever's missing/empty in the cache, mirroring mautrix-whatsapp's
  // GetJoinedGroups() pattern, rather than Baileys' rate-limited per-group
  // groupMetadata() RPC. The MAV-257/MAV-259 accumulate-across-passes and
  // skip-already-resolved behavioral guarantees still apply, just re-pointed
  // at the new fetch mechanism.
  describe('fetchRealGroupMembers() via the sidecar\'s list-groups command', () => {
    it('falls back to cached members for an already-resolved group when a sibling request triggers a failed list-groups fetch', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { id: string; name: string; members: string[]; lastMessageAt: number; createdAt: number | null }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'], lastMessageAt: 0, createdAt: null })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)
      // g1@g.us is already well-resolved (MAV-259: not "missing"), so on its
      // own it would never trigger a fetch — request it alongside a genuinely
      // unresolved group so the batch list-groups command actually fires,
      // then verify g1's untouched cache entry survives the failure.
      const resultPromise = (wa as any).fetchRealGroupMembers(['g1@g.us', 'other-missing@g.us'])
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      dispatch(wa, 'command-error', { cmdId: cmd.id, cmd: 'list-groups', error: 'sidecar unreachable' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Map<string, string[]> = await resultPromise
      expect(result.get('g1@g.us')).toEqual(['a@s.whatsapp.net', 'b@s.whatsapp.net'])
      expect(result.has('other-missing@g.us')).toBe(false)
    })

    it('leaves a group unresolved (not in the result map) if list-groups fails and it was never cached before', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const resultPromise = (wa as any).fetchRealGroupMembers(['never-seen@g.us'])
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      dispatch(wa, 'command-error', { cmdId: cmd.id, cmd: 'list-groups', error: 'sidecar unreachable' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Map<string, string[]> = await resultPromise
      expect(result.has('never-seen@g.us')).toBe(false)
    })

    it('a list-groups response overwrites a previously-empty entry with fresh members', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { members: string[] }>
      // An empty-members cache entry still counts as "missing" (MAV-259's
      // plausibility bar), so this alone is enough to trigger the fetch —
      // unlike the non-empty-cache case above, no sibling group is needed.
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: [], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)
      const resultPromise = (wa as any).fetchRealGroupMembers(['g1@g.us'])
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      dispatch(wa, 'command-ack', {
        cmdId: cmd.id,
        groups: [{ chatId: 'g1@g.us', name: 'G1', participants: ['fresh@s.whatsapp.net'] }],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Map<string, string[]> = await resultPromise
      expect(result.get('g1@g.us')).toEqual(['fresh@s.whatsapp.net'])
      expect(cache.get('g1@g.us')).toMatchObject({ members: ['fresh@s.whatsapp.net'] })
    })

    it('persists the accumulated cache to disk after a fetch pass', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const resultPromise = (wa as any).fetchRealGroupMembers(['g1@g.us'])
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      dispatch(wa, 'command-ack', {
        cmdId: cmd.id,
        groups: [{ chatId: 'g1@g.us', name: 'G1', participants: ['a@s.whatsapp.net'] }],
      })
      await resultPromise

      expect(writeFileMock).toHaveBeenCalled()
    })

    it('skips the active list-groups fetch entirely when every requested group is already well-resolved in cache', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { id: string; name: string; members: string[]; lastMessageAt: number; createdAt: number | null }>
      cache.set('g1@g.us', {
        id: 'g1@g.us',
        name: 'G1',
        members: ['a@s.whatsapp.net', 'b@s.whatsapp.net', 'c@s.whatsapp.net'],
        lastMessageAt: 0,
        createdAt: null,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Map<string, string[]> = await (wa as any).fetchRealGroupMembers(['g1@g.us'])

      expect(sentCommands(proc)).toHaveLength(0)
      expect(result.get('g1@g.us')).toEqual(['a@s.whatsapp.net', 'b@s.whatsapp.net', 'c@s.whatsapp.net'])
    })

    it('actively fetches a genuinely first-seen group with no cache entry at all', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = connectMockSidecar(wa as any)

      const resultPromise = (wa as any).fetchRealGroupMembers(['never-seen@g.us'])
      await flushToCommand()
      const [cmd] = sentCommands(proc)
      expect(cmd).toMatchObject({ cmd: 'list-groups' })
      dispatch(wa, 'command-ack', {
        cmdId: cmd.id,
        groups: [{ chatId: 'never-seen@g.us', name: 'New Group', participants: ['a@s.whatsapp.net', 'b@s.whatsapp.net', 'c@s.whatsapp.net'] }],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Map<string, string[]> = await resultPromise
      expect(result.get('never-seen@g.us')).toEqual(['a@s.whatsapp.net', 'b@s.whatsapp.net', 'c@s.whatsapp.net'])
    })
  })
})
