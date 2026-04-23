---
'@portabletext/editor': minor
---

feat: expose `defineLeaf` and `LeafPlugin`

`defineLeaf` lets consumers override how a matching span, inline object, or void block object renders inside a given scope. Combined with `defineContainer`, consumers can customize nested rendering at every node type inside a container.
