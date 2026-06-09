# Loop — Design System

> **Loop** is a personal relationship memory system for Mac. Not a CRM — a photo
> album that happens to be software. It organises the people in your life around
> the **chapters** you lived (the London years, the Edinburgh masters) and the
> **crews** who were there with you. The emotional register is nostalgia and
> warmth: paper, not productivity.

This repository is the brand's design system: design tokens, fonts, reusable
React components, foundation specimen cards, and a full UI-kit recreation of the
Mac app. An automated compiler indexes the tokens and bundles the components into
`_ds_bundle.js` (do not hand-edit that file).

**Platform:** macOS desktop app, ~1200×800.
**Namespace:** components are exposed at `window.LoopDesignSystem_96f8bb` in card HTML.

---

## Sources

No external codebase or Figma was provided. This system was authored from a
written brand brief (palette, typography, platform, and feel). If a Loop
codebase or Figma file exists, link it here so future edits can reconcile against
the source of truth.

- Brand brief: warm-parchment palette, Lora + Inter, Mac ~1200×800, "photo album
  not productivity tool."

---

## Content fundamentals — how Loop talks

Loop writes like a thoughtful friend recalling a shared past, never like an app
reporting metrics.

- **Voice:** warm, plain, a little literary. Second person ("you"), past and
  present tense woven together. The product narrates *your* life back to you.
