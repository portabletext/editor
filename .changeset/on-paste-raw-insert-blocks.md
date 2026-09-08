---
'@portabletext/editor': patch
---

fix: pass blocks returned from `onPaste` unparsed to the `insert.blocks` event

Blocks returned from a custom `onPaste` (the `insert` result) now reach the `insert.blocks` behavior event exactly as returned: keys are no longer generated, unused `markDefs` no longer stripped, and unknown block types no longer dropped before behaviors see them. The blocks are still validated against the schema when inserted, so nothing invalid reaches the document.

One narrow behavioral delta rides along: when the returned array puts an unknown-type block before a text block, the text block now inserts as its own block instead of merging into the block at the cursor, matching what a direct `insert.blocks` event already did.
