# MAV-203 Analysis: Calendar Integration + Email Signup

_Internal planning document. Not for users._

---

## What this ticket actually contains (two unrelated threads)

MAV-203 conflated two distinct product questions. They should be separated before any implementation decision.

- **Thread A — Email signup / freemium identity**: How does Loop know who its users are, gate features, and manage billing?
- **Thread B — Calendar reminder as a third nudge action**: When a user sees a drift signal, should "add a reminder" be a third option alongside "message now" and "dismiss"?

---

## Thread A: Email signup and the freemium model

### The tension

Loop's core promise is local-first: nothing leaves the device, no behavioural data is shared. Email signup creates a server-side user record. These are in direct tension.

The question is not whether the tension exists — it does — but whether it can be resolved cleanly enough that users don't feel deceived.

### The minimum viable server footprint

What the server needs to know to run freemium:
- Email address (identity anchor)
- License key or subscription status (free / paid)
- Date of first activation (for trial expiry)

What the server must **never** hold:
- Contact names, chapter names, conversation excerpts
- WhatsApp IDs or phone numbers
- Scan results, relationship scores, story content
- Any data derived from the user's conversations

This is a meaningful distinction. The server is a billing record, not a data record. Loop should communicate this explicitly in the email signup screen: "We only store your email and subscription status. Everything else stays on your Mac."

### Activation flow recommendation

1. **Days 1–14**: fully offline trial, no account required. User experiences the product before giving anything.
2. **Day 14 gate** (or at a specific premium feature): prompt for email. Frame it as: "To keep Loop running, create a free account." One field. No password at signup — use magic link or device-bound token.
3. **Free tier**: core nudge + chapter detection, capped (e.g. 5 contacts, 3 chapters). Unlimited with paid.
4. **Paid**: one-time purchase (more aligned with privacy-first macOS apps like Pockity, Tot) OR annual subscription. One-time is more consistent with the "not a service" positioning.

### Risk to manage

If a user has already been told "nothing leaves your device" and then hits an email gate, they will feel misled unless the framing is precise. The distinction — "your *data* never leaves; your *email* is needed for billing" — must be explicit in both the onboarding and the gate screen. One sentence, not buried in settings.

### Recommendation on Thread A

Split into its own epic: **MAV-XXX: Freemium identity and billing**. This is a significant product and infrastructure decision (licensing server, email provider, payment processor) that should not be bundled with a calendar feature. Do not implement until the monetisation model is locked. **Not part of `calendar:addEvent`.**

---

## Thread B: Calendar reminder as a third action

### Current state

When a user sees a drift signal (nudge card, story screen, On Your Mind section), they have two options:
- **Message on WhatsApp** — immediate action
- **Dismiss** — defer indefinitely

The proposed addition: **"Remind me"** — add a macOS Calendar event for a future date.

### Utility assessment

**Who uses macOS Calendar?**
Among the target demographic (people who care about relationships, likely professional, Apple ecosystem), macOS Calendar is commonly open — it syncs with Google Calendar, iCloud, Fantastical. An event added to the default calendar surfaces in most of their other tools. This is not a niche action.

**Does it duplicate Loop's own nudge system?**
Yes and no. Loop nudges based on cadence (days since last contact). If a user adds a calendar event for 3 weeks from now, Loop will also nudge them again before that date if the silence continues. This creates double-reminder risk.

However, there is a real use case that Loop's nudge system does NOT cover: **intentional scheduling**. The user might think "I want to call her when I'm back from this trip" — they know they'll be unavailable for 10 days and want to park it. Loop has no concept of "I've acknowledged this, remind me on a specific date." Dismiss clears it; message sends now. There's a genuine gap.

**The snooze framing is stronger than the calendar framing.**
The right mental model is not "export to calendar" but "snooze until [date]". This keeps the action inside Loop, removes the macOS Calendar dependency, and is far simpler to build. The Loop nudge system already tracks timing — a snooze is just a future `nextNudgeAt` timestamp on the contact state. The user picks a date, Loop stays quiet until then.

**When would calendar export add value over snooze?**
Only if the user wants the reminder to appear in their external calendar alongside their other commitments (meetings, travel). Some users do think this way — "I want 'call Alice' to sit next to my Thursday 3pm meeting so I remember." That's a legitimate preference, not a trivial one. But it's a preference, not a core need.

### Risk of building calendar export now

- AppleScript for Calendar is brittle — it breaks on macOS version updates and Calendar permissions prompts are confusing to users.
- EventKit (the proper API) requires a native module or a Swift/Obj-C bridge — significant complexity for an Electron app.
- The first time a user sees a macOS permissions dialog ("Loop wants to access your Calendar") mid-onboarding, many will decline and wonder why a relationship app needs their calendar.

### Recommendation on Thread B

**Build snooze first. Calendar export later, maybe never.**

Snooze ("remind me on...") is the 80% solution:
- No external permissions
- No AppleScript fragility
- Stays inside Loop's UX
- Implements as a date field on ContactState (`snoozedUntil: string | null`)
- Nudge system respects it: skip contacts where `snoozedUntil > now`

Calendar export can be a future setting ("When I snooze a contact, also add it to my calendar") for users who want external visibility. Make it opt-in, not the default action.

---

## IPC spec: if calendar export is built

Only write this if the snooze-first approach is rejected and calendar export is explicitly approved.

**Handler:** `calendar:addEvent`
**Parameters:** `{ contactName: string, date: string (ISO 8601), note?: string }`
**Returns:** `{ success: boolean, error?: string }`
**Main process:** `child_process.exec` with AppleScript:
```applescript
tell application "Calendar"
  tell calendar "Home"
    make new event with properties {summary:"Reach out to [name]", start date:date "[date]"}
  end tell
end tell
```
**Permissions:** macOS will prompt for Calendar access on first use. Handle denial gracefully — show a toast "Calendar access denied. You can enable it in System Settings > Privacy."
**Renderer trigger:** "Remind me" button on StoryScreen and nudge card, followed by a date picker (native `<input type="date">` styled to match).

---

## Recommended next step

1. **Split MAV-203 into two tickets:**
   - MAV-203a: Freemium identity and billing (email, licensing, gate flow) — park until monetisation model is decided
   - MAV-203b: Snooze / "remind me on [date]" — build this now as part of the nudge system, no external dependencies

2. **Rename `calendar:addEvent` in the preload** to `reminder:snooze` or simply implement snooze directly through `state:patch` with a `snoozedUntil` field — no new IPC handler needed.

3. **Calendar export**: revisit after snooze ships and user feedback shows demand for external calendar visibility. Do not build speculatively.
