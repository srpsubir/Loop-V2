# Flow: About screen

## Objective
Confirm the About screen renders correctly and shows the right version/build info.

## Steps
1. Open macOS app menu → "About Loop".
2. Confirm founder letter, dark D-II palette, and Loop mark render correctly.
3. Confirm version number matches package.json / build (via version:get IPC).
4. Tap Privacy Policy link — confirm it opens correctly (external link, not loop-file://).
5. Close the About screen — confirm it returns cleanly to the previous screen/state.

## What to flag
- Version mismatch or missing version.
- Broken privacy policy link.
- Dock/menu quirks (note: "Electron" in dock tooltip during dev is a known non-bug, don't flag).
