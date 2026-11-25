---
'@portabletext/editor': patch
---

fix: emit no operation for a remote patch that cannot change a field

A remote `diffMatchPatch` on a string outside span text, such as a block's `style`, no longer emits an `operation` event when the resulting string is identical to the current one. That covers a stale diff whose hunks all miss and a diff that leaves the string as it is. Previously both emitted a `set` operation writing the current string back. A diff whose hunks match only in part still emits a `set` when the hunks that match change the string.

A remote range `unset` on a field that isn't an array no longer emits an `operation` event either. Previously it emitted an operation at the range path, though the field was unchanged:

```ts
editor.send({
  type: 'apply',
  patches: [
    {type: 'unset', path: [{_key: 'b1'}, 'style', [0, '']], origin: 'remote'},
  ],
})
// Previously emitted an `operation` event for this `unset`, though `style` was unchanged
```
