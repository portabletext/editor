---
'@portabletext/editor': patch
---

fix: replace `set_node` with primitive `set` and `unset` operations

Replace the Slate `set_node` operation with two primitive operations: `set` and `unset`. Each targets a single property at a path like `[...nodePath, propertyName]` and carries its own inverse for undo. Because each operation maps 1:1 to a Sanity patch, the translation layer collapses.
