---
'@portabletext/editor': patch
---

fix: resolve `getNodes` range bounds to the node they name

Selectors that walk the nodes between the selection's start and end, such as `getSelectedBlocks`, now treat each selection point as the node it names. A negative index counts once from the end of its array, a point whose index is outside the array or whose key is missing names nothing, so the walk between the two points yields nothing, and a point inside a text block's `markDefs` stands for the text block that owns the annotation.

Against a document of three text blocks `b0`, `b1` and `b2`, each with one span `s0`, `s1` and `s2`:

```ts
const snapshot = editor.getSnapshot()

getSelectedBlocks({
  ...snapshot,
  context: {
    ...snapshot.context,
    selection: {
      anchor: {path: [-3, 'children', 0], offset: 0},
      focus: {path: [-2, 'children', 0], offset: 0},
    },
  },
})
// Now: `b0` and `b1`. Previously: no blocks.

getSelectedBlocks({
  ...snapshot,
  context: {
    ...snapshot.context,
    selection: {
      anchor: {path: [{_key: 'missing'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
    },
  },
})
// Now: no blocks. Previously: `b0`, `b1` and `b2`.
```

A range bounded by an annotation path no longer starts or ends at a span in the same block that shares the annotation's `_key`, which dropped the spans before it from the start of a range and added the spans up to it at the end.
