# Whatsmeow ingestion migration — replace Baileys as Loop's WhatsApp transport

**Driven by:** empirical spike (2026-07-15) proving Baileys cannot deliver the history depth MAV-262 needs. Same WhatsApp account, same session: Baileys (after MAV-263 + MAV-264, every client-side lever maxed) delivered ~0 genuine backfill messages across ~600 chats, capped at 15/chat. A standalone whatsmeow (Go) test client, linked as a fresh device on the same account, pulled **14,812 messages across 890 chats, oldest dated 2017-06-06** — the account's real origin — in a single ~90-second sync. Desk research beforehand found open, unresolved Baileys GitHub issues (#2452, #2005) matching Loop's exact symptom (`fetchMessageHistory`/`messaging-history.set` silently returning nothing), while whatsmeow's backfill path is documented and configurable. This is not a tuning problem; it's a library capability gap.

**Scope of this change:** replace Baileys as Loop's WhatsApp transport with a whatsmeow-based Go sidecar process, while preserving everything MAV-263/264 already built downstream (`messageStore.ts` schema, `buildTieStrengthMap()`, IPC surface to the renderer).

**This is a big change, stated plainly up front:**
- New toolchain dependency (Go), not just a native Node module rebuild step like `better-sqlite3` was.
- A new OS process boundary that doesn't exist today — Loop has never spawned/managed a long-lived child process.
- **Every existing user, including the one testing this tonight, must log out and re-link WhatsApp via QR** — Baileys and whatsmeow use incompatible session/credential formats; there is no in-place migration of the linked-device session itself. (The already-collected `messages.db` data is unaffected and carries forward.)
- Realistic estimate: multi-week effort, not a ticket-sized patch. This spec exists to make that scope legible before committing, not to green-light immediate implementation.

---

## Section 1: Data changes

| Model | Change | Migration risk |
|---|---|---|
| `messages`, `receipts`, `calls`, `labels`, `label_associations` (SQLite, `messageStore.ts`) | **No schema change.** Same tables, same `insertMessages`/`insertReceipts`/etc. methods. Only the *caller* changes — events arrive via sidecar IPC instead of direct Baileys `sock.ev.on()` callbacks. | None — additive data continues to accumulate in the same file. |
| `whatsapp-auth/` (Baileys credential files, existing) | Becomes dead weight after cutover. Not reused by whatsmeow (different auth format entirely — Baileys uses its own signal-protocol key files, whatsmeow uses its own SQLite-backed device store). | **Explicit decommission step required**: after a successful whatsmeow relink, delete `whatsapp-auth/` and, on WhatsApp's side, unlink the old Baileys device from Linked Devices — otherwise two device sessions exist simultaneously, which risks duplicate/conflicting message delivery to Loop's own ingestion (both would fire `messages.upsert`-equivalent events for the same live traffic). |
| New: `whatsmeow-session.db` (or similar, under `LoopData/`) | Whatsmeow's own device/session store (SQLite, created by whatsmeow's `sqlstore` package — confirmed working in tonight's spike, uses `modernc.org/sqlite`, no CGO needed). Owned entirely by the Go sidecar process, not read/written by the Node side. | New file, no existing data to migrate into it — it's populated fresh by the QR relink. |
| `state.json`'s `whatsappConnected` flag | Meaning shifts: today it reflects an in-process Baileys socket state; after this change it must reflect **sidecar process alive AND its whatsmeow client connected** — two conditions, not one. | Low risk but must be handled explicitly (Section 4) — a spawned-but-not-yet-connected sidecar must not be reported as connected. |
| `groupCache` (existing JSON file, `whatsapp.ts`) | Needs an equivalent populated from whatsmeow's group metadata events/queries instead of Baileys' `groups.upsert`/`groups.update`. | Same shape, different source — low risk, but every Baileys group-event handler (`handleGroupsUpsert`, `handleGroupsUpdate`, `handleGroupParticipantsUpdate`) needs a whatsmeow-side equivalent mapped through the sidecar protocol. |

---

## Section 2: Service wiring

