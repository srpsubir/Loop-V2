Paper segmented toggle for switching between 2–4 related views.

```jsx
<SegmentedControl
  options={["Timeline", "People", "Notes"]}
  value={view}
  onChange={setView}
/>
```

Options can be strings or `{ value, label }`. Selected segment rises on a soft pill over a sunk track.
