import { join } from 'path'
import { promises as fs } from 'fs'
import { LOOP_DIR } from './store'

// MAV-263: persistent local record of real message activity, used to replace
// buildTieStrengthMap()'s hardcoded recency-bucket proxy (150/30/5) with real
// counts. Source of truth is always WhatsApp's servers — this is a durable
// local cache/log, same contract as the MAV-256 groupCache.
export const MESSAGE_STORE_PATH = join(LOOP_DIR, 'messages.db')

export interface MessageRecord {
  id: string
  chatId: string
  senderJid: string
  fromMe: boolean
  timestamp: number // unix seconds
  text: string | null
}

// MAV-264: message-receipt.update — per-message read/delivery timing, a
// stronger tie-strength signal than raw message counts.
export interface ReceiptRecord {
  chatId: string
  messageId: string
  userJid: string
  receiptTimestamp: number | null
  readTimestamp: number | null
}

// MAV-264: call — call history, a graph-strength signal fully independent
// of text. Deliberately no FK dependency on messages.chat_id — a call can
// exist for a JID Loop has never seen a message from.
export interface CallRecord {
  id: string
  chatJid: string
  status: string
  isVideo: boolean
  timestamp: number
}

// MAV-264: labels.edit — the user's own manual WhatsApp chat labels.
export interface LabelRecord {
  id: string
  name: string
  deleted: boolean
}

// MAV-264: labels.association — which chats/messages carry a given label.
export interface LabelAssociationRecord {
  labelId: string
  chatId: string
  messageId: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS messages (
    chat_id TEXT NOT NULL,
    id TEXT NOT NULL,
    sender_jid TEXT NOT NULL,
    from_me INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    text TEXT,
    PRIMARY KEY (chat_id, id)
  );
  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
  CREATE INDEX IF NOT EXISTS idx_messages_chat_id_timestamp ON messages (chat_id, timestamp);

  -- MAV-264: live-only, no historical backfill mechanism exists in Baileys
  -- for receipts/calls/labels at all (no receipts.set/calls.set/labels.set
  -- bulk-sync event) — this is a permanent limitation, not a rollout gap.
  CREATE TABLE IF NOT EXISTS receipts (
    chat_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    receipt_timestamp INTEGER,
    read_timestamp INTEGER,
    PRIMARY KEY (chat_id, message_id, user_jid)
  );

