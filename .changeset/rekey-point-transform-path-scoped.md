---
'@portabletext/editor': patch
---

fix: re-point positions only at the renamed node's own path when a `_key` changes

Renaming a node's `_key` no longer drags carets, selections, or tracked ranges sitting on an unrelated node that happens to carry the same key (keys are only unique among siblings, so twins across blocks are legal). Positions on the renamed node itself follow the rename as before; everything else stays put.
