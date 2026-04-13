---
'@portabletext/editor': patch
---

fix: rename `insert_node` to `insert` and merge `remove_node` into `unset`

The internal `insert_node` operation is now `insert`. The `remove_node` operation is merged into `unset`, where the path points to the node to remove (last segment is a keyed segment). Both `insert` and node-removal `unset` carry inverse data computed in the apply layer for undo support.
