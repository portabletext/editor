---
'@portabletext/editor': minor
---

refactor!: rename `getChildren` to `getChildrenAt`

`getChildren` is renamed to `getChildrenAt` to reflect its path-based input. Aligns with the rest of the path-based traversal surface and makes room for a node-based companion in a future release.
