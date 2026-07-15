# Flow: Onboarding — WhatsApp scan

## Objective
Starting from a fresh/logged-out state, complete Loop's onboarding through the WhatsApp scan step and reach the main "Your Loop" feed.

## Steps (natural language, not rigid selectors)
1. Launch Loop.
2. If a sign-in screen appears, complete Google sign-in.
3. Proceed through onboarding screens until the WhatsApp scanner step.
4. Start the scan and wait for it to detect chapters/groups.
5. Confirm the scan completes without a crash and lands on "Your Loop".

## What to flag
- Any confusing copy, unlabeled buttons, or dead-end screens.
- Scan taking unusually long or appearing stuck with no feedback.
- Crash screen (known open bug #6 — capture crash.log/Sentry context if seen).
- Anything that reads as "Brief" (should never appear — settled copy is "Their world").

## Notes
- Scanner logic is real, not mocked — a real WhatsApp Web session state may be required. If not available, treat this as best-effort exploration of whatever onboarding state exists.
