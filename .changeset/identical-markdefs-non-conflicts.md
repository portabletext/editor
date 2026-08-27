---
'@portabletext/editor': patch
---

fix: treat identical same-key markDefs as non-conflicts when inserting text block fragments

Inserting a text block into another (pasting into a block, for example) no longer renames an annotation definition when the destination already carries an identical one under the same `_key`. The definition keeps its key, so anything tracking the annotation (comments, decorations) keeps following it.