- **Tone:** gentle and unhurried. It never nags, scores, or gamifies. A lapse in
  contact is described softly ("It's been a while — you last spoke in the
  spring."), never as a failure ("84 days overdue").
- **Casing:** sentence case everywhere in prose. Chapter and crew names are
  written as a person would say them ("The Camden flat", "Everyone from the
  agency"), not as Title-Case Labels or tags.
- **Numbers:** used sparingly and humanely — "Eight people across three
  chapters," not dashboards of counts. Dates are soft where possible ("3 weeks
  ago", "in the spring") and only precise on the memory timeline.
- **Emoji:** none. Warmth comes from words and the serif, not from emoji.
- **No jargon:** never "contacts", "touchpoints", "records", "tags", "CRM",
  "engagement". People are *people*; groups are *crews*; eras are *chapters*;
  entries are *moments* or *notes*.

**Say this → not this**
- "You haven't spoken to Marcus since the spring." → ~~"⚠️ Contact overdue: 84 days"~~
- "Everyone from the Camden flat" → ~~"Group #3 (5 contacts) · Tag: london"~~
- "Reach out" → ~~"Log interaction"~~
- "Your story together" → ~~"Activity history"~~

---

## Visual foundations

The whole app is **printed on warm paper**. Nothing is pure white; nothing is
pure black; nothing is a hard-edged box.

- **Colour:** a warm-parchment palette. Backgrounds range across three paper
  tones (`#F9F5EE` → `#EFE6D6` → `#E8DBCA`). The single accent is **terracotta**
  (`#B8624A`), used like an ink stamp — sparingly, for the one key action. Dusty
  **rose** carries people/relationships; **sage** signals "still close". Text is
  warm brown ink (`#2A1F1B` / `#6B5447` / `#A38F85`), never black. See
  `tokens/colors.css`.
- **Type:** two families only. **Lora** (serif) is the emotional voice — names,
  chapter titles, hero lines, quotes, milestones (often italic). **Inter** (sans)
  does all functional work — body, labels, metadata. Headings are serif; controls
  and metadata are sans. Generous line-height (1.55 body, 1.7 long-form). Metadata
  uses tabular numerals. See `tokens/typography.css`.
- **Backgrounds:** flat warm paper, no gradients as decoration. Imagery is
  **photographic** (chapter covers, memory moments) and always **warm-tinted** —
  a sepia/terracotta duotone (`filter: sepia(.32) saturate(1.05) hue-rotate(-8deg)`)
  so every photo harmonises with the parchment. Photos carry a soft bottom
  gradient when text sits over them.
- **Cards = paper, not boxes.** Surfaces are lifted by **warm-tinted shadows**
  (brown alpha, never neutral grey), never by borders. Hairlines exist only as the
  faintest dividers between rows. Corners are softly rounded
  (`12px` default, `18px` for photo frames, full-round for avatars/chips/buttons).
  See `tokens/effects.css`.
- **Elevation:** `sm` resting paper → `md` cards → `lg` hover/popover → `xl`
  dialogs/dragged photos. Inputs are *sunk* into the paper with an inset shadow
  (a well), not raised.
- **Buttons:** pill-shaped. Primary = solid terracotta; secondary = paper-on-paper;
  ghost = text only. No outlines.
- **Motion:** gentle and settled, never bouncy. Fades and small transl(≤2px)
  lifts on `cubic-bezier(0.22,0.61,0.36,1)` at 120–320ms. Memories settle, they
  don't snap. No infinite/looping decoration.
- **Hover:** primary darkens (`#A6543E`); secondary/ghost warm to terracotta-faint;
  cards lift 2px to a larger shadow; rows wash to the surface tint.
- **Press:** buttons shrink subtly (scale ~0.985–0.92); no colour flash.
- **Focus:** a soft terracotta ring at low opacity (`--focus-ring`), warm not blue.
- **Transparency/blur:** used lightly — gradient scrims over photos only; no
  glassmorphism. The paper stays opaque.
- **Forbidden** (anti-patterns this brand never uses): card borders, red status
  dots, data tables, a productivity-style icon sidebar nav, neutral-grey shadows,
  blue/purple gradients, emoji, Title-Case labels, dense dashboards.

---

## Iconography

- **Set:** [Lucide](https://lucide.dev) — soft, rounded, even-stroke (2px) line
  icons. Their gentle, humanist line matches Loop's warmth far better than sharp
  or filled systems. Loaded from CDN in cards and the UI kit
  (`unpkg.com/lucide`). **⚠️ Substitution:** no icon set was specified in the
  brief; Lucide is our recommended default — swap if Loop standardises on
  another humanist line set.
- **Usage:** icons are quiet and secondary — toolbar actions, a leading glyph in
  inputs, small affordances inside `IconButton`. They are line icons rendered in
  `--text-secondary`/`--text-muted`, never filled blocks of accent colour. Common
  glyphs: `Search`, `Plus`, `Send`, `Heart` (still close), `ArrowLeft`,
  `MessageCircle`, `Settings2`, `Ellipsis`, `Camera`.
- **No emoji, no unicode dingbats** as icons.
- **Logo:** a hand-drawn continuous **loop mark** (`assets/logo/loop-mark.svg`,
  terracotta) paired with the **Lora** wordmark "Loop". The mark is a single
  looping thread — the through-line of a life.

---

## Assets

- `assets/logo/loop-mark.svg` — the loop mark (terracotta).
- `assets/fonts/` — self-hosted Lora + Inter (latin woff2 subsets).
- `assets/photos/` — warm placeholder photography for chapter covers and memory
  moments. **⚠️ Substitution:** these are royalty-free placeholders
  (picsum.photos) used to demonstrate the photo-album layout. Replace with real
  user/brand imagery; the warm CSS duotone keeps any source on-palette.

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link. `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
  `effects.css`.
- `SKILL.md` — Agent-Skill wrapper for using this system in Claude Code.

**Foundation cards** (`guidelines/`) — rendered in the Design System tab:
colours (surfaces, terracotta, rose & sage, ink & hairlines), type (serif, sans,
scale), spacing (scale, radii, elevation), brand (logo, voice).

**Components** (`components/`, exposed on `window.LoopDesignSystem_96f8bb`)
- `buttons/` — **Button**, **IconButton**
- `forms/` — **Input**, **SegmentedControl**, **Switch**
- `data-display/` — **Avatar**, **Tag**, **PaperCard**, **PersonRow** (signature)
- `overlays/` — **Dialog**, **Toast**, **Tooltip**, **Dropdown** (feedback &
  transient surfaces; warm ink scrim, paper popovers, no red error styling)

Each component ships `<Name>.jsx`, `<Name>.d.ts` (props + docs), and
`<Name>.prompt.md` (one-line what/when + usage). Each directory has a
`@dsCard` HTML specimen.

**UI kit** (`ui_kits/loop-app/`) — interactive **Mac-app** recreation: Home
(a single *On your mind* hero + chapters), Chapter setup (per-card photo picker),
Chapter (crews), Person (memory timeline), with a working search. Mac desktop
only — there is no mobile surface. See its own `README.md`.
