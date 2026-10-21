---
'@portabletext/markdown': patch
---

fix: keep untouched table cells intact when another cell is edited

`applyMarkdownEdit` now returns a table cell the edit did not touch exactly as stored, even when a sibling cell in the same table changed, as long as the table's shape survives the markdown round trip. A table whose rows hold different numbers of cells does not, and its untouched cells can still lose what markdown cannot show. Previously the untouched cell was rebuilt from the markdown, so anything markdown cannot show (annotations such as internal links, custom styles and decorators) was dropped from it:

```ts
const stored = [
  {
    _type: 'table',
    _key: 't1',
    rows: [
      {
        _type: 'row',
        _key: 'r1',
        cells: [
          {
            _type: 'cell',
            _key: 'c1',
            value: [
              {
                _type: 'block',
                _key: 'b1',
                style: 'normal',
                markDefs: [
                  {_type: 'internalLink', _key: 'l1', reference: {_ref: 'foo'}},
                ],
                children: [
                  {_type: 'span', _key: 's1', text: 'foo', marks: ['l1']},
                ],
              },
            ],
          },
          {
            _type: 'cell',
            _key: 'c2',
            value: [
              {
                _type: 'block',
                _key: 'b2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
              },
            ],
          },
        ],
      },
    ],
  },
]
const markdown = portableTextToMarkdown(stored).replace('bar', 'baz')
applyMarkdownEdit(stored, markdown)
// Cell `c1` now keeps its `internalLink` definition.
// Previously it came back with `markDefs: []`.
```

The reconciliation report now lists the untouched cell and everything inside it as `content-unchanged`, the same as an untouched top-level block. Those entries report `valueChanged: false`, except where a stored node had no `_key`: the key it gets is not listed, and the nodes containing it report `valueChanged: true`.
