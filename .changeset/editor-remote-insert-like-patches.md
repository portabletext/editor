---
'@portabletext/editor': patch
---

fix: land remote inserts where `@portabletext/patches` places them

A remote `insert` patch now puts its items where `applyAll` from `@portabletext/patches` puts them, also inside containers, block children and plain-data arrays in block objects.

```ts
editor.send({
  type: 'patches',
  patches: [
    {
      type: 'insert',
      path: [{_key: 'grid'}, 'tags', 0],
      position: 'after',
      items: ['bar', 'baz'],
      origin: 'remote',
    },
  ],
  snapshot: undefined,
})
// tags: ['foo', 'bar', 'baz']
// Previously: ['foo', 'bar']
```

Previously, items could land reordered or go missing, and `after` the last block by `-1` prepended. An insert through a numeric container index such as `[0, 'content', 0]` could also write into a new `children` field. A remote `insert` with position `replace` now replaces the addressed item instead of inserting before it. Remote `set` and `unset` of an item in a plain-data array now also apply through root block index `0` and in an array directly inside another array, where they did nothing before.
