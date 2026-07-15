# Full Baileys capability wiring (follow-up to MAV-263)

## Context

MAV-263 wired two Baileys events (`messaging-history.set`, `messages.upsert`) and built `messageStore.ts` (SQLite). Live testing surfaced two things:

1. **A silent filter, same bug shape as the original fake-data problem.** Baileys' default `shouldSyncHistoryMessage` (`node_modules/@whiskeysockets/baileys/lib/Defaults/index.js:65-67`) is `({ syncType }) => syncType !== HistorySyncType.FULL` — it explicitly rejects the one sync-chunk type that carries deep history. `syncFullHistory: true` (already set, `whatsapp.ts:248`) asks the phone to send full history; this default then discards it on arrival. Loop never overrides it. This is why real depth capped at roughly 13 weeks after the MAV-263 relink instead of going back years — not a WhatsApp platform ceiling, an unwired override.
2. **A full audit of the installed Baileys source (`@whiskeysockets/baileys@7.0.0-rc13`)** turned up several more events and one fetch method Loop has never used, two of which are directly relevant to MAV-262's frequency-clustering hypothesis and don't depend on solving backfill depth at all.

This ticket closes all of it in one pass, rather than continuing to discover one gap at a time.

## Section 1: Data changes

Four new tables in the existing `messages.db` (`src/main/messageStore.ts`, opened once at startup via `MessageStore.getInstance().init()`). Same file, same lifecycle, same corrupt-recovery path — no new DB file.

**`receipts`** — read/delivery timestamps per message per participant.
```sql
CREATE TABLE IF NOT EXISTS receipts (
  chat_id     TEXT NOT NULL,
  message_id  TEXT NOT NULL,
  participant TEXT NOT NULL,   -- JID of the person whose receipt this is
  receipt_type TEXT NOT NULL,  -- 'delivery' | 'read' | 'read-self' | 'played'
  timestamp   INTEGER NOT NULL,
  PRIMARY KEY (chat_id, message_id, participant, receipt_type)
);
CREATE INDEX IF NOT EXISTS idx_receipts_chat_ts ON receipts (chat_id, timestamp);
```

**`calls`** — call history, independent signal from text.
```sql
CREATE TABLE IF NOT EXISTS calls (
  call_id     TEXT NOT NULL PRIMARY KEY,  -- Baileys call id
  chat_jid    TEXT NOT NULL,              -- caller/callee JID
  status      TEXT NOT NULL,              -- 'offer' | 'accept' | 'reject' | 'timeout' | 'terminated'
  is_video    INTEGER NOT NULL,
  timestamp   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calls_jid_ts ON calls (chat_jid, timestamp);
```

**`labels`** — WhatsApp's own label definitions.
```sql
CREATE TABLE IF NOT EXISTS labels (
  label_id  TEXT NOT NULL PRIMARY KEY,
  name      TEXT NOT NULL,
  color     INTEGER,
  deleted   INTEGER NOT NULL DEFAULT 0
);
```

**`label_associations`** — which chat/message has which label.
```sql
CREATE TABLE IF NOT EXISTS label_associations (
  label_id  TEXT NOT NULL,
  chat_id   TEXT NOT NULL,
  message_id TEXT,           -- NULL when the label is on the whole chat, not one message
  PRIMARY KEY (label_id, chat_id, COALESCE(message_id, ''))
);
```

No schema change to the existing `messages` table.

- **Created by**: four new handlers in `whatsapp.ts` (Section 2), each calling a new `messageStore` method (`insertReceipts`, `insertCalls`, `upsertLabel`, `upsertLabelAssociation`).
- **Read by**: nothing yet — same as `getWeeklyMessageCounts()` in MAV-263, these are read APIs built for the future MAV-262 clustering work, not wired into `chapters.ts` in this ticket.
- **Cleared by**: `disconnect()` — extend the existing `messageStore.clearAll()` (currently `DELETE FROM messages` only) to also clear all four new tables. Same MAV-256/MAV-263 reasoning: a second linked account must never inherit the first account's data.
- **Migration risk**: low. All four are new `CREATE TABLE IF NOT EXISTS` additions to a DB file that already went through its one real migration risk (native module) in MAV-263. No existing table's schema changes.

