# Loop — Session Context

_Last updated: 2026-06-29_

## Last commit + remote
`281454c` — People-first chapter detection: bipartite clustering + TF-IDF naming. Committed + ready to push.

## What shipped this session
- **MAV-155**: Garbage filter in `listGroupsWithMeta()` + `scoreGroups()` — kills communities (`isCommunity`), newsletters, member ceiling 80→50, name regex (broadcast/announce/alumni/society/association/residents/colony etc.)
- **MAV-156**: `buildTieStrengthMap()` now captures `displayName` from Baileys `sock.contacts`
- **Phase 3**: `avgTieStrength` replaced with `highTieMemberCount`, `highTieMemberFraction`, `topTieMemberNames` — wired into `scoreGroups()` scoring (+15/+8/+12 pts rescue bonus)
- **MAV-157**: `buildContactClusters()` in `whatsapp.ts` — bipartite projection, BFS community detection, era detection, cohesion scoring. Returns `{ clusters, groups }` (single WA fetch, no double-call)
- **MAV-158**: `clustersToCandidates()` in `chapters.ts` — cluster-based chapter inference, fallback to `scoreGroups()` if < 3 clusters
- **MAV-160**: `nameCluster()` TF-IDF chapter namer — deterministic, 0 bytes added to DMG, no download. Produces "Rumberos Berlin · 2023–now" style names
- **MAV-159 archived**: SLM chapter namer dropped. Only delta vs TF-IDF was poetic names — not worth 935 MB user download + 1.5 GB RAM + non-determinism
- **scripts/test-clustering.mjs**: Offline HRC tool — reads `groups-discovered.json`, runs clustering, prints top chapter candidates. No live WA needed after initial group fetch.

## Architecture decisions (settled)
- **Chapter = period of life, not a WhatsApp group**: Groups are coordination artifacts. People are the evidence. `buildContactClusters()` → `clustersToCandidates()` is now the detection path.
- **Bipartite projection**: Two contacts are "linked" if they co-appear in 2+ groups. BFS flood-fill → connected components = social clusters.
- **Fallback gate**: If `clusters.length < 3` (sparse DMs, new user, empty chatStore) → fall back to `scoreGroups()`. Never regress.
- **TF-IDF naming**: Keywords from shared group names + era years. Deterministic. SLM reserved for language generation tasks (summaries, reach-out suggestions) — not detection or naming.
- **`groupFetchAllParticipating()` timeout**: 20s timeout via `Promise.race()` — prevents UI hang when WA connection is flaky.
- **Single WA fetch**: `buildContactClusters()` calls `listGroupsWithMeta()` internally and returns `{ clusters, groups }`. IPC handler no longer calls `listGroupsWithMeta()` separately.
- **isMemberFading**: pure relationship health, drives orbit + opacity. No nudge suppression.
- **isNudgeEligible**: close tier + whatsappId + fading + !suppressNudge + 7-day dismiss cooldown
- **nudgeDismissedAt**: ISO timestamp on ContactState. Re-surfaces nudge after 7 days (not intervalDays).
- **NudgeCard naming**: final. "On your mind" is gone everywhere.
- **Fading orbit**: chapter-level (all members fading = orbit slows). Individual fading = opacity 0.55 in ChapterDetailScreen.
- **QuietDayCard**: chapter-specific (echoAnniversary) when available, generic fallback. No CTA.
- **DeadThreadCard**: "Let it rest" sets suppressNudge permanently.

## JTBD (settled — do not reopen)
Two jobs. Not one. Not three.
1. **Acquisition**: Chapter is scattering. Lock in who matters before everyone goes quiet.
2. **Retention**: Keep the habit alive after they join. Frictionless reach-out.
Nostalgia/chapter layer is a product feature (activates 12+ months in), not a JTBD.

## Monetisation + distribution (settled)
- **Payments**: Lemon Squeezy (merchant of record, built-in license key system, handles global tax)
- **License key**: issued on purchase → entered in app → validated against Lemon Squeezy API on launch → unlocks paid tier. Portable across Macs (activation limit configurable).
- **No server infrastructure needed**: one API ping to Lemon Squeezy on launch. Everything else local.
- **MailerLite**: for pre-launch waitlist nurture only (landing page interest capture). Not part of in-app flow.
- **In-app email capture**: first name + email at onboarding → feeds user identity only.

