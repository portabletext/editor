---
'@portabletext/editor': patch
---

fix: emit item-keyed `markDefs` patches instead of whole-array sets

When two clients change annotations in the same block at the same time, both clients' definitions now survive at the server. Adding an annotation, inserting a span with annotations, inserting an annotated block into a text block (for example by pasting), and deleting across blocks now emit a `setIfMissing` plus an item `insert` for each new definition. `annotation.set` emits a keyed `set` of the changed definition, and removing unused definitions emits keyed `unset`s. Only the changed or added definition is validated against the schema, and other definitions on the block are left as they are. `annotation.set` ignores `_key` in its props: it changes a definition's fields, never its key. Undo and redo emit the keyed counterparts: undoing an added annotation removes only its own definition and leaves an empty `markDefs` array behind, so definitions another client added meanwhile stay.

The order of `markDefs` is not preserved and carries no meaning. New definitions go first, and undoing a removal puts the definition back first, so code that reads the array positionally sees a different order. Consumers of `patch` or `mutation` events see the finer-grained shapes. Explicit whole-array `markDefs` writes, such as through `block.set`, still emit a whole-array `set`, except that setting an empty array where the block has no `markDefs` emits a `setIfMissing`.
