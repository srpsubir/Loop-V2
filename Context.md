# Loop — Session Context

_Last updated: 2026-06-30_

## Current branch state

Ahead of `origin/main` by 11 commits. Not yet pushed.
Latest commit: `b220517` — Context.md Phase 1 complete

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

## Active instability — what is actually blocking progress

**Navigation click-through is broken.** The app is unstable enough that design review cannot happen — clicking through screens does not work reliably. This is the primary blocker. Until this is fixed, nothing downstream (design review, D-series, feature work) can proceed.

**Root cause: unknown. Needs investigation.**
Symptoms reported: clicking through screens fails during design review. Specific failure mode (hang, white screen, wrong navigation, state mismatch) TBD — needs live investigation.

---

## Phase 2 — queued (stability sprint continues)

Sequence:

1. **Investigate + fix navigation click-through bug** — immediate, blocks everything
2. **Secondary layer code fixes** (no sign-off needed):
   - S-1: Socket listener cleanup on reconnect (`whatsapp.ts`)
   - S-2: IPC timeout on `chapters:detect` (30s `Promise.race`)
   - S-3: Re-entrancy guard on `chapters:detect` (flag)
   - S-5: Sentry renderer config (DSN + environment + release)
   - S-6: React error boundaries on every screen
3. **MAV-171** — WA connection failure-path test suite
4. **MAV-172** — Retry budget + circuit breaker
5. **MAV-173** — CI workflow
6. **Auto-update** — MAV-47 is DONE (completed 2026-06-29). Wire electron-updater. *(Needs UX sign-off on notification design only.)*

**D-series (design debt) does NOT start until the app is stable enough to click through.**

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

## Seed data

4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge]
- Zalando Crew (birthday-fading): bn-ben, rh-rahul, sl-sara [sara bday in 2 days]
- Edinburgh MSc (fading + echo): kc-kieran, am-ana, pk-priya [kieran bday today]

Contacts: 11 JSON files in ~/Documents/Loop/contacts/

---

## Monetisation + distribution (settled)

- Lemon Squeezy (merchant of record, license key)
- MailerLite for pre-launch waitlist only
- DMG: `npm run dist` — unblocked
