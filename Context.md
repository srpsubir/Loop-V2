# Loop — Session Context

_Last updated: 2026-06-30_

## Current branch state

Ahead of `origin/main` by 10 commits. Not yet pushed.

Latest commit: `032f3de` — Phase 1 complete: electron tests restored, dock tooltip skipped (known dev limitation)

## Phase 1 — COMPLETE ✓

### What was done

| Commit | Ticket | Description |
|---|---|---|
| `e95db53` | MAV-167 | Scanner null guards — `chapterIds?.includes` / `?? []` |
| `d9af272` | MAV-166 | State protection — loggedOut no longer wipes chapters; backup before write |
| `f4b778b` | MAV-168 + MAV-165 | waitForStore with storeReady flag; duplicate public method removed |
| `97ee907` | MAV-169 | Green test suite — orphaned inference tests deleted, e2e/unit properly separated |
| `c973953` | MAV-170 | CLAUDE.md wdio path corrected |
| `32ec499` | — | CLAUDE.md quality gate + test pyramid documented |
| `032f3de` | — | Electron tests restored in npm run test; dock tooltip skipped (known dev limitation) |

### Test run result (final, earned)

```
Test Files  9 passed (9)
Tests  129 passed | 2 skipped (131)
Duration  ~20s
```

- `app.test.ts`: Playwright launched Loop, verified welcome screen copy + navigation ✓
- `nutjs.test.ts`: Spawned Loop, confirmed window at 1200×800 ✓
- `osascript.test.ts`: AppleScript confirmed window title Loop, menu bar Loop, bundle ID com.loop.dev ✓
- 2 skipped: dock tooltip tests — `localizedName` is "Electron" in dev binary (known, DMG fixes it)
- TypeScript: clean

### What Phase 1 fixed

- QR connect failure on first attempt (MAV-160 / MAV-164)
- Groups not loading after connection — waitForStore race (MAV-161 / MAV-165)
- loggedOut event wiping onboardingComplete + chapters (MAV-162 / MAV-166)
- Scanner crash on missing chapterIds field (MAV-163 / MAV-167)
- Duplicate waitForStore silently shadowing correct implementation (MAV-168)
- 2 orphaned test files referencing deleted inference.ts (MAV-169)
- CLAUDE.md path pointing to non-existent wdio location (MAV-170)

---

## Phase 2 — IN QUEUE

### Scope

1. **WA connection failure-path test suite** — `src/test/whatsapp-connection.test.ts`
   - QR emitted on first connect
   - Connected state on `connection === 'open'`
   - Silent retry on transient first-connect failure
   - Retry budget exhausted → terminal failure state, no infinite loop
   - loggedOut → auth cleared, state preserved
   - waitForStore resolves immediately / times out gracefully

2. **WA connection retry budget + circuit breaker** — `src/main/whatsapp.ts`
   - `private retryCount = 0`, `private readonly MAX_RETRIES = 3`
   - Backoff: 800ms → 2s → 5s, then emit `connection-failed` to renderer
   - Reset retryCount on successful connection
   - No infinite retry possible

3. **CI GitHub Actions workflow** — `.github/workflows/ci.yml`
   - Triggers: PR + push to main
   - Steps: tsc → vitest → (green gate) → build → e2e
   - Keeps unit + e2e gated so slow tests don't block fast feedback

---

## Architecture decisions (settled)

- Chapter = period of life, not a WhatsApp group
- Bipartite projection → Louvain clustering → TF-IDF naming
- Single WA fetch: `buildContactClusters()` returns `{ clusters, groups }`
- Fallback gate: < 3 clusters → `scoreGroups()`
- Fading orbit = chapter-level (all members fading = orbit slows)
- `isFading` on contact = visual opacity 0.55 in ChapterDetail
- `isNudgeEligible`: close tier + whatsappId + fading + !suppressNudge + 7-day cooldown
- `nudgeDismissedAt`: ISO timestamp, re-surfaces after 7 days

## Monetisation + distribution (settled)

- Lemon Squeezy (merchant of record, license key)
- MailerLite for pre-launch waitlist only
- DMG: `npm run dist` (blocked on Apple Developer ID — MAV-47)

## JTBD (settled)

1. Acquisition: chapter scattering — lock in who matters
2. Retention: keep habit alive after joining

## Seed data (written 2026-06-30)

4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge]
- Zalando Crew (birthday-fading): bn-ben, rh-rahul, sl-sara [sara bday in 2 days]
- Edinburgh MSc (fading + echo): kc-kieran, am-ana, pk-priya [kieran bday today]

Contacts: 11 JSON files in ~/Documents/Loop/contacts/
