---
'@portabletext/markdown': patch
---

fix: report hidden losses on stored blocks missing from the `applyMarkdownEdit` result

`applyMarkdownEdit`'s `hiddenLosses` now lists content the markdown could not show (an annotation, decorator, block style, or list-item kind with no renderer) on every stored block whose `_key` is missing from the returned value. Previously those blocks counted as deleted and their losses went unreported. That included a block the edit only rewrote, when it came back with a fresh key, so the hidden content was dropped silently:

```ts
const schema = compileSchema(
  defineSchema({
    annotations: [{name: 'internalLink', fields: [{name: 'ref', type: 'string'}]}],
  }),
)
const stored = [
  {
    _type: 'block',
    _key: 'a',
    style: 'normal',
    markDefs: [{_type: 'internalLink', _key: 'm1', ref: 'doc1'}],
    children: [
      {_type: 'span', _key: 'a1', text: 'Compare with ', marks: []},
      {_type: 'span', _key: 'a2', text: "last year's survey", marks: ['m1']},
    ],
  },
  {
    _type: 'block',
    _key: 'b',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'b1', text: 'Unchanged end.', marks: []}],
  },
]
applyMarkdownEdit(
  stored,
  "See last year's survey for comparison.\n\nNew paragraph.\n\nUnchanged end.",
  {schema, onReconciliation: (report) => console.log(report.hiddenLosses)},
)
// Previously logged: []
// Now logs the dropped `internalLink` annotation on block `a`
```

A plain delete of a block that held such content is now reported too, so decide whether the removal was intended before refusing the write.
