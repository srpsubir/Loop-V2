# Persistent local message store (prerequisite for MAV-262 chapter redesign)

## Context and actual root cause

Loop has never persisted message content or timestamps. `buildTieStrengthMap()` (`src/main/whatsapp.ts:411-435`) — the only signal chapter detection currently uses in place of real message frequency — assigns a **hardcoded** `messageCount` (150/30/5) based on a recency bucket derived from `chatStore`'s `conversationTimestamp`. This isn't measured data.

This traces back to a real bug fix, not a deliberate architecture decision. The original version called `fetchMessagesFromWA()` (a per-chat live network round-trip) once per DM contact, sequentially — hundreds of calls, no timeout, no concurrency limit — and hung `chapters:detect` indefinitely (`Loop/CLAUDE.md`, "Chapter detection infinite hang," fixed `5d37be1`, 2026-06-30). The fix removed the real-data call rather than fixing the fetch pattern, leaving the hardcoded proxy in its place. Nobody revisited that trade-off since.

Separately confirmed this session: Baileys (`@whiskeysockets/baileys@7.0.0-rc13`) already delivers both historical and live messages **event-driven, for free, with zero extra network calls** — `messaging-history.set` (bulk historical `messages`/`chats`/`contacts` payload, fired once after pairing) and `messages.upsert` (every live incoming/outgoing message). Loop's `whatsapp.ts` has never listened to either event (confirmed: the complete listener list is `chats.set`, `chats.upsert`, `connection.update`, `creds.update`, `groups.upsert`, `groups.update`, `group-participants.update` — nothing message-bearing). This is the gap this ticket closes.

**Storage engine: SQLite (`better-sqlite3`).** Loop has zero DB dependencies today (everything is plain JSON via `store.ts`), but the cost of adding one is bounded and well-precedented: `better-sqlite3` is a native module, so it needs rebuilding against Electron's bundled Node ABI (not host Node) via `electron-rebuild`, and `electron-builder` must `asarUnpack` the compiled `.node` binary so it can load from the packaged arm64 DMG. Both are standard, widely-shipped patterns, not novel risk. Chosen over NDJSON because real SQL queries (date-range aggregation, per-chat joins, future full-text search over message content) are a better fit for what this store will actually be asked to do, and the up-front cost is genuinely two config items, not an open-ended integration.

**Content persistence: full message text, not metadata-only.** Storing `text` alongside timestamp/sender/chat unlocks the content-based signals discussed earlier (LLM boundary/naming pass, institution/relationship keyword detection) without a second migration later.

**Historical backfill: relink accepted.** `messaging-history.set` only fires once, at initial device pairing — it will not refire for the currently-linked account on a simple reconnect. A deliberate logout + fresh QR relink is required to get a real `messaging-history.set` payload for backfill, and that's accepted as part of this rollout (see Section 3).

## Section 1: Data changes

**New model: `Message`** (SQLite table, in a new local DB file — see Section 6 for exact path).

```sql
CREATE TABLE messages (
  id          TEXT NOT NULL,       -- Baileys message key id
  chat_id     TEXT NOT NULL,       -- JID: ends in @g.us (group) or @s.whatsapp.net (DM)
  sender_jid  TEXT,                -- participant JID for group messages; NULL for DMs (chat_id IS the sender when NOT from_me)
  from_me     INTEGER NOT NULL,    -- 0/1
  timestamp   INTEGER NOT NULL,    -- unix seconds
  text        TEXT,                -- message body if text-representable; NULL for non-text media (see Section 4)
  PRIMARY KEY (chat_id, id)
);
CREATE INDEX idx_messages_chat_ts ON messages (chat_id, timestamp);
```

`PRIMARY KEY (chat_id, id)` gives dedup for free via `INSERT OR IGNORE` — no separate in-memory dedup index needed (this replaces the NDJSON draft's "accepted duplicate rows" trade-off entirely; SQLite's constraint makes the problem disappear rather than needing to be tolerated).

