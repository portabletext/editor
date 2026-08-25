---
'@portabletext/editor': major
---

feat!: unexport `resolveContainerAt`

The positional container resolver, an `@alpha` API from the container redesign, is no longer part of the public API. `getContainerChildren` from `@portabletext/editor/traversal` stays and covers per-node descent; code that needs the full path walk can build it from that primitive.
