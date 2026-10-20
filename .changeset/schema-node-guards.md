---
'@portabletext/schema': minor
---

feat: add `isTextBlockNode` and `isSpanNode`

`isTextBlockNode` and `isSpanNode` check a node's `_type` against the schema and nothing else. `isTextBlock` also requires `children` and `isSpan` also requires `text`, so they reject a block or span that is still missing those fields. Use the new guards when you need to recognise such a node, for example to repair it.

```ts
import {
  compileSchema,
  defineSchema,
  isSpan,
  isSpanNode,
} from '@portabletext/schema'

const schema = compileSchema(defineSchema({}))
const node = {_type: 'span', _key: 's1'}

isSpan({schema}, node) // false
isSpanNode({schema}, node) // true
```
