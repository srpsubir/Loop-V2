# Loop — Open Product Questions
## Context for discovery conversations

---

# Vision (locked — do not re-open)

> Loop is an intelligent relationship companion that holds two things simultaneously: the people you want to stay close to, and the identities you lived through while you were with them.
>
> Neither dimension subordinates the other. Same underlying data. Two lenses. The people layer answers "who do I want to maintain a relationship with, right now?" The chapter layer answers "who was I during that period of my life, and who was there with me?"
>
> A person who knew you across multiple chapters of your life is significant on both dimensions — and Loop should honour that, not flatten it.
>
> This is what makes Loop distinct: every other product picks one dimension. LinkedIn is people-first. Instagram is chapter-first. Google Photos is chapter-first. Loop holds both, because real relationships are inseparable from the identities that existed when you were in them.

**Positioning anchor:** "Loop maps the *people* from every chapter of your life and keeps you close to them, without the mental load of remembering to reach out." / "Not a reminder. A memory."

**Research grounding:** Tie strength detection is a solved problem in social network analysis (Granovetter 1973, EPJ Data Science 2020). Strongest signals: reciprocity, interaction frequency, temporal consistency, multi-channel co-presence. Strong ties use BOTH group channels AND private DMs. Loop's novel contribution: applying this intelligence privately, locally, on-device — returning the intelligence to the individual rather than harvesting it for a platform.

**Architecture:** Two co-equal layers on the same data.
- **People layer** (relationship intelligence): Close contacts, chapter-agnostic, sorted by urgency. "Who needs me right now?"
- **Chapter layer** (identity + memory): Orbit atoms, visual timeline, era-scoped. "Who was I then, and who was there with me?"

---

# Jobs To Be Done

These are the two primary user jobs Loop is built to serve. Both exist as implemented features; this section anchors the user-research framing so it survives context resets.

## JTBD 1 — Nostalgia
> "I want to relive the best chapters of my life and feel the warmth of who I was with."

**Implemented via:** QuietDayCard (echo chapter state), EchoCard, OpeningMomentCard (On This Day memory surface).
**Emotional register:** warmth, gratitude, beautiful surprise — no CTA, no action required.
**Key principle:** "The nostalgia layer is the soul of the product. This is what makes Loop different from a CRM." (Topic 1, MAV-69)

## JTBD 2 — Losing Touch
> "I'm beginning to lose touch with my closest friends, but I don't have time to schedule stuff with them — I need a gentle nudge."

**Implemented via:** Fading contacts (30-day intervalDays default for close tier), NudgeCard ("You've been quiet with {firstName}. Worth a message."), StayCloseScreen, DeadThreadCard.
**Key mechanic:** isMemberFading checks daysSince > contact.intervalDays → triggers fading orbit state → NudgeCard surfaces most-overdue eligible contact.
**Note:** The "I don't have time to schedule" framing is a verbatim user-research quote — Loop deliberately avoids scheduling/calendar mechanics and lowers the bar to a single message.

---

### What Loop is

Loop is a Mac app that helps you stay genuinely close to the people who matter. Not through reminders or CRM discipline. Through memory, warmth, and the feeling of standing in the sun after an overcast sky.

It reads WhatsApp conversations locally (nothing leaves your Mac), surfaces the chapters of your life as a visual timeline of atoms — each chapter a past identity, each person an electron orbiting that nucleus. When a chapter fades, you feel it. When you reconnect, the clouds part.

The emotional register is nostalgia, gratitude, and warmth. Never productivity. Never admin.

**Post-onboarding journey (decided):**
1. "Your Loops" home screen — horizontal atom timeline, chapters as primary unit, fading atoms draw the eye
2. Tap a chapter → Chapter detail (vertical: cover image, crew with fading profile pictures, memorable moments as media only)
3. Tap a fading crew member → Story screen (context, history, your story together)
4. Story screen → Open in WhatsApp → reach out
5. Resolution happens outside Loop when the connection re-establishes

**Naming decisions:**
- Home screen: "Your Loops" (not Garden)
- Contact context screen: "Story" (not Brief)
- Chapter nucleus: WhatsApp group's creative name ("The Boys", not "London 2018-2022")

