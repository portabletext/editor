# `@portabletext/traversal`

> Find, compare and walk the nodes of any Portable Text document

A Portable Text document is an array of blocks, and blocks hold spans, inline objects and sometimes more blocks. A path points at one node in that tree, one segment per step down: `[{_key: 'b1'}, 'children', {_key: 's1'}]` is the span with key `s1` in the `children` of the block with key `b1`.

This package looks nodes up by path in a plain document, with no editor: the node at a path, whether it is a block, a span, an annotation or a container, its children, and every node below it in document order. It also compares paths. A keyed segment like `{_key: 'b1'}` is a new object every time it is built, so `===` never matches it, and the same node can be reached by key or by index, `[{_key: 'b1'}]` or `[0]`, but only the key keeps pointing at that block after another block is inserted before it. The comparisons match keyed segments by `_key` and never treat a key and an index as the same segment.

## Installation

```sh
npm install @portabletext/traversal
```

## Usage

### The snapshot

Every lookup takes a snapshot: the document, the schema it follows and the containers that give block objects child nodes.

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {compileContainers} from '@portabletext/traversal'

const schema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
    ],
  }),
)

const snapshot = {
  context: {
    schema,
    containers: compileContainers(schema, [
      {kind: 'container', type: 'callout', arrayField: 'content'},
    ]),
    value: [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['l1']}],
        markDefs: [{_type: 'link', _key: 'l1', href: 'https://example.com'}],
      },
      {
        _type: 'callout',
        _key: 'c1',
        content: [
          {
            _type: 'block',
            _key: 'b2',
            children: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
            markDefs: [],
          },
        ],
      },
    ],
  },
}
```

A snapshot can also carry an `indexMap`: a map from a node's serialized keyed path (`[_key=="c1"].content[_key=="b2"]`) to its index among its siblings. With it, a keyed lookup jumps straight to the node instead of scanning its siblings for the key. The map is only a shortcut: a lookup uses an entry only when the node at that index has the expected `_key`, and scans otherwise, so a missing or stale map gives the same answers.

### Paths

Node segments are keyed segments or indexes, and a field name sits between every two of them. A negative index counts once from the end, so `-1` is the last node, and an index outside the array names no node. A compact path such as `[0, 0]`, with no field name between the node segments, names no node either.

A path that goes on past a node into its data, such as `[{_key: 'i1'}, 'caption']` or a field the node doesn't have, means the node that owns the data. Lookups return the node's own path, keyed wherever the node has a `_key`, so it can be passed straight to the next call.

A lookup that finds no node returns `undefined`, `[]` or `false`.

### `compileContainers`

Resolves container declarations against a schema. A declaration names an object type and the array field that holds its child nodes. Declarations nested in `of` apply only to the children of that container, where a `{kind: 'blockObject', type}` entry makes `type` a block object even if a top-level declaration makes it a container. A declaration that doesn't match the schema is skipped with a `console.warn`.

```ts continue
const tableSchema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
)

const containers = compileContainers(tableSchema, [
  {
    kind: 'container',
    type: 'table',
    arrayField: 'rows',
    of: [
      {
        kind: 'container',
        type: 'row',
        arrayField: 'cells',
        of: [{kind: 'container', type: 'cell', arrayField: 'content'}],
      },
    ],
  },
])
```

### `getNode` and `hasNode`

`getNode` gets the node at a path, with the path that identifies it. `hasNode` checks whether there is one.

```ts continue
import {getNode, hasNode} from '@portabletext/traversal'

getNode(snapshot, [1, 'content', 0])
// {node: {_type: 'block', _key: 'b2', ...}, path: [{_key: 'c1'}, 'content', {_key: 'b2'}]}

hasNode(snapshot, [{_key: 'b3'}]) // false
```

### `isBlock`, `getBlock`, `getTextBlock` and `getSpan`

A node is a block anywhere but in a text block's `children`. `getTextBlock` and `getSpan` also check the node's type.

```ts continue
import {getSpan, getTextBlock, isBlock} from '@portabletext/traversal'

isBlock(snapshot, [{_key: 'c1'}]) // true
isBlock(snapshot, [{_key: 'b1'}, 'children', {_key: 's1'}]) // false

getTextBlock(snapshot, [{_key: 'c1'}, 'content', {_key: 'b2'}])
// {node: {_type: 'block', _key: 'b2', ...}, path: [{_key: 'c1'}, 'content', {_key: 'b2'}]}

getSpan(snapshot, [0, 'children', -1])
// {node: {_type: 'span', _key: 's1', text: 'foo', marks: ['l1']}, path: [{_key: 'b1'}, 'children', {_key: 's1'}]}
```

### `getAnnotation`

Annotations live in a text block's `markDefs`, outside its `children`, so `getNode` doesn't return them.

```ts continue
import {getAnnotation} from '@portabletext/traversal'

getAnnotation(snapshot, [{_key: 'b1'}, 'markDefs', {_key: 'l1'}])
// {node: {_type: 'link', _key: 'l1', href: 'https://example.com'}, path: [{_key: 'b1'}, 'markDefs', {_key: 'l1'}]}
```

### `getContainer`

Gets the node at a path if its type is declared as a container at that position.

```ts continue
import {getContainer} from '@portabletext/traversal'

getContainer(snapshot, [{_key: 'c1'}])
// {node: {_type: 'callout', _key: 'c1', content: [...]}, path: [{_key: 'c1'}]}
```

### `getChildren`

Gets the child nodes of the node at a path, or the blocks of the document for the empty path.

```ts continue
import {getChildren} from '@portabletext/traversal'

getChildren(snapshot, [{_key: 'c1'}])
// [{node: {_type: 'block', _key: 'b2', ...}, path: [{_key: 'c1'}, 'content', {_key: 'b2'}]}]
```

### `getNodes`

Yields every node below a path (the whole document by default), parents before their children. `from` and `to` limit it to the nodes between two paths in document order, both included, along with the ancestors of `from`. `reverse` visits siblings last to first, and `match` filters what is yielded.

```ts continue
import {isSpan} from '@portabletext/schema'
import {getNodes} from '@portabletext/traversal'

const spans = getNodes(snapshot, {
  from: [{_key: 'b1'}],
  to: [{_key: 'c1'}, 'content', {_key: 'b2'}, 'children', {_key: 's2'}],
  match: (node) => isSpan(snapshot.context, node),
})

for (const {node, path} of spans) {
  console.log(node._key, path)
}
// s1 [{_key: 'b1'}, 'children', {_key: 's1'}]
// s2 [{_key: 'c1'}, 'content', {_key: 'b2'}, 'children', {_key: 's2'}]
```

### `isKeyedSegment`

Checks whether a path segment is a keyed segment, an object with a `_key`.

```ts
import {isKeyedSegment} from '@portabletext/traversal'

isKeyedSegment({_key: 'b1'}) // true
isKeyedSegment('children') // false
```

### `pathEquals`

Checks whether two paths have the same segment at every position.

```ts
import {pathEquals} from '@portabletext/traversal'

pathEquals(
  [{_key: 'b1'}, 'children', {_key: 's1'}],
  [{_key: 'b1'}, 'children', {_key: 's1'}],
) // true
```

### `pathContains`

Checks whether the first path equals the second, or whether the second path lives anywhere inside the first path's subtree. The empty path contains every path.

```ts
import {pathContains} from '@portabletext/traversal'

pathContains([{_key: 'b1'}], [{_key: 'b1'}, 'children', {_key: 's1'}]) // true
```
