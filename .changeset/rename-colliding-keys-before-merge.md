---
'@portabletext/editor': patch
---

fix: rename colliding keys before backspace merges a block into its predecessor

Backspacing at the start of a text block to merge it into the previous block could silently mint fresh `_key`s for any child span or annotation whose key collided with one already in the destination block. On the wire this read as those nodes being destroyed and re-created rather than moved, so a collaborator applying the same patches lost their caret through the merge instead of following it. The merge now renames the colliding keys first, so the wire shows the rename followed by the move, and collaborators keep their position.
