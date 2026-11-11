---
'@portabletext/editor': minor
---

feat: reset the editor to a whole value with `reset`

Send `reset` after `ready` to replace the whole value and clear undo and redo history, pending value updates, and edits that have not been emitted. Edits made while read-only are cleared too. Already emitted patches are not recalled. Sending `reset` before `ready` throws.

```ts
editor.send({type: 'reset', value})
```

Changed content emits one remote `change` with a root `set`, followed by any corrections, without `value changed`. An equal value emits no change. `undefined` and `[]` give the empty editor.

Carets and range decorations keep their key paths and offsets. A caret whose span key is gone goes to offset 0 of its replacement. A decoration whose span key is gone is removed and its `onMoved` callback receives `newSelection: null` with remote origin. A prop decoration does not move while the editor is read-only. Reusing a text block object preserves its drawing and any composition in it.
