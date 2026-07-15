# Loop — Behavioral Signals & Ranking Audit
_Generated 2026-07-04_

---

## 1. Every Signal in ContactState — What It Is, How It's Computed, How It's Used

### `lastContactDate` (string | null)
- **Computed**: scanner.ts line 331–333. Takes the most recent of: `detectReachOut()` timestamp (an outgoing message after Story was opened), or the timestamp of the most recent real WA message, or carries forward previous value.
- **Ranking use**: Primary sort key in both `closeContacts` strip (line 339–344, YourLoopsScreen) and `nudgeContact` selection (line 356–363). Higher days-since = appears earlier/gets nudged first.
- **Gap**: Used correctly. No issue here.

### `messageStrength` ('high' | 'medium' | 'low' | undefined)
- **Computed**: scanner.ts line 359–361, from `tieStrengthMap` built by `wa.buildTieStrengthMap()` (chat recency lookup). Falls back to previous value if WA not connected.
- **Ranking use**: Used as a multiplier in the `closeContacts` strip sort (line 332–333: `strengthMultiplier` → high=1.5, low=0.7). **NOT used in `nudgeContact` sort** (line 356–363 — pure `lastContactDate` only).
- **Gap**: The nudge selection ignores `messageStrength`. A high-strength contact who's briefly overdue gets the same nudge weight as a low-strength contact who's massively overdue. Should incorporate `messageStrength` into nudge sort to avoid nagging contacts where the relationship is already cold.

### `relationshipStrength` (number, 0–1)
- **Computed**: scanner.ts lines 402–407. Composite C1 score: `reciprocityRatio * 0.35 + frequencyScore * 0.35 + temporalConsistency * 0.10 + multiChannelBonus * 0.20`.
- **Ranking use**: **Stored on ContactState but never read in any ranking or nudge logic.** Not used anywhere in YourLoopsScreen.
- **Gap**: Computed but entirely orphaned. This is the richest signal in the system and it's not wired to anything. Should replace or augment `messageStrength` multiplier in ranking.

### `reciprocityRatio` (number)
- **Computed**: scanner.ts line 380–383. `min(sent,recv)/max(sent,recv)`, neutral 0.5 if <10 messages.
- **Ranking use**: Component of `relationshipStrength` only. **Never read directly.**
- **Gap**: Same as `relationshipStrength` — orphaned.

### `temporalConsistency` (number)
- **Computed**: scanner.ts lines 392–396. Distinct ISO weeks / span in weeks.
- **Ranking use**: Component of `relationshipStrength` only. **Never read directly.**
- **Gap**: Orphaned.

### `suppressNudge` (boolean)
- **Computed**: scanner.ts line 148–149 (`computeReachOutUpdate`): set to `true` when `reachOutCount >= 2`. Reset to `false` on reconnection (line 418).
- **Ranking use**: `isNudgeEligible()` line 50 — if `suppressNudge: true`, contact is excluded from nudge selection entirely.
- **Gap**: Suppression is binary and permanent until reconnection. There's no decay or timeout. A contact suppressed in February stays suppressed until they reply. No partial suppression (lower rank but still visible).

### `reachOutCount` (number)
- **Computed**: scanner.ts line 415 — increments each scan if `detectReachOut` fires. Reset to 0 on reconnection.
- **Ranking use**: Feeds `suppressNudge` threshold only. Not used as a ranking weight.
- **Gap**: Count resets on reconnection but not on time. If a contact gets reached out to twice in a year with no reply, they're suppressed forever. No time-based reset (e.g., reachOutCount decays after 90 days).

### `nudgeDismissedAt` (string | null)
- **Computed**: YourLoopsScreen line 388, set when user taps "Dismiss" on nudge card via `state:patch`.
- **Ranking use**: `isNudgeEligible()` line 52–55 — contact excluded from nudge if dismissed < 7 days ago. After 7 days they resurface.
- **Gap**: Single timestamp — no count. Dismissing 10 times has the same effect as dismissing once: resurface after 7 days. There is no progressive suppression from repeated dismissals.