**Call graph, end to end:**

1. **App startup** (`src/main/index.ts`, after `MessageStore.getInstance().init()`, same ordering constraint MAV-263 already established): main process spawns the Go sidecar binary as a child process (`child_process.spawn`), passing it the path to `whatsmeow-session.db` under `LOOP_DIR`.
2. Sidecar starts, opens its whatsmeow device store, and either (a) has existing valid session → connects directly, or (b) no session → emits a `qr` event over IPC with the pairing code, which `WhatsAppManager` forwards to the renderer via the *same* existing `WhatsAppConnectScreen` IPC channel Baileys uses today (UI unchanged).
3. Sidecar emits structured JSON events over the IPC channel (transport: **open decision, see below**) mirroring today's Baileys event names as closely as possible: `qr`, `connection-update`, `history-sync-chunk`, `messages-upsert`, `receipt-update`, `call`, `labels-edit`, `labels-association`, `groups-upsert`, `groups-update`, `group-participants-update`.
4. `WhatsAppManager` (rewritten internals, **same public method signatures** — `start()`, `disconnect()`, `fetchOlderMessages()`, `buildTieStrengthMap()` — so `ipc.ts`, `chapters.ts`, and every existing caller needs zero changes) parses each sidecar event and calls the *exact same* downstream methods MAV-263/264 already wrote: `messageStore.insertMessages()`, `insertReceipts()`, `insertCalls()`, `upsertLabel()`, `upsertLabelAssociation()`.
5. `fetchOlderMessages(chatId, count)` becomes a **command sent to the sidecar** (`{"cmd": "fetch-history", "chatId": ..., "count": ...}`) rather than a direct `sock.fetchMessageHistory()` call — sidecar performs the whatsmeow call and streams the result back as `history-sync-chunk` events, same as an organic sync.
6. `disconnect()` sends a `{"cmd": "logout"}` to the sidecar (triggers whatsmeow's own `Client.Logout()`, confirmed working in tonight's spike — cleanly unlinks the device), then kills the sidecar process, then calls `messageStore.clearAll()` (unchanged).

**Must be instantiated before anything else works:** the sidecar process must be spawned and have signaled a ready/handshake state *before* `WhatsAppManager.start()` can send it any commands — a new ordering constraint that didn't exist when everything was in-process.

