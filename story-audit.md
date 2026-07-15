# Story Generation Audit
_Generated 2026-07-04_

---

## 1. What StoryScreen Renders

Fields pulled from the `Story` object (`brief`):

| Field | Where it appears on screen |
|---|---|
| `heroPhotoPath` | Avatar `src` — rendered as `loop-file://${brief.heroPhotoPath}` if set |
| `reasonToReachOut` | First content block after the hero section. Serif italic, accent colour background, 15px. Conditionally rendered (omitted if falsy). |
| `contextLines` | One `TimelineItem` per entry. First item: dot `accent`, label "Recently". Last item: serif italic text, label "Earlier". Middle items (if any): dot `rose`, label "Earlier". |

Fields from `ContactState` loaded separately (not from `Story`):

| Field | Where it appears on screen |
|---|---|
| `lastContactDate` | "Last spoke: {formatted}" below the contact name. Formatted locally in `formatLastContact()`. |
| `storyOpenedAt` | Written on load (MAV-83). Never displayed. |

`generatedAt` is never rendered. No `draftMessage` field exists yet.

---

## 2. Improved `reasonToReachOut` Variants

Signal priority order — first match wins.

**1. Birthday in ≤ 3 days**
Condition: `nextOccasion.type === 'birthday'` and `daysUntil <= 3`
Copy: `"Their birthday is in {daysUntil} days. A good moment to reach out."`

**2. Birthday in 4–14 days**
Condition: `nextOccasion.type === 'birthday'` and `daysUntil >= 4 && daysUntil <= 14`
Copy: `"Their birthday is coming up on {formattedDate}. You have a little time."`

**3. Dead thread (commitment, never followed through)**
Condition: `nextOccasion.type === 'dead-thread'`
Copy: `"You said you would be in touch. That loop is still open."`

**4. Long silence, high message strength (close friend gone quiet)**
Condition: `silenceDays > 60 && messageStrength === 'high'`
Copy: `"You two used to talk a lot. It has been {weeks} weeks."`

**5. Long silence, low message strength (warm contact fading)**
Condition: `silenceDays > 60 && messageStrength === 'low'`
Copy: `"You have not spoken in a while. Worth a short check-in."`

**6. Just reconnected**
Condition: `lastReachOutAt` and `reconnectedAt` both set, `reconnectedAt` within last 14 days
Copy: `"{firstName} replied. Good time to keep the thread warm."`

**7. Interval overdue (standard)**
Condition: `nextOccasion.type === 'interval'`
Copy: `"It has been {weeks} weeks. You said you wanted to stay close."`

**8. No signal (fallback)**
Condition: none of the above
Copy: `"{firstName} has been a bit quiet in your life lately."`

---

## 3. `draftMessage` Variants

Proposed new field: `draftMessage?: string` on `Story`.

All variants are under 25 words, second person, present tense, no em dashes, no guilt framing. Only populate when a meaningful signal is present. If no signal, leave `null` and hide the draft UI entirely.

**Birthday approaching**
> "Hey, thinking of you ahead of your birthday. Hope it is a good one."

**Dead thread re-open**
> "Hey, I know I went quiet after last time. Still thinking about you."

**Long silence, close friend (high messageStrength)**
> "Hey, it has been ages. Just wanted to check in. How are things with you?"

**Checking in, warm contact (low messageStrength)**
> "Hey, hope things are good. Just thinking of you and wanted to say hi."

**Post-reconnection follow-up**
> "Really glad we caught up. Let us do it again soon."

**Generic warm fallback (interval overdue, no other signal)**
> "Hey, hope you are well. Was thinking of you today."

---

## 4. Story Type Extension

New fields to add to the `Story` interface in `/Users/subirpaul/Loop/src/shared/types.ts`:

```typescript
export interface Story {
  generatedAt: string
  heroPhotoPath?: string
  contextLines: string[]
  reasonToReachOut: string

  // Proposed additions
  draftMessage?: string              // pre-written opener; null means hide draft UI
  reasonSignal?:                     // source signal that produced reasonToReachOut
    | 'birthday-imminent'            // ≤ 3 days
    | 'birthday-upcoming'            // 4–14 days
    | 'dead-thread'
    | 'silence-high-strength'
    | 'silence-low-strength'
    | 'reconnected'
    | 'interval-overdue'
    | 'fallback'
  silenceDays?: number               // days since lastContactDate at generation time
  nextOccasionLabel?: string         // cached from nextOccasion.label to avoid re-reading ContactState at render time
}
```

`reasonSignal` lets StoryScreen vary iconography or layout per signal type without re-running contact state logic. `silenceDays` avoids re-computing the diff at render time. `nextOccasionLabel` caches the occasion label so the screen does not need to join on `ContactState.nextOccasion` separately.