**Current build state:** Core app built with old architecture (Garden, BriefScreen, On Your Mind). New architecture decided but not yet designed or built. All screens gated on CD sign-off.

---

## Topic 1 — The quiet day (MAV-69)

**The question:** What is Loop's value on a day when there's nothing urgent?

Right now, the Garden screen shows an "On your mind" section with whoever needs attention — an upcoming birthday, someone you haven't spoken to in a while. But what happens when there's no one? What does Loop show when all your relationships are healthy and nothing is pressing?

The current empty state is a generic placeholder. But this might actually be Loop's most important moment: the quiet day is the opportunity to be something other than a reminder system.

**The hypothesis:** On a quiet day, Loop's value is nostalgia. Surfacing an old memory — a photo, a message, a moment from a previous chapter — not as a nudge to do something, but just because it's beautiful. "Three years ago this week, you and Taha were planning the Berlin trip." No CTA. Just memory.

**What we haven't figured out:**
- What does this look like on screen? A card? A full experience? A gentle notification?
- Is it proactive ("Loop just came across this") or on-demand (the user browses old moments)?
- How does it differ from a nudge? The tone needs to be completely different — no urgency, no action required.
- Does it always appear on quiet days, or only when Loop has found something genuinely good?

**Why it matters:** This is what makes Loop different from a CRM. Anyone can build a reminder system. The nostalgia layer is the soul of the product.

---

## Topic 2 — Warm vs Close (MAV-70)

**The question:** What does being "Close" actually change in the experience?

During onboarding, users sort their contacts into two tiers: Warm and Close. The distinction exists in the data model. But we never defined what it means in practice. We hid the tier selector from Settings until we figure this out.

**What we know:**
- Close probably means: someone you want to stay in touch with more frequently, or who gets deeper treatment in the brief, or who Loop watches more carefully for drift.
- Warm probably means: someone you care about but with a longer natural interval — maybe you only talk every few months and that's fine.

