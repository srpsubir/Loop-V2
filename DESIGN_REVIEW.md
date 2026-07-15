# Loop Design Review — 2026-06-30
**Reviewer:** Claude Code (design audit, code + screenshot)
**Build:** preview (LOOP_TEST=1)
**Screenshots taken:** /tmp/loop-welcome.png, /tmp/loop-yourloops-empty.png, /tmp/loop-yourloops-chapters.png
**Method:** Live screenshots for Welcome + Your Loops states. All other screens evaluated from full source read of every screen and component file. Screenshots taken with window raised by Accessibility API, captured with `screencapture -R`.

---

## Welcome Screen
**Reached via:** state.json — onboardingComplete: false
**Screenshot:** /tmp/loop-welcome.png

### Clarity
Purpose is clear within 3 seconds. "Connect WhatsApp" is the unambiguous primary action. The three-step explanation reads top-to-bottom without friction.

### Copy + Tone
The tagline "Every chapter of your life, and the people you lived it with." is the best line in the app — memoir language, not product language. The bridge line "Our lives happen in conversations with our people." holds the register. The three step labels slip: "Loop maps the chapters of your life" and "Your people, still in every chapter" are feature bullets dressed as emotional priming — a new user doesn't know what "chapter" means yet and these don't help them feel anything about it. "Your messages never leave your Mac." earns trust without sounding defensive.

### Emotional Resonance
The serif italic tagline sets a nostalgic, intimate tone. The broken logo mark — `loop-mark.svg` fails to load in preview mode, showing a gray placeholder rectangle — immediately undercuts it. A memory app whose first visual is a broken image box cannot land its emotional promise. Below that, the numbered circles look like a SaaS product walkthrough, which is exactly the register Loop is trying to avoid.

**Severity:** P0
**Finding:** Broken logo mark is the app's first visual impression. Combined with procedural 3-step copy, the welcome screen opens on product rather than feeling.

---

## Your Loops — Empty State (no chapters)
**Reached via:** state.json — onboardingComplete: true, chapterDetectionComplete: true, chapters: []
**Screenshot:** /tmp/loop-yourloops-empty.png

### Clarity
Two messages compete directly on screen. The QuietDayCard says "A quiet day. / Your people are close." The body below says "No chapters yet. / Connect WhatsApp to discover your loops." These contradict each other: the user is told simultaneously that their people are close and that no people have been added yet.

### Copy + Tone
"No chapters yet. Connect WhatsApp to discover your loops." is functional. "Your people are close." when no people have been loaded is false — it reads as a placeholder that was never conditioned on state.

### Emotional Resonance
None. The contradiction kills any warmth the QuietDayCard might otherwise earn. A user who completed onboarding but whose chapter detection yielded nothing lands here and receives two messages that do not add up.

**Severity:** P0
**Finding:** QuietDayCard renders unconditionally and says "Your people are close" when no chapters or contacts exist — the most prominent copy on screen is a false statement.

---

## Your Loops — With Chapters
**Reached via:** state.json — onboardingComplete: true, chapterDetectionComplete: true, stayCloseComplete: true, four seeded chapters
**Screenshot:** /tmp/loop-yourloops-chapters.png

### Clarity
The atom orbit visualization is immediately distinctive. Chapter names read cleanly beneath each nucleus. The first-time user may not know that each atom is tappable — there is no affordance label — but hover state and cursor change handle this reasonably on desktop.

### Copy + Tone
The QuietDayCard here shows "A quiet day. / Your people are close." — semantically accurate when chapters exist and nothing is urgent. But it doesn't do emotional work. It occupies the most prominent position above the atoms on every calm visit and says: nothing has changed. A line that gestures at the lives contained in those orbiting electrons would be stronger.

### Emotional Resonance
The atom visualizations are the strongest emotional beat in the app. Each orbiting dot is a person; the orbital speed differential between active and fading chapters is subtle and beautiful. The screen achieves the "old photo album" register when populated. The QuietDayCard above the atoms is ambient at best.

**Severity:** P1
**Finding:** QuietDayCard copy "A quiet day. Your people are close." is emotionally inert — it occupies prime real estate above the atoms without earning it.

---

## Chapter Inference Screen
**Reached via:** evaluated from code (requires WhatsApp connected + chapterDetectionComplete: false; not reachable via state.json alone)
**Screenshot:** n/a — code review

