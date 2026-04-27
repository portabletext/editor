---
'@portabletext/editor': minor
---

feat: expose `defineLeaf` and `LeafPlugin`

Adds a sibling to `defineContainer` for per-leaf custom rendering.
Consumers register `defineLeaf({scope, render})` for spans, inline
objects, and void block objects — taking full control over the
outermost element when the scope matches. The most specific scope
wins (per JSONPath specificity); registration order breaks ties.
`LeafPlugin` accepts an array of leaf definitions just like
`ContainerPlugin`. Both are `@alpha`.
