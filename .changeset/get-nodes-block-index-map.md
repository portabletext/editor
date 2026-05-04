---
'@portabletext/editor': patch
---

fix: use blockIndexMap for O(1) root-level path comparisons in getNodes

Range traversal via `getNodes` was walking sibling arrays to compare
root-level path positions. It now consults the editor's
`blockIndexMap` for the root segment, turning that comparison from
O(n) into O(1). Most visible on large documents where ranges or
selections span many root-level blocks.