### Clarity
Loading state: "Reading your groups…" in italic serif. Results: large serif headline "Loop found your chapters", body "These are the chapters of your life, read from your conversations. Confirm the ones that feel right." Chapter cards in a 2-column grid — each shows chapter name in serif, year range pills, "Ongoing" badge where applicable, and a member avatar stack. Fixed CTA bar at bottom: "These are my chapters (N)" / "Not quite right". Step indicator: "Step 2 of 5."

### Copy + Tone
"Loop found your chapters" is a strong declarative — confident, slightly magical, right register. "Confirm the ones that feel right" respects the user's authority over their own memory. "These are my chapters (N)" is possessive and warm. "Not quite right" as the ghost dismiss is non-alarming. The empty-state body "No chapters detected yet. Your groups may not have enough history, or WhatsApp may still be loading." is accurate but surfaces implementation detail ("WhatsApp may still be loading"). "Step 2 of 5" turns the most emotional reveal in the onboarding into a process step.

### Emotional Resonance
This is the reveal moment — the first time the app shows the user their own life back to them. The card design (serif name, year pills, avatar stack) feels like artifacts rather than data. The screen earns the moment. "Step 2 of 5" deflates it.

**Severity:** P1
**Finding:** "Step 2 of 5" turns the emotional reveal of a person's life chapters into a form step; empty-state copy exposes implementation detail.

---

## Chapter Naming Screen
**Reached via:** evaluated from code (only reachable from onboarding flow after CrewDetection, for unconfirmed chapters)
**Screenshot:** n/a — code review

### Clarity
Centered layout: progress indicator ("1 of N"), avatar stack of detected members, heading "What do you call this chapter?", serif centered input with the detected name pre-filled, "This looks right" CTA, "Skip for now" link. Single focused action.

### Copy + Tone
"What do you call this chapter?" is the right question — personal, acknowledges the name belongs to the user not the app. The input uses 22px centered serif, giving naming a chapter the right visual weight. "This looks right" as a CTA is slightly off: it invites the user to evaluate the name they just typed rather than confirm it. Sub-label shows "X people, ongoing/closed" — purely functional metadata under the most personal prompt in the onboarding.

### Emotional Resonance
Naming a life chapter deserves exactly this treatment: a blank input, a question, no distractions. It mostly lands. Would be stronger if the sub-label surfaced something human rather than a member count.

**Severity:** P2
**Finding:** "This looks right" misfires as a confirmation CTA — the user just typed the name, the button should confirm ("Name it" or "Save it"), not evaluate.

---

## Crew Detection Screen
**Reached via:** evaluated from code (only reachable from onboarding, after Chapter Inference)
**Screenshot:** n/a — code review

### Clarity
Three-step sub-flow: permission gate → group-to-chapter assignment → crew confirmation grid. Each step has a single primary action. The group assignment step (step 1) is the most cognitively demanding — mapping WhatsApp groups to chapters requires the user to hold both in mind at once.

### Copy + Tone
Step 0 eyebrow: "Your crew" — the word "crew" is the only piece of developer/startup vocabulary that surfaces visibly in the UI copy. Step 2 heading: "Your crew." — appears again as a full section title. Everywhere else in the app the language is "your people." These two appearances of "crew" create a register inconsistency: it sounds like a Discord server, not a connection app. Step 2 instruction: "Tap anyone to remove them." — this is a desktop app; "Click" is correct.

### Emotional Resonance
"Your people are already in your groups." (Step 0 headline) is warm. "ready to tend to" in the body is good — "tend to" has a gardener quality that suits Loop. The avatar grid of people in Step 2 is visual and personal. "Your crew." as the headline cheapens it.

**Severity:** P1
**Finding:** "crew" appears twice in UI headings and conflicts with "your people" language used everywhere else; "Tap anyone" should be "Click anyone" on desktop.

---

## Stay Close Screen
**Reached via:** evaluated from code (only reachable from onboarding flow after Chapter Naming)
**Screenshot:** n/a — code review

### Clarity
Three-step flow: Intent (full-screen question) → Picker (search + contact list) → Confirm (avatar gallery + CTA). Single action per step. Logical progression.

### Copy + Tone
"Who do you want to stay close to?" is one of the best lines in the app — direct, intimate, does not sound like a CRM. "Pick a few people you care about. Loop will gently remind you if it has been a while." — "gently remind" is right; "if it has been a while" is natural. Picker step search placeholder: "Search contacts..." — "contacts" is the one word that breaks the register, importing address-book language into a screen about people you love. Confirm step: "You've chosen X people." is slightly formal. "Loop will check in if it has been a while since you last spoke. No pressure. Just a gentle nudge." is warm and appropriate. "Let's go" CTA is perfect.

