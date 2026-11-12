---
'@portabletext/editor': patch
---

fix: leave the document alone when a selection or `at` names something that has gone

A selection or `at` range that points at a span, a text block or a link definition no longer in the document now resolves to nothing, at the root and inside containers. `select` deselects, and `delete`, `decorator.add`, `annotation.add`, `annotation.remove` and `insert.block` change nothing instead of editing another block. The deprecated `selection` prop resolves these points as before.

`insert.block` and `insert.blocks` with an `at` that names a block no longer in the document insert nothing, instead of inserting at the top or bottom of the document.

```ts
// `at` names a block a collaborator removed: nothing is inserted
editor.send({type: 'insert.block', block, placement: 'after', at})
```

When a Behavior cancels one block of an `insert.blocks`, the blocks after it follow the last block that was inserted, in the same container. If the first block is cancelled, the rest land where it would have, and `auto` placement leaves no empty block behind.
