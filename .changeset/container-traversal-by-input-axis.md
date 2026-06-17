---
'@portabletext/editor': minor
---

feat!: name container traversal by input axis

`getChildren` is renamed to `getChildrenAt` (path-based). A node-based variant `getChildrenOf` is exposed for consumers walking the value tree recursively (`O(1)` lookup from a held node, vs `getChildrenAt`'s descent from the root). A node-based `resolveContainerOf` is exposed as the companion to `resolveContainerAt`. Both new symbols ship `@beta` and `@alpha` respectively, matching the visibility tier of their path-based siblings.
