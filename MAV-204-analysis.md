# MAV-204 — On-Device LLM/SLM Architecture Analysis

_Written after reading: scanner.ts, whatsapp.ts, shared/types.ts_

---

## What the codebase already does

Before deciding what an LLM adds, understand what exists:

**Warmth/tie strength (already rule-based):**
- `buildTieStrengthMap()` classifies every DM contact as high/medium/low purely by `conversationTimestamp` recency (≤30 days = high, ≤180 = medium, else low). No message content involved.
- C1 composite score in `scanner.ts` computes `reciprocityRatio`, `temporalConsistency`, and `relationshipStrength` (0–1) from the last 50 messages per contact. Already captures back-and-forth balance and weekly consistency.

**Story generation (already template-based):**
- `generateStory()` uses TF-IDF word frequency on 50 messages to extract 2 topics, then fills sentence templates: "You and Alice talked a lot about yoga."
- This is where the quality gap is most visible — the output is technically correct but feels mechanical.

**Dead thread detection (already rule-based):**
- Phrase matching ("let's catch up", "speak soon") on the most recent 50 messages. Works for the common cases. No ML needed here.

---

## Part 1 — SLM vs LLM and app size

### Use case by use case

| Use case | What's needed | Minimum viable model | Can rules do it? |
|---|---|---|---|
| Warmth sensing / relationship scoring | Tone + sentiment analysis | DistilBERT-tiny (~67MB) or extend C1 rules | Rules already 80% there. ML adds tone layer. |
| Filtering unwanted contacts | Tone + recency + interaction pattern | Extend current C1 score + user signal | Rules + user input (explicit block) is more trustworthy than model inference here |
| Draft messages | Generative — needs to produce text | 1B Q4 minimum | No. This is generative-only. |
| World summary ("Their world") | Generative — short paragraph from messages | 1B Q4 minimum | Current template is functional but obviously mechanical |

**Honest assessment:**
- Use cases 1 and 2 do not need a generative LLM. The current C1 scoring covers warmth sensing well. Adding a lightweight sentiment classifier (DistilBERT-tiny, 67MB or smaller) would capture emotional tone that word frequency misses. This is additive, not a replacement.
- The "filter unwanted contacts" use case is better handled by an explicit user signal (a "not interested" dismiss on a nudge card) than by model inference. An ex-partner who went silent 2 years ago already scores `low` on C1 — the model doesn't add much, and getting it wrong would be worse than the current behavior.
- Use cases 3 and 4 (drafts and world summary) genuinely need a generative model.

### App size reality

| Model | Size on disk (Q4_K_M) | Startup (M2 8GB) | Quality on summarisation |
|---|---|---|---|
| Phi-3.5-mini-3.8B Q4 | ~2.2 GB | 3–6s | Strong — designed for this |
| Qwen2.5-1.5B Q4 | ~900 MB | 1–2s | Adequate for drafts, weak on nuance |
| Phi-3.5-mini 1B Q4 | ~700 MB | 1–2s | Borderline — drafts acceptable, summaries thin |
| DistilBERT-tiny (classifier only) | ~67 MB | <0.5s | Classification only, not generative |

**The hard constraint:** The user said no 500MB+ app. A generative model that's actually good (Phi-3.5-mini 3.8B) is 2.2GB by itself. Even the smallest viable generative model (700MB) violates the constraint if bundled into the DMG.

**Resolution: lazy download architecture.** The app ships without any model bundled. The DMG stays ~150MB (current size). On first use of a generative feature (draft message or world summary), Loop prompts the user to download the model (~700MB–2.2GB). This download happens once, stored in `~/Documents/Loop/models/`. The `model:status` IPC tracks the download and load state.

This is how Whisper.cpp, LM Studio, and Jan.app handle the same problem. It's the only architecture that respects both the app size constraint and the local-first requirement.

### node-llama-cpp assessment

