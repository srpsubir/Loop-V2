Pill-shaped action button for Loop — warm, low-chrome, no hard borders. Use `primary` for the one key action on a view.

```jsx
<Button variant="primary" onClick={save}>Add to chapter</Button>
<Button variant="secondary" iconLeft={<PlusIcon/>}>New person</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Variants: `primary` (terracotta stamp), `secondary` (paper-on-paper), `ghost` (text only). Sizes: `sm` 30 / `md` 38 / `lg` 46. Supports `iconLeft` / `iconRight`, `disabled`. Hover darkens (primary) or warms faint (secondary/ghost); press shrinks subtly.
