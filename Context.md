# Loop — Session Context
_Updated: 2026-07-15_

---

## 2026-07-15 (cont'd) — MAV-263 implemented + live-verified. Real data pipe works; frequency-signal depth still thin.

MAV-263 shipped (per Linear comment + `Loop/CLAUDE.md` architecture section, both now reflect it as done — this happened outside this thread, between the artifact publish and this check-in). `messageStore.ts` (SQLite) live, both Baileys listeners wired, `buildTieStrengthMap()` reads real counts, `disconnect()` clears the store, `syncFullHistory: true`. `npm run test:all` green (232 unit tests + e2e + ipc).

**Live verification (fresh logout + QR relink, done for real):** `messages.db` has 1,007 rows across 600 chats, timestamps span 2017-06-13 → now. Dedup via PK works, no corrupt-DB path hit.

**New finding, open, not yet solved**: per-chat backfill depth is shallow — 561/600 chats got exactly 1 message, the rest capped at exactly 15. `messaging-history.set` fired as a single chunk (`isLatest: true` immediately) — Baileys' historical-sync payload appears to cap recent-messages-per-chat regardless of `syncFullHistory: true`. This is upstream Baileys behavior, not a bug in `messageStore.ts`'s insert/count logic (no artificial limit there).

**Why this still matters for MAV-262**: the original ask (test whether frequency/social-graph-strength dynamics alone can signal chapter transitions) needs a frequency *trend* over time, not a recency snapshot. 1–15 messages/chat is closer to what the old fake proxy already approximated than to real trend data. The infra is now correct and unblocked; the product hypothesis is still untested. Depth will build up naturally via live `messages.upsert` traffic — this needs elapsed real time (weeks), not more engineering.

## 2026-07-15 — MAV-262 product-thinking investigation → MAV-263 filed (persistent message store, SQLite). Eng spec written, NOT yet approved.

This session was product/architecture investigation, not implementation — no code changed. Full thread: chapters≠groups product question → life-chapter taxonomy research → clustering-mechanism research → discovery that chapter detection runs on fake data → root-caused why → eng spec for the real fix.

### MAV-262 (filed by founder, 2026-07-14, worked this session) — "chapters are not 1:1 with WhatsApp groups"
Founder's core objection: Loop's chapter detection treats one WhatsApp group as one chapter, structurally (`Chapter.id` derives from `waJid`). Real chapters can span multiple groups, a group can be noise (not a chapter at all), and — per the founder's explicit instruction — **chapters cannot be born with zero groups** (this rules out a "create from scratch" path considered and then cut).

**Locked design direction for MAV-262** (not yet built): detection should surface pre-assembled candidate chapters (system does the clustering), user approves/edits/rejects — not manual assembly from parts (too much user load). `Chapter` needs its own identity independent of any single `waJid`, with a many-to-one group→chapter join.

