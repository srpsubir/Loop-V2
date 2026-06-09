Soft circular icon-only button for toolbars and inline actions. Always provide `label`.

```jsx
<IconButton icon={<XIcon/>} label="Close" onClick={close} />
<IconButton icon={<PlusIcon/>} variant="primary" label="Add person" />
<IconButton icon={<SearchIcon/>} variant="soft" size="lg" label="Search" />
```

Variants: `ghost` (default), `soft` (paper well), `primary` (terracotta). Sizes: `sm` 30 / `md` 36 / `lg` 44. Press scales down to 0.92.
