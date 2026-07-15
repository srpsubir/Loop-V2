# Design Research: Story Screen + Draft Message
## MAV-207 (Story / "Their world") + MAV-214 (Draft message suggestion)
Research date: 2026-07-04

---

## MAV-207: Story screen / "Their world"

### Search 1: "contact detail reach out reminder single person view"

**1. Amie**
[https://mobbin.com/screens/cec3e6e3-a0b0-484f-b3e5-fd49177931d9](https://mobbin.com/screens/cec3e6e3-a0b0-484f-b3e5-fd49177931d9)
Single person view: avatar + name in accent color at top, then two stat tiles (Birthday / Together count) as pill-cards in a 2-column grid, then a bottom sheet triggered by action with "Catch-up reminder" heading and four frequency options (Weekly / Monthly / Quarterly / Yearly). The "reason to act" is structural rather than textual: Amie shows the data (birthday in X days, 0 times together) and trusts the user to draw the conclusion. The reminder bottom sheet is the call to action.
Pattern: data-tiles + bottom sheet frequency picker. Reason text is implicit, not explicit.

**2. Microsoft Outlook contact detail**
[https://mobbin.com/screens/59d25a1f-6afc-4ff4-aef6-3c2988c40c48](https://mobbin.com/screens/59d25a1f-6afc-4ff4-aef6-3c2988c40c48)
Contact detail: avatar + name at top, contact info rows below, then grouped sections (Email preview card, Events, Files). The recent email shows as a condensed card with sender, subject, and first-line preview. Useful structural reference: identity band at top, then signals as grouped sections scrolling below.
Pattern: identity header + signal sections in a scrollable list. No "reason" text layer at all.

**3. Insight Timer person profile**
[https://mobbin.com/screens/a34514dc-aad8-4524-b618-9845c07ac9da](https://mobbin.com/screens/a34514dc-aad8-4524-b618-9845c07ac9da)
Teacher profile with a full-bleed hero photo, name overlaid in large white text at the bottom of the photo, then a bottom sheet with action rows (Message Teacher / Share profile / Unfollow). Very image-forward, actions in a drawer.
Pattern: hero photo + action drawer. Too social-media-adjacent for Loop's intimate register.

---

### Search 2: "relationship memory journal person profile emotional keepsake"

**1. Replika person profile**
[https://mobbin.com/screens/fbf139db-9de7-4c66-8e46-3d6dce83058d](https://mobbin.com/screens/fbf139db-9de7-4c66-8e46-3d6dce83058d)
Person profile on a warm dark background: name in large serif at top, relationship-type selector chips below (Friend / Girlfriend / Wife / Sister), then stacked sections with chevrons: Memories (text snippet), Diary (dated entry with photo thumbnail), Traits. The section headers are bold sans uppercase, content previews sit inside soft-edged cards. Most emotionally resonant result in the search.
Pattern: name header + relationship context chips + stacked content sections. The Memories section is a direct analog to Loop's "recent signal" summary.

**2. Paired timeline**
[https://mobbin.com/screens/cff70a87-9e24-466e-b968-73d55b09004f](https://mobbin.com/screens/cff70a87-9e24-466e-b968-73d55b09004f)
Relationship timeline with dated memory cards in a vertical list ("Mexico adventures / 10 photos", "Birthday party / 20 photos"). A tooltip prompt is overlaid: "Your turn! Add your favorite relationship memory — Memories you add to your timeline are only shared with Alex Smith." The prompt copy is warm and second-person, shown in a floating tooltip card with a close button.
Pattern: the prompt/nudge text lives in a floating tooltip, not in the hero area. Useful contrast: Loop's reasonToReachOut should be more prominent than a tooltip.

**3. Paired "Us" dashboard**
[https://mobbin.com/screens/ead9d328-8e5a-446f-8d8b-7dc79d2a44df](https://mobbin.com/screens/ead9d328-8e5a-446f-8d8b-7dc79d2a44df)
Dashboard showing joint stats: "Together for X years / months / days", activity metrics (conversations answered, streak days, games won) in a comparison table with avatar indicators per row, then "Your Special Dates" section. Very data-rich, couples-focused. Too symmetric/mutual for Loop's one-sided reach-out view.
Pattern: stat tiles + activity table. Not directly applicable but the "Together for" counter is a nice precedent for "You two haven't talked in X weeks."

---

### Search 3: Flow — "nudge reminder reach out reconnect friend prompt"

**1. Duolingo: Nudging a friend**
[https://mobbin.com/flows/bf4b176e-56c4-49c9-b6f5-3400d17885d4](https://mobbin.com/flows/bf4b176e-56c4-49c9-b6f5-3400d17885d4)
3-screen flow: Friend Streaks list (name + streak count + "NUDGE" chip) → bottom sheet "Nudge Jane" with pre-written message options as chips (emoji-led: sticker options) + "SEND TO JANE" CTA button → confirmation state (chip changes to "NUDGED" grayed out). The nudge reason is embedded in the pre-written message ("A real friend honors their Friend Streak!"). The reason is gamified, not personal.
Key insight: the chip-to-nudge-to-send flow is fast and feels low-friction. The "send a message" moment is the same thing Loop wants to do. But the reason is mechanical, not emotional.

**2. How We Feel: Nudging a friend**
[https://mobbin.com/flows/3c4e15a2-3e75-48b5-87d7-7725e285647e](https://mobbin.com/flows/3c4e15a2-3e75-48b5-87d7-7725e285647e)
2-screen flow: Friends list where each card shows status ("I'm feeling focused" / "Joshua feels apathetic" / "Jessica / Hasn't shared recently"). The third card has a "Nudge" chip inline and no mood update. After nudging: card updates to "Nudged just now" confirmation state. No intermediate screen.
Key insight: the reason text "Hasn't shared recently" lives inline on the list card as a subtitle, not as a separate detail screen. For Loop's Story screen this is the analog of showing the lapsed contact reason right in the entry point.

**3. Paired: Nudging a partner**
[https://mobbin.com/flows/41602562-017d-4576-adc5-381b67c0e136](https://mobbin.com/flows/41602562-017d-4576-adc5-381b67c0e136)
3-screen flow: complete a shared Q&A → "Nice work, Sam! Waiting for Alex Smith to answer." status message → "Nudge Alex Smith" CTA becomes active (large button) → tapping it sends a nudge and the button grays. The nudge here is a follow-up to content, not a standalone prompt.
Key insight: the nudge CTA becomes the primary action after context is established. Loop should mirror this: reason text first, CTA after.

---

### MAV-207: 3-Bullet Design Spec

**1. Hierarchy.** The `reasonToReachOut` string is the entry point to the entire screen. It belongs at the very top of the content area, above the person's identity. Not a subtitle under the name. Not a section header. The first thing a user reads when they open this screen should be the reason they are here. Below the reason: avatar (64px) + name in bold sans + connection label (e.g., "close friend" or crew name). Below identity: a compact signal row (icon + "Last contact: 3 weeks ago", icon + "14 messages this year"). CTA pinned to the bottom of the window.

**2. Typography treatment.** reasonToReachOut: Georgia or Lora, italic, 20pt, color #7A4535 (darker warm brown, not the full terracotta accent). 2 line max with ellipsis on overflow. Person name: Inter Semi-Bold, 18pt, #2A1A14 (near-black warm). Signal metadata: Inter Regular, 12pt, #9C7A6E (muted warm mid-tone). CTA button: Inter Medium, 15pt, white on #B8624A. No decorative icons in the reason area. Text alone carries the weight.

**3. Component structure.** (A) Reason card: off-white (#F4E7E2) rounded-12 panel, 16px padding, sits flush with the window top margin. Contains only the italic reason text. (B) Identity row: avatar circle + name + connection label, horizontal. (C) Signal row: two lines, each with a small circle-icon prefix (calendar for last contact, chat bubble for message count). (D) If draftMessage is present: suggestion card between signal row and CTA (see MAV-214 spec). (E) "Message on WhatsApp" button: full-width, 52px tall, rounded-8, sticky to window bottom. Inspired by: Amie's stat approach for signals, How We Feel's inline reason-as-subtitle, Replika's stacked section structure.

---

## MAV-214: Draft message suggestion

### Search 4: "suggested message draft quick reply pre-written starter"

**1. Bolt: Suggested replies**
[https://mobbin.com/screens/371ce83e-ec3b-4268-92f2-2fb17a3afcf2](https://mobbin.com/screens/371ce83e-ec3b-4268-92f2-2fb17a3afcf2)
Chat screen with "Suggested replies" label (small, medium-weight sans, dark) followed by a horizontal row of pill chips: emoji chip, "I'm here" chip, "I'm on my way" chip, "Where are you?" chip. Chips are small (32px tall), pill-shaped, light gray background. Selecting a chip fills the composer. Label + chips sit above the keyboard.
Visual differentiation: explicit label + pill chips. Subtle. Easy to ignore. Not suitable for a draft that needs to be seen.

**2. Gojek: Quick chat drawer**
[https://mobbin.com/screens/fc6f84fa-d32f-4b30-89af-45f83503b228](https://mobbin.com/screens/fc6f84fa-d32f-4b30-89af-45f83503b228)
"Quick chat" bottom drawer with full-width rows (icon + text). Not chips, not a card. More prominent because the full-width row makes the text readable. An arrow icon on the side sends directly. Also has "Save messages (1/2)" row at bottom indicating editability.
Visual differentiation: labeled drawer with full-width readable rows. Better for longer strings like Loop's draft message.

**3. Grab Driver: Quick reply list**
[https://mobbin.com/screens/8309d0d4-916e-44fc-90a9-665eb1e2f9a2](https://mobbin.com/screens/8309d0d4-916e-44fc-90a9-665eb1e2f9a2)
Plain text rows below the composer: "OK / Hello, I'm here / I'll be there in a few mins / Sorry, I'm stuck in traffic". No icons, no chips, no labels. Extremely minimal. "Add a quick reply (3/3 left)" at the bottom confirms these are editable slots.
Visual differentiation: none beyond position. Too minimal for a one-shot suggestion that might be missed.

---

### Search 5: "message suggestion draft copy inline card chip" (web sections)

**1. folk: Templates by category**
[https://mobbin.com/sites/sections/4829eafe-3c16-415b-9f44-d6d9d097e783](https://mobbin.com/sites/sections/4829eafe-3c16-415b-9f44-d6d9d097e783)
Email template gallery: each template shown as a white card with FROM label, bold subject line, and body text preview. Categories visually scannable. This is a template library, not inline suggestion, but the card-as-readable-draft pattern is directly applicable: the full message text lives inside the card so you can read it before using it.
Pattern insight: the draft should be fully readable in place. Not a truncated chip. A card with the complete text.

**2. Notion: Inline snippet autocomplete**
[https://mobbin.com/sites/sections/09e2269d-3adb-45c4-b6e3-d5067dff9748](https://mobbin.com/sites/sections/09e2269d-3adb-45c4-b6e3-d5067dff9748)
Email composer with floating autocomplete dropdown triggered by typing "/". Shows snippet text with "Insert" and keyboard shortcuts. Ghost-text autocomplete pattern.
Pattern insight: autocomplete/ghost text only works in an active composer. Loop's draft suggestion lives before the user opens WhatsApp, so this pattern doesn't apply directly.

**3. Grammarly: Text snippets**
[https://mobbin.com/sites/sections/8189efeb-4ccf-4781-a418-d4cada4f0ae6](https://mobbin.com/sites/sections/8189efeb-4ccf-4781-a418-d4cada4f0ae6)
Text snippet expanding inline in a message field as the user types. Keyboard navigation (Navigate / Insert / Return / Close / Esc). Very composer-native.
Pattern insight: same limitation as Notion. Composer-native pattern won't work for Loop's pre-compose suggestion card.

---

### MAV-214: 3-Bullet Design Spec

**1. Hierarchy.** The draft suggestion is a secondary card that appears only when `draftMessage` is set. It sits between the signal row and the CTA button. It is not the most prominent element on the screen. The reason text still dominates. The draft card is a convenience layer, not the hero: "here is something you could send."

**2. Visual differentiation.** The card should feel handwritten/composed, not mechanical. Use a slightly inset background (#EDD8D2, one step warmer/darker than the page ground #F4E7E2) with a 1px inner border (#D4A898). Rounded-8 corners, 14px padding. Small ALL-CAPS label at the top: "SUGGESTED OPENING" in Inter Regular 10pt, #9C7A6E (muted). Draft text below in the same serif italic as reasonToReachOut but smaller (16pt) and in #2A1A14 (near-black, not warm-brown, to signal it is editable content not a system voice). In the top-right: a copy icon (16px, muted terracotta). No Edit button: tapping anywhere on the card copies to clipboard and shows a brief "Copied" toast. Do not pre-fill a composer.

**3. Affordance.** Single interaction: tap card copies the text. No second tap, no modal. The user takes it to WhatsApp themselves. This keeps Loop out of the message-sending flow and avoids any feeling that Loop is composing messages on the user's behalf. If the user wants to edit before sending, they paste into WhatsApp and edit there. This mirrors the folk template card pattern (read it in full, use it as-is or modify it) and avoids the friction of an in-app composer. The chip/pill pattern from Bolt is explicitly wrong here: the draft is too long for a chip and too important to be scannable only.

---

## Do Not Generate (block in MP prompt)

- Phone frames (iOS, Android) of any kind. Loop is a 960px wide macOS desktop window.
- Dark mode / OLED black backgrounds. The ground is #F4E7E2 warm off-white.
- Chat bubble UI (the draft card is not a message thread).
- Gamified elements: streaks, XP bars, trophy icons, green flames.
- Productivity chrome: sidebar navigation, task checkboxes, project tabs, Kanban columns.
- Feed/timeline structures: vertical list of multiple people cards. This screen is single-person only.
- Social media profile patterns: follower counts, public stats, "Follow" buttons.
- Bottom navigation tab bars.
- Any illustration style that is cartoonish or vector-character (Duolingo owl register is wrong).

---

## Magic Patterns Prompt: MAV-207 Story Screen Redesign

Paste into Magic Patterns as a new artifact prompt:

---

Design a macOS desktop app screen at 960px wide. This is "Their world" (also called the Story screen) for Loop, a personal relationship companion app. The app has a warm, intimate emotional register similar to Day One or Bear. Do not use phone frames.

**Color palette:**
- Background ground: #F4E7E2 (warm off-white)
- Accent / CTA: #B8624A (deep terracotta)
- Reason text: #7A4535 (darker warm brown)
- Body text / headings: #2A1A14 (near-black warm)
- Muted metadata: #9C7A6E
- Card inset (draft suggestion): #EDD8D2
- Card border (draft suggestion): #D4A898

**Typography:**
- Reason text: Georgia or Lora, italic, 20pt
- Person name: Inter Semi-Bold, 18pt
- Section metadata: Inter Regular, 12pt
- Draft card label: Inter Regular, 10pt, ALL-CAPS
- Draft card body: Georgia or Lora, italic, 16pt
- CTA button label: Inter Medium, 15pt, white

**Layout — top to bottom:**
1. Window chrome: standard macOS title bar (translucent), back chevron at left, screen title "Their world" centered, 3-dot overflow at right.
2. Reason card: full-width, rounded-12, #F4E7E2 background with 1px border #D4A898, 16px padding. Contains only italic serif reason text: "Her birthday is in 2 days. Good time to reach out." No icons. Sits at top of scrollable content area.
3. Identity row: 64px avatar circle (warm terracotta placeholder initial), person name in semi-bold 18pt, below it a small connection label ("Close friend") in muted 12pt.
4. Signal row: two lines with small circle-icon prefix. Line 1: calendar icon + "Last contact: 3 weeks ago". Line 2: chat bubble icon + "14 messages this year". Both in muted 12pt.
5. Draft suggestion card (conditional): inset card (#EDD8D2 background, 1px #D4A898 border, rounded-8, 14px padding). Top-left: "SUGGESTED OPENING" in 10pt ALL-CAPS muted label. Top-right: small copy/document icon in muted terracotta. Card body: italic serif 16pt in near-black: "Happy birthday Alice! Hope you have an amazing day." Full text visible, no truncation.
6. CTA button: full-width, 52px tall, rounded-8, #B8624A fill. Label: "Message on WhatsApp" in Inter Medium 15pt white. Pinned to bottom of window, 20px margin from edge.

**Do not generate:**
- Phone frames or mobile UI
- Dark backgrounds
- Chat bubble threads
- Sidebar navigation
- Feed or list of multiple people
- Gamified elements (streaks, badges, flames)
- Any illustration or cartoon characters

**Generate two variants:**
A. With draft suggestion card visible (draftMessage populated)
B. Without draft suggestion card (draftMessage is null — signal row leads directly to CTA)

Sign-off gate: Please show both variants for review before any screen code is written locally.
