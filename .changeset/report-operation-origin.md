---
'@portabletext/editor': minor
---

feat: report the origin on the `operation` event

Every `operation` event now carries an `origin` telling you where the change that produced it came from:

```ts
editor.on('operation', (event) => {
  console.log(event.operation, event.origin)
})
```

`origin` is `'local'` for changes made in this editor (edits, undo/redo) and `'remote'` for changes a collaborator applied through `patches` or `update value`. A normalization fix (a repaired key, a merged span) reports the origin of the change that triggered it: a local edit's fallout reports `'local'`, a remote patch's fallout reports `'remote'`.

The field is required on the event object: code that constructs `operation` event values or asserts them wholesale (for example with `toEqual`) must add `origin` when upgrading.
