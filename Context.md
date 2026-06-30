# Loop — Session Context

_Last updated: 2026-06-30_

## Current branch state

Ahead of `origin/main` by 12 commits. Not yet pushed.
Latest commit: `c1d9904` — fix(nav): goYourLoops now sets onboardingComplete: true on happy path

---

## Phase 1 — COMPLETE

**Test result (earned, not gamed):**
```
Test Files  9 passed (9)
Tests  129 passed | 2 skipped (131)
```
- app.test.ts: Playwright confirmed welcome screen + navigation ✓
- nutjs.test.ts: window at 1200×800 ✓
- osascript.test.ts: CFBundleName Loop, menu bar Loop, bundle ID com.loop.dev ✓
- 2 skipped: dock tooltip — localizedName is "Electron" in dev binary (known, DMG fixes it)
- TypeScript: clean

**What Phase 1 fixed:**

| Commit | Fix |
|---|---|
| e95db53 | Scanner null guards on chapterIds |
| d9af272 | loggedOut disconnect no longer wipes chapters; backup before write |
| f4b778b | waitForStore with storeReady flag; duplicate method removed |
| 97ee907 | Orphaned inference tests deleted; e2e/unit properly separated |
| c973953 | CLAUDE.md wdio path corrected |
| 032f3de | Electron tests restored in scope; dock tooltip correctly skipped |

---

## Navigation instability — FIXED (2026-06-30)

**Root cause found and resolved.** The app now boots directly to Your Loops.

**What was broken:**
1. `goYourLoops` (App.tsx:475) never set `onboardingComplete: true`. Only `goSkip` did. So every launch after completing onboarding normally started at the welcome screen.
2. `chapters: []` was empty in state.json — seed data contacts existed but the chapters array was never populated.

**Fixes applied:**
- `c1d9904`: `goYourLoops` now async-patches `onboardingComplete: true` before navigating. Idempotent — safe for all callers (stay-close done, chapter-detail back, settings back).
- state.json patched manually with 4 seed chapters + completion flags (`onboardingComplete`, `chapterDetectionComplete`, `stayCloseComplete`, `emailCaptured` all set to `true`).

**Verified:** App launches directly to Your Loops. All 4 chapters visible. Clara W nudge card, Edinburgh echo card both rendering.

---

## Phase 2 — queued (stability sprint continues)

Sequence (no sign-off needed):

1. **S-1**: Socket listener cleanup on reconnect (`whatsapp.ts`) — before `makeWASocket()`, call `sock.ev.removeAllListeners()` then null it
2. **S-2**: IPC timeout on `chapters:detect` — wrap `buildContactClusters()` in `Promise.race` with 30s timeout
3. **S-3**: Re-entrancy guard on `chapters:detect` — `let detecting = false` flag
4. **S-5**: Sentry renderer init — pass DSN + environment + release matching main process
5. **S-6**: React error boundaries on every screen
6. **MAV-171** — WA connection failure-path test suite (`src/test/whatsapp-connection.test.ts`)
7. **MAV-172** — Retry budget + circuit breaker in `whatsapp.ts`
8. **MAV-173** — CI workflow (`.github/workflows/ci.yml`)
9. **Auto-update** — Wire `electron-updater` (UX notification design needs sign-off)

**D-series (design debt) is now unblocked** — app is stable enough to click through.

---

## MAV-47 — DONE (not blocked)

Apple Developer ID + notarization completed 2026-06-29. DMG buildable via `npm run dist`. Auto-update unblocked.

---

## Architecture decisions (settled)

- Chapter = period of life, not a WhatsApp group
- Bipartite projection → Louvain clustering → TF-IDF naming
- Single WA fetch: `buildContactClusters()` returns `{ clusters, groups }`
- Fallback gate: < 3 clusters → `scoreGroups()`
- Fading orbit = chapter-level
- `isFading` on contact = visual opacity 0.55 in ChapterDetail
- `isNudgeEligible`: close tier + whatsappId + fading + !suppressNudge + 7-day cooldown
- State lives in `~/Documents/Loop/state.json` — only via `store.ts`
- IPC handlers in `src/main/ipc.ts` — one place only

---

## Dev runtime rules

**Kill before launch — always one instance:**
```bash
ps aux | grep "node_modules/electron" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
sleep 2 && npm run preview &>/tmp/loop-preview.log &
```
Never run `npm run preview` without killing first. Multiple instances cause duplicate dock icons and split WA connections.

**State.json reset for detection testing:**
```bash
node -e "
const fs=require('fs'),p=require('path').join(process.env.HOME,'Documents/Loop/state.json');
const s=JSON.parse(fs.readFileSync(p,'utf8'));
s.onboardingComplete=true; s.chapterDetectionComplete=false; s.chapters=[];
fs.writeFileSync(p,JSON.stringify(s,null,2)); console.log('reset done');
"
```
`onboardingComplete` can slip to false when the app disconnects while state has been manually edited — always re-check it after a reset.

**State.json reset for design review (seed data):**
Use the seed data script — sets onboardingComplete/chapterDetectionComplete/stayCloseComplete/emailCaptured all true + 4 chapters (Casa Mañana, Yoga Sceptics, Zalando Crew, Edinburgh MSc).

---

## Seed data (dev)

4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh [lastContactDate set to 30d ago]
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge eligible]
- Zalando Crew (birthday): bn-ben, rh-rahul, sl-sara [sara bday July 2]
- Edinburgh MSc (echo + birthday): kc-kieran, am-ana, pk-priya [kieran bday July 1, echo = 8 years ago]

Contacts: 11 JSON files in ~/Documents/Loop/contacts/
State flags (design review): onboardingComplete, chapterDetectionComplete, stayCloseComplete, emailCaptured — all true

---

## Monetisation + distribution (settled)

- Lemon Squeezy (merchant of record, license key)
- MailerLite for pre-launch waitlist only
- DMG: `npm run dist` — unblocked
