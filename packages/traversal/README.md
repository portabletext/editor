# `@portabletext/traversal`

> Find, compare and walk the nodes of any Portable Text document

A Portable Text document is an array of blocks, and blocks hold spans, inline objects and sometimes more blocks. A path points at one node in that tree, one segment per step down: `[{_key: 'b1'}, 'children', {_key: 's1'}]` is the span with key `s1` in the `children` of the block with key `b1`.

Comparing two paths looks easy and isn't. A keyed segment like `{_key: 'b1'}` is a new object every time it is built, so `===` never matches it, and a deep equality check also compares any other properties it carries. The same node can also be reached by key or by index, `[{_key: 'b1'}]` or `[0]`, but only the key keeps pointing at that block after another block is inserted before it. These functions compare keyed segments by `_key` and numbers and strings by identity, and they never treat a key and an index as the same segment. They compare path syntax only and never read a document.

This release compares paths. Finding and walking the nodes of a document come in later releases.

## Installation

```sh
npm install @portabletext/traversal
```

## Usage

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