**Open design decision — IPC transport (not resolved by this spec, flag for implementation kickoff):**
- **Option A: newline-delimited JSON over stdio.** Simplest to implement, no additional OS resources. Risk: a large burst (tonight's spike delivered 14,812 messages in one chunk) needs careful buffering/backpressure handling on both ends so a big write doesn't block or corrupt the stream.
- **Option B: local Unix domain socket with length-prefixed framing.** More robust for large payloads, decouples process lifecycle from the pipe, but is new infrastructure Loop has never needed before.
- Recommendation to validate during implementation kickoff, not decided here: start with Option A (stdio) since the spike already proves whatsmeow can deliver a 14,812-message burst without issue at the Go level — the risk is purely in how the Node side consumes the stream, which is solvable with standard newline-delimited JSON parsing and doesn't obviously need socket-level complexity.

---

## Section 3: Cross-system sync

**New boundary that does not exist today:** Electron main process (Node) ↔ Go sidecar process (separate OS process), over local IPC. Everything else (renderer ↔ main via existing Electron IPC, main ↔ SQLite via `messageStore.ts`) is unchanged.

- **Source of truth**: WhatsApp's servers, unchanged.
- **Sidecar → main**: events described in Section 2. Sidecar is a thin translation layer — it does not make product decisions, does not touch `messageStore` directly, does not run any Loop business logic. All of that stays in the Node/TypeScript main process, same as today.
- **Main → sidecar**: commands: `fetch-history`, `logout`, and **`send-message` — confirmed in scope (audited 2026-07-15)**. `WhatsAppManager.sendMessage(jid, text)` (`src/main/whatsapp.ts:178-192`) currently calls Baileys' `sock.sendMessage()` and is wired end-to-end: IPC handler `whatsapp:sendMessage` (`src/main/ipc.ts:329-337`) → renderer → `MessageComposer.tsx:69`, a live UI component. No presence/read-receipt sends exist — this is the only outbound write path. The sidecar's `send-message` command must map to whatsmeow's `Client.SendMessage()`, and the existing JID normalization plus the MAV-255 guard (reject sends to a JID with no existing conversation) must be preserved — either ported into the sidecar or re-applied in `WhatsAppManager` before the command is sent, so behavior doesn't regress on cutover.
- **Sidecar crash / unexpected exit**: main process must detect the child process `exit`/`error` event and treat it exactly like today's Baileys `connection.close` handling — attempt respawn with the *same* exponential backoff pattern already implemented (`MAX_RECONNECT_ATTEMPTS = 8`, `aee2ab7`), now applied to sidecar respawns instead of Baileys socket reconnects. After exhaustion, emit `disconnected` to the renderer exactly as today.
- **Cold start**: app launch → sidecar spawned → sidecar reports existing valid session or emits QR → same states the renderer already handles (`WhatsAppConnectScreen` for QR, connected state for existing session). No new renderer-visible states required if the sidecar protocol maps cleanly onto today's Baileys `connection.update` shape.
- **Receiver offline**: identical to today — no queue-and-replay if Loop isn't running; whatsmeow's `messages.upsert`-equivalent is live-only, same limitation Baileys has for this event type.

---

## Section 4: Edge cases

- **Sidecar binary missing or wrong architecture** (packaging failure — e.g. an x64 binary shipped on an arm64 Mac): must not crash the app. `spawn` failure should be caught, logged, and surfaced as a "WhatsApp unavailable" state rather than an unhandled main-process exception — same spirit as `messageStore.init()`'s corrupt-DB recovery in MAV-263, applied to a missing executable instead of a missing/corrupt file.
- **Sidecar crashes mid-session** (not a clean exit): respawn-with-backoff per Section 3. Must not silently drop in-flight commands (e.g. a `fetch-history` request sent right before a crash) — needs explicit timeout/retry-or-fail semantics on the main-process side for outstanding commands.
- **Double-linked-device window during migration**: if a user relinks via whatsmeow *before* the old Baileys device is unlinked, both are active on the account simultaneously. WhatsApp allows this (multiple linked devices), but Loop must not end up running both a Baileys socket and a whatsmeow sidecar at once — that's exactly the "two processes racing against the same account" failure mode observed tonight (transient WhatsApp link-refusal from two simultaneous pairing attempts). **Cutover must be atomic from Loop's perspective**: disconnect/unlink Baileys fully before or immediately after the whatsmeow relink completes, never both connected at once.
- **Existing users' relink UX**: this is a real product decision, not just engineering — do we force a relink prompt on next launch post-cutover, or let it happen passively next time `whatsappConnected` is checked and found stale? **Explicitly deferred to product sign-off, not decided in this spec.**
- **IPC protocol version skew**: if the sidecar binary and the Node code expecting its JSON shape ever get out of sync (e.g., a partial update, or a dev running an old sidecar binary against new main-process code), messages could be silently mis-parsed. Needs a protocol version field in every sidecar message, checked on the Node side, with a hard failure (not silent data corruption) on mismatch.
- **Large initial sync burst**: proven in the spike (14,812 messages, single chat with 3,532). The Node side's IPC consumption must not block the event loop — parse and insert in batches (same transactional-insert pattern `messageStore.insertMessages()` already uses), not one giant synchronous JSON.parse of an enormous payload.
- **Go not installed on a contributor's machine**: unlike `better-sqlite3` (which only needs `electron-rebuild`, no separate compiler toolchain the developer must have), building the sidecar from source requires a Go toolchain. **Either**: (a) commit prebuilt sidecar binaries per-arch to the repo/a release artifact (avoids requiring Go locally, mirrors how Electron itself ships prebuilt binaries), or (b) require Go as a documented `npm run dev` prerequisite. Recommend (a) — flag as a decision for implementation kickoff, not resolved here.
- **App quit / clean shutdown**: sidecar process must be killed gracefully when Electron quits (`app.on('before-quit')` or equivalent), not left as an orphaned background process — directly informed by tonight's incident where two `spike` binaries were accidentally left running simultaneously by two different agents; that class of bug must not ship in the real implementation.

---

## Section 5: Platform constraints

- **New build/toolchain dependency**: Go compiler (or prebuilt binaries, see Section 4) — a materially bigger platform footprint than any native-module rebuild step Loop has needed so far. This is the single biggest new constraint this change introduces.
- **Code signing / notarization**: a bundled Go executable on macOS needs its own valid code signature for Gatekeeper, independent of Electron's own app signing. **Untested — must be verified against a real signed, notarized `npm run dist` build before this can ship**, not assumed to "just work" because Electron's own signing works today.
- **`asarUnpack` equivalent**: the sidecar binary, like `better-sqlite3`'s compiled `.node` file, cannot execute from inside an asar archive — needs an `extraResources`/`asarUnpack` entry in `electron-builder.yml`, but for a full standalone executable this time, not just a loadable native module.
- **Per-architecture builds**: at minimum arm64 + x64 macOS builds of the sidecar binary are needed (matching whatever Loop's `electron-builder` config already targets) — a new per-release build step.
- **Process management is new territory for Loop**: no existing code spawns/monitors a long-lived child process today. Needs graceful-shutdown handling verified on app quit, not just assumed.
- **Local IPC transport is macOS-only in this spec's scope** (matching Loop's current platform scope) — if Loop ever targets Windows, named pipes would replace Unix domain sockets (if Option B is chosen) or stdio handling may differ; not addressed here, flagged for future scope only.

---

## Section 6: Files to change

| File | Change |
|---|---|
| `sidecar/` (new directory, Go module) | New whatsmeow-based sidecar program — production-hardened version of tonight's spike (`/Users/subirpaul/Loop/spikes/whatsmeow-backfill-test/`): structured JSON IPC protocol (Section 2), reconnect/backoff logic mirroring existing Baileys patterns, graceful shutdown on parent-process signal, protocol version field on every message. |
| `src/main/whatsapp.ts` | Largely rewritten internals: replace Baileys `sock` management with sidecar process spawn/IPC/respawn logic. **Public interface unchanged** (`start()`, `disconnect()`, `fetchOlderMessages()`, `buildTieStrengthMap()`, **`sendMessage()`**) so `ipc.ts` and every other caller needs zero changes. `sendMessage()` internals switch from `sock.sendMessage()` to a `send-message` sidecar command; JID normalization and the MAV-255 no-existing-conversation guard (currently in this file) must be preserved. |
| `src/main/messageStore.ts` | **No change expected** — already event-shape-agnostic, just receives mapped records regardless of source. |
| `src/main/index.ts` | Sidecar spawn/lifecycle wiring added, ordered after `MessageStore.getInstance().init()`, before any IPC handler can reach `WhatsAppManager.start()`. Add `app.on('before-quit')` handling to kill the sidecar cleanly. |
| `package.json` | New Go build step (or prebuilt-binary fetch step, per Section 4 decision) added to `predev`/`build` scripts. |
| `electron-builder.yml` (shared/build-wide config — **wider blast radius, confirm current contents before editing**, same caution MAV-264 flagged) | Add sidecar binary as `extraResources` per-arch, plus code-signing entitlements for the bundled executable. |
| `src/test/whatsapp.test.ts` and related | Existing Baileys-mock-based tests need equivalents that mock the sidecar's JSON IPC protocol instead of Baileys' `sock.ev`. |
| `Loop/CLAUDE.md` | Major new architecture-constraints entry: ingestion layer is now a Go sidecar process, not in-process Baileys; document the IPC protocol, the mandatory-relink requirement for existing users, and the `whatsapp-auth/`-decommission step. |
| `whatsapp-auth/` (existing, Baileys) | Deleted post-cutover, after confirmed successful whatsmeow relink (Section 1). |

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
