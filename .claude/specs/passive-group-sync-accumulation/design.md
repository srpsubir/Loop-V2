# MAV-259 — Passive group-metadata accumulation

## Context and actual root cause (corrects the ticket's framing)

The ticket assumes passive listeners (`groups.upsert`, `groups.update`, `group-participants.update`) don't exist yet. **They already exist and are wired** (`src/main/whatsapp.ts:358-360`, handlers at `636-683`). `handleGroupsUpsert` already writes full `members` from `m.participants` into `groupCache` when Baileys supplies them, and the two update handlers keep cached entries fresh incrementally.

The real gap is narrower and cheaper to fix than "add passive listeners": **`fetchRealGroupMembers()` never checks whether a group is already well-resolved (via a prior active fetch OR a passive event) before spending an active `groupMetadata()` call and rate-limit budget on it, every single pass.** `listGroups()` has a whole-cache freshness gate (`isGroupCacheFresh()`, 24h TTL) that skips the fetch path entirely when fresh — but `listGroupsWithMeta()` (the one `chapters:detect` actually calls) has no such gate and no per-group skip, so every call re-fetches every candidate group regardless of cache state. Already-resolved groups compete for the same 8-per-batch/90s budget against genuinely-unresolved ones, which is a large part of why coverage plateaus around ~1/3 per pass even as the cache accumulates good data over time.

**Revised fix**: make the active-fetch loop skip groups whose cache entry is already good, so budget concentrates on genuine misses. This is a targeted change inside `fetchRealGroupMembers()`, not a new sync subsystem.

## Section 1: Data changes

No new persisted models. `CachedGroup` (existing shape in `groups-cache.json`, MAV-256) gains no new fields — this change only alters *when* an active fetch is attempted, not what's stored.

One new in-memory-only field is needed for the skip decision: nothing persisted, computed at call time from existing `CachedGroup.members.length` and a new constant (see Section 6).

