---
'@portabletext/editor': patch
---

fix: keep the placeholder when a host echoes an empty value back

Undo now works after deleting the last block, even once the host has sent the editor's value back. Before, the whole undo history was lost at that point, so the deleted content could not be brought back with undo.

Say the editor holds a single image, the user deletes it, and the host feeds each mutation's value back to the editor as `update value`. The deletion's mutation carries the value `[]`, so a moment later the host sends `[]`. Now an empty value that arrives while the editor shows only its placeholder leaves the editor as it is, and a later undo brings the image back:

```ts
editor.send({type: 'delete.block', at: [{_key: 'image'}]})

// A moment later, once the mutation has gone out, the host echoes its value
editor.send({type: 'update value', value: []})

// Later still, the user undoes
editor.send({type: 'history.undo'})
// Before: nothing happens, and the undo history is empty
// After: the image is back
```

Because nothing changes, that empty value no longer emits `value changed`, `selection` or `operation` events. An empty block the host did hold is still cleared by an empty value, and the next keystroke creates it again on the host.
