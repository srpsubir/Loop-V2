# Design Spec: People-First Chapter Detection (Approach C)

_Feature: MAV-155 through MAV-159 | Approved plan: `.claude/plans/now-i-m-ready-to-silly-lollipop.md`_

---

## Context

The current architecture treats WhatsApp groups as the unit of chapter detection. A chapter is a period of life — people are evidence, groups are coordination artifacts. This spec covers the full rebuild: garbage filtering, contact-level social graph, bipartite clustering, and a rule-based chapter namer bridge. SLM fine-tuning (MAV-159) is scoped separately.

---

## Section 1: Data Changes

### No new persisted models. All new types are in-memory only.

**`ContactCluster` — new internal type (not persisted)**
```typescript
interface ContactCluster {
  contacts: Array<{ jid: string; displayName: string; tieStrength: 'high' | 'medium' | 'low' }>
  sharedGroups: string[]       // group JIDs this cluster's members co-appear in
  bestGroupJid: string         // group with tightest member overlap
  bestGroupName: string        // display name of bestGroupJid
  eraStart: number             // unix seconds (year-granularity)
  eraEnd: number | null        // null = active
  cohesion: number             // 0–1: fraction of contact pairs sharing 2+ groups
}
```
- Created by: `WhatsAppManager.buildContactClusters()` in `src/main/whatsapp.ts`
- Read by: `clustersToCandidates()` in `src/main/chapters.ts`
- Lifetime: in-memory only, discarded after `chapters:detect` IPC handler returns
- Never written to `state.json`

**`GroupMeta` — extended (internal to `src/main/chapters.ts`, not exported)**

Fields added:
| Field | Type | Nullable | Default |
|---|---|---|---|
| `highTieMemberCount` | `number` | No | `0` |
| `highTieMemberFraction` | `number` | No | `0` |
| `topTieMemberNames` | `string[]` | No | `[]` |
| `isCommunity` | `boolean` | No | `false` |

`avgTieStrength` field removed from `GroupMeta` and from `listGroupsWithMeta()` return type.

**`buildTieStrengthMap()` return type — extended**

Add `displayName: string` (empty string if unavailable) to each entry. Source: `sock.contacts[jid]?.name ?? sock.contacts[jid]?.notify ?? ''`.

**`ChapterCandidate` in `src/shared/types.ts` — additive only**

Fields added (optional, for debugging and future SLM use):
| Field | Type | Nullable |
|---|---|---|
| `clusterCohesion` | `number` | Yes |
| `topMemberNames` | `string[]` | Yes |

No fields removed. `waJid` is still the primary identifier.

**`AppState` — no changes.** `detectedChapters: ChapterCandidate[]` and `pendingChapters: ChapterCandidate[]` keep the same shape.

**`state.json` migration risk: None.** All changes are additive. Existing state files are forward-compatible.

**`groups-discovered.json`** (`~/Documents/Loop/groups-discovered.json`) — existing debug file written by `listGroupsWithMeta()`. Updated to include new fields (`highTieMemberCount`, `highTieMemberFraction`, `topTieMemberNames`). Additive; no reader depends on its schema.

---

## Section 2: Service Wiring

### Current call graph (`chapters:detect`)
```
IPC: chapters:detect
  → wa.listGroupsWithMeta()          [whatsapp.ts:207]
  → scoreGroups(groups)              [chapters.ts:36]
  → patchState({ detectedChapters, pendingChapters })
  → return top
```

