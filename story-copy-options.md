# Story screen copy options
## reasonToReachOut + draftMessage, by trigger scenario
Pick a number per scenario. [Name] = contact's first name, N = the number.

---

## 1. Birthday today

**reasonToReachOut**
1. "Today is her birthday. The best day to reach out."
2. "It's his birthday today. Even a short message counts."
3. "Her birthday is today. Say something."

**draftMessage**
1. "Happy birthday [Name]! Hope you have an amazing day."
2. "Happy birthday! Thinking of you today."
3. "Happy birthday [Name]. Hope it's a great one."

---

## 2. Birthday tomorrow

**reasonToReachOut**
1. "Her birthday is tomorrow. A day early always feels thoughtful."
2. "His birthday is tomorrow. Good time to reach out."
3. "Tomorrow is her birthday. Worth sending something today."

**draftMessage**
1. "Hey [Name], just wanted to say happy birthday a little early!"
2. "Happy early birthday [Name]! Hope tomorrow's a good one."
3. "Thinking of you ahead of your birthday tomorrow, [Name]!"

---

## 3. Birthday in N days (e.g. 5 days, 2 weeks)

**reasonToReachOut**
1. "Her birthday is in N days. Good time to reach out."
2. "His birthday is coming up in N days."
3. "N days until her birthday. A good reason to check in."

**draftMessage**
*(User will send before the birthday, so draft is a general check-in)*
1. "Hey [Name], been meaning to catch up. How are things going?"
2. "Hi [Name]! Just thinking about you. How have you been?"
3. "Hey [Name]! What's new with you?"

---

## 4. Interval overdue, short gap (days, e.g. 5 days)

*Fires when a close contact hasn't heard from you for longer than their set interval.*

**reasonToReachOut**
1. "It's been N days. A little longer than usual for you two."
2. "You two usually talk more often. Worth a quick message."
3. "N days since you spoke. Worth a check-in."

**draftMessage**
1. "Hey [Name], how's it going?"
2. "Hi [Name]! Just checking in. How have you been?"
3. "Hey [Name]! What's new with you?"

---

## 5. Interval overdue, weeks (e.g. 3 weeks)

**reasonToReachOut**
1. "It's been N weeks. Longer than usual for you two."
2. "You two used to talk more often. It's been N weeks."
3. "N weeks since you spoke. Worth reaching out."

**draftMessage**
1. "Hey [Name], been a while! How are things going?"
2. "Hi [Name]! Just been thinking about you. How are you doing?"
3. "Hey [Name]! How have you been? Feels like ages."

---

## 6. Interval overdue, months (e.g. 2 months)

**reasonToReachOut**
1. "It's been N months. [Name] would probably love to hear from you."
2. "N months since you were last in touch. Worth a message."
3. "You haven't spoken in N months. A good time to check in."

**draftMessage**
1. "Hey [Name]! It's been too long. How are things?"
2. "Hi [Name], just thinking about you. How have you been?"
3. "Hey [Name]! Been meaning to reach out. How's life?"

---

## 7. Dead thread (said "let's catch up" but went quiet for 14+ days)

**reasonToReachOut**
1. "You said you'd catch up. It never quite happened. Now's the time."
2. "You two had a plan to meet up. That was a while ago."
3. "There was a plan to catch up that never quite came together."

**draftMessage**
1. "Hey [Name]! I feel like we keep saying we'll catch up. Let's actually do it."
2. "Hi [Name], I know we've been bad at following through. Let's fix that."
3. "Hey [Name]! Been thinking I should make good on that catch-up plan."

---

## 8. Fallback (no specific occasion)

**reasonToReachOut**
1. "[Name] is someone worth staying close to."
2. "Worth reaching out to [Name] today."
3. "A good time to check in with [Name]."

**draftMessage**
1. "Hey [Name]! Just thinking about you. How are things going?"
2. "Hi [Name]! Been a while. How are you doing?"
3. "Hey [Name], just dropping in to say hi. How have you been?"

---

## Also flagging: em-dash violations in current code

These strings in `scanner.ts` currently use em-dashes and need to be replaced with whichever copy you pick above:

- Interval label: `"You spoke yesterday — keep the momentum"` (line 67)
- Interval label: `"${daysSince} days since you last spoke"` (fine, no dash)
- Interval label: `"${Math.floor(daysSince / 7)} weeks since you last spoke"` (fine)
- Interval label: `"${Math.floor(daysSince / 30)} months since you last spoke"` (fine)

Only line 67 has the em-dash. Once you pick a number for scenario 4, we'll replace that line too.
