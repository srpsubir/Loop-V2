# Loop — Session Context

_Last updated: 2026-07-01_

## Current branch state

`main` — in sync with `origin/main`. Latest commit: `c228600` — MAV-184: add chapter removal to ChapterDetailScreen.

Uncommitted local changes:
- `src/renderer/src/screens/PrivacyNoticeScreen.tsx` — WCAG contrast fix + spacing (in progress via bg agent, commit pending)
- `src/renderer/src/screens/YourLoopsScreen.tsx` — Option A static orbit dots (in progress via bg agent, commit pending)
- `src/test/electron/app.test.ts` — added `privacyAcceptedAt` to initial state write (E2E fix, commit pending)
- `vitest.e2e.config.ts` — new file, separates E2E config (commit pending)
- `package.json` — `test:e2e` script updated to use `vitest.e2e.config.ts`

---

## What shipped (committed + pushed to origin/main)

| Item | Commit | Status |
|---|---|---|
| Phase 1 stability fixes | multiple | DONE |
| Navigation fix (onboardingComplete) | `c1d9904` | DONE |
| H1/H2/H3 + MAV-172 circuit breaker | `aee2ab7` | DONE |
| MAV-173: CI workflow | `058189c` | DONE |
| MAV-171: WA connection test suite | `8e1e114` | DONE |
| Auto-update (electron-updater) | `c709870` | DONE |
| UX end-to-end flow fixes | `09d87fd` | DONE |
| MAV-75 Warp/Oz build + revert | `3f89401` / `a66ee1c` | REVERTED |
| MAV-75 correct rebuild | `fb5ff84` | DONE |
| MAV-178: data:deleteAll gate | `c4e909f` | DONE |
| MAV-179 + MAV-180: privacy notice + LLM consent | `32f748f` | DONE |
| MAV-184: chapter removal UI | `c228600` | DONE |

---

## What's pending

### Option A — Static orbit dots (YourLoopsScreen)
MP design `7ald56f51fltmzzg9kckai` signed off. Background agent implementing: replace rotating electron track with static contact dots at fixed evenly-spaced positions on orbit ring. Commit pending.

### PrivacyNoticeScreen spacing fixes
- `margin: '0 0 10px'` → `'0 0 8px'`
- `padding: '14px 16px'` → `'12px 16px'`
- `marginTop: 14` → `12` (footer)
Commit pending (same agent as Option A).

### MAV-75 — ConnectionStatusBadge (correct spec)
Design locked. Still pending implementation:
- Top slim bar, ~48px, full width, inline not fixed
- Dot only for color: amber (#f59e0b) reconnecting, soft red (#ef4444) others
- Never dismissible
- Auto-retry on window focus after `failed` (5-min gate)
- New files: `ConnectionStateContext.tsx`, `ConnectionStatusBadge.tsx`
- Update: `App.tsx` (wrap provider), `YourLoopsScreen.tsx` (render badge)

### SLM / Your Story
`node-llama-cpp` in `package.json` but zero imports anywhere. No `inference.ts`. `resolveStory()` in `src/main/scanner.ts:211` always falls through to `generateStory()` (pure string template). Under investigation via Linear ticket audit. This is the engine for the Story screen for fading contacts — V2 priority.

---

## Test status

| Layer | Command | Status |
|---|---|---|
| Unit (vitest) | `npm run test` | ✅ 144 passing |
| E2E (Playwright) | `npm run test:e2e` | ⚠️ Fix applied (privacyAcceptedAt), not yet re-run |
| IPC (wdio) | `npm run test:ipc` | ❌ 9 failures in ui-navigation.test.ts |

**IPC failures root cause (under Warp investigation):**
- Test 1 (`[data-chapter-id="test-nav-ch1"]`) passes, Test 2 (`*=The Nav Crew`) fails after 5000ms
- Likely: `browser.execute(async fn)` does not await IPC calls; state.patch races with window.location.reload()
- Fix: convert to `browser.executeAsync` in before hook

**DMG:** `npm run dist` — unblocked, gated on all tests green + features shipped.

---

## Architecture decisions (settled)

- Chapter = period of life, not a WhatsApp group
- Bipartite projection → Louvain clustering → TF-IDF naming (ALL IMPLEMENTED in whatsapp.ts + chapters.ts)
- Single WA fetch: `buildContactClusters()` returns `{ clusters, groups }`
- Fallback gate: < 3 clusters → `scoreGroups()`
- Fading orbit = chapter-level
- `isFading` on contact = visual opacity 0.55 in ChapterDetail
- `isNudgeEligible`: close tier + whatsappId + fading + !suppressNudge + 7-day cooldown
- State lives in `~/Documents/Loop/state.json` — only via `store.ts`
- IPC handlers in `src/main/ipc.ts` — one place only

---

## Open design topics (need dedicated sessions before building)

1. Nostalgia / quiet-day card placement in Your Loops (Topic 11, MAV-79)
2. Warm vs Close tier distinction UX
3. Dead thread / second loop product design
4. "On your mind" CTA framing + "Brief" naming

---

## Dev runtime rules

**Kill before launch — always one instance:**
```bash
ps aux | grep "node_modules/electron" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
sleep 2 && npm run preview &>/tmp/loop-preview.log &
```

**State.json reset for detection testing:**
```bash
node -e "
const fs=require('fs'),p=require('path').join(process.env.HOME,'Documents/Loop/state.json');
const s=JSON.parse(fs.readFileSync(p,'utf8'));
s.onboardingComplete=true; s.chapterDetectionComplete=false; s.chapters=[];
fs.writeFileSync(p,JSON.stringify(s,null,2)); console.log('reset done');
"
```

---

## Seed data (dev)

4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge eligible]
- Zalando Crew (birthday): bn-ben, rh-rahul, sl-sara [sara bday July 2]
- Edinburgh MSc (echo + birthday): kc-kieran, am-ana, pk-priya [kieran bday July 1, echo = 8 years ago]

---

## Monetisation + distribution (settled)

- Lemon Squeezy (merchant of record, license key)
- MailerLite for pre-launch waitlist only
- DMG: `npm run dist` — unblocked
