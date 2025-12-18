---
'@portabletext/editor': minor
---

feat(`patches`): support `setIfMissing` patches

`setIfMissing` is like `set`, except existing keys will be preserved and not overwritten:

```ts
editor.send({
  type: 'patches',
  patches: [
    {
      type: 'setIfMissing',
      origin: 'remote',
      path: [{_key: 'block-key'}, 'level'],
      value: 1,
    },
  ],
  // Snapshot not important
  snapshot: undefined,
})

```
