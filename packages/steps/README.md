# `@portabletext/steps`

> Map a position across a transaction

A transaction reshapes a Portable Text document: text is typed, a block splits, a span is folded into another. This package turns that reshaping into a small vocabulary of primitive steps (`insert.text`, `remove.text`, `move.text`, `insert.node`, `remove.node`, `move.node`, `set.text`, `set.children`, `set.key`), derived from a transaction's Sanity patches, then maps a caret or a selection through them. A mapped position points at the same text after the transaction, or is `null` when that text was removed.

## You might not need this

This is a low-level building block for collaborative and offline scenarios:

- **Editing** with the Portable Text Editor directly? The editor already tracks its own selection through every local change. You don't need to map anything yourself.
- **Applying Sanity patches** to a value without caring where a position ends up? Use [`@portabletext/patches`](https://www.npmjs.com/package/@portabletext/patches) instead.

Reach for this package when you hold a position, your own or a remote collaborator's, that has to survive a transaction it didn't originate from: a server relaying another client's edits, or an offline client rebasing its own selection onto a transaction it received while disconnected.

## Installation

```bash
npm install @portabletext/steps
```

## Usage

`interpretTransaction(base, patches)` derives the steps for a transaction's patches, read against the document value they applied to. `mapPoint(steps, point, options?)` and `mapRange(steps, range)` map a `Point` (`{path, offset}`) or a `Range` (`{anchor, focus}`) through them:

```ts
import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {interpretTransaction, mapPoint} from '@portabletext/steps'

const value: Array<PortableTextBlock> = [
  {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', marks: [], text: 'foo'}],
    markDefs: [],
  },
]
const patches: Array<Patch> = [
  {
    type: 'set',
    path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
    value: 'foobar',
  },
]
const steps = interpretTransaction(value, patches)

const newPoint = mapPoint(steps, {
  path: [{_key: 'b1'}, 'children', {_key: 's1'}],
  offset: 3,
})
```

`mapPoint`'s `affinity` option (default `'forward'`) decides which side of an insertion a point sitting exactly on the boundary lands on: forward moves it with text inserted at that offset, backward leaves it behind. At a `move.text` boundary, the start follows with forward affinity and the end follows with backward affinity, attaching the point to the moved character on its side. `mapRange` maps the document-order start forward and end backward when both are on the same path, so text inserted exactly at a range's edge never gets swallowed into the range.

Pass `affinity: 'both'` to follow inserted text and either edge of moved text, the way a local caret does. `mapRange` takes the same value as `collapsedAffinity` for a collapsed range, which otherwise maps with `'backward'`.

## Step kinds

| kind           | shape                                                |
| -------------- | ---------------------------------------------------- |
| `insert.text`  | `{path, offset, length}`                             |
| `remove.text`  | `{path, offset, length}`                             |
| `move.text`    | `{from: {path, offset, length}, to: {path, offset}}` |
| `insert.node`  | `{path, count}` (numeric insertion position)         |
| `remove.node`  | `{path, index?}`                                     |
| `move.node`    | `{from, to, fromIndex?, toIndex?}`                   |
| `set.text`     | `{path, length}`                                     |
| `set.children` | `{path, field, oldChildren, newChildren}`            |
| `set.key`      | `{path, newKey}`                                     |

After a `move.text` that reaches the end of its source span, a second `move.text` with `length: 0` carries a point at that end to where the moved text ends.

Array segments in step paths (`path`, `from`, and `to`) use a unique non-empty `_key` when available, otherwise the sibling's numeric index. Field names remain string segments, and paths can traverse arrays and object fields at any depth. A `remove.node` step can invalidate a whole subtree, including an object field or the entire value (`[]`).

`insert.node` adds `count` to every index segment at or after its position. `remove.node` subtracts one from every later index segment. It uses `index` for this when its path ends in a key. Both transforms preserve descendant suffixes. The interpreter emits `insert.node` only when a sibling in that array is addressed by index. When a new duplicate makes a key ambiguous, a `move.node` first moves the existing node to its index address. When a removal leaves a key unique again, a `set.key` moves the survivor back to its key address. Points should use the same unique-key-or-index addressing as step paths.

A point inside the moved node rides from `from` to `to`. Every other point shifts as if a node was removed at `fromIndex` and then inserted at `toIndex`. `toIndex` counts positions after that removal. A move without these fields shifts no siblings.

A `remove.node` whose path ends in a key carries the removed node's `index` when a later sibling is addressed by index.

The document-aware functions `interpretTransaction`, `mapRangeInward`, `rangeSurvives`, and `normalizeRangeBoundary` accept an optional `{schema}` (`Schema` from `@portabletext/schema`). They recognize spans and text blocks using that schema, or the compiled default schema (`span` and `block`) when omitted. Text blocks are recognized at any depth, including undeclared containers and object fields. Annotation data in `markDefs` and inline objects are never text. Pass the same schema to all four functions when your span or block type has a custom name. `mapPoint` and `mapRange` operate only on steps and take no schema.
