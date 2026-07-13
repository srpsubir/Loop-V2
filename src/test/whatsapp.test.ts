import { describe, it, expect, vi, beforeEach } from 'vitest'

const readdirMock = vi.fn()
const unlinkMock = vi.fn()
const readFileMock = vi.fn()
const writeFileMock = vi.fn()

vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: readdirMock,
    unlink: unlinkMock,
    readFile: readFileMock,
    writeFile: writeFileMock,
  }
  return { default: { promises }, promises }
})

describe('WhatsAppManager', () => {
  beforeEach(() => {
    vi.resetModules()
    readdirMock.mockReset()
    unlinkMock.mockReset()
    readFileMock.mockReset().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    writeFileMock.mockReset().mockResolvedValue(undefined)
  })

  it('disconnect() clears all auth files so next start() always generates a fresh QR', async () => {
    readdirMock.mockResolvedValue(['creds.json', 'app-state-sync-key.json'])
    unlinkMock.mockResolvedValue(undefined)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    expect(readdirMock).toHaveBeenCalled()
    // 2 auth files + 1 MAV-256 group-cache-file unlink attempt (see next test)
    expect(unlinkMock).toHaveBeenCalledTimes(3)
  })

  it('disconnect() still clears auth even if auth dir is empty', async () => {
    readdirMock.mockResolvedValue([])
    unlinkMock.mockResolvedValue(undefined)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    // MAV-256: disconnect() also attempts to delete the group cache file so a
    // subsequently-linked account never inherits a previous account's cache —
    // that's the one call here, since the auth dir itself was empty.
    expect(unlinkMock).toHaveBeenCalledTimes(1)
  })

  it('disconnect() does not throw if auth dir does not exist', async () => {
    readdirMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await expect(wa.disconnect()).resolves.not.toThrow()
  })

  // MAV-255: a fabricated/externally-injected contact with no real WhatsApp
  // conversation must never reach a real send — this is the guard that failed
  // in the incident that prompted this ticket.
  describe('sendMessage() refuses unverified contacts (MAV-255)', () => {
    it('throws if there is no existing chat for the JID, even with a live socket', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const socketSendMessage = vi.fn().mockResolvedValue(undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { sendMessage: socketSendMessage }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map() // no known chats — simulates fabricated contact data

      await expect(wa.sendMessage('447700900001@s.whatsapp.net', 'hi')).rejects.toThrow(
        /no existing whatsapp conversation/i
      )
      expect(socketSendMessage).not.toHaveBeenCalled()
    })

    it('sends when the JID has a real, known chat', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const socketSendMessage = vi.fn().mockResolvedValue(undefined)
      const jid = '447700900003@s.whatsapp.net'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { sendMessage: socketSendMessage }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map([[jid, { id: jid }]])

      await wa.sendMessage(jid, 'hi')
      expect(socketSendMessage).toHaveBeenCalledWith(jid, { text: 'hi' })
    })

    it('hasChatWith() reflects chatStore membership directly', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const jid = '447700900004@s.whatsapp.net'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).chatStore = new Map([[jid, { id: jid }]])

      expect(wa.hasChatWith(jid)).toBe(true)
      expect(wa.hasChatWith('447700900099@s.whatsapp.net')).toBe(false)
    })
  })

  // MAV-256: listGroups() used to re-run the full rate-limited fetch on
  // every single call, even seconds apart, because groups-discovered.json
  // was write-only. These tests cover the new read-write cache directly.
  describe('listGroups() group cache (MAV-256)', () => {
    it('serves from cache and skips the real fetch when the cache is fresh', async () => {
      readFileMock.mockResolvedValue(JSON.stringify({
        writtenAt: Date.now(),
        groups: [{ id: 'g1@g.us', name: 'Cached Group', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null }],
      }))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const groupFetchAllParticipating = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { groupFetchAllParticipating }

      const result = await wa.listGroups()

      expect(result).toEqual([{ id: 'g1@g.us', name: 'Cached Group', members: ['a@s.whatsapp.net'] }])
      expect(groupFetchAllParticipating).not.toHaveBeenCalled()
    })

    it('ignores a stale cache (older than 24h) and does a real fetch', async () => {
      const staleWrittenAt = Date.now() - 25 * 60 * 60 * 1000
      readFileMock.mockResolvedValue(JSON.stringify({
        writtenAt: staleWrittenAt,
        groups: [{ id: 'stale@g.us', name: 'Stale Group', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null }],
      }))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const groupFetchAllParticipating = vi.fn().mockResolvedValue({})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { groupFetchAllParticipating }

      const result = await wa.listGroups()

      expect(groupFetchAllParticipating).toHaveBeenCalled()
      expect(result).toEqual([]) // empty groupMap from the mock — no candidates
    })

    it('treats a legacy bare-array cache file (pre-MAV-256 shape) as present but stale', async () => {
      readFileMock.mockResolvedValue(JSON.stringify([
        { id: 'legacy@g.us', name: 'Legacy', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null },
      ]))

      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      const groupFetchAllParticipating = vi.fn().mockResolvedValue({})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = { groupFetchAllParticipating }

      await wa.listGroups()

      // Must not crash on the old shape, and must still treat it as stale
      // (no writtenAt in the legacy file) rather than serving it as fresh.
      expect(groupFetchAllParticipating).toHaveBeenCalled()
    })

    it('returns [] without touching the cache when there is no socket', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).socket = null

      const result = await wa.listGroups()

      expect(result).toEqual([])
      expect(readFileMock).not.toHaveBeenCalled()
    })

    // These call the real private handlers directly (bound via .bind(this) to
    // sock.ev.on(...) in start(), which isn't itself exercised by this test
    // file — see other tests' comments re: makeWASocket() not being mocked).
    it('handleGroupParticipantsUpdate "add" merges new participants into a cached group', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { members: string[] }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: ['a@s.whatsapp.net'], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleGroupParticipantsUpdate({ id: 'g1@g.us', participants: ['b@s.whatsapp.net'], action: 'add' })

      expect(cache.get('g1@g.us')).toMatchObject({ members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'] })
    })

    it('handleGroupParticipantsUpdate "remove" drops participants from a cached group', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { members: string[] }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'G1', members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleGroupParticipantsUpdate({ id: 'g1@g.us', participants: ['b@s.whatsapp.net'], action: 'remove' })

      expect(cache.get('g1@g.us')).toMatchObject({ members: ['a@s.whatsapp.net'] })
    })

    it('handleGroupParticipantsUpdate is a no-op for a group not yet in the cache', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, unknown>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleGroupParticipantsUpdate({ id: 'unknown@g.us', participants: ['b@s.whatsapp.net'], action: 'add' })

      expect(cache.has('unknown@g.us')).toBe(false)
    })

    it('handleGroupsUpsert adds a new group to the cache with its real participant list', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { name: string; members: string[] }>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleGroupsUpsert([
        { id: 'new@g.us', subject: 'New Group', participants: [{ id: 'a@s.whatsapp.net' }, { id: 'b@s.whatsapp.net' }], creation: 12345 },
      ])

      expect(cache.get('new@g.us')).toMatchObject({
        name: 'New Group',
        members: ['a@s.whatsapp.net', 'b@s.whatsapp.net'],
      })
    })

    it('handleGroupsUpdate renames a cached group but ignores updates for uncached groups', async () => {
      const { default: WhatsAppManager } = await import('../main/whatsapp')
      const wa = WhatsAppManager.getInstance()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (wa as any).groupCache as Map<string, { name: string }>
      cache.set('g1@g.us', { id: 'g1@g.us', name: 'Old Name', members: [], lastMessageAt: 0, createdAt: null } as never)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleGroupsUpdate([
        { id: 'g1@g.us', subject: 'New Name' },
        { id: 'never-cached@g.us', subject: 'Should Be Ignored' },
      ])

      expect(cache.get('g1@g.us')).toMatchObject({ name: 'New Name' })
      expect(cache.has('never-cached@g.us')).toBe(false)
    })
  })
})