### New call graph (`chapters:detect`)
```
IPC: chapters:detect                 [ipc.ts:143]
  → wa.buildContactClusters()        [whatsapp.ts — new]
      → wa.buildTieStrengthMap()     [whatsapp.ts:177 — extended to capture displayName]
          → chatStore DM iteration
          → sock.fetchMessagesFromWA() per DM (up to 500 msgs)
      → wa.listGroupsWithMeta()      [whatsapp.ts:207 — extended: garbage filter + new signals]
          → sock.groupFetchAllParticipating()
          → garbage filter: isCommunity, member ceiling (50), name regex kill list
          → compute highTieMemberCount, highTieMemberFraction, topTieMemberNames
      → bipartite projection (in-memory): contacts × groups → contact adjacency
      → greedy community detection → ContactCluster[]
      → K-means on createdAt timestamps → eraStart / eraEnd per cluster
      → drop invalid clusters (< 2 contacts, all shared groups > 40 members)
      → return ContactCluster[]
  → clustersToCandidates(clusters, groups)   [chapters.ts — new]
      → if clusters.length < 3: FALLBACK → scoreGroups(groups)
      → score each cluster: cohesion × highTieMemberFraction × eraClarity
      → map cluster → ChapterCandidate (bestGroupJid → waJid, bestGroupName → name)
      → rule-based name bridge: "{Name1}, {Name2} & {N} others · {era}"
      → sort descending by score → top 5 / rest
  → patchState({ detectedChapters: top, pendingChapters: rest })
  → getWindow()?.webContents.send('state:changed')
  → return top
```

### Lifecycle / setup
- `WhatsAppManager` singleton instantiated in `ipc.ts:43` — no change.
- `buildContactClusters()` requires `this.socket` to be non-null (WA connected). Guard already in `buildTieStrengthMap()` pattern — same pattern applied.
- `listGroupsWithMeta()` called inside `buildContactClusters()` — `groupFetchAllParticipating()` hits WA servers directly; does not depend on `chatStore`.
- Trigger: `ChapterInferenceScreen` calls `window.loop.chapters.detect()` on mount (no change to renderer).
- `state:changed` IPC push on completion — renderer re-reads state (no change).

### What observes what
- No new observers, no new publishers, no new `EventEmitter` events.
- `ChapterInferenceScreen` awaits the IPC promise and renders the returned `ChapterCandidate[]`.

---

## Section 3: Cross-System Sync

Single-process Electron app. The only process boundary is main ↔ renderer via IPC.

**Data that crosses the IPC boundary:**
- `ChapterCandidate[]` (top 5) returned from `chapters:detect` to renderer — same as today
- `state:changed` event triggers renderer to call `state:get` — same as today

**`ContactCluster[]` never crosses the IPC boundary.** It lives and dies in the main process.

**Source of truth:** `~/Documents/Loop/state.json` for confirmed chapters. `ContactCluster[]` is transient.

**Cold-start state:**
- WA not connected → `buildContactClusters()` returns `[]` → fallback to `scoreGroups([])` → `detectedChapters: []` → ChapterInferenceScreen shows empty state (already handled).
- `chatStore` empty (returning user, `syncFullHistory: false`) → `buildTieStrengthMap()` returns empty map → all contacts score `tieStrength: 'low'` → clusters have low cohesion → likely < 3 clusters → fallback to `scoreGroups(groups)`. `groupFetchAllParticipating()` still works (hits WA servers), so groups are available for fallback.

**No iCloud, no watch, no remote sync involved.**

---

## Section 4: Edge Cases

| Case | What happens | Explicitly handled? |
|---|---|---|
| WA not connected | `buildContactClusters()`: `if (!this.socket) return []` → fallback scoreGroups | Yes — guard in buildTieStrengthMap pattern |
| `groupFetchAllParticipating()` fails | Already caught, returns `[]` → clusters empty → fallback → empty candidates | Yes — existing try/catch in listGroupsWithMeta |
| `chatStore` empty | tieMap empty → all 'low' → weak clusters → < 3 clusters → fallback | Yes — fallback gate |
| `sock.contacts` missing displayNames | Fallback chain: `sock.contacts[jid]?.name ?? sock.contacts[jid]?.notify ?? ''` | Yes — explicit fallback |
| Cluster's `bestGroupJid` no longer in `groupFetchAllParticipating()` | Filter clusters where `bestGroupJid` not in returned groupMap | Yes — filter step |
| K-means on cluster with 1 group only | `eraStart = createdAt ?? lastMessageAt`, `eraEnd = null`. Skip K-means. | Yes — guard on cluster size |
| `createdAt` null for groups | Era detection falls back to `lastMessageAt`; if also 0, era fields set to 0 | Yes |
| All groups filtered by garbage filter | Empty group list → empty clusters → fallback to `scoreGroups([])` → empty candidates | Yes — fallback |
| < 3 clusters produced | Explicit gate: `if (clusters.length < 3) return scoreGroups(groups)` | Yes — defined in plan |
| Concurrent `chapters:detect` calls | Second call overwrites state — same behavior as current. IPC calls are sequential per call in Electron. Low risk; UI only calls on mount. | Accepted — no lock needed |
| Phase 1 name regex too aggressive | If all groups filtered: empty → fallback. Tunable regex. | Handled by fallback |
| User has 0 groups | `groupFetchAllParticipating()` returns `{}` → empty clusters → fallback → empty candidates → existing empty state UI | Yes |