### `storyOpenedAt` (string | null)
- **Computed**: Set when user opens Story screen (IPC side), cleared in scanner when `detectReachOut` fires.
- **Ranking use**: Used as the anchor timestamp in `detectReachOut()` — "did an outgoing message happen after this?". Not used in ranking.
- **Gap**: No gap — this is a detection anchor, not a ranking signal.

### `lastReachOutAt` (string | null)
- **Computed**: scanner.ts line 417 — set from `reachOutDate` when a reach-out is detected, cleared on reconnection.
- **Ranking use**: Used in `detectReconnection()` to anchor the reply detection window. **Not used in nudge eligibility or ranking.**
- **Gap**: Should factor into nudge eligibility — if we reached out 2 days ago, don't nudge again yet. Currently `suppressNudge` handles this bluntly (suppress after 2 reach-outs), but there's a window between reach-out 1 and reach-out 2 where nudge is still eligible even though we literally just messaged them.

### `reconnectedAt` (string | null)
- **Computed**: scanner.ts line 417 — set to now when `detectReconnection()` returns true.
- **Ranking use**: Prevents `detectReconnection` from firing again (line 137). **Not used in ranking or strip ordering.**
- **Gap**: A reconnection event is the strongest positive signal possible — someone replied after we nudged them. It should boost the contact's ranking position temporarily (they just re-engaged, reward that). Currently invisible to ranking.

### `nextOccasion` (Occasion | null)
- **Computed**: scanner.ts line 340 — `detectDeadThread(messages) ?? computeNextOccasion(contact, lastContactDate)`.
- **Ranking use**: `isNudgeEligible()` does NOT require a `nextOccasion` — it uses `isMemberFading()` instead. Occasions don't independently boost nudge priority; the nudge sort is still pure `lastContactDate`.
- **Gap**: A contact with a birthday in 2 days has the same nudge priority as a contact who's simply been quiet for 40 days. Birthday occasion should be a hard override that puts the contact at position 0 in nudge selection.

---

## 2. Identified Gaps — Summary

### Gap A: `relationshipStrength` (C1) is computed but never consumed
The richest signal — composite of reciprocity, frequency, temporal consistency, and chapter membership — is written to ContactState at every scan and read by nothing. Should replace `messageStrength` as the ranking multiplier in both the strip sort and the nudge selection sort.

**Fix:** In `closeContacts` sort (YourLoopsScreen line 332–333), replace `strengthMultiplier(csA?.messageStrength)` with `(csA?.relationshipStrength ?? 0.5)`. Same in nudge sort.

### Gap B: `nudgeDismissedAt` has no count — no progressive suppression
Dismissing 10 times = dismissing once. The user asked for auto-suppression after repeated dismissals.

**Fix needed:** Add `nudgeDismissCount: number` to ContactState. Each dismiss increments it. Thresholds:
- 0–2: resurface after 7 days (current behavior)
- 3–4: resurface after 30 days
- 5+: `autosuppressed: true` — contact drops out of nudge selection entirely, still visible in strip at reduced opacity

`autosuppressed` should be reversible: user can un-suppress from Settings contact list.

### Gap C: No `snoozedUntil` field (MAV-205)
Currently contacts dismissed from a nudge resurface after 7 days regardless. `snoozedUntil` would let the user pick a date. Slot into `isNudgeEligible()` as:
```
if (cs.snoozedUntil && new Date(cs.snoozedUntil) > new Date()) return false
```

### Gap D: Occasion type not factored into nudge priority
A birthday in 2 days and an interval-overdue contact compete equally in nudge sort. Birthday (and dead-thread) should be hard overrides.

**Fix:** In `nudgeContact` useMemo, sort by: `nextOccasion.type === 'birthday' ? Infinity : daysSince`.