### Emotional Resonance
The intent step — a single question, full screen — gives the act of choosing who matters the right weight. The confirm step's avatar gallery (faces above first names) is personal and warm. Overall arc of the flow is strong.

**Severity:** P1
**Finding:** "Search contacts..." leaks CRM language into a screen whose headline asks "Who do you want to stay close to?" — one word undercuts the register.

---

## Email Capture Screen
**Reached via:** evaluated from code (only reachable from onboarding flow after Crew Detection)
**Screenshot:** n/a — code review

### Clarity
Centered form: "One last thing." heading, subhead explaining the ask, first name + email fields, "Sure" CTA, "Skip for now" link. Step indicator: "Step 5 of 5." Purpose is clear.

### Copy + Tone
"One last thing." is casual and low-pressure. The subhead "Where should we reach you if Loop finds something worth sharing?" sounds like opt-in marketing copy rather than a personal conversation — Loop has spent the last four steps building an intimate relationship and this reads as a newsletter signup. The CTA "Sure" is too casual for a data handover — it reads as a shrug. "Skip for now" is better than "Skip." "Step 5 of 5" continues the form-filling frame into what should feel like the end of an intimate journey.

### Emotional Resonance
After mapping life chapters, naming crews, and declaring who you care about, landing on what reads as a newsletter opt-in is a register drop. The subhead doesn't explain what Loop would share or why the email matters to the user's experience.

**Severity:** P1
**Finding:** Email capture subhead reads as marketing opt-in after an intimate onboarding — tone drops sharply, and "Sure" as a primary CTA for personal data handover doesn't inspire confidence.

---

## Chapter Detail Screen
**Reached via:** evaluated from code (tapping a chapter atom from Your Loops)
**Screenshot:** n/a — code review

### Clarity
Full-bleed cover with gradient overlay, chapter name in large serif, year range in uppercase small-caps, sub-label "X people · Y fading." "Crew" section with avatar grid. "Moments" section with empty film strip placeholder. For unconfirmed chapters: a banner "Give this chapter a name that feels like yours." with a "Name it" button.

### Copy + Tone
"Give this chapter a name that feels like yours." is some of the best copy in the app — specifically the word "yours" claims ownership in exactly the right way. The sub-label "Y fading" is where it weakens: "fading" is the internal state name from code and while evocative, it appears without context — a user seeing "3 fading" beneath a chapter they cherish may feel alarmed. The "Name it" button triggers `window.prompt()` — a native macOS gray system alert dialog, completely outside Loop's visual language. This is the most jarring brand break in the product: naming a life chapter is routed through an OS-level text input.

### Emotional Resonance
The full-bleed cover photo with warm gradient and serif chapter name glowing at the bottom is the strongest visual in the app — it does feel like opening an album to a bookmarked page. The crew grid is warm. The "Moments" section (always showing "Moments from this chapter will appear here.") is a consistently anticlimactic landing point at the bottom of a rich screen.

**Severity:** P0
**Finding:** `window.prompt()` for chapter rename is a native OS alert box — gray system dialog mid-brand break for naming a life memory. This is the hardest emotional rupture in the entire app.

---

## Story Screen
**Reached via:** evaluated from code (tapping a crew member from Chapter Detail)
**Screenshot:** n/a — code review

### Clarity
Top bar: back + "Open WhatsApp" ghost button. Hero: 88px avatar, person name in 38px serif, "Last contact: {relative time}", chapter tags. Italic warm observation in terracotta accent box (reasonToReachOut). "Your story together" section header. Timeline of 2–3 context lines with dot-and-line visual connector.

### Copy + Tone
"Your story together" is perfect — possessive, the word "story" is right, the word "together" makes it mutual. The italic terracotta observation (reasonToReachOut) is the most emotionally intelligent piece in the app: context about a person surfaced as a warm thought, not a task prompt. Timeline labels "Recently" and "Earlier" are natural. The problem phrases: "Last contact: Never recorded" — "Never recorded" is database language; "Last contact" is a CRM field label. In the empty story state: "Still coming together." is acceptable but "Run a scan to let Loop read your conversation history." is engineering language. The variable name `brief` is used for the Story data type internally throughout the codebase — confirmed NOT visible in any user-facing UI copy. "Your story together" is the displayed section header, not "brief." This debt has been addressed.

### Emotional Resonance
The Story screen has the highest ceiling of any screen in the app. When reasonToReachOut is populated, the screen achieves something rare: a reason to reach out that feels like it came from memory rather than an algorithm. "Open WhatsApp" is well-placed — present when ready, not pushing. "Last contact: Never recorded" and "Run a scan" crash the register hard in the two states where the screen is most likely to disappoint.

