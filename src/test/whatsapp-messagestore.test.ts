/**
 * MAV-263/264, ported to whatsmeow (MAV-265): WhatsAppManager <-> MessageStore wiring.
 *
 * Covers: sidecar history-sync-chunk / messages-upsert handlers persist into
 * the store, buildTieStrengthMap() sources real counts from it (regression
 * guard: zero live network calls, per the original infinite-hang bug fix),
 * receipt/call/label handlers, fetchOlderMessages()'s sidecar command, and
 * disconnect() clearing the store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSidecarProcess, sentCommands, type MockSidecarProcess } from './mocks/sidecarProcess'

vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
    unlink: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  }
  return { default: { promises }, promises }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function connectMockSidecar(wa: any): MockSidecarProcess {
  const proc = createMockSidecarProcess()
  wa.sidecarProcess = proc
  wa.sidecarConnected = true
  return proc
}

describe('WhatsAppManager <-> MessageStore (MAV-263, ported to whatsmeow MAV-265)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  // sidecar/events.go's history-sync-chunk payload is pre-batched and
  // grouped by chat ({ chats: [{ chatId, name, messages: [...] }] }), unlike
  // Baileys' flat messaging-history.set({ messages: [...] }) — messages
  // within each chat are still WebMessageInfo-shaped (protojson), same field
  // names as the pre-migration Baileys WAMessage.
  it('handleSidecarHistorySyncChunk() persists messages into the message store', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarHistorySyncChunk({
      chats: [{
        chatId: 'chatA@s.whatsapp.net',
        messages: [
          { key: { remoteJID: 'chatA@s.whatsapp.net', ID: 'h1', fromMe: false }, messageTimestamp: 1, message: { conversation: 'hi' } },
          { key: { remoteJID: 'chatA@s.whatsapp.net', ID: 'h2', fromMe: true }, messageTimestamp: 2, message: { conversation: 'yo' } },
        ],
      }],
      isLast: true,
    })

    expect(store.getMessageCount('chatA@s.whatsapp.net')).toBe(2)
  })

  // sidecar's messages-upsert payload is a single live message, already
  // flattened to top-level chatId/senderId/id/isFromMe/timestamp fields
  // (sidecar/events.go's messageUpsertPayload) — not nested under `.key`
  // like Baileys/history-sync messages.
  it('handleSidecarMessageUpsert() appends live messages incrementally, including non-text messages', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarMessageUpsert({
      chatId: 'chatB@s.whatsapp.net', senderId: 'chatB@s.whatsapp.net', id: 'u1', isFromMe: false, timestamp: 10,
      message: { conversation: 'hey' },
    })
    // Non-text (e.g. voice note) — must still be counted, not filtered out.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarMessageUpsert({
      chatId: 'chatB@s.whatsapp.net', senderId: 'chatB@s.whatsapp.net', id: 'u2', isFromMe: false, timestamp: 11,
      message: { audioMessage: {} },
    })

    expect(store.getMessageCount('chatB@s.whatsapp.net')).toBe(2)
  })

  it('handleSidecarMessageUpsert() resolves sender to "me" when isFromMe, otherwise senderId (group disambiguation)', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarMessageUpsert({
      chatId: 'group1@g.us', senderId: '447700900001@s.whatsapp.net', id: 'g1', isFromMe: false, timestamp: 5,
      message: { conversation: 'group msg' },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT sender_jid FROM messages WHERE id = ?').get('g1')
    expect(row.sender_jid).toBe('447700900001@s.whatsapp.net')
  })

  it('handleSidecarHistorySyncChunk() resolves group sender from key.participant, not key.remoteJID', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarHistorySyncChunk({
      chats: [{
        chatId: 'group1@g.us',
        messages: [{
          key: { remoteJID: 'group1@g.us', ID: 'g1', fromMe: false, participant: '447700900001@s.whatsapp.net' },
          messageTimestamp: 5,
          message: { conversation: 'group msg' },
        }],
      }],
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT sender_jid FROM messages WHERE id = ?').get('g1')
    expect(row.sender_jid).toBe('447700900001@s.whatsapp.net')
  })

  it('buildTieStrengthMap() sources messageCount from the real store, not the hardcoded 150/30/5 buckets, with zero live network calls', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')
    store.insertMessages([
      { id: 'm1', chatId: '447700900001@s.whatsapp.net', senderJid: '447700900001@s.whatsapp.net', fromMe: false, timestamp: 1, text: 'a' },
      { id: 'm2', chatId: '447700900001@s.whatsapp.net', senderJid: '447700900001@s.whatsapp.net', fromMe: false, timestamp: 2, text: 'b' },
      { id: 'm3', chatId: '447700900001@s.whatsapp.net', senderJid: '447700900001@s.whatsapp.net', fromMe: false, timestamp: 3, text: 'c' },
    ])

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = connectMockSidecar(wa as any)

    const map = await wa.buildTieStrengthMap()

    expect(map.get('447700900001@s.whatsapp.net')?.messageCount).toBe(3)
    // Regression guard for the original infinite-hang bug (MAV, fixed 5d37be1):
    // buildTieStrengthMap() must never make a live network/sidecar call — it's
    // rebuilt entirely from messageStore.getDmChatSummaries(), not a fresh
    // fetch, so no command should ever have been sent to the sidecar.
    expect(sentCommands(proc)).toHaveLength(0)
  })

  it('disconnect() clears the message store so a re-linked account never inherits prior history', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')
    store.insertMessages([
      { id: 'm1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 1, text: 'a' },
    ])
    expect(store.getMessageCount('chatA')).toBe(1)

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    expect(store.getMessageCount('chatA')).toBe(0)
  })
})

describe('WhatsAppManager <-> MessageStore (MAV-264, ported to whatsmeow MAV-265)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  // sidecar's receipt-update payload is one event per receipt-group
  // (chatId/senderId/messageIds[]/type/timestamp) — not Baileys' array-of-
  // updates shape. `type` is whatsmeow's types.ReceiptType string (e.g.
  // "read"); handleSidecarReceiptUpdate maps any type containing "read" to
  // readTimestamp, everything else to receiptTimestamp.
  it('handleSidecarReceiptUpdate() maps a read receipt into readTimestamp', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarReceiptUpdate({
      chatId: 'chatA@s.whatsapp.net',
      senderId: '447700900001@s.whatsapp.net',
      messageIds: ['m1'],
      type: 'read',
      timestamp: 12,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT * FROM receipts WHERE chat_id = ?').get('chatA@s.whatsapp.net')
    expect(row.user_jid).toBe('447700900001@s.whatsapp.net')
    expect(row.read_timestamp).toBe(12)
    expect(row.receipt_timestamp).toBeNull()
  })

  it('handleSidecarReceiptUpdate() maps a non-read receipt (e.g. "delivered") into receiptTimestamp', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarReceiptUpdate({
      chatId: 'chatA@s.whatsapp.net',
      senderId: '447700900001@s.whatsapp.net',
      messageIds: ['m2'],
      type: 'delivered',
      timestamp: 9,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT * FROM receipts WHERE message_id = ?').get('m2')
    expect(row.receipt_timestamp).toBe(9)
    expect(row.read_timestamp).toBeNull()
  })

  // sidecar emits one call event per whatsmeow call sub-event (offer/offer-
  // notice/terminate/reject) — `kind` replaces Baileys' `status` field.
  it('handleSidecarCall() persists a call for a JID with no prior message history', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarCall({ callId: 'call1', from: 'caller@s.whatsapp.net', timestamp: 999, kind: 'terminate' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT * FROM calls WHERE id = ?').get('call1')
    expect(row.chat_jid).toBe('caller@s.whatsapp.net')
    expect(row.status).toBe('terminate')
  })

  it('handleSidecarCall() prefers groupJid over from for a group call', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarCall({ callId: 'call2', from: 'caller@s.whatsapp.net', groupJid: 'group1@g.us', timestamp: 1000, kind: 'offer' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (store as any).db.prepare('SELECT * FROM calls WHERE id = ?').get('call2')
    expect(row.chat_jid).toBe('group1@g.us')
  })

  it('handleSidecarLabelsEdit() and handleSidecarLabelsAssociation() persist labels without cascading delete', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarLabelsEdit({ labelId: 'lbl1', name: 'Family', deleted: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarLabelsAssociation({ labelId: 'lbl1', chatId: 'chatA@s.whatsapp.net', labeled: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarLabelsEdit({ labelId: 'lbl1', name: 'Family', deleted: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = (store as any).db.prepare('SELECT * FROM labels WHERE id = ?').get('lbl1')
    expect(label.deleted).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assoc = (store as any).db.prepare('SELECT * FROM label_associations WHERE label_id = ?').all('lbl1')
    expect(assoc).toHaveLength(1)
  })

  // MAV-265: a `labeled: false` (removal) event has no removal path in
  // messageStore's schema (unchanged, out of scope) — must be logged and
  // skipped, not silently applied as if it were an addition.
  it('handleSidecarLabelsAssociation() skips (does not apply) a removal event', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarLabelsAssociation({ labelId: 'lbl1', chatId: 'chatA@s.whatsapp.net', labeled: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assoc = (store as any).db.prepare('SELECT * FROM label_associations WHERE label_id = ?').all('lbl1')
    expect(assoc).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('fetchOlderMessages() no-ops and logs when getOldestMessage() returns null', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = connectMockSidecar(wa as any)

    await wa.fetchOlderMessages('never-seen-chat@s.whatsapp.net')

    expect(sentCommands(proc)).toHaveLength(0)
  })

  // MAV-265: fetchOlderMessages() is now a fire-and-forget `fetch-history`
  // sidecar command (no correlation id — sidecar/commands.go's
  // handleFetchHistory triggers an async on-demand sync whose result arrives
  // later as an ordinary history-sync-chunk event, same contract as before).
  it('fetchOlderMessages() sends a fetch-history command anchored to the oldest stored message', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')
    store.insertMessages([
      { id: 'm1', chatId: 'chatA@s.whatsapp.net', senderJid: 'chatA@s.whatsapp.net', fromMe: false, timestamp: 100, text: 'a' },
    ])

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc = connectMockSidecar(wa as any)

    await wa.fetchOlderMessages('chatA@s.whatsapp.net', 25)

    const [cmd] = sentCommands(proc)
    expect(cmd).toMatchObject({
      cmd: 'fetch-history',
      payload: { chatId: 'chatA@s.whatsapp.net', oldestKnownMessageId: 'm1', oldestKnownTimestamp: 100, count: 25 },
    })
  })

  it('disconnect() clears receipts, calls, and labels alongside messages', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')
    store.insertReceipts([{ chatId: 'chatA', messageId: 'm1', userJid: 'u1', receiptTimestamp: 1, readTimestamp: null }])
    store.insertCalls([{ id: 'c1', chatJid: 'chatA', status: 'missed', isVideo: false, timestamp: 1 }])
    store.upsertLabel({ id: 'lbl1', name: 'Family', deleted: false })

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()

    await wa.disconnect()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (store as any).db
    expect(db.prepare('SELECT COUNT(*) AS c FROM receipts').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM calls').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM labels').get().c).toBe(0)
  })
})

describe('WhatsAppManager decommissionBaileysAuth() (MAV-265/task #6)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deletes AUTH_DIR on the first connection-update:connected transition', async () => {
    const fsMock = await import('fs')
    const rmSpy = fsMock.promises.rm as ReturnType<typeof vi.fn>
    rmSpy.mockClear()

    const { default: WhatsAppManager, AUTH_DIR } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectMockSidecar(wa as any)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wa as any).handleSidecarLine(
      JSON.stringify({ v: 1, type: 'event', event: 'connection-update', payload: { state: 'connected' } })
    )

    expect(rmSpy).toHaveBeenCalledWith(AUTH_DIR, { recursive: true, force: true })
  })

  it('does not throw or block the connected flow if the deletion fails', async () => {
    const fsMock = await import('fs')
    const rmSpy = fsMock.promises.rm as ReturnType<typeof vi.fn>
    rmSpy.mockRejectedValueOnce(new Error('permission denied'))

    const { default: WhatsAppManager } = await import('../main/whatsapp')
    const wa = WhatsAppManager.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectMockSidecar(wa as any)

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(wa as any).handleSidecarLine(
        JSON.stringify({ v: 1, type: 'event', event: 'connection-update', payload: { state: 'connected' } })
      )
    }).not.toThrow()
    expect(wa.getStatus()).toBe('connected')
  })
})
