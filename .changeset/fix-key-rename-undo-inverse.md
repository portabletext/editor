---
'@portabletext/editor': patch
---

fix: locate a renamed node by its new key when undoing a `_key` change

Undoing an edit that renamed a node's own `_key` (a collision-avoiding rename ahead of a block merge, for example) left the node stuck under its new key instead of restoring the old one: the undo step tried to find the node by the key it had before the rename, which no longer resolved to anything once the rename had applied. Undoing now locates the node by its current key first, so a rename reverts cleanly along with everything else in the same undo step.
