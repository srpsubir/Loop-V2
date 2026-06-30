# Loop — Session Context

_Last updated: 2026-06-30_

## Last commit + remote
`281454c` — People-first chapter detection: bipartite clustering + TF-IDF naming. Committed + ready to push.

## Active session work
Design review in progress. Bug fixes implemented (not committed). Live review of Chapter Detail / Story / Settings still pending.

## Bug Fixes — Implemented, Not Committed
| Ticket | Fix | File |
|---|---|---|
| MAV-160 | `hasConnectedOnce` flag + 800ms silent retry before surfacing QR failure | `src/main/whatsapp.ts` |
| MAV-161 | `waitForStore()` polls `sock.store.chats` up to 10× before `listGroupsWithMeta()` | `src/main/whatsapp.ts` |
| MAV-162 (new) | `loggedOut` disconnect no longer wipes `onboardingComplete`/`chapters`; `wa.start()` failures caught silently; `writeState` writes `.backup` before overwriting | `src/main/ipc.ts`, `src/main/index.ts`, `src/main/store.ts` |
| MAV-163 (new) | `contact.chapterIds` accesses guarded with `?.` / `?? []` | `src/main/scanner.ts` |

TypeScript: clean. Unit tests: 55/65 pass — 10 failures pre-existing.

## Bug Fixes Identified (not yet implemented)

### MAV-160 — First-connect QR failure
Root: No retry / cooldown before surfacing error to user on first `connection.update`.
Fix: In `src/main/whatsapp.ts`, add `hasEverConnected` flag. If `connection === 'open'` and first time, set flag. Add 1 retry with 800ms delay before emitting failure to renderer.

### MAV-161 — Groups don't load after connection
Root: `listGroupsWithMeta()` called before Baileys store is hydrated.
Fix: Wrap in `waitForStore()` helper (polls `sock.store`, 3 retries, 1s backoff). Also applies to IPC handler.

## Design Review — Full Findings

### Home Screen ("Your Loops") — D-01 to D-10
| # | Issue | Severity |
|---|---|---|
| D-01 | "Your Loops" header redundant — mock had none, wastes ~60px | Medium |
| D-02 | Large dead zone (~100px) between nudge/echo cards and atom row | High |
| D-03 | Card (rectangular) vs atom (circular) visual language conflict | High |
| D-04 | All atoms same size 176px — mock shows varying sizes by warmth | Medium |
| D-05 | Nucleus shows first letter only — mock suggests emoji or photo | Medium |
| D-06 | AtomState as text badge (FADING/BIRTHDAY) — mock encodes via color/saturation | High |
| D-07 | Echo anniversary band visually undersized for its emotional significance | High |
| D-08 | Echo band copy broken — "years ago today" missing number | Medium |
| D-09 | Casa Mañana shows FADING despite being seeded active — `atomState` field ignored, derived from contacts | Low (seed issue) |
| D-10 | Nudge card avatar fallback is initials only, no photo | Low |

### Chapter Detail Screen — Code/Mock Gap Analysis
| Element | Gap |
|---|---|
| Cover photo | Missing warm duotone filter (`sepia(.32) saturate(1.05) hue-rotate(-8deg)`) — cold photos |
| No-cover placeholder | Flat gradient — acceptable but bland |
| Year range | `startYear`/`endYear` not in current Chapter type — renders blank |
| Moments section | Permanently `FilmStripEmpty` — no photo pipeline wired. Camera icon + placeholder copy |
| Crew grid fading states | Implemented via ContactTierIndicator — needs live visual verification |
| Overall structure | Matches mock closely — cover, crew grid, moments layout correct |

### Story Screen — Code/Mock Gap Analysis
| Element | Gap |
|---|---|
| Overall | Strongest screen — closest to MAV-72 spec |
| Max width | `maxWidth: 680, padding: 28px 52px` — slightly wide vs mock's intimate column |
| "Reason to reach out" | ✓ Italic serif, warm accent callout — matches mock |
| Timeline | ✓ RECENTLY/EARLIER labels, dot + line — matches mock |
| WhatsApp CTA | ✓ Ghost button top-right, conditional on whatsappId |
| Empty story state | "Still coming together." — no mock equivalent, reasonable fallback |

### Screens Still to Review Live
- [ ] Chapter Detail (need live navigation — state fix now in place)
- [ ] Story screen
- [ ] Settings
- [ ] Echo card overlay
- [ ] Birthday state card

## Seed Data (written 2026-06-30)
4 chapters in state.json:
- Casa Mañana (active): tomas-k, mia-j, nb-niamh
- Yoga Sceptics (fading): dw-david, cw-clara [clara = nudge]
- Zalando Crew (birthday-fading): bn-ben, rh-rahul, sl-sara [sara bday in 2 days]
- Edinburgh MSc (fading + echo): kc-kieran, am-ana, pk-priya [kieran bday today]

Contacts: 11 JSON files in ~/Documents/Loop/contacts/

## Linear Tickets
| ID | Title | Status |
|---|---|---|
| MAV-159 | Orbital view hidden (no chapters) | Filed |
| MAV-160 | QR connect fails first attempt | Filed |
| MAV-161 | Groups don't load after connection | Filed |

## Architecture decisions (settled)
- Chapter = period of life, not a WhatsApp group
- Bipartite projection → BFS clusters → TF-IDF naming
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