**What we haven't figured out:**
- Does Close change scan frequency? (Loop checks on them more often?)
- Does it change brief depth? (More context, more history?)
- Does it change the urgency weighting? (A Close contact who's gone quiet gets flagged faster?)
- Is the distinction ever visible to the user, or is it purely an internal signal?
- Should Close contacts have a defined "expected interval" that the user sets, so Loop knows when drift is actually drift?

**Why it matters:** If Close doesn't concretely change anything, we should remove the distinction. If it does, we need to design around what it changes — including how users understand it during onboarding.

---

## Topic 3 — The second loop / dead thread (MAV-71)

**The question:** Can Loop detect when a reconnection was started but never completed?

Here's the pattern Loop sees constantly in WhatsApp data:
1. Loop nudges — "you haven't spoken to Priya in 6 weeks"
2. User messages Priya
3. Priya replies, they catch up a bit
4. Someone says "let's grab coffee soon" or "we should catch up properly"
5. Silence. Nothing happens. The coffee never gets booked.

Loop reads all of this. It knows the nudge happened. It knows they replied. It knows "let's catch up" was said. And it knows nothing followed. Weeks pass.

The current scanner treats this as a successful reconnection — last contact date is updated, urgency drops. But the relationship is actually in a more precarious state than before: a plan was made and broken. That's a stronger signal than just silence.

**The second loop would be:** Loop detects "plan made, plan not completed" → surfaces a different kind of nudge: "You and Priya said you'd catch up. That was 6 weeks ago. Still hasn't happened."

**What we haven't figured out:**
- What signals indicate a plan was made? ("let's", "we should", "soon", "next week", calendar language?)
- How confident does Loop need to be before surfacing this? False positives would feel invasive.
- Is this a different kind of card in the Garden? A different tone in the brief? A notification?
- Does the user ever see the "evidence" (the conversation snippet), or is Loop's conclusion presented without showing its work?

**Why it matters:** This is the insight that makes Loop genuinely smarter than a timer. It's not just tracking recency — it's tracking whether relationships are actually progressing.

---

## Topic 4 — "Brief" is the wrong word (MAV-72)

**The question:** What do we call the screen where you read about someone you care about?

Right now it's called "Brief." As in: a brief on the contact before you reach out. The problem: "brief" sounds like prep work for a meeting, or a sales call, or a court case. It's clinical. It positions the relationship as a professional objective. That's the wrong feeling entirely.

Loop is about genuine human connection. The screen where you read about someone — their recent life, your shared history, why they're on your mind — should feel like pulling out an old letter, not opening a dossier.

**"Brief" stays in the code as a placeholder. But the name that users see needs to change.**

**Connected question — the "On your mind" CTA:**
When someone appears in your Garden as the hero card ("on your mind"), what happens when you tap through? Currently it goes to the Brief. But should it? Options:
- Go to the Brief / whatever we rename it (current)
- Go directly to WhatsApp (skips Loop's context entirely — probably wrong)
- Something new: a lighter "moment" view that isn't the full screen

**What we haven't figured out:**
- What's the right name? (Not "brief", not "profile", not "dossier". Something warmer.)
- Does the name change based on context — is it different when it's someone's birthday vs someone you've just drifted from?
- What should the "On your mind" CTA actually do? Does it depend on the reason they're on your mind?

**Why it matters:** The name is the mental model. Whatever we call it shapes how the user thinks about what they're doing when they open it — and whether it feels like care or like admin.

---

## Topic 5 — "On Your Mind" UX (MAV-73)

**The question:** What does the "On Your Mind" section actually do, and does it do it well?

The hero card and supporting list exist and are built. But several things were never properly decided:
- The hero card CTA says "Open brief" — connected to the naming problem in Topic 4, but the destination and intent need a decision independent of the name.
- The Gift icon is hardcoded on the hero card regardless of occasion type. A birthday, a drift warning, and a milestone all look identical. Should they?
- The "rest" list below the hero shows name + reason in a PersonRow. Is that enough? Does it need visual differentiation by occasion type?
- What's the right number of people to show? Currently capped at 5. Is that right?

**What we haven't figured out:**
- Does the CTA go to the Brief, directly to WhatsApp, or something new?
- Should different occasion types (birthday vs drift vs milestone) have distinct visual treatments on the hero card?
- Is the list below the hero the right pattern, or should it be something else?

**Why it matters:** "On Your Mind" is the functional heart of the Garden — the moment Loop earns its keep. The current implementation is a placeholder that works but was never properly designed.

---

## Topic 6 — Birthday UX (MAV-74)

**The question:** Does a birthday deserve its own experience, or is it just another "On Your Mind" entry?

Currently birthdays surface like any other occasion — same hero card, same Gift icon, same "Open brief" CTA. But a birthday is the highest-signal moment in the product: it's a deadline, it's emotional, and it's the one moment where reaching out is universally acceptable.

**What we haven't figured out:**
- Should a birthday get a distinct card treatment — different visual weight, different colour, different icon?
- How far in advance does Loop surface a birthday? Currently 30 days — is that right, or does it create noise?
- What's the CTA on a birthday card? "Open brief" feels wrong. "Wish them well"? Something else?
- If the birthday is today vs in 2 weeks, should the card look different?
- What happens after the birthday passes — does the card disappear immediately or linger?

**Why it matters:** If Loop gets birthdays right, users will feel it. It's the most natural moment to reach out and Loop should make it effortless, not just informative.

---

## Topic 8 — Chapter sensitivity / identity selection (MAV-76)

**The question:** Some chapters represent versions of the user they may not want to be reminded of — dark periods, difficult eras, identities they've consciously moved on from. How does Loop handle this without erasing the genuine good moments that existed within those chapters?

**The insight:** Even a difficult chapter had warmth in it. The option can't be "hide the chapter entirely." But surfacing drift signals for a chapter the user doesn't want to revisit is wrong — "you're losing touch with your 2017 self" is not helpful if that self was broken.

**Proposed mechanic: "Rest this chapter"**
- Loop keeps the people from that chapter
- Drift signals are suppressed — Loop won't flag fading for rested chapters
- Genuine warm moments (a voice note, a good memory) may still surface, but only if the user hasn't explicitly blocked it
- The chapter exists in the user's life map but sits quietly — not highlighted, not flagged

**What we haven't figured out:**
- Where does the user set this? During chapter creation, or later in settings?
- Should "rested" chapters look visually different on the home screen, or just be absent from active signalling?
- Can a user un-rest a chapter? (Probably yes — people change.)
- Does Loop ever ask about rested chapters, or is silence the permanent default once set?

**Why it matters:** Loop is touching something deeply personal — past identities, not just past friendships. Getting this wrong feels invasive. Getting it right feels like Loop genuinely understands the complexity of a human life.

---

## Topic 9 — Home screen visual metaphor (MAV-77)

**The question:** What does "Your Loops" actually look like — and what is the right visual metaphor for a life map of chapters?

**Working hypothesis:** A horizontal timeline of "atoms" — each chapter is a nucleus (who you were then) orbited by the people who made it. Active chapters have tight orbits. Fading chapters have electrons drifting outward. The product name "Loop" maps directly to this: orbits are loops.

**This is a hypothesis, not a decision.** CD should research this through Mobbin before we commit. Search for: orbital and constellation UI patterns in relationship or social apps, atomic metaphors in data visualisation, solar system or orbit navigation in any app context. Look for patterns where the visual structure carries emotional weight, not just information.

**What we do know:**
- The nucleus = the WhatsApp group's creative name, not a generated location/time label. "The Boys." "Yoga for the Sceptics." The name people gave the group IS the chapter identity.
- Warm/dark = fading but ached. Bright/vivid = alive and active.
- The visual should make you feel the weight of your life at a glance, not read a dashboard.

**What we haven't figured out:**
- What if multiple groups map to the same chapter? Do they each become separate atoms or merge?
- Does the timeline scroll horizontally or is it all visible at once?
- What is the entry point into a chapter — tap the nucleus? Tap an electron?

---

## Topic 10 — Onboarding: chapter naming and WhatsApp Community filtering (MAV-78)

**Decision locked:** Chapter names should come from WhatsApp group names, not be auto-generated from location/time. "The Boys" not "London 2018-2022." The creative name people gave their group already carries the identity. Loop should honour that.

**New filter needed:** WhatsApp Communities and community announcement channels must be excluded from the onboarding group scan. Users have no nostalgia toward institutional communities. Only genuine friend/crew groups should surface.

**Open questions:**
- If a user has multiple groups from the same era (e.g. "Edinburgh Flat 2014" and "Edinburgh climbing club"), do they each become separate chapters/atoms, or does the user merge them during onboarding?
- Should Loop suggest a merge when it detects overlapping membership or time periods?
- Where in the onboarding flow does the WhatsApp Community filter get applied — silently in the scanner, or with a brief explanation to the user?

---

## Topic 11 — Quiet day in new architecture (MAV-79)

**The question:** The quiet day experience (Topic 1) was designed for the old Garden home screen. In the new "Your Loops" atom timeline, where does it live?

**What was decided in Topic 1:** On a quiet day, the "On This Day" card expands to replace the "On Your Mind" section — a single nostalgic moment, card in Garden, no CTA, media or conversation snippet, persists 24h.

**What's now broken:** The old Garden no longer exists. The home screen is now a horizontal atom timeline. The "On This Day" card has no home.

**Options to explore:**
- The quiet day moment appears as a special card that floats above or between the atoms
- A quiet day changes the state of the entire home screen — atoms settle, something surfaces in the foreground
- The quiet day lives inside a specific chapter — Loop decides which chapter to pull the memory from and highlights that atom
- The quiet day is a separate surface entirely — a gentle full-screen moment on app open before the atom timeline

**Why it matters:** The quiet day is the soul of the product. Getting its home in the new architecture right is critical.

---

## Topic 12 — Birthday and dead thread placement in new architecture (MAV-80)

**The question:** Birthdays (Topic 6) and dead threads (Topic 3) were both designed as "On Your Mind" entries. That section no longer exists. Where do time-sensitive signals surface in the atom architecture?

**What was decided:**
- Birthday: surfaces in "On Your Mind" hero card (old design, now homeless)
- Dead thread: surfaces as a different reason string in "On Your Mind" (old design, now homeless)

**Options to explore:**
- These signals affect the visual state of the chapter atom — a birthday makes the atom pulse or brighten; a dead thread makes it notably darker
- These signals surface inside the chapter detail screen — you only see them when you tap in
- A separate surface handles all time-sensitive signals — a quiet banner or a card that appears above the atom timeline when something is urgent
- The birthday or dead thread signal causes a specific crew member's profile picture to be highlighted inside the chapter

**Why it matters:** Birthdays especially are time-sensitive. If the signal is only visible after tapping into a chapter, the user might miss it entirely.

---

## Topic 13 — Reconnection feedback loop (MAV-81)

**The question:** When a connection is re-established — the user reached out and the other person responded — does anything change visually in the app?

**The tension/resolution framework we established:** Loop builds tension (fading atom, desaturated crew member). The reach-out is the attempt. The reconnection is the resolution. The clouds part.

**What we haven't figured out:**
- When Loop detects a response (scanner sees new messages after a reach-out), does the crew member's profile picture brighten?
- Does the chapter atom warm up and become more vivid?
- Is there a moment of celebration — something that acknowledges the reconnection happened — or does Loop just quietly update the visual?
- How does this feel without being congratulatory or gamified?

**Why it matters:** The feedback loop closing is the dopamine hit. If Loop doesn't acknowledge it, the product feels deaf to the most important moment.

---

## Topic 14 — Chapter detail screen (MAV-82)

**The question:** The chapter detail screen has been fully brainstormed but not yet designed or given a CD prompt.

**What's been decided:**
- Entry: cover image first (WhatsApp group profile image as fallback, or highest-faces-count image from the group)
- Crew display: profile pictures, fading crew members desaturated (not grey, not crossed out — cooler, quieter)
- Memorable moments: media only (images + voice notes), no Claude interpretation
- Voice notes: inline playback, waveform + play button, unmistakably playable
- No moments if no media — section simply doesn't appear
- Navigation: vertical scroll (complements horizontal home screen)
- Tap a fading crew member → Story screen
- Film strip metaphor: memorable moments live in a horizontal drag-to-browse strip (not a grid, not a vertical scroll)
- Hero moment: single full-width image at top of film strip — always an image, never a voice note (voice note requires click to play; aha must be immediate)
- Voice notes sit inside the film strip, not as hero; displayed as WhatsApp-style inline waveform + play button

**Spike detection and surfacing (decided, v1):**
- Spikes detected by message volume over time — behavioral proxy, no NLP, no Claude
- Surfacing tier (binary for v1): <1 year = nothing surfaced; ≥2 years = everything surfaced + user can remove
- No sentiment classification attempted — same problem Google Photos and Apple Photos failed to solve. Hard moments are part of the story.
- "Remove this moment" gesture is the escape valve and the learning signal
- Middle tier (1–2 years, high-confidence only) deferred to v2 once beta removal data informs thresholds

**What still needs deciding before CD prompt:**
- Empty crew state: what if Loop can't find profile pictures for crew members?
- Chapter name placement: where does "The Boys" / "Yoga for the Sceptics" appear on screen?

---

## Topic 15 — Onboarding UX and copy review (MAV-85)

**The question:** The onboarding flow (Welcome → WhatsApp Connect → Chapter Inference → Crew Detection) was built before the new product vision was established. It needs a full copy and emotional register review.

**Known issues:**
- Copy throughout uses engineering/CRM language, not the warmth-and-nostalgia register
- Chapter Inference screen generates location/time labels (now superseded — group names are the chapter identity)
- No Step 4 in Crew Detection yet (Close contact marking, Topic 2)
- WhatsApp Communities not filtered (Topic 10)
- Onboarding must land into the new "Your Loops" atom home screen — transition needs to feel continuous, not like a jump

**CD export status (updated as exports arrive):**

| # | Screen | File | Export | Alignment | Action |
|---|--------|------|--------|-----------|--------|
| 0 | Landing Page | `Landing Page.html` | ✅ 34K | Not reviewed | Review separately |
| 1 | Welcome | `Loop Welcome Screen.html` | ✅ 6K | ✅ Fixed | Copy updated: new tagline, bridge line added, steps rewritten. Done. |
| 2 | WhatsApp Connect | `MAV-85 WhatsApp Connect (Standalone).html` | ✅ 1.7MB bundled | ✅ Looks good | QR centred, parchment bg, Mac window. Verify states + copy in browser. |
| 3 | Chapter Inference | `MAV-86 Chapter Inference Onboarding (Standalone).html` | ✅ 1.7MB bundled | ✅ Looks good | Chapter list rows visible. Verify in browser. |
| 4 | Crew Detection | `MAV-87 Crew Detection.html` | ✅ 19K self-contained | ✅ Aligned | Two states: Scanning + Revealed. Variant A/B. Note: labels "step 4 of 4" — should be 4 of 5 (Close Contacts is step 5). Flag to CD. |
| 5 | Close Contacts (Step 4) | `MAV-63 Close Contacts Standalone.html` | ⚠️ 9.8K (ext deps) | ✅ Copy fixed | "garden" → "loops" fixed directly. Still refs external styles.css/_ds_bundle.js — won't render offline. |
| 6 | Your Loops (home) | `MAV-77 Your Loops.html` | ✅ 19K | ✅ Good | Confirmed. |
| 7 | Opening Moment | `MAV-81 Opening Moment (Standalone).html` | ✅ 1.7MB bundled | ✅ Looks good | "The Boys" + 2022 bottom-left, full-bleed. Verify in browser. |
| 8 | Signal States | `MAV-82 Signal States.html` | ✅ 15K | ✅ Good | One annotation fix: dead thread trigger → "Commitment made, never followed through." |
| 9 | Chapter Naming | `MAV-78 Chapter Naming.html` | ✅ 21K | ✅ Good | Confirmed. |
| 10 | Chapter Detail | `MAV-84 Chapter Detail.html` | ✅ 16K | ✅ Good | Ready for sign-off. |
| 11 | The Story | `MAV-72 The Story.html` | ✅ 11K | ✅ Good | Confirmed. |
| 12 | Reconnection Feedback | `MAV-83 Reconnection Feedback Loop - Standalone.html` | ✅ 1.9MB bundled | ✅ Looks good | 4 states, progression visible. Verify in browser. |

**To archive (superseded):** MAV-60 Quiet Day, MAV-62/62a/62b On Your Mind. Old Garden architecture, replaced by new designs.

**Gated on:** Topic 14 (chapter detail screen) and Topic 9 (home screen) being designed first. Onboarding must match what it leads into.

---

## Topic 7 — End-to-end UX flow review (MAV-75)

**The question:** Does the full user journey hold together as a coherent experience?

As individual screens get designed and built, the overall flow has never been reviewed end-to-end. Gaps, redundancies, and awkward transitions accumulate without anyone noticing because each screen is designed in isolation.

**The full flow to review:**
Welcome → WhatsApp Connect → Chapter Inference → Crew Detection (Steps 1-4) → Garden → On Your Mind (hero tap) → Brief/renamed screen → WhatsApp handoff

**What to check:**
- Does the onboarding flow feel like one continuous experience or a series of disconnected steps?
- Are there moments where the user doesn't know what Loop is doing or why?
- Does the Garden feel like a natural landing after onboarding, or is there a jump?
- Is there a clear path back from any screen?
- Are there screens that exist in code but have no designed state (empty states, error states, loading states)?
- Does the emotional register stay consistent — nostalgia and warmth — across every screen, or does it slip into productivity/admin language somewhere?

**Why it matters:** Individual screens can pass design review while the overall journey still feels broken. This is the review that catches what isolated CD sessions miss.

---

## How to use this document

These are product questions, not design briefs. The goal of the conversation is to:
1. Explore each topic properly — what's the real user need, what are the constraints, what feels right
2. Make decisions — even tentative ones
3. Write those decisions up as a short PRD for each topic
4. Use the PRD to brief Claude Design (the design tool) with a proper prompt

Nothing gets designed or built until each topic has gone through this process.