**Severity:** P1
**Finding:** "Last contact: Never recorded" and "Run a scan" are the two most technically-voiced phrases in the app; they appear precisely in the screen with the highest emotional ceiling.

---

## Settings Screen
**Reached via:** evaluated from code (Settings gear icon from Your Loops)
**Screenshot:** n/a — code review

### Clarity
Well-organized sections: WhatsApp, Invite your chapters, People, Data. Each section uses a card. WhatsApp status is clear. People list shows each person with last-spoke sub-label and remove icon. Data section shows folder path and delete option.

### Copy + Tone
Page subtitle "How Loop listens, and who it listens for." reframes settings as attention rather than configuration — warm and original. WhatsApp disconnected state: "Not connected. Loop can only remember what it can see." — "what it can see" implies surveillance, the opposite of the trust register Loop is building. People footnote "Removing someone only removes them from Loop. Your actual conversations are never touched." — excellent, needed, reassuring. Delete dialog: "This clears every person, chapter, and memory Loop holds. It can't be undone. Your actual conversations aren't touched." — compassionate and clear. Invite section: "Invite the people from your chapters to close the loop." — "close the loop" is a business idiom that collides with the product name and the emotional register. Share message: "It quietly reminds you who you've drifted from." — "drifted from" has genuine emotional weight, keep it.

### Emotional Resonance
Settings is expected to be functional. Loop's version achieves warmth through copy more than visual design. The People section showing each person with time-since-contact is a quiet reminder of who matters — settings list turned into an ambient signal. The delete dialog is handled with genuine compassion.

**Severity:** P1
**Finding:** "Invite the people from your chapters to close the loop" uses a business idiom that breaks the intimate register; "Loop can only remember what it can see" implies surveillance.

---

## NudgeCard
**Reached via:** evaluated from code (appears on Your Loops when a Close contact is overdue)
**Screenshot:** n/a — code review

### Clarity
Card with avatar initials, person name, nudge text, two actions. Compact and unmissable in position. Primary action: "Message on WhatsApp." Secondary: "Dismiss."

### Copy + Tone
The nudge text template produces: "You've been quiet with {firstName}. Worth a message." — this is excellent. Observational rather than imperative. Frames the gap as the user's quietness (honest, personal) not the other person's failure. "Worth a message" is perfectly calibrated: suggests without demanding.

"Message on WhatsApp" as CTA goes directly to `window.loop.shell.openWhatsApp(nudgeContact.whatsappId)` — straight into a WhatsApp chat, bypassing the Story screen. The user gets nudged, taps the CTA, and opens a chat without seeing the context (recent topics, reason to reach out) that Story provides. The nudge is most powerful when it gives you a reason to reach out, not just a reminder to do so. That reason lives in Story.

### Emotional Resonance
The card itself is a gentle tap on the shoulder. The warm observational copy lands. The missing Story step on the CTA means the user reaches out without the warmth the app spent effort building to support exactly this moment.

**Severity:** P1
**Finding:** "Message on WhatsApp" bypasses the Story screen — the user reaches out without the contextual warm-up Loop specifically built to make that message feel considered, not obligatory.

---

## QuietDayCard
**Reached via:** visible in screenshots (renders whenever no NudgeCard or DeadThreadCard is showing)
**Screenshot:** visible in /tmp/loop-yourloops-empty.png and /tmp/loop-yourloops-chapters.png

### Clarity
Two states: quiet-day (no chapter moment) shows "A quiet day." + "Your people are close." Chapter-moment state (when echoChapter is present) shows "{N} years ago / {chapterName} started. / Your people from that chapter are still close." — tappable, opens the Echo card. The card always renders when no urgent signal is present, including when chapters: [] is empty.

### Copy + Tone
"A quiet day." is poetic but incomplete as a standalone. "Your people are close." when no contacts exist is false. When contacts DO exist and all is well, "Your people are close" is a reassurance without specificity. The chapter-moment variant is much stronger: "Casa Mañana started. / Your people from that chapter are still close." has the specificity that earns warmth.

### Emotional Resonance
The chapter-moment state is genuinely touching. The plain quiet-day state is ambient at best, misleading at worst. The card occupies the most prominent position on the home screen on every calm visit and deserves copy that earns that position even when there is no anniversary to surface.