## Distribution flow (ready when Apple ID arrives)
1. Install "Developer ID Application" cert into Keychain
2. Generate app-specific password at appleid.apple.com
3. `export APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID`
4. `npm run dist` — builds, signs, notarizes, packages DMG (arm64 + x64)
- Unsigned DMG built locally for testing (right-click → Open to bypass Gatekeeper)

## Tests
- 119 unit tests passing (chapters, clustering, scanner, inference)
- 2 pre-existing E2E failures (osascript, need app running)
- E2E suite conflicts with dev app running — run unit tests only with `npx vitest run src/test/chapters.test.ts src/test/clustering.test.ts`

## Linear backlog (Loop-relevant only)
| ID | Priority | Title | Status |
|---|---|---|---|
| MAV-97 | Urgent | Freemium gate (2 free chapters + paywall + Lemon Squeezy license key) | Backlog |
| MAV-75 | Urgent | Baileys/Meta ToS resilience | Backlog (monitor only pre-beta) |
| MAV-100 | Urgent | MailerLite nurture sequence (landing page waitlist) | Backlog |
| MAV-155 | High | Filter broadcast groups, communities, alumni (rule-based) | Shipped (uncommitted) |
| MAV-156 | High | Capture contact display names in buildTieStrengthMap | Shipped (uncommitted) |
| MAV-157 | High | buildContactClusters() — bipartite contact clustering | Shipped (uncommitted) |
| MAV-158 | High | clustersToCandidates() — cluster-based chapter inference | Shipped (uncommitted) |
| MAV-160 | High | TF-IDF chapter namer (replaces MAV-159) | Shipped (uncommitted) |
| MAV-150 | High | Landing page narrative | Backlog (parked) |
| MAV-73 | High | iMessage connector | Backlog (post-beta) |
| MAV-76 | Medium | Telegram connector | Backlog (post-beta) |
| MAV-79 | Low | iOS companion | Backlog (post-beta) |
| MAV-47 | — | Apple Developer ID | In Progress (blocked — cert pending) |
| MAV-74 | — | Gmail connector | CANCELLED |
| MAV-77 | — | Apple Calendar connector | CANCELLED |
| MAV-153 | — | SLM group classifier | ARCHIVED (superseded by MAV-157/158) |
| MAV-159 | — | SLM chapter namer | ARCHIVED (replaced by TF-IDF MAV-160) |

## Pending (before beta can ship)
1. **MAV-47**: Apple Developer ID cert (a few days) — then sign + notarize DMG
2. **MAV-97**: Freemium gate + Lemon Squeezy integration — build once cert is in hand

## HRC checklist (DONE ✓ 2026-06-29)
```
node scripts/test-clustering.mjs
```
- [x] clusters.length >= 3 — 24 clusters found
- [x] Top 5 chapter names recognisable: "Kira Andrew · 2026–now", "Strength Training · 2025–now", "Grillboot · 2023–2025", "Aline Bday · 2022–2025", "Karting Zaragoza · 2018"
- [x] No broadcast/alumni/community groups in output (garbage filter applied in script + in production)
- [x] Committed `281454c`

## Bug fixed: chapter detection never re-ran after onboarding

**Root cause** (discovered in session, fixed 2026-06-29):
`App.tsx` init: `onboardingComplete: true` → `setNav({ screen: 'your-loops' })` — skips `chapter-inference` entirely.
`ChapterInferenceScreen` is the ONLY caller of `window.loop.chapters.detect()`.
`ipc.ts` `wa.on('connected')`: only called `Scanner.run()` (contacts scan), never chapter detection.
Result: returning users got 0 chapters forever. "Loop is reading your conversations." was a static lie.

**Fix** (`src/renderer/src/App.tsx`):
1. Added global `whatsapp.onConnected` listener in `App()` — when WA reconnects on launch, if `onboardingComplete && !chapterDetectionComplete && chapters.length === 0`, route to `chapter-inference`.
2. Fixed `whatsapp-connect` case `onConnected` to route returning users to `chapter-inference` (not `your-loops`) under same condition.

**Covered by**: `wdio/returning-user-chapter-detection.test.ts`
