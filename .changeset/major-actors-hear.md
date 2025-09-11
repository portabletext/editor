---
'@portabletext/editor': minor
---

feat: add `select.block` event

You can now `send`, `raise`, `execute` and `forward` `select.block` events. Under the hood they convert into `select` events. For convenience, you can `select` the block either at the `'start'` or `'end'` (`'start'` is default).

```ts
raise({
  type: 'select.block',
  at: [{_key: firstBlockKey}],
  select: 'start',
})
```
