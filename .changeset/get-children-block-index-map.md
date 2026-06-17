---
'@portabletext/editor': patch
---

fix(perf): resolve `getChildren` segments via `blockIndexMap`

`getChildren` now resolves keyed path segments through the editor's
`blockIndexMap` (O(1)) with a linear-scan fallback, matching `getNode`,
`getAncestors`, and `getSibling`. Behavior is unchanged; resolution is faster
on wide sibling arrays and on repeated descents into the same subtree.