**Severity:** P1
**Finding:** Quiet-day copy "A quiet day. Your people are close." is too vague to create warmth and actively misleads when rendered with no chapters loaded.

---

## DeadThreadCard
**Reached via:** evaluated from code (appears when a contact has a dead-thread occasion)
**Screenshot:** n/a — code review

### Clarity
Eyebrow: "The thread is resting." Person name. Body: "Still quiet from {firstName}. No rush." CTAs: "Try again" (primary) and "Let it rest" (ghost).

### Copy + Tone
"The thread is resting" is the best eyebrow label in the app — it names the silence without judgment. "Still quiet from {firstName}. No rush." is pitch-perfect: acknowledges non-reply without blame, releases anxiety with "No rush." "Let it rest" matches the eyebrow perfectly. "Try again" is the one blunt word in an otherwise carefully calibrated card — "Reach out again" would hold the register.

### Emotional Resonance
This card handles one of the most emotionally delicate moments (someone didn't reply) with exceptional care. Non-judgmental, non-pressuring, two valid paths without favoring either. The most emotionally intelligent card in the codebase.

**Severity:** P2
**Finding:** "Try again" is the one functional word in an otherwise beautifully calibrated card — "Reach out again" would preserve the register.

---

## Known Design Debt — Status Check

| Item | Status | Detail |
|---|---|---|
| "Brief" in UI copy | CLEAR | `brief` is a variable name only. Story screen displays "Your story together." No user-visible leak. |
| "Crew Detection" in UI | PARTIAL | The screen file is named CrewDetectionScreen.tsx but the visible eyebrow reads "Your crew" — developer name not exposed. However "crew" appears twice in headings (Step 0 eyebrow + Step 2 H1) and conflicts with "your people" register. |
| "A quiet day. Your people are close." | ISSUE | Appropriate when chapters exist and no signals. Misleading (false) when chapters: []. Card needs a guard or different copy for the zero-chapters state. |
| Chapter naming feels like a form | MIXED | ChapterNamingScreen (onboarding) is well designed — centered serif input, right question. ChapterDetailScreen inline rename uses `window.prompt()` — P0 brand break. Two very different experiences for the same action. |
| Nudge CTA destination | ISSUE | "Message on WhatsApp" goes directly to WhatsApp, bypassing Story. This is the unresolved "On your mind" CTA design question from the open design topics list. |
| Productivity-app language | MULTIPLE | "Search contacts..." (Stay Close picker), "Run a scan" (Story empty), "Last contact: Never recorded" (Story), "Step X of 5" (onboarding multiple), "close the loop" (Settings invite). |

---

## Summary

**P0 findings: 3**
**P1 findings: 9**
**P2 findings: 2**

### Top 5 issues ranked by severity

**1. P0 — window.prompt() for chapter rename (ChapterDetailScreen)**
The moment of naming a life chapter is the most emotionally charged user action in the app. It currently opens a native macOS gray system alert box. Fix: replace with a styled in-context input, matching the ChapterNamingScreen treatment.

**2. P0 — QuietDayCard "Your people are close" renders with chapters: [] (Your Loops empty state)**
The most prominent copy on the home screen is a false statement when no chapters have been loaded. Fix: gate the quiet-day copy behind `chapters.length > 0`; provide a separate zero-state variant.

**3. P0 — Broken logo mark on Welcome screen**
`loop-mark.svg` fails to load in preview build. A gray placeholder rectangle is the app's first visual impression. Fix: verify asset path in preview build, or use an inline SVG fallback.

**4. P1 — NudgeCard "Message on WhatsApp" bypasses the Story screen**
The primary action on the most important signal card opens a WhatsApp chat without the contextual story that makes that reach-out feel considered. This is the open "On your mind CTA + Brief framing" design question. Fix: CTA should open Story screen; Story screen carries the "Open WhatsApp" action.

**5. P1 — "Last contact: Never recorded" + "Run a scan" on Story screen**
Two technically-voiced phrases in the screen with the highest emotional ceiling. Fix: "Last contact" → "Last spoke"; "Never recorded" → "No history yet" or omit; "Run a scan" → "Let Loop read your conversations."

### Overall design readiness
The visual language is distinctive and consistent. The atom metaphor is original and earned. Several moments — DeadThreadCard, ChapterNamingScreen, the Story screen when populated, the Chapter Detail cover header — achieve genuine emotional resonance. The three P0 issues and the cluster of productivity-app language in key microcopy positions prevent a green light. The `window.prompt()` fix and the QuietDayCard false-state fix are both small-effort, high-impact: fix those two before any external user sees the app.