### Gap E: `lastReachOutAt` not blocking re-nudge in the 0→1 reach-out window
Between the first reach-out and `suppressNudge` firing (at count=2), a contact can be nudged again immediately on next app open. Should add: if `lastReachOutAt` is within 14 days, contact is not nudge-eligible.

### Gap F: `reconnectedAt` not boosting ranking
Reconnection is the highest-quality positive signal. Not wired to anything in ranking. Should temporarily boost `relationshipStrength` or add a recency bonus for 30 days post-reconnection.

### Gap G: No `manuallyConfirmed` field (MAV-206)
After chapter crew picker, contacts the user explicitly selects should get a ranking bonus. Proposed multiplier: `manuallyConfirmed ? 1.3 : 1.0` on top of `relationshipStrength`.

---

## 3. Progressive Suppression Design (no code — logic only)

### Fields needed
```
nudgeDismissCount: number           // increments on each dismiss, never resets automatically
autosuppressed: boolean             // set when dismissCount >= 5
snoozedUntil: string | null         // ISO date — MAV-205
```

### Threshold logic
| dismissCount | behavior |
|---|---|
| 0 | Never dismissed — fully eligible |
| 1–2 | Resurface after 7 days (current) |
| 3–4 | Resurface after 30 days |
| 5+ | `autosuppressed: true` — excluded from nudge selection |

### Strip visibility
Suppressed contacts remain visible in the close contacts strip at **reduced opacity (0.45)** with no urgent indicator. They are not hidden — the user can still tap them, open Their World, reach out manually. Suppression only removes them from the automatic nudge card.

### Reversibility
Settings screen contact list: each contact should have a "Re-enable nudges" action if `autosuppressed: true`. Tapping it resets `nudgeDismissCount: 0` and `autosuppressed: false`.

---

## 4. Summary Table

| Signal | Computed | Used in strip rank | Used in nudge eligibility | Gap |
|---|---|---|---|---|
| `lastContactDate` | scanner.ts:331 | Yes — primary sort key | Yes — days overdue | None |
| `messageStrength` | scanner.ts:359 | Yes — multiplier | No | Should also weight nudge sort |
| `relationshipStrength` (C1) | scanner.ts:402 | **No** | **No** | Entirely orphaned — highest-leverage fix |
| `reciprocityRatio` | scanner.ts:380 | No (feeds C1 only) | No | Consumed via C1 when C1 is wired |
| `temporalConsistency` | scanner.ts:392 | No (feeds C1 only) | No | Same |
| `suppressNudge` | scanner.ts:148 | No | Yes — binary exclude | No decay/timeout, no partial suppression |
| `reachOutCount` | scanner.ts:415 | No | Feeds suppressNudge | No time-based reset |
| `nudgeDismissedAt` | YourLoops:388 | No | Yes — 7-day gate | No count, no progressive suppression |
| `lastReachOutAt` | scanner.ts:417 | No | No | Should block re-nudge within 14 days |
| `reconnectedAt` | scanner.ts:417 | No | Resets suppressNudge | Should boost ranking post-reconnect |
| `nextOccasion` | scanner.ts:340 | No | No (nudge uses fading check instead) | Birthday should override nudge sort |
| `storyOpenedAt` | IPC handler | No | No — detection anchor only | None |

---

## 5. Recommended Implementation Order

1. **Wire `relationshipStrength` into strip + nudge sort** — single-line change in YourLoopsScreen, highest leverage, no new fields needed.
2. **Add `nudgeDismissCount` + `autosuppressed`** — progressive suppression from repeated dismissals.
3. **Add `snoozedUntil`** — MAV-205, slots cleanly into `isNudgeEligible`.
4. **Birthday/dead-thread as hard nudge override** — occasion-type sort in nudge useMemo.
5. **Block re-nudge within 14 days of `lastReachOutAt`** — one condition in `isNudgeEligible`.
6. **`reconnectedAt` ranking boost** — 30-day post-reconnection multiplier.
7. **`manuallyConfirmed` multiplier** — MAV-206, after crew picker ships.
