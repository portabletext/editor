---
'@portabletext/traversal': minor
---

feat: add traversal lookups

`@portabletext/traversal` now looks nodes up by path in a plain Portable Text document, with no editor. Build a snapshot from the document, its schema and the containers from `compileContainers`, then call `getNode`, `hasNode`, `getBlock`, `isBlock`, `getTextBlock`, `getSpan`, `getAnnotation`, `getContainer`, `getChildren` or `getNodes`:

```ts
import {compileContainers, getNode} from '@portabletext/traversal'

const snapshot = {
  context: {
    schema,
    containers: compileContainers(schema, [
      {kind: 'container', type: 'callout', arrayField: 'content'},
    ]),
    value,
  },
}

getNode(snapshot, [1, 'content', 0])
// {node: {_type: 'block', _key: 'b2', ...}, path: [{_key: 'c1'}, 'content', {_key: 'b2'}]}
```

The exported types are `TraversalSnapshot`, `Node`, `ContainerDeclaration`, `BlockObjectDeclaration`, `Containers`, `RegisteredContainer` and `RegisteredPositional`. A snapshot can carry an optional `indexMap` from serialized keyed paths to sibling indexes, which lookups use as a shortcut only after checking that the node at that index has the expected `_key`. A negative index counts once from the end, as in patches.
