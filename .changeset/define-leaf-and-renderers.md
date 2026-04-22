---
'@portabletext/editor': patch
---

feat: add internal `defineLeaf` API and make renderers container-aware

Lays the engine plumbing for the public `defineLeaf` API: a
scope-keyed map of leaf renderers on the editor, lookup by the
node's type chain, and a `Leaf` type that narrows `node` based on
the terminal segment of the scope. Renderers (`render.element.tsx`,
`render.span.tsx`, `render.text-block.tsx`, `render.inline-object.tsx`,
`render.block-object.tsx`) honor the registered leaf when one
matches and fall through to legacy rendering otherwise. No public
surface change yet; consumers see the API in the
`feat: expose defineLeaf and LeafPlugin` changeset.
