# Loop Session Context
_Updated: 2026-07-05_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `c090cd0` security: IPC hardening + renderer containment (audit findings)
  - `45c2a5c` feat: privacy-safe analytics + crash reporting (MAV-217)
  - `4811514` chore: remove node-llama-cpp and @sentry/electron (unused, 38MB saved)
  - `420966f` fix: pin @whiskeysockets/baileys to 7.0.0-rc13, sync lock file
  - `3e9fb4b` test: update e2e suite for Beat 1 nav flow + skip accessibility-gated tests
  - `a252a8f` feat: Google Sign-In screen, dark mode fixes, IPC hardening, security fixes
  - `4899111` fix: nudge:snooze preload + openWhatsApp contactId forwarding (MAV-205, MAV-212)
  - `1dfa7cd` feat: Beat 3 contact picker + Chapter crew picker (MAV-215, MAV-206)
  - `8075850` feat: signals ranking + progressive suppression + snooze data model
- Working tree: clean, nothing uncommitted

## Recent work (last 5 commits, newest first)

### security: IPC hardening + renderer containment (`c090cd0`)
- `store.ts` — `safeContactId()` guards `contacts:save`/`contacts:delete` against path traversal
- `index.ts` — `loop-file://` protocol restricted to `~/Documents/Loop` and `~/Pictures`; other paths blocked with 403
- `index.ts` — `nodeIntegration: false` explicit; `sandbox: false` documented
- `index.html` — CSP added (script-src self, connect-src none, img-src loop-file:)
- `ipc.ts` — `analytics:track` whitelisted to known events + strips non-primitive props; `chapters:confirm` dedups on retry; `chapters:setName` caps name at 100 chars
- `analytics.ts` — Sentry `beforeBreadcrumb` strips data payloads; `initAnalytics` shuts down existing PostHog client before re-init
- preload — dead `invite:generate`/`invite:redeem` bridge entries removed

### feat: privacy-safe analytics + crash reporting — MAV-217 (`45c2a5c`)
- Re-introduces Sentry + PostHog with configs designed to make it structurally impossible to send user content off-device
- Sentry: `beforeSend` deletes `event.user` only; breadcrumbs (nav events, not message content) kept for crash repro
- PostHog: random per-device install UUID (`~/Documents/Loop/install-id`), never linked to email/Google ID, no `identify()` call ever
- Settings > Privacy toggle to opt out of both; default enabled (private beta), flip to disabled at public launch
- `SENTRY_DSN` / `POSTHOG_KEY` env vars — missing means silently disabled

### chore: remove node-llama-cpp + @sentry/electron (`4811514`)
- Dropped unused deps, 38MB saved — superseded by the proper re-add in `45c2a5c`

### fix: pin Baileys to 7.0.0-rc13 (`420966f`)
- rc11 had a message-spoofing zero-day (GHSA-qvv5-jq5g-4cgg); lock file had already drifted to rc13 locally while `package.json` said `^rc11`, breaking `npm ci` on CI. Pinned both.

### test: e2e suite update for Beat 1 nav flow (`3e9fb4b`)
- `app.test.ts` now asserts app boots on `OnboardingFeltMomentScreen`, not `welcome`, when `onboardingComplete=false`
- `osascript.test.ts`/`nutjs.test.ts` skip window-title/menu-bar tests needing macOS assistive-access permission not granted in dev

## Test status (verified 2026-07-05, this session)
- Unit (vitest): **144/144 passing**, 10 files. `src/test/dockIcon.test.ts` was silently platform-dependent — it asserted `app.dock.setIcon()` behind `process.platform === 'darwin'` in `src/main/index.ts:79` but never pinned `process.platform` in the test, so it only ever passed on macOS (where every commit so far was authored/tested) and failed outright on Linux. Fixed by pinning `process.platform` to `'darwin'` for the test and restoring it in `afterEach`.
- TypeScript: clean (`npx tsc --noEmit` exits 0)
- wdio (IPC navigation): not run this session (requires `npm run build` first, not attempted here)
- Playwright (e2e): not run this session

## Architecture decisions (locked)
- Google Sign-In (OAuth) for account creation — one tap, no password, no email field
- Placement: post-Beat 5 (First Truth) — highest emotional engagement
- Account = license gate only. No WhatsApp data or relationship data ever leaves device.
- Backend stores: email + googleId + licenseStatus only. No behavioural data.
- WA name (`creds.me.name`) used for personalized headline — synchronous read, no network call
- Auth backend: MAV-208 scope (parked post-DMG). Stub returns null until then.
- `patchState`: all writes serialised via promise queue (race condition fix)
- Analytics (MAV-217): Sentry + PostHog on by default in private beta, structurally scrubbed of user content, opt-out in Settings > Privacy

## Full Linear backlog

### Shipped
- **MAV-217** — privacy-safe analytics + crash reporting
- **MAV-216** — Google Sign-In screen (post-Beat 5), stub IPC, wired into onboarding
- **MAV-209** DONE — relationshipStrength (C1) wired into contacts strip + nudge sort
- **MAV-210** DONE — Progressive nudge suppression
- **MAV-211** DONE — Birthday occasion overrides nudge sort priority
- **MAV-212** DONE — lastReachOutAt gate
- **MAV-213** DONE — reconnectedAt ranking boost
- **MAV-205** DONE — snoozedUntil + nudge:snooze IPC + snooze UI
- **MAV-206** DONE — Chapter crew picker
- **MAV-207** DONE — generateStory() copy improvements
- **MAV-214** DONE — draftMessage field + generateDraftMessage()
- **MAV-215** DONE — Beat 3 contact picker

### Parked
- **MAV-208** — Freemium / billing epic (park pre-DMG). MAV-216 stub is the placeholder front door.

## Pending / in-flight
1. wdio IPC suite + Playwright e2e not run this session — run before DMG cut
2. DMG: `npm run dist` — gated on all tests green (unit + wdio + e2e all green)

## Bugs triage
- #1 Old orbit-ring UI: FIXED (AppShell)
- #2 Two Loop icons in Dock: known dev limitation — DMG fixes
- #3 Invite Your Chapters in Settings: FIXED
- #4 NudgeCard no snooze: FIXED (MAV-205)
- #5 Chapter inference loading: not a bug
- #6 Generic crash screen: OPEN — crash.log now captures root cause on next occurrence
- #7 EPIPE crash from libsignal: FIXED
- #8 Dark mode sidebar pinkish: FIXED
- #9 `dockIcon.test.ts` false-passes on macOS, fails on Linux CI: FIXED (this session) — test now pins `process.platform`

## Open design topics
1. Nostalgia/quiet-day
2. Warm/Close tier
3. Dead thread/second loop
4. "On your mind" label (MAV-201) — screen name SETTLED as "Their world"
