# MAV-260 — Returning-user chapter review (tappable toast → lightweight confirm flow)

## Context and a correction to the ticket's framing

The ticket describes MAV-258 as "discarding" rescan candidates. **That's not quite what happens.** `chapters:detect()` (`ipc.ts:156-184`) already unconditionally writes results to `state.detectedChapters` (top-N by score) and `state.pendingChapters` (rest) via `patchState()`, and emits `state:changed` — regardless of who calls it. `SettingsScreen.tsx`'s `handleRescanGroups()` does call the real handler, and the data really is persisted. What's actually missing is **UI that reads `detectedChapters` outside the first-run onboarding flow**, plus **dedup/snooze logic** so already-confirmed or recently-declined candidates don't repeatedly resurface. This is cheaper to build than "persist discarded data" — the persistence already exists.

One critical wrinkle this creates: `chapters:detect()` **wholesale-replaces** `detectedChapters`/`pendingChapters` on every call (not a merge). So a per-candidate 7-day dismiss timestamp cannot live inside the `ChapterCandidate` objects themselves — those get fully overwritten every rescan. It needs its own persisted structure that survives across `detect()` calls.

## Section 1: Data changes

**`ChapterCandidate`** (`src/shared/types.ts:29-39`) — no changes. Stays exactly as-is; it's a transient scoring snapshot, wholesale-replaced every `chapters:detect()` call, so it's the wrong place for anything that needs to persist across calls.

**`AppState`** (`src/shared/types.ts:118-141`) — one new field:
- `dismissedChapterCandidates: Record<string, string>` — map of `waJid` → ISO timestamp when declined. Mirrors the existing precedent `ContactState.nudgeDismissedAt` (`types.ts:106`, "resurfaces after 7 days" — same pattern, same TTL, already validated in this codebase for the exact same kind of UX).
  - **Created**: empty object, `src/main/store.ts`'s default state (alongside `detectedChapters: []`, `pendingChapters: []`).
  - **Written**: new IPC handler `chapters:dismissCandidate` (Section 2) sets `dismissedChapterCandidates[waJid] = new Date().toISOString()`.
  - **Read**: wherever the "new candidates" list is computed for the badge/toast (client-side filter, or a new IPC read) — a candidate whose `dismissedAt` is within 7 days is excluded from "new."
  - **Cleared**: never explicitly deleted (a stale entry for a JID that later becomes a real confirmed chapter is harmless — that JID will also be filtered out by the "already in `state.chapters`" check, so the dismissed-map entry becomes moot, not wrong). Optional cleanup could prune entries older than e.g. 30 days but isn't required for correctness — flagging as a nice-to-have, not blocking.
  - **Migration risk**: none. New field, defaults to `{}` for existing users via the same store-default mechanism every other optional `AppState` field uses (`store.ts` merges saved state over defaults — check `store.ts`'s load path applies defaults for missing keys, which it must already do given fields like `telemetryEnabled` were added post-launch without a formal migration).

No changes to `Chapter`, `ContactState`, or any other model.

## Section 2: Service wiring

**Trigger (unchanged from MAV-258)**: `SettingsScreen.tsx`'s "Rescan my groups" → `window.loop.chapters.detect()` → `ipc.ts`'s `chapters:detect` handler → `patchState({ detectedChapters, pendingChapters })` → `state:changed` event.

**New: computing "what's actually new" (the badge/toast count).** This must exclude two things from raw `detectedChapters`: (a) candidates whose JID already maps to an existing `state.chapters` entry (same dedup logic already used in `App.tsx:451-459`'s `unnamedIds`/`jidToId` pattern — reuse that exact function, don't reimplement), (b) candidates in `dismissedChapterCandidates` with a timestamp less than 7 days old. This computation can live client-side (in `SettingsScreen.tsx` or a shared hook) since it only needs `state.detectedChapters`, `state.chapters`, and `state.dismissedChapterCandidates` — all already delivered via `window.loop.state.get()`. No new IPC read needed for the count itself.

**New: toast becomes tappable.** `SettingsScreen.tsx`'s existing toast component (used for "Rescanned — found N chapter candidates") needs an optional `onAction` prop/callback if it doesn't already support one — check the toast component's current interface before assuming. Tapping it opens the new review flow (Section 4's UI, likely a modal state in `App.tsx` or a new overlay rendered conditionally, NOT a `nav.screen` route change per the "chrome stays visible" decision).

**New: persistent badge.** A badge count (same "new candidate" computation as above) needs to render on the Settings sidebar item and/or the Chapters sidebar item (`AppSidebar.tsx`) until the user reviews. This means `AppSidebar.tsx` needs read access to the same three state fields — it likely already reads `state` via whatever hook/context the rest of the sidebar uses (check existing pattern, e.g. does it already show unread-style badges anywhere? If not, this is the first instance of that pattern in this codebase and should be built as a small reusable piece, not a one-off).

