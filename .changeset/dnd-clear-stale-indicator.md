---
'@portabletext/plugin-dnd': patch
---

fix: clear a stale drop indicator when a block is dragged over itself

Hovering a dragged block over itself cancels the drop, but an indicator activated on a previous hover kept pointing at the block. The self-hover now clears the drop position, at the root and inside containers alike.
