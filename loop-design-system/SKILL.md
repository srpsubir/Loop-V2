---
name: loop-design
description: Use this skill to generate well-branded interfaces and assets for Loop (a warm, nostalgic personal relationship memory app for Mac), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy
assets out and create static HTML files for the user to view. Link `styles.css`
for the real tokens and fonts. If working on production code, you can copy assets
and read the rules here to become an expert in designing with this brand.

Key files:
- `readme.md` — the full design guide: content voice, visual foundations,
  iconography, and a manifest of everything available.
- `styles.css` — the single CSS entry point (imports tokens + fonts). Link this.
- `tokens/` — colour, type, spacing, and effect custom properties.
- `components/` — reusable React primitives (Button, IconButton, Input,
  SegmentedControl, Switch, Avatar, Tag, PaperCard, PersonRow). Each has a
  `.prompt.md` with usage.
- `ui_kits/loop-app/` — a full interactive Mac-app recreation to learn the
  patterns from.
- `assets/` — logo, self-hosted fonts, and warm placeholder photography.

The non-negotiables: warm parchment paper (never pure white/black), terracotta
used sparingly like an ink stamp, Lora serif for names/chapters/emotional
moments and Inter for everything functional, warm-tinted shadows instead of
borders, soft rounded corners, gentle motion, and a warm not clinical voice.
Never use: card borders, red status dots, data tables, an icon sidebar nav, blue
gradients, or emoji.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.