**New: lightweight confirm flow.** A new component (not a route) that reuses the *interaction pattern* of `ChapterInferenceScreen`/`ChapterNamingScreen`/`OnboardingRevealScreen` but is NOT those components directly (per the "lighter returning-user variant" decision). Concretely:
- Card list of new candidates (only the ones passing the "actually new" filter above) → confirm/skip per candidate, same visual language as `ChapterInferenceScreen`'s cards but different copy ("We found new chapters" not "Almost there").
- Confirm → same naming step as `ChapterNamingScreen` (can likely reuse that component's internals/props directly if its props don't assume it's inside the full-screen onboarding nav state — check its prop signature).
- Skip → calls new `chapters:dismissCandidate` IPC handler with the candidate's `waJid`.
- No reveal-screen equivalent needed — reveal was a first-run "welcome" moment; for a returning user, closing the modal and updating the Chapters list in place is sufficient, don't manufacture a reveal beat that doesn't serve a returning user.
- Renders as an overlay/modal on top of the current screen (dashboard/Settings/wherever they were), per "app chrome stays visible" — this is new to the codebase (first modal-over-existing-screen pattern for a multi-step flow) — confirm during implementation whether an existing modal primitive exists in this codebase (check for any `<Modal>`/`<Dialog>` component — Delete-all-data's confirmation dialog is one, reuse its layering/z-index approach if suitable) or whether a new one is needed.

**New IPC handler**: `chapters:dismissCandidate` in `ipc.ts` (per the existing rule — IPC handlers live only in `ipc.ts`). Takes a `waJid: string`, reads current state, writes `dismissedChapterCandidates[waJid] = new Date().toISOString()`, patches state, returns nothing.

**Confirm action**: reuses the existing `chapters:confirm` handler (`ipc.ts:186-204`) unchanged — it already does exactly what's needed (moves a `detectedChapters` entry into `state.chapters`, dedupes against existing chapters by id). No new handler needed for confirm.

## Section 3: Cross-system sync

Single-process, no cross-device sync. The only "boundary" is main↔renderer via IPC and the `state:changed` event, both existing, unchanged patterns. Source of truth is `state.json` on disk via `patchState()`, same as everything else in this app.

## Section 4: Edge cases

- **Rescan finds zero new candidates**: toast still shows (e.g., "Rescanned — no new chapters found"), no badge, nothing tappable, no regression from MAV-258's current behavior in this case.
- **User declines a candidate, then a rescan re-runs within 7 days**: the dismissed-map filter must exclude it from "new" even though it's still present in the raw `detectedChapters` array (that array gets wholesale-replaced but will likely re-surface the same group if it's still a high-scoring cluster) — this is the entire reason the dismiss timestamp can't live inside `ChapterCandidate`.
- **User declines a candidate, 7+ days pass, another rescan runs**: candidate should reappear as "new" again (dismissed timestamp now stale) — filter must be a live time comparison at read time, not a one-time check.
- **A candidate gets confirmed through this flow while ALSO being one of the top-5 in `detectedChapters` from a stale rescan**: `chapters:confirm`'s existing dedup-by-id logic already handles double-confirm safely (filters `existingIds` before adding) — no new handling needed, existing code already covers this.
- **User has the review modal open, and ANOTHER rescan completes in the background** (e.g., they triggered rescan, then immediately reopened the modal from a stale badge before the new scan finished): the modal's candidate list should reflect state at open time; if this causes a confusing mid-review update instead of a hard requirement, at minimum don't crash — re-reading `state.detectedChapters` mid-flow should not corrupt an in-progress per-candidate naming step. Flag as needing a decision during implementation if it proves awkward (e.g., snapshot the candidate list at modal-open time and ignore subsequent `state:changed` events until the modal closes).
- **Cold start / app restart with a pending badge**: badge count must be recomputed from persisted state on every load, not held in transient React state that resets on restart — since it's derived from `state.detectedChapters`/`chapters`/`dismissedChapterCandidates`, all persisted, this falls out naturally as long as the badge computation runs on mount, not just after a live rescan event.
- **Empty state**: first-ever load for a user with `dismissedChapterCandidates` undefined (pre-migration) — must default to `{}` (see Section 1's migration note), not crash on `Object.keys(undefined)` or similar.

## Section 5: Platform constraints

None beyond what the existing onboarding flow already handles — same Electron/IPC/React environment, no new OS-level capability, no new entitlement. The only genuinely new interaction pattern for this codebase is a **multi-step modal overlay on top of a persistent-chrome screen** — worth a quick check during implementation for whether the existing `ConnectionStateProvider`/context patterns used elsewhere compose cleanly with a modal, or whether z-index/focus-trap needs explicit handling (native macOS app, so OS-level focus behavior matters more than it would in a browser tab).

## Section 6: Files to change

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `dismissedChapterCandidates: Record<string, string>` to `AppState`. |
| `src/main/store.ts` | Add `dismissedChapterCandidates: {}` to default state. |
| `src/main/ipc.ts` | Add `chapters:dismissCandidate` handler (new, small). No changes to existing `chapters:detect`/`chapters:confirm` — both already do what's needed. |
| `src/renderer/src/screens/SettingsScreen.tsx` | `handleRescanGroups()` — after detect completes, compute the "actually new" count (dedup + snooze filter) instead of raw `candidates.length`; make the toast tappable, wire to open the new review modal. |
| `src/renderer/src/components/AppSidebar.tsx` | Add badge rendering for the same "new candidate" count, on Settings and/or Chapters nav items. |
| New file, e.g. `src/renderer/src/components/ChapterReviewModal.tsx` | The lightweight returning-user confirm/name flow — card list → confirm (calls existing `chapters:confirm`) / skip (calls new `chapters:dismissCandidate`) → close. Likely reuses `ChapterNamingScreen`'s internals for the per-candidate naming step; check that component's prop signature for reusability outside the full onboarding nav flow before assuming it can be dropped in unchanged. |
| `src/renderer/src/App.tsx` | Wire the modal's open/close state (likely a small piece of local state, not a `nav.screen` route change, per the "chrome stays visible" decision). |

No files shared with other targets/packages beyond what's already shared (this is all renderer + main, same as every other feature in this app).

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
