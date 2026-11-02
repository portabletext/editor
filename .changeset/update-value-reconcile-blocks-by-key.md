---
'@portabletext/editor': patch
---

fix: reconcile `update value` blocks by key

Reordering blocks in the value passed to `update value`, for example swapping two blocks, no longer gives a moved block a new `_key`. Previously the next local edit sent a `set` patch renaming that block, and a host that already held the reordered value renamed the wrong block, so the host and the editor diverged. A block that moves now keeps its key and its content, and the sync emits no patches of its own.

The `operation` event for a reorder now shows each moved block removed and inserted at its new index, with no key renames in between. A caret or range with either end inside a moved block now keeps covering the same text in the block's new position instead of jumping to the start of the document. When a block later in the value fails validation, the blocks synced before it no longer include a renamed copy of a moved block. When the editor repairs a new block, for example by giving a child its missing `_key`, it now sends the repair patch for that block wherever it lands, including at the end of the value.