`node-llama-cpp` is the right runtime for Electron:
- Runs in the main process (Node.js), no subprocess needed
- Supports GGUF format (universal — all quantised models are distributed as GGUF)
- Metal acceleration on Apple Silicon — inference is fast
- Supports streaming generation (needed for draft messages)
- Package size: the native binding is ~15MB; the model is separate and user-downloaded

Alternatives evaluated:
- **Ollama**: requires the user to install a separate daemon. Non-starter for a consumer app.
- **MLX Python**: fast on Apple Silicon but requires Python subprocess. Adds complexity, breaks sandbox.
- **WebAssembly ONNX runtime**: works for classifiers, too slow for generative tasks.

---

## Part 2 — Baileys coverage: the real picture

### What Baileys actually retrieves

From the code:

```typescript
// whatsapp.ts line 179
syncFullHistory: false,
```

This is the critical flag. With `syncFullHistory: false`:

- **chatStore** (populated by `chats.set` event): receives metadata for all chats — last message timestamp, unread count, chat name. **No message content.**
- **`fetchMessagesFromWA(jid, limit)`**: fetches actual message content from WhatsApp servers. Limited by what WhatsApp's Web API will return for that session.

### What WhatsApp Web actually serves

The WhatsApp Web protocol (which Baileys implements) has a rolling sync window. In practice:

- **Active DMs (last 30 days)**: typically 100–300 recent messages available. The Scanner caps at 50 — so it's getting ~1–3 weeks of content for active contacts.
- **Dormant DMs (31–180 days silent)**: WhatsApp may return 10–50 messages, all from the last conversation. Could be months old.
- **Truly dormant DMs (6+ months)**: 0–20 messages. Often just the last exchange. The data is there but shallow.
- **Group chats**: the Scanner does NOT call `getMessages` on group chats at all. Only metadata (membership, last message time) is used for chapter detection. Group message content is never read.

### Coverage gap and its consequences

| Contact type | Messages available | C1 score reliability | LLM summary quality |
|---|---|---|---|
| Active (weekly) | 40–50 (capped) | High | Good — recent context available |
| Monthly contact | 20–50 | Medium | Adequate — last few exchanges |
| Dormant (3–6 months) | 5–20 | Low | Poor — not enough signal |
| Truly dormant (6m+) | 0–10 | Very low | Unusable |

**Key finding:** The Baileys coverage problem is not a Baileys limitation — it's a WhatsApp Web protocol constraint. With `syncFullHistory: false`, WhatsApp only syncs recent session data. Even if Loop fetched 500 messages per contact instead of 50, the dormant contact data simply isn't available on the server side for a new session.

**For the LLM use cases:**
- Draft messages and world summary work well for **active contacts** (the people Loop is designed to surface). This is actually fine — if someone is truly dormant, there's nothing to summarise anyway.
- Warmth sensing using ML on messages works for the same population.
- The gap is that Loop can't produce a quality summary for someone you haven't messaged in 8 months — but that's also the person you most need a nudge about, not a summary of.

### Group chat: the missing dimension

The user mentioned group chats as a source of relationship signal ("if there's a crash-out in a group chat..."). Currently, group messages are never fetched. To add group chat sentiment:

1. `getMessages` would need to be called for group JIDs in addition to DM JIDs
2. Group messages are noisy — broadcast groups, work announcements, etc. would need filtering (the `GARBAGE_NAME_RE` filter in `whatsapp.ts` already does this at the chapter level, could be reused)
3. The user's own messages in group chats are the signal — is the user engaged, laughing, contributing, or silent?

This is feasible but represents a meaningful addition to the Scanner. Not a first-build item.

---

## Part 3 — Architecture recommendation

### What's feasible now (no model changes needed)

1. **Story/world summary quality**: The current `generateStory()` template output is the most visible quality gap. The template works correctly but feels machine-generated. This can be improved significantly by extending the template engine with more sentence variety, better topic labelling, and occasion-specific framing — without any ML. This should happen before a model is introduced.

