A paper sheet that floats above the app for one deliberate decision. Warm ink scrim, serif title, sans body. Closes on Escape / scrim click.

```jsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Let this chapter close?"
  description="The London Years will move to your archive. Nothing is deleted — you can reopen it any time."
  footer={<>
    <Button variant="ghost" onClick={() => setOpen(false)}>Keep it open</Button>
    <Button onClick={archive}>Archive chapter</Button>
  </>}
/>
```

Props: `open`, `onClose`, `title` (serif), `description`, `children`, `footer` (actions), `icon`, `width`, `closeOnScrim`. Never use a black overlay — the scrim is warm ink at low alpha.
