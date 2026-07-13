# Loop — Session Context
_Updated: 2026-07-13_

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
