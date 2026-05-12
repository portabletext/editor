---
'@portabletext/editor': patch
---

fix(perf): O(D^2) -> O(D) for ancestor/path/lookup hot paths on deep nested data

Several traversal primitives had quadratic-in-depth cost that compounded for deeply-nested data. Tab-indenting a list-item in a recursive list container to depth 20 went from over 5 seconds per indent to about 100ms.

`getAncestors` now descends from the root once collecting each ancestor as it goes, instead of calling `getNode` per ancestor. `comparePathsInTree` (the document-order comparator used by range queries and dirty-path tracking) now descends both paths in a single pass instead of re-walking from the root at each level. `getSelectedTextBlocks`, `getSelectedBlocks` and `getSelectedChildren` short-circuit when the selection endpoints share the same enclosing block / root block / inline child, skipping the range walk when the selection doesn't actually cross the boundary.
