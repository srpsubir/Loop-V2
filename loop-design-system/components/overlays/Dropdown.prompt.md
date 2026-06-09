A small paper menu of actions opened from a trigger. Items wash to the surface on hover; a chosen item shows a terracotta check. Use it for "…" overflow menus and select-style pickers.

```jsx
<Dropdown
  align="end"
  trigger={<IconButton icon={<Ellipsis />} label="More" />}
  items={[
    { label: "Add a moment", icon: <Plus /> },
    { label: "Rename chapter", icon: <Pencil /> },
    { divider: true },
    { label: "Archive chapter", icon: <Archive />, tone: "accent" },
  ]}
/>
```

Props: `trigger`, `items` (each `{label, icon, onClick, selected, trailing, tone, disabled}` or `{divider}` / `{header}`), `align` (`start`|`end`), `width`, controlled `open`/`onOpenChange`. No loud red destructive rows — a remove uses `tone:"accent"`.