- **Model**: `CachedGroup` (`src/main/whatsapp.ts`, existing type) — unchanged shape.
- **Written by**: `handleGroupsUpsert`, `handleGroupsUpdate`, `handleGroupParticipantsUpdate` (passive, existing, unchanged), `fetchRealGroupMembers` (active, existing, behavior changes per Section 2).
- **Read by**: `fetchRealGroupMembers` (new: pre-fetch skip check), `listGroups()`, `listGroupsWithMeta()`.
- **No deletion path changes.** `disconnect()` still clears the whole cache on logout (unchanged, MAV-256 design — a new account shouldn't inherit stale groups).
- **Migration risk**: none. `groups-cache.json`'s on-disk shape is unchanged; this is pure in-process logic.

## Section 2: Service wiring

Call graph, current vs. changed:

**Current** (`chapters:detect` IPC handler, `src/main/ipc.ts:156`):
1. `ipcMain.handle('chapters:detect')` → `detectChapters()` (wherever that's defined, calls `listGroupsWithMeta()`)
2. `listGroupsWithMeta()` (`whatsapp.ts:685`) → `sock.groupFetchAllParticipating()` → cheap filters → `candidateEntries`
3. `fetchRealGroupMembers(sock, candidateEntries.map(m => m.id))` (`whatsapp.ts:474`) — **unconditionally attempts every id in the list**, batched 8/1.5s, 90s total budget
4. Inside the loop: `existing = this.groupCache.get(groupId)` is read **only** for the truncation-guard comparison (Section on "looksTruncated"), never to skip the call outright

**Changed**: step 3's per-group loop gains a skip check before the `sock.groupMetadata()` call:

```
for each groupId in batch:
  existing = groupCache.get(groupId)
  if existing is "good enough" (see Section 6 threshold) AND not forced-stale:
    membersByGroup.set(groupId, existing.members)   // carry forward, no network call
    continue  // do not spend batch/budget slot on this group
  // else: proceed with the existing active-fetch + truncation-guard logic, unchanged
```

This means the batch size effectively shrinks to "genuine misses this pass," so the same 8-per-batch/90s budget covers proportionally more unresolved groups each time. Passive listeners already populate `existing` between passes (and even mid-pass, since they're on the same event loop) — this change is what lets that passive population actually reduce active-fetch load, instead of being redundant with it.

**Setup/lifecycle**: no change. `sock.ev.on(...)` registrations happen once in `start()` (`whatsapp.ts` ~248-360), already before any scan can run. `groupCache` is a `Map` on the `WhatsAppManager` instance, already instantiated before `start()` registers listeners.

**Nothing new to instantiate.** No new class, no new IPC handler required for this specific change (MAV-258's rescan trigger is a separate, already-in-flight change).

## Section 3: Cross-system sync

Single-process, single-system — no cross-device/cross-process sync involved. The only "boundary" is Baileys' WebSocket ↔ `WhatsAppManager`'s in-memory `groupCache` ↔ `groups-cache.json` on disk. That boundary and its failure modes are unchanged by this fix (already covered by MAV-256's load/save error handling — corrupt/missing file falls back to empty cache, non-fatal).

Source of truth: WhatsApp's servers, always. `groupCache` is a performance cache with a defined staleness policy, never authoritative — this fix doesn't change that contract, it changes how aggressively the cache is trusted before spending fetch budget.

## Section 4: Edge cases

- **A passively-updated group has fewer members than actively-cached data** (e.g., a `group-participants.update` 'remove' event legitimately shrinks membership). This is *correct* data, not truncation — the skip-check must not confuse "smaller than before" with "suspicious," since `handleGroupParticipantsUpdate` already applies real add/remove semantics (existing code, `whatsapp.ts:664-683`). The skip threshold (Section 6) should be based on absolute plausibility (e.g., `SUSPICIOUS_MEMBER_THRESHOLD`-style minimum), not "did the count change since last active fetch."
- **A group is cache-fresh but the founder just joined new people** — passive `group-participants.update` should catch adds in real time regardless of whether an active fetch ever runs again for that group; verify this path is exercised by a live join/leave event during implementation, not just unit-tested with synthetic events.
- **First-ever run, empty cache**: every group is a genuine miss, skip check always false — behavior identical to today (all groups attempt active fetch, same as now). No regression risk for first-run users.
- **A group only ever seen via passive `groups.upsert` with an empty/undefined `participants` field** (plausible during initial history-sync — Baileys' upsert events during sync sometimes carry partial metadata without a full participant list; **this needs live confirmation during implementation**, see Section 5). If `m.participants` is empty/undefined at upsert time, `handleGroupsUpsert` currently writes `members: []` — an empty cache entry that the skip check must NOT treat as "good enough" (an empty list should never short-circuit an active fetch; it's indistinguishable from "not yet known").
- **Concurrent writes**: `saveGroupCache()` is fire-and-forget (`.catch(() => {})`) from multiple call sites (active fetch completion, three passive handlers) — already a possible last-write-wins race today, unchanged by this fix. Out of scope to fix here; flagging as pre-existing, not introduced by this change.
- **`chapters:detect`'s single-flight guard** (`detectPromise`, `ipc.ts:155`) already prevents concurrent `listGroupsWithMeta()` calls from racing each other — unaffected by this change.

## Section 5: Platform constraints

- **Unverified assumption, must confirm live before/during implementation**: whether Baileys' `groups.upsert` events during a normal connect/history-sync actually carry populated `participants` arrays, or whether they typically arrive with metadata-only (subject, creation) and participants stay empty until an explicit `groupMetadata()` call. If the latter is true for most groups, the passive stream contributes less coverage than hoped and the skip-check will rarely fire — the fix still isn't harmful (it's a no-op in that case, active-fetch behavior stays as today), but the expected coverage improvement may not materialize. **Action**: instrument and observe real `groups.upsert` payloads on the next live connect before assuming this design closes the coverage gap; if participants are consistently empty on upsert, this ticket's actual leverage point shifts to "does Baileys expose a way to request the same data more cheaply than per-group `groupMetadata()`" — a follow-up investigation, not a blocker to shipping the skip-check itself (which is beneficial regardless, since it stops wasting budget on already-resolved groups from *previous active passes* even if passive data never fully closes the gap).
- **No new entitlements, OS version gates, or background execution constraints** — this is pure Node/Electron main-process logic, same runtime environment as the existing code.
- **WhatsApp's server-side rate limiter itself is unverified and unmodeled** — no visibility into its actual rules (per-connection? per-account? time-window based?). This fix reduces *our* demand on it but doesn't change its behavior; it's not something we can test deterministically, only observe empirically across live runs.

## Section 6: Files to change

| File | Change |
|---|---|
| `src/main/whatsapp.ts` | Modify `fetchRealGroupMembers()` (~line 474-573): add a per-group skip check before the `sock.groupMetadata()` call inside the batch loop, using a new constant e.g. `private static readonly SKIP_ACTIVE_FETCH_MIN_MEMBERS = 3` (deliberately above `SUSPICIOUS_MEMBER_THRESHOLD = 2` so a cache entry has to be genuinely plausible, not just "not-suspicious," to be trusted for skipping). Skip only when `existing.members.length >= SKIP_ACTIVE_FETCH_MIN_MEMBERS` — never skip on an empty or 1-2-member cached entry, matching the truncation-guard's existing plausibility bar. |
| `src/main/whatsapp.ts` | No changes needed to `handleGroupsUpsert`/`handleGroupsUpdate`/`handleGroupParticipantsUpdate` — already correct, already wired. |
| `src/test/**` (exact path TBD — check existing `whatsapp.test.ts` or equivalent) | Add unit coverage: (a) a group with a good cached entry is skipped (no `groupMetadata` call recorded on the mock sock), (b) a group with an empty/small cached entry still gets actively fetched, (c) a genuinely first-seen group with no cache entry gets actively fetched. |
| `Loop/CLAUDE.md` | No changes needed — no new architecture constraint introduced (still one code path, `fetchRealGroupMembers`, doing rate-limited resolution; behavior is a threshold tweak, not a new caller/pattern). |

No files shared between other targets/packages are touched — this is confined to `src/main/whatsapp.ts` and its existing test coverage.

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