- **Created by**: two new handlers in `whatsapp.ts` — `handleMessagingHistorySet` (bulk, from `messaging-history.set`) and `handleMessagesUpsert` (incremental, from `messages.upsert`). Both call `messageStore.insertMessages(records)`, a batched `INSERT OR IGNORE` (wrapped in a single transaction per event for the bulk history case, since `better-sqlite3` transactions are synchronous and fast — this matters for a large history-sync payload).
- **Read by**: `buildTieStrengthMap()` (`whatsapp.ts:411`, modified — see Section 2), and a new `messageStore.getWeeklyMessageCounts(chatId, sinceTs)` helper (a straightforward `GROUP BY` query) exposed for the future MAV-262 frequency-clustering work — built here as a read API, not wired into `chapters.ts` yet, which stays out of this ticket's scope.
- **Deleted/cleared by**: `disconnect()` (`whatsapp.ts:368-390`) — must clear the messages table on logout/account switch, same reasoning already documented there for `groupCache` (a newly-linked account must never inherit a previous account's data). This is a required addition, not a behavior change to existing code.
- **Migration risk**: low, not zero. This is new, additive storage with no existing schema to migrate *within Loop*, but it's the first native dependency in the project — real risk is entirely in the build pipeline (native rebuild + `asarUnpack`), not in data migration. See Section 5.

## Section 2: Service wiring

Call graph, current vs. changed, in `src/main/whatsapp.ts`'s `start()`:

**Current** (unchanged listeners, for reference): `chats.set`, `chats.upsert`, `connection.update`, `creds.update`, `groups.upsert`, `groups.update`, `group-participants.update` — registered `~line 248-360`.

**New**, added alongside the existing `groups.*` registrations (`~line 358-360`):

```ts
sock.ev.on('messaging-history.set', this.handleMessagingHistorySet.bind(this))
sock.ev.on('messages.upsert', this.handleMessagesUpsert.bind(this))
```

- `handleMessagingHistorySet({ messages, chunkOrder, isLatest }: BaileysHistorySyncPayload)` (new private method): maps each `WAMessage` (extracting `chat_id` from `key.remoteJid`, `sender_jid` from `key.participant` when present, `text` via the same `message?.conversation ?? message?.extendedTextMessage?.text` pattern `normalizeMessages()` already uses) and calls `messageStore.insertMessages()` in one transaction per invocation. **The payload can arrive in multiple chunks** (`chunkOrder` field exists in Baileys' own type), so a single invocation must not be assumed to be the complete history — track completion via `isLatest`. **Unverified assumption, confirm live during implementation**: exact chunking behavior (how many chunks, whether `isLatest` reliably signals the last one) — not observable from static code, needs a real relink to verify.
- `handleMessagesUpsert({ messages, type }: BaileysUpsertPayload)` (new private method): same per-message mapping, calls `messageStore.insertMessages()`. No completion/chunk semantics — fires continuously for the life of the connection.
- **`buildTieStrengthMap()` modified** (`whatsapp.ts:411-435`): replace the hardcoded `messageCount = strength === 'high' ? 150 : ...` line with a real lookup against the local DB: `const messageCount = messageStore.getMessageCount(chat.id)` (synchronous — `better-sqlite3` is a sync API, no `await` needed, which if anything makes this simpler than the NDJSON draft's async-read concern). This keeps `buildTieStrengthMap()` fast and local, satisfying "do not reintroduce any `await getMessages()` call inside `buildTieStrengthMap()`" (`Loop/CLAUDE.md`) by construction — it reads a local DB file, categorically different from the live-per-contact-fetch pattern that caused the original hang.
- **Setup/lifecycle**: the SQLite DB connection must be opened once and held for the life of the process — add a `messageStore.init()` call at app startup (main process entry, alongside `ensureLoopDir()` in `store.ts`'s usage pattern) that opens the DB file and runs the `CREATE TABLE IF NOT EXISTS` / index statements. This is a new lifecycle step that doesn't exist for the JSON-file stores (which open/close per read/write) — **must be instantiated before `start()`'s event listeners can write to it**, since `messages.upsert` can fire immediately after connection.

## Section 3: Cross-system sync

Single boundary, same shape as the existing group-cache boundary: **Baileys' WebSocket (WhatsApp's servers) → `WhatsAppManager` (main process, in-memory handling) → `messageStore` (local SQLite DB on disk)**. No renderer/IPC involvement in this ticket — nothing here is displayed in the UI yet.

- **Source of truth**: WhatsApp's servers, always. The local DB is a durable log/cache, never authoritative — consistent with the existing `groupCache` contract (`whatsapp.ts:136-147` comments).
- **Cold-start state, fresh install or fresh relink**: DB file doesn't exist (or is empty for this account). A successful pairing (QR scan) fires `messaging-history.set` — this populates initial history. From then on, `messages.upsert` accumulates live.
- **Cold-start state, currently-linked account (accepted, not a blocker)**: this install is already paired, so `messaging-history.set` will not refire on the next ordinary reconnect — that event is tied to the pairing handshake, not to every connection. **A deliberate logout + fresh QR relink is required** to trigger it and get real historical data. This is accepted as part of rollout, not deferred or silently worked around — the relink is the explicit action that makes this ticket's backfill actually happen for the account being used to test MAV-262's frequency-dynamics idea.
- **Receiver-offline / transport-fail case**: if the app isn't running when messages arrive, there's nothing to receive — WhatsApp doesn't queue-and-replay indefinitely for a disconnected multi-device client the way it does for the phone itself; gaps while Loop isn't connected are simply gaps. No different from today's `chatStore` behavior, just now with a persistent record of what *was* seen.

## Section 4: Edge cases

- **Duplicate messages across `messaging-history.set` and `messages.upsert`** at a connection-boundary overlap — fully handled by the `PRIMARY KEY (chat_id, id)` constraint plus `INSERT OR IGNORE`; no application-level dedup logic needed, unlike the NDJSON draft's accepted-duplication trade-off.
- **Non-text messages (media, voice notes, reactions)**: the existing `normalizeMessages()` (`whatsapp.ts:1157-1169`, used by the unrelated `getMessages()` UI path) filters these out via `.filter(m => m.text !== null)`. The persistence layer **must not** apply this filter — a chat that's mostly voice notes or photos would otherwise systematically under-count activity, biasing any frequency-based signal downstream. Insert every message as a row (with `text = NULL` when not text-representable) so `COUNT(*)` queries reflect true activity volume regardless of message type.
- **Sender resolution for group vs. DM messages**: `key.participant` is the actual sender only for group messages; for DMs, `key.remoteJid` (== `chat_id`) is both the chat and the sender when `!fromMe`. The new handlers need this distinction explicitly — `normalizeMessages()` doesn't capture `participant` at all today, so this is new mapping logic, not a reuse of the existing function.
- **Logout / account switch must clear the messages table** — same reasoning as `groupCache`'s existing clear-on-disconnect (MAV-256). Add `messageStore.clearAll()` (a `DELETE FROM messages` or, simpler, drop and recreate the file) to `disconnect()` (`whatsapp.ts:368-390`) alongside the existing `groupCache.clear()` / `GROUP_CACHE_PATH` unlink. Missing this is a real privacy/correctness bug: a second account linked in the same install would otherwise inherit the first account's message history.
- **Corrupt DB file recovery**: unlike the JSON-file pattern (which has an explicit `.backup` file and manual fallback logic in `store.ts`), a corrupt SQLite file typically fails to open outright. `messageStore.init()` should catch an open failure, log it, move the corrupt file aside (e.g. rename with a `.corrupt-<timestamp>` suffix, mirroring the spirit of `store.ts`'s backup-recovery approach), and start a fresh DB rather than crashing app startup — losing message history is recoverable (re-accumulates going forward), crashing the app is not acceptable.
- **Concurrent writes**: `better-sqlite3` is synchronous and single-connection by default, which actually removes the concurrent-write race the NDJSON draft had to design around with a promise queue — writes from `messaging-history.set` and `messages.upsert` handlers are naturally serialized by Node's single-threaded event loop plus SQLite's own file locking. No additional queuing logic needed.
- **Disk growth / retention is an open question, not solved here**: no cap is implemented. A very active account with full message text across years of history could reach real size (tens of MB, potentially more). Flagging as a real forward risk to monitor — a retention window (if any) is a separate, deliberate product decision, and is more valuable to revisit now that content is persisted (versus the metadata-only draft, where size pressure was much lower).
- **`syncFullHistory` flip to `true`** (`whatsapp.ts:240`, currently `false` against Baileys' own default of `true`): only affects **future pairings** — i.e., exactly the relink you're planning. Flip it before the relink so the resulting `messaging-history.set` payload is the deepest backfill Baileys will offer, not the bounded/recent variant. Trade-off: slower initial sync after the QR scan (this is presumably why it was set `false` originally — no code comment confirms the original reasoning, worth a quick check with whoever set it if that context matters).

## Section 5: Platform constraints

- **New native dependency**: `better-sqlite3` requires a native build step. Two concrete, bounded actions: (1) ensure `electron-rebuild` (or `electron-builder`'s built-in native-dependency rebuild) runs on `npm install` and before packaging, so the compiled binary matches Electron's bundled Node ABI, not the host Node used to run other tooling; (2) add `asarUnpack: ["**/node_modules/better-sqlite3/**"]` (or an equivalent glob) to the `electron-builder` config, since native `.node` binaries cannot load from inside an asar archive. **Action for implementation**: verify both against the actual arm64 DMG build (`npm run dist`), not just `npm run dev` — the dev/packaged split is exactly where this class of native-module issue tends to surface.
- **Content-at-rest sensitivity, materially increased**: full message text now sits as plaintext in a local SQLite file — this is a real step up in sensitivity from the metadata-only draft (which was itself already comparable to the existing unencrypted `whatsapp-auth/` credential files). Real message content — what was actually said, to whom — is a meaningfully larger blast radius if this machine or file is ever compromised or backed up somewhere unintended. Encryption-at-rest is explicitly out of scope for this ticket, but this is a real trade-off being accepted, not a null-risk decision — worth being deliberate about, especially if this DB file is ever included in a backup/sync path Loop doesn't fully control (Time Machine, iCloud, etc. — this is exactly the failure mode `store.ts`'s `LOOP_DIR` move away from `~/Documents` was designed around for `state.json`; confirm the new DB file also lives under `LOOP_DIR`, not somewhere that could get pulled into an unmanaged sync path).
- **No OS version gates, entitlements, or background-execution constraints beyond the native-module rebuild** — otherwise pure Node/Electron main-process logic, same runtime environment as existing `whatsapp.ts` code.
- **Large first-sync payload after relink** (especially with `syncFullHistory: true`): a `messaging-history.set` event for an account with substantial history could deliver many thousands of messages in one payload. Insert them inside a single `better-sqlite3` transaction (fast — thousands of rows/sec is typical) rather than one `INSERT` per row outside a transaction, which would be dramatically slower and could stall the main process event loop noticeably given `better-sqlite3`'s synchronous API.

## Section 6: Files to change

| File | Change |
|---|---|
| `src/main/whatsapp.ts` | Add `sock.ev.on('messaging-history.set', ...)` and `sock.ev.on('messages.upsert', ...)` listeners in `start()` (~line 358-360). Add new private methods `handleMessagingHistorySet()` and `handleMessagesUpsert()`. Modify `buildTieStrengthMap()` (~line 411-435) to source `messageCount` from `messageStore.getMessageCount()` instead of the hardcoded 150/30/5 buckets. Modify `disconnect()` (~line 368-390) to call `messageStore.clearAll()` alongside the existing `groupCache`/auth clearing. Flip `syncFullHistory: false` → `true` (~line 240) — do this *before* the planned relink so the relink actually gets deep backfill. |
| `src/main/messageStore.ts` (new) | SQLite persistence layer using `better-sqlite3`: `init()` (open DB under `LOOP_DIR`, e.g. `join(LOOP_DIR, 'messages.db')`, run `CREATE TABLE IF NOT EXISTS` + index), `insertMessages(records)` (transactional `INSERT OR IGNORE`), `getMessageCount(chatId)`, `getWeeklyMessageCounts(chatId, sinceTs)`, `clearAll()`. Corrupt-file handling: catch DB-open failure in `init()`, rename the bad file aside, start fresh rather than crashing startup. |
| `package.json` | Add `better-sqlite3` dependency. Add/confirm an `electron-rebuild` step (or equivalent) runs post-install. |
| `electron-builder` config (wherever it lives — `electron-builder.yml` / `package.json`'s `build` key / `electron-builder.config.js`, confirm exact location during implementation) | Add `asarUnpack` entry for `better-sqlite3`'s compiled binary. |
| `src/test/messageStore.test.ts` (new) | Unit coverage: (a) `messaging-history.set` payload persists correctly, including a simulated multi-chunk delivery; (b) `messages.upsert` appends incrementally; (c) duplicate message IDs across history-sync + live upsert are silently deduped by the `PRIMARY KEY` constraint, not double-counted; (d) `disconnect()` clears the messages table; (e) a corrupt DB file on `init()` is handled by renaming aside and starting fresh, not crashing; (f) `buildTieStrengthMap()` sources real counts and involves zero live network calls (regression guard for the original hang bug's constraint). |
| `Loop/CLAUDE.md` | Add an "Architecture constraints" bullet: message persistence lives in `messageStore.ts` (SQLite, `LoopData/messages.db`), populated by `messaging-history.set` (one-time, pairing-only — **does not backfill an account already paired before a relink**) and `messages.upsert` (live, ongoing). Also note this is the project's first native dependency, with the `electron-rebuild`/`asarUnpack` requirement, so a future contributor touching packaging doesn't get blindsided by it. |

`electron-builder` config file is potentially shared/build-wide (not scoped to one feature) — flagging as the one file in this list with wider blast radius; confirm its current contents before editing so the `asarUnpack` addition doesn't clobber existing packaging config.

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
