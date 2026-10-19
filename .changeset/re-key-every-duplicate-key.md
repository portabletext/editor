---
'@portabletext/editor': patch
---

fix: re-key every repeat of a duplicate sibling `_key` that arrives in patches

When patches sent to the editor repeat a `_key` among blocks, or among the spans and inline objects of one block, every repeat after the first now gets a new key. This is how remote changes reach the editor. Previously only the second copy was re-keyed, so a third copy kept the duplicate key and React warned about two children with the same key:

```ts
editor.send({
  type: 'patches',
  patches: [
    {
      type: 'set',
      path: [],
      value: [
        {_type: 'block', _key: 'b1', children: [{_type: 'span', _key: 's1', text: 'one'}]},
        {_type: 'block', _key: 'b1', children: [{_type: 'span', _key: 's2', text: 'two'}]},
        {_type: 'block', _key: 'b1', children: [{_type: 'span', _key: 's3', text: 'three'}]},
      ],
    },
  ],
  snapshot: undefined,
})
// Previously the block keys ended as 'b1', <new key>, 'b1'
```

Values passed as `initialValue` or through `update value`, and the children of containers, were already re-keyed in full.