2. **Warmth scoring**: C1 composite score is already good. The main gap is tone/sentiment — a rule-based "positivity proxy" (emoji ratio, question count, response time patterns) could get 80% of the benefit with zero model weight.

3. **Dead thread detection**: Phrase matching is good enough. No ML needed.

### What requires a model

4. **World summary (high value)**: "Alice has been talking about her new apartment and her sister coming to visit." Requires a generative model on ~50 recent messages. 1B Q4 is sufficient — the context fits in 2K tokens.

5. **Draft messages (medium value)**: "Hey, been thinking about you — how did the move to Berlin go?" Short generation, highly constrained by what's in the last 20 messages. 1B Q4 works. Phi-3.5-mini recommended.

### What NOT to build with a model

6. **Contact filtering / ex-detection**: This is a model hallucination risk. Better handled by explicit user dismissal signals. If a contact triggers 3 suppressed nudges, the system can auto-deprioritise them. No model judgment needed on who's an ex.

7. **Group chat crash-out detection**: Real but high-complexity, low-coverage. Not a first build. Requires new data pipeline, significant filtering, and the false-positive cost (suppressing a misclassified memory) is high.

---

## model:status IPC specification

Given the lazy-download architecture, `model:status` needs to cover the full lifecycle:

```typescript
type ModelPhase =
  | { phase: 'not-downloaded' }
  | { phase: 'downloading'; progressFraction: number; bytesTotal: number; bytesReceived: number }
  | { phase: 'verifying' }
  | { phase: 'loading'; progressFraction?: number }
  | { phase: 'ready'; modelId: string; contextWindow: number }
  | { phase: 'error'; message: string; recoverable: boolean }

// IPC response shape
interface ModelStatusResponse {
  status: ModelPhase
  featuresAvailable: {
    worldSummary: boolean   // requires 'ready'
    draftMessage: boolean   // requires 'ready'
    sentimentClassifier: boolean  // true even without download if rules-based
  }
}
```

The renderer uses this to:
- Show a "download model" prompt on first Story view if `phase === 'not-downloaded'`
- Show a progress bar during download
- Enable/disable the draft message button based on `draftMessage`

---

## Recommended architecture

**Phase 1 (no model — do this first):**
- Improve `generateStory()` template quality: more sentence variants, occasion-aware framing, better topic labelling
- Add positivity proxy to C1 scoring: emoji ratio, question count as warmth signals
- Add explicit "not interested" contact suppression signal in the UI (feeds into C1 to deprioritise permanently)

**Phase 2 (model infrastructure):**
- Install `node-llama-cpp` and wire `model:status` IPC
- Build model download manager: user-initiated, progress tracked, stored in `~/Documents/Loop/models/`
- No model bundled in DMG — app stays ~150MB

**Phase 3 (generative features):**
- Replace `generateStory()` template output with LLM summary when model is ready
- Add draft message suggestion on Story screen (below the Open WhatsApp CTA)
- Model: Phi-3.5-mini Q4 (~700MB) as the default download. Quality/size tradeoff is best in class.

**What to build first:** Phase 1 template quality improvements. They ship immediately, require no infrastructure, and make the most visible screen (Story/Their world) noticeably better. The LLM is the long-term path but doesn't need to gate the near-term quality improvement.

---

## Open questions for the product conversation

1. **Model consent**: LLM inference requires reading message content locally. The `privacyAcceptedAt` field in AppState suggests a consent flow was planned. Does the draft message feature require a separate LLM consent gate, or does the existing privacy notice cover it?

2. **Model download UX**: When does Loop prompt for the model download? Options: (a) on first Story view, (b) in Settings as an opt-in, (c) during onboarding as an optional step.

3. **Fallback**: When the model is not downloaded, does the Story screen show the current template output, or does it show a prompt to download the model? The template output is usable — showing it as the default with an optional "make this richer" CTA is probably right.

4. **Group message fetching**: If the user wants mood/tone from group chats, a separate Scanner pass for group message content is needed. This is a significant addition — worth scoping as its own ticket.