  -- No FK dependency on messages.chat_id — a call can exist for a JID Loop
  -- has never seen a message from.
  CREATE TABLE IF NOT EXISTS calls (
    id TEXT NOT NULL PRIMARY KEY,
    chat_jid TEXT NOT NULL,
    status TEXT NOT NULL,
    is_video INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_calls_chat_jid ON calls (chat_jid);

  -- deleted flag rather than cascading delete on labels.edit(deleted: true)
  -- so historical "this chat had label X" data isn't lost if the label is
  -- later renamed or removed.
  CREATE TABLE IF NOT EXISTS labels (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
  );

  -- message_id can be NULL (label applied to a whole chat, not one message).
  -- SQLite treats NULLs as distinct for uniqueness, which would defeat
  -- dedup on repeated association events (and generated columns can't be
  -- part of a PRIMARY KEY) — dedup via a UNIQUE index on
  -- COALESCE(message_id, '') instead, with INSERT OR IGNORE against it.
  CREATE TABLE IF NOT EXISTS label_associations (
    label_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    message_id TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_label_associations_dedup
    ON label_associations (label_id, chat_id, COALESCE(message_id, ''));
`

class MessageStore {
  private static instance: MessageStore
  private db: Database = null

  static getInstance(): MessageStore {
    if (!MessageStore.instance) MessageStore.instance = new MessageStore()
    return MessageStore.instance
  }

  // Must be called once at app startup, before any Baileys event listener can
  // fire — messages.upsert can arrive immediately after connection. Never
  // throws: a message-store failure must not be able to crash app startup,
  // same contract as store.ts's corrupt-state.json recovery.
  async init(dbPath: string = MESSAGE_STORE_PATH): Promise<void> {
    try {
      await this.open(dbPath)
    } catch (err) {
      console.error('[messageStore] Failed to open DB, attempting corrupt-file recovery:', err)
      try {
        await fs.rename(dbPath, `${dbPath}.corrupt-${Date.now()}`)
      } catch {
        // No file to move aside, or move failed — fall through and try a fresh open anyway.
      }
      try {
        await this.open(dbPath)
      } catch (err2) {
        console.error('[messageStore] Failed to open fresh DB after recovery attempt — message persistence disabled:', err2)
        this.db = null
      }
    }
  }

  private async open(dbPath: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BetterSqlite3 = ((await import('better-sqlite3')) as any).default
    const db = new BetterSqlite3(dbPath)
    db.exec(SCHEMA)
    this.db = db
  }

  // Transactional INSERT OR IGNORE — duplicates across messaging-history.set
  // and messages.upsert at a connection-boundary overlap are silently
  // deduped by the PRIMARY KEY, no application-level dedup needed.
  insertMessages(records: MessageRecord[]): void {
    if (!this.db || records.length === 0) return
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO messages (chat_id, id, sender_jid, from_me, timestamp, text) VALUES (?, ?, ?, ?, ?, ?)'
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertMany = this.db.transaction((rows: MessageRecord[]) => {
      for (const r of rows) {
        stmt.run(r.chatId, r.id, r.senderJid, r.fromMe ? 1 : 0, r.timestamp, r.text)
      }
    })
    insertMany(records)
  }

  // MAV-264: receipt.userJid/participant is mapped directly from the raw
  // Baileys payload by the caller — no inference here. Dedup via PRIMARY KEY.
  insertReceipts(records: ReceiptRecord[]): void {
    if (!this.db || records.length === 0) return
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO receipts (chat_id, message_id, user_jid, receipt_timestamp, read_timestamp) VALUES (?, ?, ?, ?, ?)'
    )
    const insertMany = this.db.transaction((rows: ReceiptRecord[]) => {
      for (const r of rows) {
        stmt.run(r.chatId, r.messageId, r.userJid, r.receiptTimestamp, r.readTimestamp)
      }
    })
    insertMany(records)
  }

  insertCalls(records: CallRecord[]): void {
    if (!this.db || records.length === 0) return
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO calls (id, chat_jid, status, is_video, timestamp) VALUES (?, ?, ?, ?, ?)'
    )
    const insertMany = this.db.transaction((rows: CallRecord[]) => {
      for (const r of rows) {
        stmt.run(r.id, r.chatJid, r.status, r.isVideo ? 1 : 0, r.timestamp)
      }
    })
    insertMany(records)
  }

  // labels.edit can mark a label deleted without removing existing
  // label_associations rows — upsert here never deletes the row itself.
  upsertLabel(record: LabelRecord): void {
    if (!this.db) return
    this.db
      .prepare(
        'INSERT INTO labels (id, name, deleted) VALUES (?, ?, ?) ' +
          'ON CONFLICT(id) DO UPDATE SET name = excluded.name, deleted = excluded.deleted'
      )
      .run(record.id, record.name, record.deleted ? 1 : 0)
  }

  // labels.association can refire for an already-associated label (e.g. on
  // reconnect) — INSERT OR IGNORE against the generated dedup key.
  upsertLabelAssociation(record: LabelAssociationRecord): void {
    if (!this.db) return
    this.db
      .prepare('INSERT OR IGNORE INTO label_associations (label_id, chat_id, message_id) VALUES (?, ?, ?)')
      .run(record.labelId, record.chatId, record.messageId)
  }

  // Used by fetchOlderMessages() to anchor an on-demand deep-backfill
  // request. Returns null for a chat with no stored messages — callers
  // must no-op rather than throw.
  getOldestMessage(chatId: string): { id: string; timestamp: number } | null {
    if (!this.db) return null
    const row = this.db
      .prepare('SELECT id, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC LIMIT 1')
      .get(chatId)
    return row ?? null
  }

  getMessageCount(chatId: string): number {
    if (!this.db) return 0
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM messages WHERE chat_id = ?').get(chatId)
    return row?.count ?? 0
  }

  // MAV-265: added for WhatsAppManager.getMessages() — Baileys' live
  // sock.fetchMessagesFromWA(jid, limit) has no whatsmeow/sidecar command
  // equivalent, so that method now reads the same locally-persisted data
  // this store already accumulates via insertMessages(), instead of making
  // a live query. Newest-first, matching the old method's contract.
  getMessages(chatId: string, limit: number): MessageRecord[] {
    if (!this.db) return []
    const rows = this.db
      .prepare(
        'SELECT chat_id AS chatId, id, sender_jid AS senderJid, from_me AS fromMe, timestamp, text ' +
          'FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(chatId, limit) as (Omit<MessageRecord, 'fromMe'> & { fromMe: number })[]
    return rows.map((r) => ({ ...r, fromMe: Boolean(r.fromMe) }))
  }

  // MAV-265: added for WhatsAppManager.buildTieStrengthMap() — Baileys'
  // chatStore (chats.set/chats.upsert) has no whatsmeow/sidecar equivalent;
  // the DM chat list and recency signal are rebuilt from ingested message
  // data instead. lastTimestamp is the latest stored message per chat,
  // replacing Baileys' chat.conversationTimestamp field.
  getDmChatSummaries(): { chatId: string; lastTimestamp: number }[] {
    if (!this.db) return []
    return this.db
      .prepare(
        "SELECT chat_id AS chatId, MAX(timestamp) AS lastTimestamp FROM messages " +
          "WHERE chat_id LIKE '%@s.whatsapp.net' GROUP BY chat_id"
      )
      .all() as { chatId: string; lastTimestamp: number }[]
  }

  getWeeklyMessageCounts(chatId: string, sinceTs: number): { weekStart: number; count: number }[] {
    if (!this.db) return []
    const rows = this.db
      .prepare('SELECT timestamp FROM messages WHERE chat_id = ? AND timestamp >= ? ORDER BY timestamp ASC')
      .all(chatId, sinceTs) as { timestamp: number }[]
    const WEEK_SECONDS = 7 * 86400
    const buckets = new Map<number, number>()
    for (const { timestamp } of rows) {
      const weekStart = Math.floor(timestamp / WEEK_SECONDS) * WEEK_SECONDS
      buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + 1)
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([weekStart, count]) => ({ weekStart, count }))
  }

  // MAV-256-equivalent contract: a second account linked in the same install
  // must never inherit the first account's message/receipt/call/label history.
  clearAll(): void {
    if (!this.db) return
    this.db.exec(
      'DELETE FROM messages; DELETE FROM receipts; DELETE FROM calls; DELETE FROM labels; DELETE FROM label_associations;'
    )
  }

  close(): void {
    if (!this.db) return
    try {
      this.db.close()
    } catch {
      // ignore
    }
    this.db = null
  }
}

export default MessageStore
