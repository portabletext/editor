---
'@portabletext/editor': minor
---

feat: `renderChild` on `defineContainer` and a type-keyed container/leaf registry

`defineContainer` now takes a `childField` (the schema field holding children) and an optional `renderChild` (a record keyed by child `_type`). The container's plugin owns both the container's own appearance AND how things look inside it. One registration bundles `{type, childField, render, renderChild?}`.

```ts
defineContainer<typeof schema>({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children}) => <aside {...attributes}>{children}</aside>,
  renderChild: {
    image: ({attributes, node}) => <span {...attributes}>{/* compact image */}</span>,
  },
})
```

`renderChild` is opt-in per child type, direct parent only, additive (never exclusive), and fires whether or not the child has a global `defineContainer` / `defineLeaf` registration. The parent plugin is self-contained.

**This deletes scope grammar.** `defineContainer({scope: '$..foo.bar', field: 'baz', render})` and `defineLeaf({scope: '$..a.b.c', render})` are gone. Containers and leaves are keyed by `_type`. Lookup is `Map.get` (O(1)) instead of `matchScope` + `compareSpecificity` per render. The `scope/` directory, `lookupContainer`, `findMatchingLeaf`, `getTypeChain`, `getContainerScopedName` and `makeContainerConfig` are removed.

Migration: rename `scope: '$..X'` to `type: 'X'`, `field:` to `childField:`. For multi-segment scopes, move the inner registration into the outer plugin's `renderChild`. The corpus migration deletes `$..callout.block` and `$..fact-box.block` (CSS-redundant), deletes `$..code-block.block.span` (CSS-redundant, `<pre>` inheritance handles monospace), and relocates `$..table.row.cell.image` from the image plugin to the table plugin's cell container as `renderChild.image`.

A registered container type applies wherever its bare `_type` appears in the value. The schema's allowed positions define where a type can be used; the engine's registration is keyed by `_type` alone. For position-differentiated structure, use different type names.

The render pipeline gains two universal render props: `parent` (the immediate parent node reference, referentially stable across re-renders, undefined at root) and `isInline` (true when the node sits inside a text block's `children` field).

All container API surface remained `@alpha` through this change.
