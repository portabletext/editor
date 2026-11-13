---
'@portabletext/editor': patch
---

fix: keep the `children` field of block objects

A block object with its own `children` field lost it when the editor took the block in. Moving the block, or deleting it and undoing, emitted patches without the field, and inserting or pasting such a block did the same. A container registered with `arrayField: 'children'` rendered empty, and its first edit emitted a patch that replaced its blocks with one empty block. Block objects now keep every field, and these containers render their blocks and follow `value` updates.