---

## Section 5: Platform Constraints

**`syncFullHistory: false` (whatsapp.ts:73)**
Chat history is not re-downloaded on reconnect. `buildTieStrengthMap()` reads `chatStore` DMs. For returning users, `chatStore` may be empty on reconnect until new messages arrive. Result: tie strengths are sparse → clustering quality degrades → fallback fires. This is the known constraint that drove the whole architecture; the fallback is the mitigation.

**`sock.fetchMessagesFromWA()` rate limits**
`buildTieStrengthMap()` calls this for every DM in `chatStore` (up to 500 messages each). This is unchanged from the current implementation — `listGroupsWithMeta()` already calls `buildTieStrengthMap()`. `buildContactClusters()` calls it once, not twice. No regression.

**`groupFetchAllParticipating()` cap**
Currently sliced to 200 groups (`groupEntries.slice(0, 200)` in whatsapp.ts:242). Bipartite projection runs on ≤ 200 groups × ~50 members = ≤ 10,000 membership pairs. Entirely in-memory, no memory concern.

**Memory**
All clustering is in-memory in the main process. At 10,000 pairs, peak memory is ~2–3 MB. No concern.

**No new entitlements required.** All computation is local. No new network permissions beyond existing Baileys WA connection.

**macOS only.** Electron app targeting macOS arm64 + x64. No cross-platform concerns.

**No minimum OS version change.** No new Electron APIs used.

**Baileys `isCommunity` flag availability**
`groupFetchAllParticipating()` returns full group metadata objects from WA servers. The `isCommunity` (or equivalent `communityId` / `isParent`) field is present in Baileys' `GroupMetadata` type if the group is a community. Must verify field name at implementation time against the installed Baileys version.

---

## Section 6: Files to Change

| File | Change | Shared target? |
|---|---|---|
| `src/main/whatsapp.ts` | (1) Add garbage filter to `listGroupsWithMeta()`: `isCommunity` flag, member ceiling 50, name regex kill list. (2) Extend `buildTieStrengthMap()` return to include `displayName`. (3) Replace `avgTieStrength` with `highTieMemberCount`, `highTieMemberFraction`, `topTieMemberNames`. (4) Add new `buildContactClusters()` function. | No |
| `src/main/chapters.ts` | (1) Extend `GroupMeta` with new signal fields; remove `avgTieStrength`. (2) Update `scoreGroups()` to use `highTieMemberFraction` in scoring. (3) Add `ContactCluster` interface. (4) Add `clustersToCandidates()` with fallback to `scoreGroups()` and rule-based name bridge. | No |
| `src/main/ipc.ts` | `chapters:detect` handler: import and call `clustersToCandidates` + `buildContactClusters` instead of `listGroupsWithMeta` + `scoreGroups`. ~10 line change. | No |
| `src/shared/types.ts` | Add optional `clusterCohesion?: number` and `topMemberNames?: string[]` to `ChapterCandidate`. No removals. | **Yes — shared between main and renderer** |
| `src/test/chapters.test.ts` | Add tests for `clustersToCandidates()`: happy path, fallback trigger, empty input, rule-based name output. Add test for community filter. | No |
| `src/test/whatsapp.test.ts` | Add tests for `buildContactClusters()`: bipartite projection, era detection, empty chatStore fallback, displayName capture. | No |

**`src/shared/types.ts` is shared between main and renderer processes.** Change is additive only (optional fields) — no renderer code reads the new fields until Phase 6, so blast radius is zero for the renderer.

---

```
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
```
