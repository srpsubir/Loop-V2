# Flow: Chapter crew picker

## Objective
Add or adjust crew membership for a chapter via the crew picker screen.

## Steps
1. Open a chapter's crew picker (ChapterCrewPickerScreen).
2. Confirm the skeleton loading state appears briefly, not a bare "Loading…" string.
3. Search/filter for a contact and add them to the chapter's crew.
4. Remove a crew member.
5. Navigate away and back — confirm the change persisted.

## What to flag
- Loading state regressions (should be SkeletonPulse, not text).
- Transition glitches (spring transitions: fade+slide, stiffness 260/damping 20/mass 0.8).
- Any state loss on navigation.
- Contrast/readability issues on this screen.
