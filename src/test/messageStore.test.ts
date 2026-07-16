/**
 * MAV-263: persistent local message store — messaging-history.set +
 * messages.upsert wiring, dedup, disconnect-clear, corrupt-DB recovery, and
 * the buildTieStrengthMap() regression guard (no live network calls).
 *
 * Uses real better-sqlite3 against ':memory:' databases — faithful dedup/
 * transaction behavior without touching disk.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const renameMock = vi.fn()

vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: renameMock,
  }
  return { default: { promises }, promises }
})

describe('MessageStore', () => {
  beforeEach(() => {
    vi.resetModules()
    // vi.doMock registrations (used by the corrupt-DB/unopenable-DB tests
    // below) aren't cleared by resetModules() alone — without this they leak
    // into every test that runs after them in file order.
    vi.doUnmock('better-sqlite3')
    renameMock.mockReset().mockResolvedValue(undefined)
  })

  it('init() against :memory: succeeds and getMessageCount starts at 0', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')
    expect(store.getMessageCount('447700900001@s.whatsapp.net')).toBe(0)
  })

  it('insertMessages persists rows retrievable via getMessageCount', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.insertMessages([
      { id: 'm1', chatId: 'chat1', senderJid: 'chat1', fromMe: false, timestamp: 100, text: 'hi' },
      { id: 'm2', chatId: 'chat1', senderJid: 'me', fromMe: true, timestamp: 200, text: 'hello' },
      { id: 'm3', chatId: 'chat2', senderJid: 'chat2', fromMe: false, timestamp: 150, text: null },
    ])

    expect(store.getMessageCount('chat1')).toBe(2)
    expect(store.getMessageCount('chat2')).toBe(1)
    expect(store.getMessageCount('chat-unknown')).toBe(0)
  })

  it('a simulated multi-chunk history-sync delivery persists across separate insertMessages calls', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    // Chunk 1
    store.insertMessages([
      { id: 'h1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 1, text: 'a' },
    ])
    // Chunk 2 (isLatest)
    store.insertMessages([
      { id: 'h2', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 2, text: 'b' },
    ])

    expect(store.getMessageCount('chatA')).toBe(2)
  })

  it('messages.upsert appends incrementally on top of existing history', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.insertMessages([
      { id: 'h1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 1, text: 'a' },
    ])
    expect(store.getMessageCount('chatA')).toBe(1)

    // Simulated live upsert
    store.insertMessages([
      { id: 'u1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 2, text: 'c' },
    ])
    expect(store.getMessageCount('chatA')).toBe(2)
  })

  it('duplicate message ids across history-sync + live upsert are deduped by PRIMARY KEY, not double-counted', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const record = { id: 'dup1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 1, text: 'a' }
    store.insertMessages([record]) // arrives via messaging-history.set
    store.insertMessages([record]) // same message re-delivered via messages.upsert

    expect(store.getMessageCount('chatA')).toBe(1)
  })

  it('clearAll() empties the table (disconnect/account-switch contract)', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.insertMessages([
      { id: 'm1', chatId: 'chat1', senderJid: 'chat1', fromMe: false, timestamp: 100, text: 'hi' },
    ])
    expect(store.getMessageCount('chat1')).toBe(1)

    store.clearAll()
    expect(store.getMessageCount('chat1')).toBe(0)
  })

  it('a corrupt DB file on init() is handled by renaming it aside and starting fresh, not crashing', async () => {
    vi.doMock('better-sqlite3', () => {
      let attempt = 0
      return {
        default: vi.fn().mockImplementation(() => {
          attempt++
          if (attempt === 1) throw new Error('file is not a database')
          return {
            exec: vi.fn(),
            prepare: vi.fn().mockReturnValue({
              run: vi.fn(),
              get: vi.fn().mockReturnValue({ count: 0 }),
              all: vi.fn().mockReturnValue([]),
            }),
            transaction: (fn: (rows: unknown[]) => void) => (rows: unknown[]) => fn(rows),
            close: vi.fn(),
          }
        }),
      }
    })

    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()

    await expect(store.init('/fake/path/messages.db')).resolves.not.toThrow()
    expect(renameMock).toHaveBeenCalledTimes(1)
    // Store still usable after recovery — starts fresh rather than disabled.
    expect(store.getMessageCount('any')).toBe(0)
  })

  it('a permanently unopenable DB disables persistence without throwing (never crashes app startup)', async () => {
    vi.doMock('better-sqlite3', () => ({
      default: vi.fn().mockImplementation(() => {
        throw new Error('permanent failure')
      }),
    }))

    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()

    await expect(store.init('/fake/path/messages.db')).resolves.not.toThrow()
    // insertMessages/getMessageCount must be safe no-ops when the DB never opened.
    expect(() => store.insertMessages([
      { id: 'm1', chatId: 'chat1', senderJid: 'chat1', fromMe: false, timestamp: 1, text: 'x' },
    ])).not.toThrow()
    expect(store.getMessageCount('chat1')).toBe(0)
  })

  // ─── MAV-264 ────────────────────────────────────────────────────────────

  it('insertReceipts persists rows, deduped by (chat_id, message_id, user_jid)', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    const receipt = {
      chatId: 'chatA',
      messageId: 'm1',
      userJid: '447700900001@s.whatsapp.net',
      receiptTimestamp: 100,
      readTimestamp: 105,
    }
    store.insertReceipts([receipt])
    store.insertReceipts([receipt]) // duplicate, e.g. refired on reconnect

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (store as any).db.prepare('SELECT * FROM receipts WHERE chat_id = ?').all('chatA')
    expect(rows).toHaveLength(1)
    expect(rows[0].read_timestamp).toBe(105)
  })

  it('insertCalls persists rows with no dependency on the messages table', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    // Caller Loop has never exchanged a text message with.
    store.insertCalls([
      { id: 'call1', chatJid: 'unknown@s.whatsapp.net', status: 'missed', isVideo: false, timestamp: 500 },
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (store as any).db.prepare('SELECT * FROM calls WHERE chat_jid = ?').all('unknown@s.whatsapp.net')
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('missed')
  })

  it('upsertLabel updates name/deleted without needing a delete, preserving associations', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.upsertLabel({ id: 'lbl1', name: 'Close friends', deleted: false })
    store.upsertLabelAssociation({ labelId: 'lbl1', chatId: 'chatA', messageId: null })

    store.upsertLabel({ id: 'lbl1', name: 'Close friends', deleted: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const label = (store as any).db.prepare('SELECT * FROM labels WHERE id = ?').get('lbl1')
    expect(label.deleted).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assoc = (store as any).db.prepare('SELECT * FROM label_associations WHERE label_id = ?').all('lbl1')
    expect(assoc).toHaveLength(1) // deleting the label must not cascade-remove the association
  })

  it('upsertLabelAssociation dedupes repeated events, including when message_id is null', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.upsertLabelAssociation({ labelId: 'lbl1', chatId: 'chatA', messageId: null })
    store.upsertLabelAssociation({ labelId: 'lbl1', chatId: 'chatA', messageId: null }) // refire, e.g. on reconnect

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (store as any).db.prepare('SELECT * FROM label_associations WHERE label_id = ?').all('lbl1')
    expect(rows).toHaveLength(1)
  })

  it('getOldestMessage returns the earliest stored message, or null for an unseen chat', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    expect(store.getOldestMessage('chatA')).toBeNull()

    store.insertMessages([
      { id: 'm2', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 200, text: 'b' },
      { id: 'm1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 100, text: 'a' },
    ])

    expect(store.getOldestMessage('chatA')).toEqual({ id: 'm1', timestamp: 100, senderJid: 'chatA', fromMe: false })
  })

  it('clearAll() empties receipts, calls, labels, and label_associations alongside messages', async () => {
    const { default: MessageStore } = await import('../main/messageStore')
    const store = MessageStore.getInstance()
    await store.init(':memory:')

    store.insertMessages([{ id: 'm1', chatId: 'chatA', senderJid: 'chatA', fromMe: false, timestamp: 1, text: 'a' }])
    store.insertReceipts([{ chatId: 'chatA', messageId: 'm1', userJid: 'u1', receiptTimestamp: 1, readTimestamp: null }])
    store.insertCalls([{ id: 'c1', chatJid: 'chatA', status: 'missed', isVideo: false, timestamp: 1 }])
    store.upsertLabel({ id: 'lbl1', name: 'Family', deleted: false })
    store.upsertLabelAssociation({ labelId: 'lbl1', chatId: 'chatA', messageId: null })

    store.clearAll()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (store as any).db
    expect(store.getMessageCount('chatA')).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM receipts').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM calls').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM labels').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM label_associations').get().c).toBe(0)
  })
})
