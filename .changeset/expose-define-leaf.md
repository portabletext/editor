---
'@portabletext/editor': minor
---

feat: expose `defineLeaf` and `LeafPlugin`

Adds a sibling to `defineContainer` for per-leaf custom rendering. Consumers register `defineLeaf({type, render})` for spans, inline objects, and void block objects - taking full control over the outermost element for nodes of that type. Registration is type-keyed; positional overrides nest inside a parent container's `of` array. `LeafPlugin` accepts an array of leaf definitions just like `ContainerPlugin`. Both are `@alpha`.
