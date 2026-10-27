---
'@portabletext/markdown': patch
---

fix: leave the blocks passed to `portableTextToMarkdown` unchanged

`portableTextToMarkdown` no longer writes a generated `_key` into blocks that are passed in without one. The keys only exist on an internal copy now, so the output is the same, and the caller's value is left exactly as it was.

```ts
const blocks = [
  {
    _type: 'block',
    listItem: 'number',
    level: 1,
    children: [{_type: 'span', text: 'foo'}],
  },
]

portableTextToMarkdown(blocks)

blocks[0]._key
// Previously: a random key such as '507fef1a166e'
// Now: undefined
```
