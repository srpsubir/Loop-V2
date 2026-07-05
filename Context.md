# Loop Session Context
_Updated: 2026-07-05_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `4899111` fix: nudge:snooze preload + openWhatsApp contactId forwarding (MAV-205, MAV-212)
  - `1dfa7cd` feat: Beat 3 contact picker + Chapter crew picker (MAV-215, MAV-206)
  - `8075850` feat: signals ranking + progressive suppression + snooze data model
  - `f371f69` chore: update Context.md — backlog complete
  - `e6fea43` feat: D-II token enforcement, deleteAll backup, Baileys pin, manifesto
  - `5f83241` security: remove Sentry/PostHog + validate shell:openExternal

## Uncommitted changes (this session — ready to commit)

### Dark mode fixes
- `src/renderer/src/styles/globals.css` — added `--sidebar-bg` token (light + dark values)
- `src/renderer/src/components/AppSidebar.tsx` — sidebar bg → `var(--sidebar-bg)`, border → `var(--border-light)`, hover states neutral
- `src/renderer/src/screens/YourLoopsScreen.tsx` — 6 hardcoded hex → CSS vars (section dots, text colors, echo card modal bg, divider, crew avatar border)
- `src/renderer/src/components/NudgeCard.tsx` — 4 hardcoded rgba shadows/borders → `var(--shadow-md)` / `var(--border-light)`
- `src/renderer/src/screens/OnboardingBeat3Screen.tsx` — hover bg dark ink → neutral warm tint; grid gap 28→32

### Bug fixes
- `src/main/index.ts` — EPIPE handler (stdout/stderr), crash.log for uncaughtException, `setWindowOpenHandler` https:// guard (security bypass fixed)
- `src/main/store.ts` — `patchState` promise queue (race condition CRASH fix)
- `src/main/ipc.ts` — `disconnected` no longer spreads full state (CRASH fix); `nudge:snooze` validates days input; stale `invite:*` handlers + `generateCode` removed; `InviteCode` import removed

### Feature removal
- `src/renderer/src/screens/SettingsScreen.tsx` — "Invite Your Chapters" section, `ShareDialog` component, `inviteCodes` state, `window.loop.invite.generate()` IPC call all removed

### MAV-216: Google Sign-In screen
- `src/renderer/src/screens/OnboardingGoogleSignInScreen.tsx` — new screen (warm parchment, personalized headline from WA name, Google G SVG, "Not now" skip)
- `src/main/ipc.ts` — `account:signInWithGoogle` stub (returns null until MAV-208)
- `src/preload/index.ts` — `window.loop.account.signInWithGoogle()` bridge; `InviteCode` import removed
- `src/renderer/src/env.d.ts` — `account.signInWithGoogle` type declaration
- `src/renderer/src/App.tsx` — `EmailCaptureScreen` → `OnboardingGoogleSignInScreen` in `email-capture` nav slot

## Test status
- Unit (vitest): 144 tests, 10 files — ALL PASSING (2026-07-05)
- TypeScript: clean (npx tsc --noEmit exits 0)
- wdio (IPC navigation): last run 2026-07-05 — ALL PASSING
- Playwright (e2e): not run this session

## Architecture decisions (locked this session)
- Google Sign-In (OAuth) for account creation — one tap, no password, no email field
- Placement: post-Beat 5 (First Truth) — highest emotional engagement
- Account = license gate only. No WhatsApp data or relationship data ever leaves device.
- Backend stores: email + googleId + licenseStatus only. No behavioural data.
- WA name (`creds.me.name`) used for personalized headline — synchronous read, no network call
- Auth backend: MAV-208 scope (parked post-DMG). Stub returns null until then.
- patchState: all writes now serialised via promise queue (race condition fix)

## Full Linear backlog

### Shipped this session
- **MAV-216** — Google Sign-In screen (post-Beat 5), stub IPC, wired into onboarding

### Signals & ranking — SHIPPED 2026-07-04
- **MAV-209** DONE — relationshipStrength (C1) wired into contacts strip + nudge sort
- **MAV-210** DONE — Progressive nudge suppression
- **MAV-211** DONE — Birthday occasion overrides nudge sort priority
- **MAV-212** DONE — lastReachOutAt gate
- **MAV-213** DONE — reconnectedAt ranking boost

### Core features — SHIPPED 2026-07-04
- **MAV-205** DONE — snoozedUntil + nudge:snooze IPC + snooze UI
- **MAV-206** DONE — Chapter crew picker
- **MAV-207** DONE — generateStory() copy improvements
- **MAV-214** DONE — draftMessage field + generateDraftMessage()
- **MAV-215** DONE — Beat 3 contact picker

### Parked
- **MAV-208** — Freemium / billing epic (park pre-DMG). MAV-216 stub is the placeholder front door.

## Pending / in-flight
1. Commit this session's changes (diff reviewed, ready)
2. Push to remote: `git push origin main` (user must run, PAT constraint)
3. Playwright e2e: `npm run test:e2e` (requires build first)
4. DMG: `npm run dist` — gated on all tests green (unit + wdio + e2e all green)

## Bugs triage (2026-07-05)
- #1 Old orbit-ring UI: FIXED (AppShell)
- #2 Two Loop icons in Dock: known dev limitation — DMG fixes
- #3 Invite Your Chapters in Settings: FIXED (removed this session)
- #4 NudgeCard no snooze: FIXED (MAV-205)
- #5 Chapter inference loading: not a bug
- #6 Generic crash screen: OPEN — crash.log now captures root cause on next occurrence
- #7 EPIPE crash from libsignal: FIXED (this session)
- #8 Dark mode sidebar pinkish: FIXED (this session)

## Open design topics
1. Nostalgia/quiet-day
2. Warm/Close tier
3. Dead thread/second loop
4. "On your mind" label (MAV-201) — screen name SETTLED as "Their world"
