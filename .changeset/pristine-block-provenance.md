---
'@portabletext/editor': patch
---

fix: treat a pristine block from value sync as persisted content

Typing into an empty-looking block that arrived through an `update value` event no longer re-emits `setIfMissing` and an `insert` for that block. Previously the block was mistaken for the editor's own local placeholder, and the first edit inserted a copy of it into a document that already contained its `_key`, producing duplicate-key content that breaks keyed patch addressing from then on. This could occur when another client stored an empty Portable Text field as a single empty block instead of unsetting it.

The same misjudgment affected incoming patches: a remote root-level `insert` arriving next to such a block removed it locally, leaving the editor briefly missing a block the document still has until the next value sync repaired it. The block now survives the insert.

One narrow behavioral delta rides along: deleting all content back down to exactly such a synced-in empty block no longer emits `unset` for the field; the document keeps the empty block it already had.
