---
'@portabletext/editor': major
---

feat!: unexport `resolveContainerAt`

The positional container resolver is no longer part of the public API. It shipped as `@alpha` with the container redesign and found no consumers. `getContainerChildren` from `@portabletext/editor/traversal` stays and covers per-node descent; code that needs the full path walk can build it from that primitive.
