# Loop Session Context
_Updated: 2026-07-06_

## Current git state
- Branch: main
- Latest commits (newest first):
  - `1878bcf` security: MAV-216 OAuth — concurrent call guard + port exhaustion fix
  - `c4ed58c` feat(MAV-216): real Google OAuth sign-in via PKCE + loopback
  - `afb84e7` security(MAV-228): harden whatsapp:sendMessage IPC handler
  - `af22d48` security: validate normalised JID format in WhatsAppManager.sendMessage
  - `5af9401` feat(MAV-228): in-app WhatsApp message composer
  - `0b053a8` fix(test): pin process.platform in dockIcon test for cross-platform CI
  - `efffd6e` chore: update Context.md — session 2026-07-05

## Committed this session (ready to push or already pushed)

### DMG milestone
- `dist/Loop-1.0.0-arm64.dmg` (102MB) — Apple Silicon, signed + **notarized** ✓
- `dist/Loop-1.0.0.dmg` (109MB) — Intel x64, signed + **notarized** ✓
- Notarization credentials in `.env` (gitignored): APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID
- Run `npm run dist` to rebuild — `.env` vars now auto-loaded by dist script

### CI fixes
- Baileys pinned to `7.0.0-rc13` (was rc11 with rc13 in lock — npm ci mismatch)
- e2e tests updated: app.test.ts now tests OnboardingFeltMomentScreen (not stale WelcomeScreen)
- osascript + nutjs accessibility-gated tests skipped (need System Preferences > Accessibility grant)

### MAV-217: Privacy-safe analytics + crash reporting
- `src/main/analytics.ts` — Sentry + PostHog fully wired
  - Sentry: `beforeSend` deletes `event.user`; `beforeBreadcrumb` strips `.data` payloads
  - PostHog: random install UUID in `~/Documents/Loop/install-id`, never linked to identity
  - `initAnalytics()` shuts down existing PostHog client before re-init (no leaked clients)
- Settings > Privacy: toggle row, default ON (private beta)
- IPC: `telemetry:setEnabled` handler re-inits both Sentry + PostHog
- `src/renderer/src/env.d.ts` — `telemetry.setEnabled` type added
- `.env.example` created: `SENTRY_DSN` + `POSTHOG_KEY`
- `src/shared/types.ts` — `telemetryEnabled?: boolean` added to AppState

### Security hardening (audit findings)
- `loop-file://` restricted to `~/Documents/Loop` + `~/Pictures` (was unrestricted filesystem read)
- `nodeIntegration: false` explicit in BrowserWindow webPreferences
- CSP added to `src/renderer/index.html` (`connect-src none`, `script-src self`)
- `analytics:track` IPC: event whitelist + strips non-primitive properties
- `contacts:save` + `contacts:delete`: `safeContactId()` path traversal guard in store.ts
- `chapters:confirm`: dedup guard (no duplicate append on retry)
- `chapters:setName`: name capped at 100 chars
- Dead `invite:generate` + `invite:redeem` bridge entries removed from preload

## Test status
- Unit (vitest): 144 tests, 10 files — ALL PASSING (2026-07-05)
- TypeScript: clean
- wdio (IPC navigation): last run 2026-07-05 — ALL PASSING
- Playwright (e2e): 9 passed, 6 skipped (accessibility-gated) — ALL GREEN
- CI: green on latest push

## Architecture decisions (locked this session)
- Telemetry: Sentry (crash) + PostHog (usage) with minimal PII config — opt-out toggle in Settings
- Default `telemetryEnabled: true` during private beta; flip to `false` at public launch
- PostHog dashboard actions required before shipping: "Discard client IP data" + "Person profiles: Never"
- `loop-file://` restricted to two allowed roots — bypassCSP: true remains (required for photo display)

## Full Linear backlog

### In progress this session
- **MAV-228** — In-app WhatsApp message composer (build agent running)

### Shipped this session (2026-07-06)
- **MAV-228** — In-app WhatsApp message composer (Baileys send, 3 states, JID hardened)
- **MAV-216** — Real Google OAuth sign-in (PKCE + loopback, no backend needed)
  - Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env` to activate
  - Google Cloud Console: client ID `477892972489-8sl27pc0cecka6gv9sljo1h8a77q460i.apps.googleusercontent.com`

### Shipped prior session (2026-07-05)
- **MAV-217** — Privacy-safe analytics + crash reporting (Sentry + PostHog)

### Shipped prior sessions
- **MAV-216** DONE — Google Sign-In screen (post-Beat 5), stub IPC
- **MAV-209** DONE — relationshipStrength wired into contacts strip + nudge sort
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
- **MAV-208** — Freemium / billing epic (park pre-DMG)

## Pending
1. Push to remote: `! cd /Users/subirpaul/Loop && git push origin main`
2. PostHog dashboard: enable "Discard client IP data" + "Person profiles: Never"
3. Add `SENTRY_DSN` + `POSTHOG_KEY` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` to GitHub Actions secrets

## Vision gaps (from 2026-07-06 audit)
1. **Chapter moments** — empty placeholder in ChapterDetailScreen; no moment data ever populated
2. **Landing page** — wrong JTBD above fold (nostalgia leads, not losing-touch); manifesto section missing entirely; social proof missing
3. **D-II design palette** — approved but not implemented; all screens still on D-I
4. **About screen** — manifesto paragraph has no home in-app
5. **Freemium/billing (MAV-208)** — parked; `licenseStatus` field ready in state
6. **On-device model (MAV-204)** — parked

## Bugs triage (2026-07-05)
- #1 Old orbit-ring UI: FIXED
- #2 Two Loop icons in Dock: known dev limitation — DMG fixes
- #3 Invite Your Chapters in Settings: FIXED
- #4 NudgeCard no snooze: FIXED
- #5 Chapter inference loading: not a bug
- #6 Generic crash screen: OPEN — crash.log + Sentry now captures root cause
- #7 EPIPE crash from libsignal: FIXED
- #8 Dark mode sidebar pinkish: FIXED

## Open design topics
1. Nostalgia/quiet-day
2. Warm/Close tier
3. Dead thread/second loop
4. "On your mind" label (MAV-201) — screen name SETTLED as "Their world"
