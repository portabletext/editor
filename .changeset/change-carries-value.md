---
'@portabletext/editor': minor
---

feat: carry the document value on every change

`ChangeEvent` now includes `value` on both local and remote changes. It is the document your host holds after the change: the loaded value with every incoming `apply` patch and every local `patches` applied in order. `undefined` means the field is absent; an empty array remains an empty array. The empty paragraph the editor shows in an absent field is not included.

```ts
editor.on('change', (event) => {
  renderPreview(event.value)
})
```

A collaborator's value is passed on as it arrived, so its entries can be broken at runtime. When the editor makes a correction, the following local change carries the corrected value. Unchanged blocks keep their object identity, and later edits do not mutate an emitted value. Read `event.value` for the document your host holds. `editor.getSnapshot().context.value` can also include the empty paragraph the editor shows in an empty field.
