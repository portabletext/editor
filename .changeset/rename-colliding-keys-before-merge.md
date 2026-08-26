---
'@portabletext/editor': patch
---

fix: rename colliding keys before a text block merge deletes the merging block

Merging a text block into its neighbor (backspace at its start, or forward delete at the end of the block before it) could silently mint fresh `_key`s for any child span or annotation whose key collided with one already in the destination block. On the wire this read as those nodes being destroyed and re-created rather than moved, so a collaborator applying the same patches lost their caret through the merge instead of following it. The merge now renames the colliding keys first, so the emitted patches express the rename followed by the move instead of a destroy-and-create.
