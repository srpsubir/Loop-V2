# Loop — Session Context

_Last updated: 2026-06-25_

## Last commit + remote
`522fe67` — Prep signing + notarization config. Remote up to date.

## What shipped this session (all committed + pushed)
- **MAV-104**: chapters.ts scoring formula (emoji/year-only = 0, keyword = 15, real words = 10)
- **NudgeCard**: component + wired into YourLoopsScreen (isNudgeEligible, 7-day dismiss, nudgeDismissedAt)
- **DeadThreadCard**: component (Try again / Let it rest)
- **QuietDayCard**: component (chapter anniversary or "A quiet day." fallback)
- **ContactTierIndicator**: component (close 56px + terracotta dot, warm 48px, fading 0.55)
- **Wiring**: DeadThreadCard + QuietDayCard in YourLoopsScreen, ContactTierIndicator in ChapterDetailScreen
- **Distribution config**: electron-builder.yml (hardenedRuntime, notarize), entitlements.mac.plist

## Architecture decisions (settled)
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
- 152/154 passing. 2 failures = osascript E2E (need app running). All unit tests 100% green.

## Linear backlog (Loop-relevant only)
| ID | Priority | Title | Status |
|---|---|---|---|
| MAV-97 | Urgent | Freemium gate (2 free chapters + paywall + Lemon Squeezy license key) | Backlog |
| MAV-75 | Urgent | Baileys/Meta ToS resilience | Backlog (monitor only pre-beta) |
| MAV-100 | Urgent | MailerLite nurture sequence (landing page waitlist) | Backlog |
| MAV-150 | High | Landing page narrative | Backlog (parked) |
| MAV-73 | High | iMessage connector | Backlog (post-beta) |
| MAV-76 | Medium | Telegram connector | Backlog (post-beta) |
| MAV-153 | Medium | SLM chapter inference from WhatsApp groups | Backlog (V2/post-beta) |
| MAV-79 | Low | iOS companion | Backlog (post-beta) |
| MAV-47 | — | Apple Developer ID | In Progress (blocked — cert pending) |
| MAV-74 | — | Gmail connector | CANCELLED |
| MAV-77 | — | Apple Calendar connector | CANCELLED |

## Pending (before beta can ship)
1. MAV-47: Apple Developer ID cert (a few days) — then sign + notarize DMG
2. MAV-97: Freemium gate + Lemon Squeezy integration — build once cert is in hand

## SLM chapter inference (MAV-153)
- Qwen2.5-1.5B already in DMG. Could interpret group names/content for chapter detection.
- GIGO risk is real: thin group names, emoji-only, family/work misclassification, confident wrong answers.
- Needs: prompt engineering, confidence threshold, synthetic eval set before shipping.
- V2/post-beta. Do not touch until after beta validation.
