---
'@portabletext/editor': patch
---

fix: give a local `insert` into any object array a generated key when a sibling has the node's key

Sending `insert` with a node whose `_key` a sibling already uses now gives the inserted node a generated key in every object array, not only in the editor's block and child arrays. This covers array fields on block objects and arrays nested inside them, addressed by keys or by indexes:

```ts
// Value: [{_key: 'b0', _type: 'list', items: [{_key: 'i0', _type: 'item', title: 'foo'}]}]
editor.send({
  type: 'insert',
  at: [{_key: 'b0'}, 'items', {_key: 'i0'}],
  position: 'after',
  value: {_key: 'i0', _type: 'item', title: 'bar'},
})
// Previously: two items with `_key: 'i0'`
// Now: the second item gets a key from the editor's `keyGenerator`
```

The emitted `insert` patch carries the generated key. Remote `insert` patches keep the keys they arrive with, and inserting a value without a `_key`, such as a string into an array of strings, is unchanged.