### Life-chapter taxonomy (research, via fork)
Grounded in narrative identity theory (McAdams — chapters are marked by "nuclear episodes": highs/lows/turning points, not any fixed category), life-course theory (Elder — role transitions: education, employment, family), event segmentation theory (Zacks — a real boundary needs *goal + cast + setting* to change together, not just one), and shipped precedent (Facebook's own "Life Events" taxonomy: work, education, relationships, relocation, health).

**7 dimensions identified**: geography, institution (school/employer), social-circle turnover, relationship/family role, identity/internal turning points, health, employment-status-vs-institution. **Detectability from WhatsApp data**: geography/social-circle/institution/relationship are weakly-to-directly inferable from activity patterns; identity turning points and health are **structurally invisible** to any messaging signal — McAdams' own point is these often leave no external footprint. Key implication: the confirm-screen should ask the user to name *why* a detected boundary happened, since Loop can see *that* something changed but not *why*.

### Clustering-mechanism research (via fork)
Surveyed Apple Photos (two-pass clustering — weak transfer, needs location/face data we don't have), Google's significant-location/gap-segmentation algorithm (**closest real analog** — swap GPS point for message timestamp), Louvain community detection (mature but unstable on dynamic/temporal graphs — exactly why pure member-overlap churn isn't sufficient alone), changepoint detection (PELT — right tool for "one group secretly contains two eras"), and entity resolution/record linkage (Splink-style — the right *frame*: many groups → one resolved chapter entity, cheapest to implement). **Correction on record**: no real evidence Facebook algorithmically detects life events from graph structure — that's folklore, not documented engineering.

### The big finding: chapter detection runs on fabricated data today
`buildTieStrengthMap()` (`src/main/whatsapp.ts:411-435`) assigns a **hardcoded** `messageCount` (150/30/5 by recency bucket) — not measured. Traces back to the "Chapter detection infinite hang" fix (`5d37be1`, 2026-06-30): the original code called `fetchMessagesFromWA()` per contact sequentially and hung; the fix removed the real-data call instead of fixing the fetch pattern, and nobody flagged that the fix also deleted the one signal the whole chapter-layer vision depends on.

**Root cause of "why can't we get this data"**: Baileys (`@whiskeysockets/baileys@7.0.0-rc13`) already delivers historical (`messaging-history.set`) and live (`messages.upsert`) messages **event-driven, for free, zero extra network calls**. Confirmed via direct code read: Loop's `whatsapp.ts` has never listened to either event — only `chats.set/upsert`, `connection.update`, `creds.update`, `groups.*`. This was never a Baileys/platform ceiling, just an unwired listener.

### MAV-263 filed — persistent local message store
https://linear.app/maverick-silver/issue/MAV-263 (High priority, related to MAV-262 and MAV-256). Eng spec at `.claude/specs/persistent-message-store/design.md` — **written, NOT yet approved, implementation blocked on sign-off.**

Spec covers: SQLite (`better-sqlite3`) table for messages (chat_id, sender_jid, from_me, timestamp, **full text** — founder explicitly chose full text + SQLite over an initial metadata-only/NDJSON draft, judging the native-module cost as low and well-precedented), wiring the two new event listeners + handlers in `whatsapp.ts`, replacing `buildTieStrengthMap()`'s fake proxy with real counts, clearing the store on `disconnect()` (same pattern as existing `groupCache` clear), flipping `syncFullHistory: false → true`, and the `electron-rebuild`/`asarUnpack` packaging requirements for the arm64 DMG build.

**Known, accepted limitation**: `messaging-history.set` only fires once at initial pairing — it will **not** backfill the currently-linked account on a normal reconnect. Founder explicitly accepted doing a deliberate logout + fresh QR relink to get real historical data once this ships; not a blocker, a planned step.

### Also this session
- Confirmed via WebFetch: an artifact URL the founder referenced ("Loop — Launch Confidence Map") is an **unrelated** screen-by-screen bug/test-status audit from a different session — does not relate to or validate this message-persistence work. Flagged directly rather than assumed.
- New standing memory: never use "sit with this" or similar reflective-pause filler — founder flagged it as condescending mid-problem-solving, not just vague. No more "want more time?" check-ins; end on content or a real decision fork only.

### Next steps
1. **Awaiting explicit "approved" on `.claude/specs/persistent-message-store/design.md`** before any implementation starts.
2. Once approved: implement `messageStore.ts`, wire the two Baileys listeners, flip `syncFullHistory`, add `electron-rebuild`/`asarUnpack` config, update `buildTieStrengthMap()`, add test coverage per the spec's Section 6 file list.
3. After that ships: founder does the deliberate logout/relink to get real historical backfill, then the actual MAV-262 frequency-dynamics clustering test (the original ask — "construct chapters from real data and show me") becomes possible for the first time.
4. MAV-262 itself (the actual chapter-redesign clustering/confirm-UX work) is still unbuilt — this session only produced the taxonomy, the mechanism research, and the data-layer prerequisite (MAV-263). No chapter-detection code has changed yet.

---

## 2026-07-14 (cont'd) — Shipped v1.1.2 as stable checkpoint; second verification pass deferred

**Decision**: ship the current state as `v1.1.2` (tagged, `package.json` bumped from 1.1.1) rather than keep chasing a fully clean live verification of the group-metadata fix in the same session. Rationale (founder's call): too much changed today to hold the whole release hostage to one hard-to-isolate live test, but a real second pass is still owed before wider confidence — not skipped, deferred.

**What's in this checkpoint**: everything from the "Real cold-start test" section above, plus this session's later work:
- `b943bb2` — deleted dead `WelcomeScreen` + `OnboardingBeat3Screen` (confirmed unreachable)
- `a2af9bb` — dark-mode Option A (raised surface/raised floor) + avatar-stack spacing fix (chapter-candidate row)
- `202750b` — chapter-card footer-overlap bug (found live, sticky footer covered last card)
- `bd41c1a` / `8900f53` — rescan-verification harness work; confirmed WebDriver/Electron automation structurally cannot reach the real WhatsApp session (isolated profile by design) — any future live verification needs a human click or a new non-WebDriver mechanism, not more harness tuning
- `MAV-258` filed — Loop has no manual "rescan groups" trigger outside onboarding; this is *why* today's live verification kept getting contaminated by forced app restarts
- `npm run test:all` clean at ship time: unit 210/210, e2e 10 passed/6 skipped, ipc 13/13, typecheck clean, lint:colors clean

**Beeper cross-validation (real signal, not just theoretical)**: of 10 most-recent low-member-count cached groups checked against Beeper Desktop directly, 2 showed genuine undercounts consistent with the truncation bug — "Plans today" (cached 3, actually ≥5) and "Athens Weekend Crew" (cached 3, actually ≥4). Confirms `0814d92` was fixing a real, live issue, not a theoretical one.

**Open item carried into next pass — `0814d92` (truncated group-metadata fix)**:
- Code has been independently reviewed and confirmed correct twice (direct review; separately while investigating the MAV-257 accumulation logic).
- A same-session two-pass live test was attempted multiple times today and never came back fully clean — every attempt got contaminated by an app quit/restart in between (which the disconnect-on-logout cache-clear, or an untracked intermediate quit, disturbs). Final attempt: 45/49 groups matched with **zero regressions** among matched entries (the actual thing `0814d92` protects against held), but **4 groups with real prior data (7, 13, 28, 3 members) went missing between the pass-1 snapshot and the final read** — root cause not found; `loadGroupCache()`/`saveGroupCache()` code reads as correct (full load-merge-write, no filtering), so the leading theory is an untracked app quit/relaunch in between rather than a bug in the merge logic itself, but this was **not confirmed**, only inferred.
- **Next-pass checklist**: (1) get one truly uninterrupted two-scan session — no app quit/restart of any kind between scans, verified by watching the process the whole time, not inferring from logs after the fact; (2) if the 4-group disappearance reproduces under a verified-clean two-pass session, that's a real bug in the persistence layer and needs its own investigation separate from `0814d92`; (3) if it doesn't reproduce, close `0814d92` and this note out for good.
- Consider building `MAV-258` (manual rescan trigger) first — it would make this verification trivial to run cleanly, instead of fighting the onboarding-only flow every time.

## 2026-07-14 — Real cold-start test: 2 launch-blocking bugs found live, both fixed. Linear cleaned up.

This section covers everything since the last snapshot: closing out the CPO memo's action items (MAV-75/192/193/199/257), a security/privacy audit, a coverage-completeness re-check, and — the headline event — an actual full cold-start test against the real account, which is the only reason the two most serious bugs below were ever found.

### Linear housekeeping (all via MCP, all confirmed not guessed)
- **MAV-159** (orbital-bubble home screen redesign) — **canceled**. Founder confirmed directly: intentionally moved away from, it "was shitty," current list layout is the real intended design. Stale ticket, not a regression.
- **MAV-158** (935MB SLM download prompt) — **marked Done**. Grepped the codebase: zero references to `ModelUpgradeCard`/`UpgradeStatus` anywhere. Already resolved, ticket was stale.
- **MAV-192, MAV-193, MAV-199** — **marked Done**. All three were already fixed by earlier work this session (`validateSessionState()` in `index.ts`, the scanning state in `YourLoopsScreen.tsx`, `requestSingleInstanceLock()`), just never closed in Linear. No new code needed.
- **MAV-75** (Baileys connection resilience) — **marked Done**. Most of the ticket's scope was already implemented from earlier session fixes. One real gap found and fixed: `YourLoopsScreen`'s scan-retry button was gated on the stale persisted `whatsappConnected` flag instead of live `connectionState` — could trigger a re-scan with no real socket to serve it. Commit `0337d5a`.
- **MAV-257** (filed this session — per-group WhatsApp fetch drops ~2/3 of groups non-deterministically) — genuinely fixed, cache now accumulates across passes instead of dropping unresolved groups. Commit `dee28f4`.
- **Correction on file**: the CPO memo's claim that 8 Linear tickets (iOS widgets/watchOS/Live Activities) were "untouched Loop scope" was **wrong** — verified via `get_issue`, those belong to a completely different project ("ADHD App — V1") in the same Linear team. Not Loop's backlog at all.

### Security/privacy audit (fork, read-only, no code changes)
Clean bill of health overall. The `sendMessage` guard from the earlier-session safety incident was independently re-verified sound (single choke point, no bypass path found). One real Medium-severity finding, **not yet fixed**: `src/renderer/src/screens/EmailCaptureScreen.tsx` has a dead-but-dangerous MailerLite integration — sends real email to a third party via a client-bundled API key (`VITE_MAILERLITE_KEY`). Currently inert on two levels (screen unreachable from `App.tsx`'s nav, env var not set), but a real landmine if ever re-wired without re-reading this finding. **Action item: delete this file** (coverage-map fork separately flagged it as likely-orphaned dead code — two independent forks agree it should go).

### Coverage-completeness re-check (fork)
Corrected the CPO memo's rough "20% touched" estimate — actual screen-level coverage was **70-75%**, not 20%. But confirmed the memo's deeper point was still right in kind: the highest-consequence, hardest-to-reach paths were exactly the ones left unverified — real QR-scan UI, real Google OAuth completion, Delete-all-data's actual path, telemetry toggle, cover-photo file picker, a genuine empty-chapter-state account. Also found dead code worth cleanup later: `WelcomeScreen` (unreachable), `OnboardingBeat3Screen` (explicitly skipped, dead), `EmailCaptureScreen.tsx` (see above).

### The real cold-start test — the main event
Wiped `~/Library/Application Support/loop/LoopData` entirely (real Baileys session included, with the founder's explicit "full-reset" choice over a lower-risk simulated option) and relaunched clean. Founder scanned a real QR code with their phone.

**Worked, live-verified for the first time this session:**
- Real QR scan → real WhatsApp connection
- Real chapter detection (auto-triggered post-connect)
- Real group scan / crew build
- Content/tone fixes rendering correctly with real data ("These are named from your group chats for now...", "Someone you're close to has been quiet in your life lately" for a nameless contact)

**Broken, found only because of this real test — both fixed:**
1. **Google OAuth was completely non-functional, in every context this app has ever run in.** Root cause: `npm run dev` never loads `.env` into `process.env`, and `npm run dist`'s env export only affects the *build-time* shell, never the packaged app's runtime. `GOOGLE_CLIENT_ID`/`SECRET` were always undefined; `_doGoogleSignIn()` silently returned `null` before ever opening a browser — zero error, zero log line, just "nothing happens" when clicked. Fixed via build-time credential injection in `electron.vite.config.ts` (Vite `define`, reads `.env` at config-eval time so it works identically for dev and packaged builds). Founder explicitly approved baking `GOOGLE_CLIENT_SECRET` into the compiled bundle (standard/expected for Google's Desktop OAuth client type per RFC 8252 — protected by PKCE, not secrecy — the earlier security audit had already independently flagged this exact token exchange as "standard, not a leak"). **Live-verified end to end**: real browser opened, founder completed a real Google sign-in. Commit `e8e540d`.
2. **Found immediately from testing fix #1**: `emailCaptured` never actually persisted after a genuinely successful sign-in. `email`/`googleId` were correctly saved by the IPC handler's own main-process write, but the renderer's *own* follow-up `state.patch({emailCaptured: true, email, googleId})` call included `email`/`googleId` — which aren't in `RENDERER_PATCH_ALLOWLIST` — and the allowlist check rejects a patch **entirely** if any key isn't allowlisted, not just the bad keys. So the whole patch silently no-opped, including the valid `emailCaptured: true`. Would have shown the sign-in screen again on every future launch despite a real successful sign-in. Fixed: renderer no longer re-sends fields the main process already persisted. Commit `f792974`.

### WhatsApp group member-count investigation (founder-initiated: "why do so many groups show 2 members when I know they have more")
Beeper MCP cross-validation was requested but the Beeper server was never actually connected this session despite the founder believing access was granted (verified: zero `mcp__beeper__*` tools available at any point checked). Investigation proceeded from Loop's own cache data instead. Found: 12/50 cached groups showed ≤2 members, every one including only the founder's own JID — implausible for groups named "Wayfair Interview," "3 Musketeers," etc.

**Root cause, distinct from MAV-257**: `fetchRealGroupMembers()` treated any *non-throwing* `groupMetadata()` response as fully successful with no plausibility check — no cross-validation against Baileys' own `meta.size` field. WhatsApp's rate limiter apparently sometimes returns a "successful" but truncated response under load (the requester's own entry being cheaply available from local state even when the full roster isn't). This is a different failure mode than the `rate-overlimit` *exception* MAV-257 already handles — a truncated non-throwing response never hits that catch block. Worse: the truncated result was written to the cache **unconditionally**, silently regressing a previously-good cached member list to the bad truncated one.

**Fixed** (commit `0814d92`): a result is now checked for plausibility before being accepted (too few members vs. `meta.size`, or fewer than an existing better-cached entry) — suspicious results with a usable prior cache are discarded in favor of the stale-but-good cache; suspicious results with no prior cache are still accepted (first sighting beats nothing) but logged. **Not yet live-verified** — needs another real scan pass to confirm the 12 previously-truncated groups now resolve correctly or at least stop regressing.

### Open, not yet done
- **Delete `EmailCaptureScreen.tsx`** (dead MailerLite landmine, flagged by two independent forks) — not yet actioned.
- **Live re-verification of the truncated-response fix** (`0814d92`) against the real account — not yet done.
- **Two design-consultation forks killed by the founder, need a retry**: (1) color-palette critique produced 3 concrete options (A: raise surface floor, B: brighten accent — recommended pick, C: both + lift base off near-black) — founder wanted Magic Patterns prototypes of all 3 to compare visually, two attempts at generating these were killed as "stuck." (2) A live screenshot flagged the Chapter Inference screen's avatar-stack circles as "too smushed together" (`marginLeft: -10px` on 32px circles, ~31% overlap) — two attempts at this fix were also killed as "stuck." Founder said to redo both after the OAuth test; both were just re-launched as fresh forks, results pending as of this snapshot.
- Search bar was live-verified working functionally this session (typed "+56", got a real matching result) — the earlier "audit not done" caveat about it is resolved.

---

## 2026-07-13 (cont'd) — Post-audit follow-through: tests, MAV-256, remaining gaps closed

Everything flagged as "NOT done" in the section below has now been addressed, in order:

1. **`test:e2e`/`test:ipc` run for the first time this session.** Initially 11/13 failing in the wdio suite — root-caused to genuine machine resource contention (low free RAM, stray leftover `--loop-e2e-test` processes), not an app regression; fixed by replacing flaky fixed-duration `browser.pause()` calls with `waitForExist()` polling. All four gates (typecheck, unit, e2e, ipc) now verified clean together. Commit `978c8d5`.
2. **MAV-256 implemented**: `listGroups()` now checks a persistent `groups-cache.json` (24h staleness) before doing a real fetch, kept warm via `groups.upsert`/`groups.update`/`group-participants.update` listeners. `chapters:detect()` deliberately left doing a real fetch always (every call site there is an explicit "give me fresh results" action). `disconnect()` clears the cache. 9 new unit tests. Commit `8551157`.
3. **Dead button found and fixed**: "Add someone not on this list" in `ChapterCrewPickerScreen.tsx` had no `onClick` handler at all — found via source read while prepping the interactions pass. Implemented a minimal inline add-person flow. Commit `19504cc`. **Live-verified working** (added a real test contact, confirmed correct rendering; test contact then removed from `LoopData/contacts/`).
4. **`PeopleScreen.tsx`'s entire contact-card block found broken in dark mode** — a bug the original sweep missed because there was no real contact data to reveal it until onboarding started working end-to-end. Fixed. Commit `8551157` (bundled with MAV-256).
5. **Off-token `#C4613C` accent color** (StayCloseScreen, StoryScreen) — fixed to `var(--accent)`, restoring the dark-mode contrast boost. Commit `e626b2b`.
6. **Search bar dropdown found to have never respected dark mode at all** (`TitlebarSearch.tsx`: hardcoded `#FFFFFF` dropdown background, a placeholder color fixed via raw `<style>` tag that would be invisible on a dark input) — plus the same ungated garbled-avatar-initials bug in a spot the original 10-file sweep missed (this file's `initial()` helper doesn't use the `.split()` pattern that sweep grepped for). Fixed. Commit `70ff6e5`. **Functionally live-verified working** — typed "+56", got a real matching dropdown result. (Two earlier live-test attempts had failed and one accidentally leaked keystrokes into an unrelated Chrome window — root cause was Terminal being OS-frontmost the whole time, not an app bug; fixed by explicitly `osascript`-activating the Loop process before typing.)
7. **Content/tone fixes (all 8 findings from the earlier review) — fork in progress.** Covers: the "Relationship strength"/CRM-like labeling on Stay Close, raw-phone-number nudge copy, a stray "their Story" naming instance, unexplained raw WhatsApp group names on first view, the onboarding same-question-twice issue, a singular/plural grammar bug, the Google Sign-In fallback headline (confirmed landed: "One more thing." → "Almost there."), and "closed" → warmer wording for chapter status. Not yet committed as of this snapshot — check `git log` for a commit after `70ff6e5` to confirm it landed.
8. **Delete-all-data dialog**: still deliberately never opened live — the auto-mode classifier correctly blocked a coordinate-based click near it as indistinguishable from the destructive action itself, and that caution was accepted rather than pushed past. Source-confirmed correctly tokenized (dark-mode safe) via direct code read instead.
9. User freed ~3.8GB of disk space (npm/Xcode/various caches) mid-session at Claude's suggestion after disk pressure was noticed.

**Next step once the content/tone fork lands**: verify (typecheck/test/lint:colors), commit, and confirm with the user whether anything else remains before calling this fully closed.

---

## 2026-07-13 — Audit Sweep Committed (`405c12b`)

**Commit `405c12b`** landed everything accumulated during this session's live audit: the chapter-detection StrictMode race, the `nowSec` crash, the broken `tsc --noEmit` gate, 6 dark-mode-breaking screens, the CrewDetectionScreen fake-data bug, garbled avatar initials across 10 files, sidebar-highlight bugs, and the Google Sign-In contrast bug. Full detail in "Recent Work" further down — this section is the honest completeness assessment given directly to the user when asked "all done? end to end audit?".

**What's genuinely done and thorough:**
- The garbled-initials bug class is fully closed — 8 files fixed across two sweep forks, plus 2 already-fixed locations, with 2 correctly-identified false positives left untouched.
- Every screen in the core flow (onboarding → chapter detection → crew build → naming → reveal → Google sign-in → Stay Close → dashboard → People/Chapters/Settings/Story) has been live-clicked and visually checked at least once, with real data from the real connected WhatsApp account — not fake seeds.
- All fixes verified clean together: `npm run typecheck`, `npm run test` (192/192), `npm run lint:colors`.
- Now committed as `405c12b`.

**What is NOT done — do not claim a complete end-to-end audit without these:**
1. `npm run test:e2e` and `npm run test:ipc` have **not been run this session** — deliberately avoided because they build and could collide with the live dev app holding the real WhatsApp session. `npm run test:all` (the full gate) has not actually been exercised end-to-end. **Run these only after stopping/closing the live dev app instance** (`npm run test:e2e`/`test:ipc` will build and launch their own Electron instance — a second live instance touching the same `whatsapp-auth` session directory at the same time as a running `npm run dev` risks session-file corruption, the exact MAV-252 failure mode this session fixed). Kill any running `npm run dev` process first, then run them.
2. **The content/tone pass never happened.** `Loop/CLAUDE.md`'s own two-pass mandate calls for a separate copy/hierarchy/emotional-register review, run separately from the mechanical pass. Only the mechanical pass (colors, crashes, nav, data integrity) plus opportunistic spot-checks were done this session.
3. **Untouched interactions**: the "Delete all data" confirmation dialog (deliberately avoided — destructive control on a live account), the chapter cover-photo picker, "Add someone not on this list" in the crew picker, the search bar's actual search function, NudgeCard's "Message on WhatsApp"/"Remind me later" action buttons.
4. **Known open issue, not fixed**: WhatsApp's aggressive rate-limiting on `groupMetadata()` — only ~50/151 groups resolve per detection pass. A better long-term fix (build the group index from Baileys' passive `groups.upsert`/`groups.update` sync events instead of active polling, the way Beeper/mautrix-style bridges do it) is identified but not started.
5. The dark-mode/avatar fixes from the final round were code-verified but not all re-confirmed live (diminishing returns vs. cost of another full onboarding replay against the real account).

---

## Status

Live audit of the running Electron app (PID 28470, relaunched twice mid-session — once for the ipc.ts timeout fix, once after an unexplained-but-benign process exit with no crash trace) is IN PROGRESS. **Standing user instruction: do not stop or summarize until the user explicitly says the audit is complete.** Repeated multiple times with increasing frustration — treat any obstacle as something to work around in the same turn, never as a reason to end a turn on a status update. **New standing instruction (2026-07-13): put bug fixes in forked agents, not inline edits in the main thread** — see `feedback_put_fixes_in_forks.md` in memory; trivial single-line/single-file fixes are the stated exception. Both forks launched this session (two tsc errors; the chapter-detection race) have completed and landed clean.

---

## Recent Work (this session, since 2026-07-07 snapshot above is stale)

- **MAV-252** — QR/WhatsApp linking fixed. Root cause: iCloud Desktop/Documents sync corrupting Baileys session file I/O. `LOOP_DIR` moved from `~/Documents/Loop` to `app.getPath('userData')/LoopData`, with `migrateLegacyLoopDir()` for existing users. State path is now `~/Library/Application Support/loop/LoopData/state.json` in dev (see updated `Loop/CLAUDE.md`, which supersedes the `~/Documents/Loop` reference in the table above).
- Fixed onboarding-order bug: fake contact picker (beat3) was shown with placeholder names before WhatsApp was even connected.
- **MAV-253** — structural fix for repeatedly-missed "mechanical" UX bugs (traffic-light collision, off-token colors, floating icons slipping past prior audits). Added: `scripts/check-color-tokens.mjs` (ratchet-baseline lint gate, `npm run lint:colors`), `src/shared/layout.ts` (shared traffic-light safe-zone constants for main + renderer), a regression test in `src/test/electron/app.test.ts`, and a new **two-pass audit mandate** now in `Loop/CLAUDE.md` (mechanical automated pass + separate content/tone pass, always against the real running app, never a mockup).
- Fixed NudgeCard dark-card/light-text contrast; fixed PeopleScreen and SettingsScreen dark-mode non-compliance (SettingsScreen had a hardcoded `:root` token override that force-broke dark mode only on that screen — removed entirely).
- **MAV-254** — built the missing Chapters list screen (`src/renderer/src/screens/ChaptersScreen.tsx`, mirrors `PeopleScreen.tsx`/`YourLoopsScreen.tsx` card-grid pattern); sidebar "Chapters" nav item now routes correctly instead of aliasing to "Your Loop".
- Fixed `chapterDetectionComplete` permanent-stuck bug: skipping chapter inference with zero candidates never cleared it, so `YourLoopsScreen`'s "reading your conversations" scanning state stayed on forever for any account whose WhatsApp groups produced no chapter candidates.
- **Safety incident (owned, remediated)**: fabricated test phone numbers (UK Ofcom "fictitious number" range) were wrongly assumed WhatsApp-registration-safe; one was a real live account and a real message was sent to a real stranger during automated testing. Real technical fix landed: `WhatsAppManager.sendMessage` (`src/main/whatsapp.ts`) now refuses to send to any JID not present in Baileys' own `chatStore` (populated only by genuine sync events, not guessable). Commit `0616d2e`. **Permanent rule for all future sessions**: never fabricate phone/contact identifiers and assume they're safe; never trigger a Send action against any contact, real or fake, during automated testing/investigation.
- Zero-real-chapters bug root-caused: `groupFetchAllParticipating()`'s bulk `participants` field is unreliable (every one of the user's 125 real WhatsApp groups showed exactly 2 members). Fixed via rate-limited per-group `sock.groupMetadata()` calls — `fetchRealGroupMembers()` in `src/main/whatsapp.ts` (batch size 8, 1.5s inter-batch delay, 8s per-call timeout, 90s total budget). Commit `8fe551b`. Implemented by a forked agent per explicit "with explicit rate limiting" instruction; 192/192 vitest passing, tsc clean. **Live-verified this session — surfaced two further real bugs, both now fixed (uncommitted):**
  - `chapters:detect`'s IPC-level timeout in `ipc.ts` was still 30s, shorter than the new 90s group-metadata budget, so real detection always aborted before finishing. Bumped to 100s.
  - A genuine `ReferenceError: nowSec is not defined` crash in `WhatsAppManager.buildContactClusters` (`whatsapp.ts:826`) — `nowSec` was declared inside a `for` loop (pre-existing bug from commit `8bcc17b3`, 2026-07-02, unrelated to this session's other fixes) and referenced after the loop closed. Fixed by hoisting the declaration above the loop.
  - Root cause both bugs shipped silently: **`npx tsc --noEmit` (bare) has been a no-op the whole session** — root `tsconfig.json` has `"files": []` and delegates to project references, so the bare command checks zero files and always exits 0. Added `npm run typecheck` (`tsc -b tsconfig.node.json tsconfig.web.json --noEmit`) which actually resolves both projects; also added `src/shared/**/*` to `tsconfig.node.json`'s `include` (it was missing, causing a separate class of false "file not in project" errors). `Loop/CLAUDE.md` updated to mandate `npm run typecheck`, not the bare command. `test:all` now includes it.
  - Also live-observed: WhatsApp is aggressively rate-limiting `groupMetadata()` calls even at batch-size-8/1.5s-delay — only 50/151 candidate groups resolved on the first real pass, 101 hit `rate-overlimit`. Not yet fixed — see Open Threads.
- **Dark-mode audit finding (2026-07-13)**: three onboarding "beat" screens — `OnboardingFeltMomentScreen.tsx`, `OnboardingNormaliseScreen.tsx`, `OnboardingNameYourPeopleScreen.tsx` — hardcoded raw light-mode hex colors directly in inline styles (`#F4E7E2`, `#1A100C`, `#6B5447`, `#B8624A`, `#B8A99E`) instead of referencing CSS custom properties, so they never respected `prefers-color-scheme: dark` at all (confirmed system is in Dark mode via `defaults read -g AppleInterfaceStyle`). Fixed: all replaced with `var(--bg)` / `var(--text-primary)` / `var(--text-secondary)` / `var(--accent)` / `var(--text-muted)`. Same root-cause class as the `TOKEN_CSS` `:root`-override bug (see below) but a different mechanism — no override needed, they just never used tokens to begin with.
- **Same `TOKEN_CSS` `:root`-override anti-pattern as the earlier SettingsScreen fix (`f0b2f31`) found in two more screens** — `ChapterInferenceScreen.tsx` and `PrivacyNoticeScreen.tsx` both had a hardcoded `<style dangerouslySetInnerHTML>` block force-injecting light-mode token values, permanently breaking dark mode on those screens regardless of OS setting. Removed both (all tokens they redefined already exist in `globals.css`). Color-token lint baseline shrunk 217→191 as a result.

Latest commits (verified via `git log`):
```
8fe551b fix: chapter detection used unreliable bulk group participant data
0616d2e fix: chapter-detection dead end + real safeguard against sending to unverified contacts
868974d fix: chapterDetectionComplete never set true on zero-candidate outcome
f0b2f31 fix: SettingsScreen force-overrode :root tokens with hardcoded light values
5a2cad0 feat: dedicated Chapters list screen (MAV-254)
6e389a4 fix: NudgeCard contrast + PeopleScreen dark-mode background (MAV-253 audit)
6655c3c fix: WhatsApp QR linking (iCloud sync) + onboarding order + native chrome safe zone
```
Branch `main`. **Uncommitted changes exist as of this snapshot — see below.**

---

## Uncommitted Changes

Not yet committed — everything below is verified clean (`npm run typecheck` + `npm run test`, 192/192) and ready to commit as soon as the user wants:
- `src/main/ipc.ts` — `chapters:detect` timeout 30s → 100s; **and** the `detecting` boolean guard replaced with a shared in-flight `detectPromise` (fork fix — fixes the real race described below)
- `src/main/whatsapp.ts` — `nowSec` scoping crash fix (hoisted above the cluster loop)
- `src/renderer/src/screens/ChapterInferenceScreen.tsx` — removed `TOKEN_CSS` `:root` override
- `src/renderer/src/screens/PrivacyNoticeScreen.tsx` — removed `TOKEN_CSS` `:root` override
- `src/renderer/src/screens/OnboardingFeltMomentScreen.tsx`, `OnboardingNormaliseScreen.tsx`, `OnboardingNameYourPeopleScreen.tsx` — hardcoded hex → CSS tokens (dark-mode fix, live-verified)
- `src/renderer/src/components/AppSidebar.tsx` — `activeSection()` now also matches `'chapter-naming'` and `'chapter-crew-picker'` (both previously fell through to highlighting "Your Loop" instead of "Chapters" — found live)
- `src/main/analytics.ts` — Sentry `autoSessionTracking` (removed in SDK v6) replaced with filtering the `MainProcessSession` integration (fork fix)
- `src/renderer/src/screens/OnboardingGoogleSignInScreen.tsx` — unsafe `AppState → Record<string,unknown>` cast fixed by routing through `unknown`; flagged that the `whatsappDisplayName` field it reads doesn't exist on `AppState` and is never written anywhere, so that personalization is currently permanently dead (not fixed — wiring it up was out of scope, needs a product decision on whether to build it)
- `tsconfig.node.json` — added `src/shared/**/*` to `include`
- `package.json` — added `typecheck` script, added it to `test:all`
- `Loop/CLAUDE.md` — updated typecheck instruction to warn against bare `npx tsc --noEmit`
- `scripts/color-token-baseline.json` — updated (217→191 baseline violations)

Both forks launched this session (tsc-error fixes; chapter-detection race investigation) completed and their changes are folded into the list above. Nothing outstanding — safe to commit as one set or split by concern, user's call.

---

## Open Threads

- **Chapter-detection race condition — root cause found and fixed, live-reverification not yet re-run.** `ChapterInferenceScreen`'s mount effect double-fires under React StrictMode's dev-mode double-invoke; the second call used to hit `chapters:detect`'s `detecting` boolean guard and resolve instantly with `[]`, and since it belonged to the actually-rendered component instance, that empty result won the race and rendered permanently — regardless of what the real (slow, rate-limited) first call eventually found. Fixed by sharing one in-flight promise across all concurrent callers. Not yet re-verified against the real account since the fix landed (see Next Steps).
- **WhatsApp `groupMetadata()` rate-limiting**: even at batch-size-8/1.5s-delay, only ~50/151 candidate groups resolved on a real live pass (101 `rate-overlimit`). The `8fe551b` fix is directionally correct (real per-group data beats the unreliable bulk field) but the rate-limit tuning needs another pass. **Better long-term fix identified but not started**: Beeper/mautrix-style bridges avoid this entirely by building their group index from Baileys' own passive `groups.upsert`/`groups.update` push events (populated during the existing history-sync) instead of actively polling `groupMetadata()` for every group on every detection pass. Loop should persist that passive stream into `groups-discovered.json` incrementally and only active-fetch for genuine cache misses. Bigger change, deliberately not started this session.
- Off-token accent color: `#C4613C` is hardcoded literally in several screens (StayCloseScreen and others) where `var(--accent)` should be used — `--accent` genuinely changes value between light (`#B8624A`) and dark (`#C8724E`) mode in `globals.css`, so these hardcoded instances don't get the dark-mode contrast boost. Part of the existing tracked color-token lint baseline (~191 instances); not a full theme break like the ones already fixed, lower priority, not remediated this session.
- Sidebar-highlight quirk: the Story screen always shows "Chapters" as the active sidebar section regardless of whether it was entered via People — this is a different, deeper issue than the `chapter-naming`/`chapter-crew-picker` one just fixed (that one was a missing-case bug; this one needs tracking the actual entry point in nav state). Flagged by a fork, not yet fixed or discussed with the user.
- Untracked files at repo root never actioned or discussed with the user (flagged twice by different forks as unusual): `DESIGN_REVIEW.md`, `Product-vision.md`, `agentic-qa/`, `eval/`, `coverage/`, `resources/icon.png.bak`, `results-real.json`, `MAV-203-analysis.md`, `MAV-204-analysis.md`, `design-research.md`, `design-research-story.md`, `ipc-audit.md`, `signals-audit.md`, `story-audit.md`, `story-copy-options.md`, `WARP_BRIEFING.md`, `SwiftUI_Tests/`, `.claude/`. Out of scope unless user raises it.
- Live audit: Chapters list, Chapter Detail, Chapter Naming, Chapter Crew Picker all now live-verified clean (dark mode, no collisions, correct sidebar highlight post-fix). **Stay Close** was only statically reviewed (container-level `var(--bg)` usage confirmed correct) — not live-clicked through, since the natural path requires a multi-minute real chapter-detection pass to reach post-onboarding. **Google Sign-In screen** not yet visually audited at all (only its tsc error was fixed).

---

## Next Steps

1. Decide whether to commit the accumulated fixes now (all verified clean) before continuing further live audit work, or keep batching — user's call.
2. Re-verify chapter detection against the real account now that both the `nowSec` crash and the StrictMode race are fixed — real chapter candidates may now surface for the first time. Still a real live WhatsApp API call (though a repeat of ones already run this session, so lower-novelty); narrate rather than trigger silently.
3. Live-click-through Stay Close (needs the above real detection pass to reach naturally, or find another path) and Google Sign-In screens — last two unaudited screens from the original ask.
4. Consider fixing the Story-screen sidebar-highlight quirk (deeper nav-state fix, deferred) and the `#C4613C`-style off-token accent debt (larger cleanup, deferred) — not yet discussed with user, raise if continuing further.
5. Do not stop mid-audit to report status — state a blocker in one sentence and immediately attempt a workaround in the same turn. Per standing instruction; see memory `feedback_no_stopping_on_standing_audit_orders.md`.
6. **Put bug fixes in forked agents, not inline main-thread edits** — see memory `feedback_put_fixes_in_forks.md`. Trivial single-line/single-file fixes (like the sidebar `activeSection()` fix) are the stated exception and can stay inline.
7. No fabricated contact/phone data in any test fixture going forward — omit `whatsappId` entirely, or use protocol-level-invalid values only. Never click a Send action during testing.
8. Check in before killing/relaunching the live app (per `feedback_notify_before_live_system_actions.md`) — did this twice this session, pattern held well both times.

---

## Colour system (locked 2026-07-07, still current)

| Token | Value | Usage |
|---|---|---|
| Ink | `#1A100C` | App background |
| Card surface | `#2C1C14` | Elevated cards (nudge card, modals) |
| Ground | `#F4E7E2` | Primary text |
| Terra Person | `#D4804A` | Avatar rings — person marker |
| Terra Action | `#C8724A` | CTA buttons, active nav border |
| Surface | `#EDD9D2` | Search bar, toolbar |

**Rule:** `#D4804A` = people. `#C8724A` = actions. Never swap. Max 2 Terra uses per screen.

---

## Architecture (locked — do not re-open)

- **Vision:** Dual-layer relationship companion. People layer (stay close, relationship intelligence) + Chapter layer (identity, memory). Co-equal. Neither subordinates the other.
- **Data:** All WhatsApp-derived data stays on device. Local-first, non-negotiable.
- **Account:** Stores ONLY email + googleId + licenseStatus. Nothing else ever.
- **IPC handlers:** All live in `src/main/ipc.ts` — one place only.
- **State:** Lives in `<userData>/LoopData/state.json` (moved off `~/Documents/Loop` in MAV-252 — see `Loop/CLAUDE.md`) — only mutated via `store.ts`.
- **Telemetry:** Sentry (crash) + PostHog (usage). Opt-out in Settings. Default `telemetryEnabled: true` in private beta.
- **`loop-file://`:** Restricted to `LOOP_DIR` root + `~/Pictures`.
- **ChapterInferenceScreen:** Only caller of `chapters.detect()`. Keep separate from Scanner.

---

## Screen names (settled — do not change)

| Screen | Name |
|---|---|
| MAV-201 contact detail | "Their world" |
| Main feed | "Your Loop" |

---

## Known limitations (not bugs)

- Dock tooltip shows "Electron" in dev — will show "Loop" in DMG build. Do not chase.
- Two Loop icons in Dock in dev — same reason.

---

## Open bugs

- **#6** Generic crash screen — `crash.log` + Sentry captures root cause. Not yet fixed.

---

## Test commands

```bash
npm run test          # vitest unit tests (fast, always runnable)
npm run test:e2e      # Playwright — requires npm run build first
npm run test:ipc      # wdio IPC suite — requires npm run build first
npm run lint:colors   # ratchet-baseline color-token lint gate (MAV-253)
npm run test:all      # test + lint:colors + test:e2e + test:ipc
npm run dist          # build + sign + notarize DMG (requires .env)
```

---

## .env (gitignored — values in 1Password, never commit)

File lives at `/Users/subirpaul/Loop/.env`. Keys needed:
- `SENTRY_DSN`
- `POSTHOG_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
