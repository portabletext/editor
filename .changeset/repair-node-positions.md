---
'@portabletext/repair': major
---

fix!: stop setting span `text` outside a text block and text block `children` inside one

`getStructuralCorrection` no longer returns a `span-text` correction for a span whose parent is missing or is not a text block, such as a span at the root or in a container field. It no longer returns a `missing-children` correction for a text block inside another text block. The other rules still apply to these nodes. Code that relied on those two corrections must apply them itself.

```ts
getStructuralCorrection(context, {
  node: {_type: 'block', _key: 'b2'},
  path: [{_key: 'b1'}, 'children', {_key: 'b2'}],
  parent: {node: {_type: 'block', _key: 'b1', children: []}, path: [{_key: 'b1'}]},
  siblings: () => [],
})
// Previously: {type: 'missing-children', patches: [{type: 'set', path: [..., 'children'], value: []}]}
// Now: undefined
```
