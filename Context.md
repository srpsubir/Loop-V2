# Loop — Session Context

_Last updated: 2026-07-01_

## Current branch state

In sync with `origin/main`. Latest: `3f89401` — feat(MAV-75) by Warp/Oz (being reverted — see below).

---

## What shipped (all committed + pushed)

| Item | Commit | Status |
|---|---|---|
| Phase 1 stability fixes | multiple | DONE |
| Navigation fix (onboardingComplete) | `c1d9904` | DONE |
| H1/H2/H3 + MAV-172 circuit breaker | `aee2ab7` | DONE |
| MAV-173: CI workflow | `058189c` | DONE |
| MAV-171: WA connection test suite | `8e1e114` | DONE |
| Auto-update (electron-updater) | `c709870` | DONE |
| UX end-to-end flow fixes (copy/navigation) | `09d87fd` | DONE |
| MAV-75: Warp/Oz build | `3f89401` | REVERTED — wrong spec |

---

## MAV-75 — IN PROGRESS (correct-spec rebuild)

Warp's MAV-75 implementation was reverted. Spec violations:
- Banner positioned at bottom (should be top slim bar)
- Full amber/red color fill (should be dark bg + small colored dot)
- Wrong copy (error codes shown to users, wrong messages)
- Dismissible via X button (should never dismiss)
- No `ConnectionStateContext` (wired inline in component)
- No auto-retry on window focus
- `consecutiveProtocolErrors` classification missing

**Locked design decisions:**
- Badge: top slim bar, ~48px, full width, inline not fixed
- Colors: dot only — amber (#f59e0b) for reconnecting, soft red (#ef4444) for others
- Never dismissible — always visible until state clears
- Auto-retry once on window focus after `failed` (5 min gate)

**Locked copy:**
- reconnecting: "Reconnecting... (attempt N of M)" / "Your chapters are still available."
- failed: "Could not reconnect to WhatsApp." / "Your chapters are still available to read." / [Retry] [Disconnect]
- protocol_error: "WhatsApp connection issue." / "Check for a Loop update to reconnect." / [Check for update] [Retry anyway]
- logged_out: "You've been signed out of WhatsApp." / "Sign in again to keep your chapters up to date." / [Sign in again]

**New files to create:**
- `src/renderer/src/ConnectionStateContext.tsx`
- `src/renderer/src/components/ConnectionStatusBadge.tsx`

**Files to update:**
- `src/renderer/src/App.tsx` — wrap post-onboarding screens in provider
- `src/renderer/src/screens/YourLoopsScreen.tsx` — render badge at top

Session 3 (Context + Badge + YourLoops) → Session 4 (ChapterDetail feature gating) → tests green → commit.

---

## vitest config — FIXED (2026-07-01)

Changed `exclude: ['src/test/electron/wdio/**']` → `exclude: ['src/test/electron/**']`.
E2E electron tests (nutjs, osascript) no longer bleed into `npm run test`.

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
