A quiet word of explanation on hover or focus — a small warm-ink bubble with paper text. Wraps an icon-only control. Appears after a short pause.

```jsx
<Tooltip label="Add a moment" side="bottom">
  <IconButton icon={<Plus />} label="Add a moment" />
</Tooltip>
```

Props: `label`, `children` (the trigger), `side` (`top`|`bottom`|`left`|`right`), `delay` (ms). The bubble uses `--ink`, never pure black.