## Section 2: Service wiring

All changes in `src/main/whatsapp.ts`.

**Config change, inside the existing `makeWASocket({...})` call (`~line 235-251`):**
```ts
shouldSyncHistoryMessage: () => true,
```
Add alongside `syncFullHistory: true` (line 248). Accepts every `HistorySyncType`, including `FULL`, instead of the Baileys default that rejects it. This is a one-line config addition, not a new code path — `handleMessagingHistorySet` (line 764) already exists and needs no changes to receive a larger/different payload.

**New listeners, added alongside the existing `messaging-history.set`/`messages.upsert` registrations (`~line 375-376`):**
```ts
sock.ev.on('messaging-history.status', this.handleHistorySyncStatus.bind(this))
sock.ev.on('message-receipt.update', this.handleReceiptUpdate.bind(this))
sock.ev.on('call', this.handleCall.bind(this))
sock.ev.on('labels.edit', this.handleLabelsEdit.bind(this))
sock.ev.on('labels.association', this.handleLabelsAssociation.bind(this))
```

- `handleHistorySyncStatus({ syncType, status, chatId, progress })` (new private method): logs sync completion/pause state per the existing `console.log`/`console.warn` pattern used elsewhere in `start()`. Resolves the "unverified assumption" flagged in MAV-263's own spec (chunking behavior) by giving an explicit, observable completion signal instead of inferring it from `isLatest` alone. No store write — this is operational visibility, not persisted data.
- `handleReceiptUpdate(updates: any[])` (new private method): each update carries `{ key: { remoteJid, id, participant }, receipt: { userJid, receiptTimestamp, readTimestamp, ... } }` (per Baileys' `MessageUserReceiptUpdate` type). Maps to `receipts` rows, calls `messageStore.insertReceipts()`.
- `handleCall(calls: any[])` (new private method): each entry carries `{ id, from, status, isVideo, date }` (per Baileys' `WACallEvent` type). Maps to `calls` rows, calls `messageStore.insertCalls()`.
- `handleLabelsEdit(label: any)` / `handleLabelsAssociation(association: any)` (new private methods): map to `labels`/`label_associations` rows respectively, call the corresponding `messageStore` upsert method.
- All five new handlers follow the same extracted-method pattern as `handleGroupsUpsert`/`handleMessagingHistorySet` — plain methods bound in `start()`, unit-testable without a live socket.

**New on-demand fetch, not an event listener** — `fetchMessageHistory(count, oldestMsgKey, oldestMsgTimestamp)`:
- Exposed as a new public method `WhatsAppManager.fetchOlderMessages(chatId: string, count = 50)`.
- Looks up the oldest message currently stored for `chatId` via a new `messageStore.getOldestMessage(chatId)` (returns `{ id, timestamp }` or `null`), then calls `sock.fetchMessageHistory(count, { remoteJid: chatId, id: oldestMsg.id, fromMe: ... }, oldestMsg.timestamp)`.
- Result arrives via the *same* `messaging-history.set` event already wired — no new event handler needed, `handleMessagingHistorySet` already inserts whatever it receives. This method's job is purely to *trigger* an additional on-demand sync for one chat; it doesn't process a return value itself.
- **Not wired to any UI or automatic trigger in this ticket** — exposed as a callable method (e.g. via a future IPC handler or a debug script) for testing deeper backfill on specific chats. Wiring it into product UX (e.g. "load more history" on a chapter-detail screen) is out of scope here, same as `getWeeklyMessageCounts()` staying unwired from `chapters.ts` in MAV-263.

**Lifecycle**: no new instantiation order requirement beyond what MAV-263 already established (`messageStore.init()` before `start()`'s listeners can fire) — the four new tables are created by the same `SCHEMA` string executed in `init()`.

## Section 3: Cross-system sync

Same single boundary as MAV-263: **Baileys' WebSocket → `WhatsAppManager` (main process) → `messageStore` (local SQLite)**. No renderer/IPC involvement in this ticket for any of the five new data types.

- **Source of truth**: WhatsApp's servers, unchanged.
- **`shouldSyncHistoryMessage` fix + relink required**: like MAV-263's own backfill, this change only takes effect on a fresh `messaging-history.set` delivery. The currently-linked account (already relinked once for MAV-263) needs **another** deliberate logout + QR relink to get a payload that actually includes `FULL`-type chunks. This is the second relink this feature area has needed — flagging directly so it isn't a surprise.
- **`message-receipt.update`, `call`, `labels.*`**: all live-only, same as `messages.upsert` — no historical backfill mechanism exists for these in Baileys at all (confirmed via the source audit: there's no `receipts.set`/`calls.set`/`labels.set` bulk-sync event). Receipt/call/label history starts accumulating from whenever this ships, not retroactively. This is a real, permanent limitation, not a rollout gap — write it into the ticket description so it isn't rediscovered as a surprise later.
- **Cold start**: fresh install or fresh relink — all four new tables start empty, same as `messages` did pre-MAV-263. Populate as events fire from that point forward.
- **Receiver-offline**: identical to MAV-263 — no queue-and-replay for a disconnected client; gaps while Loop isn't running are permanent gaps for these live-only events, more consequential here than for messages since there's no backfill fallback at all.

## Section 4: Edge cases

- **`shouldSyncHistoryMessage: () => true` may produce a much larger `messaging-history.set` payload** than MAV-263's first relink saw (that relink was implicitly capped by the default rejecting `FULL`). `handleMessagingHistorySet` already batches inserts in one transaction per invocation — this holds, but flag as worth watching for a stall on the very large payload if `FULL` history turns out to be substantial (see Section 5).
- **Uncertain outcome, state this explicitly rather than assuming success**: WhatsApp's server may still cap what it sends even under `syncFullHistory: true` + accepting `FULL` chunks — there is no confirmation in Baileys' source of a guaranteed depth once both client-side gates are open, only that Loop's own two gates were closed. Test via the relink; do not assume "years of history" as a guaranteed outcome of this ticket. If depth is still shallow after this fix, `fetchOlderMessages()` (Section 2) is the fallback to test next, and that's a legitimate outcome of this ticket, not a failure of it.
- **`receipt.userJid` vs `key.participant` mismatch for DMs**: for one-on-one chats, a delivery/read receipt's `userJid` will just be the other party — no group-participant disambiguation needed, unlike message sender resolution in MAV-263. Group receipts do need per-participant handling; map directly from the event payload's own `participant`/`userJid` field rather than inferring it.
- **Call events with no associated chat history**: a call can exist for a JID Loop has never seen a message from (e.g., someone who only ever calls, never texts). `calls.chat_jid` must not have a foreign-key dependency on `messages.chat_id` — store it standalone.
- **Label deleted vs. association removed**: `labels.edit` can mark a label deleted (`deleted: true` in the payload) without removing existing `label_associations` rows referencing it — store the `deleted` flag on the label itself (already in the schema above) rather than cascading a delete, so historical "this chat had label X" data isn't lost if the label is later renamed or removed.
- **Duplicate association events**: `labels.association` can refire for a label that's already associated (e.g., on reconnect) — `PRIMARY KEY (label_id, chat_id, COALESCE(message_id, ''))` plus `INSERT OR IGNORE`, same dedup pattern as `messages`.
- **`fetchOlderMessages()` called with no existing messages for a chat**: `messageStore.getOldestMessage()` returns `null` — the method should no-op (nothing to anchor the "older than X" request to) rather than throwing, and log why.
- **Logout/account switch**: extend `messageStore.clearAll()` to `DELETE FROM receipts; DELETE FROM calls; DELETE FROM labels; DELETE FROM label_associations;` alongside the existing `DELETE FROM messages`. Missing this repeats the exact privacy bug MAV-263's spec already flagged for the messages table, just for four more tables.

## Section 5: Platform constraints

- **No new native dependency** — `better-sqlite3` is already integrated (MAV-263), already has `electron-rebuild`/`asarUnpack` wired (`electron-builder.yml:20`, `package.json`'s `predev`). Zero new packaging risk from this ticket.
- **Content-at-rest sensitivity increases again**: receipts expose read-timing metadata (whether/when someone read a message) and calls expose full call history — both are meaningfully sensitive on top of the full message text MAV-263 already accepted storing in plaintext. Same trade-off already accepted there (no encryption-at-rest in scope), but the blast radius is larger with this ticket, not smaller — worth restating rather than treating as already priced in.
- **Larger first-sync payload risk, concretely**: if `shouldSyncHistoryMessage: () => true` does unlock real deep history, the `messaging-history.set` payload after the next relink could be substantially larger than MAV-263's first test (which was implicitly bounded by the very filter this ticket removes). Existing single-transaction batching in `handleMessagingHistorySet` should hold, but this hasn't been tested against a payload of unknown-but-potentially-much-larger size — flag as something to watch during the relink, not a solved concern.
- **No OS version gates or entitlements** — same runtime environment as MAV-263, pure main-process Node/Electron logic.

## Section 6: Files to change

| File | Change |
|---|---|
| `src/main/whatsapp.ts` | Add `shouldSyncHistoryMessage: () => true` to the `makeWASocket()` config (~line 248). Add five new `sock.ev.on(...)` registrations (~line 376). Add five new private handler methods (`handleHistorySyncStatus`, `handleReceiptUpdate`, `handleCall`, `handleLabelsEdit`, `handleLabelsAssociation`) near the existing `handleMessagingHistorySet`/`handleMessagesUpsert` (~line 764). Add new public method `fetchOlderMessages(chatId, count)`. Extend `disconnect()`'s existing `messageStore.clearAll()` call — no code change needed here if `clearAll()` itself is extended in `messageStore.ts` instead (preferred, keeps the clear-everything contract in one place). |
| `src/main/messageStore.ts` | Extend `SCHEMA` with the four new `CREATE TABLE IF NOT EXISTS` statements. Add `insertReceipts()`, `insertCalls()`, `upsertLabel()`, `upsertLabelAssociation()`, `getOldestMessage(chatId)`. Extend `clearAll()` to delete from all four new tables alongside `messages`. |
| `src/test/messageStore.test.ts` | Add coverage: each new table's insert/upsert method persists correctly; `clearAll()` clears all five tables now, not just `messages`; `getOldestMessage()` returns `null` for an unseen chat. |
| `src/test/whatsapp.test.ts` (existing file, confirm exact name during implementation) | Add coverage for each new handler mapping a raw Baileys payload shape to the correct store call; `fetchOlderMessages()` no-ops when `getOldestMessage()` returns `null`. |
| `Loop/CLAUDE.md` | Extend the existing MAV-263 architecture-constraints bullet: note `shouldSyncHistoryMessage` is now overridden (mention the default it replaces, so a future contributor touching socket config doesn't silently revert it), and that receipts/calls/labels are live-only with no historical backfill mechanism in Baileys at all — a permanent limitation, not a gap to eventually close. |

No file in this list has wider blast radius than `whatsapp.ts` itself, which is already the shared file MAV-263 touched — no build-config or cross-feature file changes this time.

---
ENG SPEC READY FOR REVIEW

Before implementation begins, confirm:
[ ] Data changes are complete and migration risk is acceptable
[ ] Service wiring call graph is correct and nothing is left un-instantiated
[ ] Cross-system sync source of truth and cold-start state are correct
[ ] Edge cases are handled (not deferred)
[ ] Platform constraints are noted and mitigated
[ ] File list is complete

Reply "approved" to proceed to implementation, or list what needs to change.
---
