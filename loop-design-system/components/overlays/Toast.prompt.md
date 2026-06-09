A small paper slip that rises from the bottom to confirm something quietly. Warm shadow, sage dot for positive notes. Auto-dismisses — it reassures, never alarms.

```jsx
const [saved, setSaved] = React.useState(false);
// ...
<Toast
  open={saved}
  onClose={() => setSaved(false)}
  tone="positive"
  message="Saved to Priya's story."
  action={{ label: "Undo", onClick: undo }}
/>
```

Props: `open`, `onClose`, `message`, `tone` (`neutral`|`positive`), `icon`, `action`, `duration` (ms, 0 disables), `inline` (anchor to a relative parent). Never style as a red error.
