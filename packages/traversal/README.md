# @portabletext/traversal

Traverse Portable Text documents without an editor runtime.

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {getNode} from '@portabletext/traversal'

const value = [
  {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', marks: [], text: 'foo'}],
    markDefs: [],
  },
]
const schema = compileSchema(defineSchema({}))

const entry = getNode({context: {value, schema}}, [
  {_key: 'b1'},
  'children',
  {_key: 's1'},
])
// {
//   node: {_key: 's1', _type: 'span', marks: [], text: 'foo'},
//   path: [{_key: 'b1'}, 'children', {_key: 's1'}],
// }
```

Pass a compiled `@portabletext/schema` schema. Without a `containers` registry, every object in the document is a node, annotations and plain objects included, visited in document order. Arrays are part of a path but are not nodes.

Pass `containers` to walk only what the editor walks: root blocks, the children of text blocks, and the arrays of the containers you register.

Paths name every field, so the first span of the first block is `[0, 'children', 0]` or `[{_key: 'b1'}, 'children', {_key: 's1'}]`.
