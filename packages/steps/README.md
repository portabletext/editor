# `@portabletext/steps`

> Map a position across a transaction

A transaction reshapes a Portable Text document: text is typed, a block splits, a span is folded into another. This package turns that reshaping into a small vocabulary of primitive steps (`insert.text`, `remove.text`, `move.text`, `remove.node`, `move.node`, `set.text`, `set.children`, `set.key`), derived from a transaction's Sanity patches, then maps a caret or a selection through them, so a position captured before the transaction still points at the right place after it.

## You might not need this

This is a low-level building block for collaborative and offline scenarios:

- **Editing** with the Portable Text Editor directly? The editor already tracks its own selection through every local change; you don't need to map anything yourself.
- **Applying Sanity patches** to a value without caring where a position ends up? Use [`@portabletext/patches`](https://www.npmjs.com/package/@portabletext/patches) instead.

Reach for this package when you hold a position, your own or a remote collaborator's, that has to survive a transaction it didn't originate from: a server relaying another client's edits, or an offline client rebasing its own selection onto a transaction it received while disconnected.

## Installation

```bash
npm install @portabletext/steps
```

## Usage

`interpretTransaction(base, patches)` derives the steps for a transaction's patches, read against the document value they applied to. `mapPoint(steps, point, options?)` and `mapRange(steps, range)` map a `Point` (`{path, offset}`) or a `Range` (`{anchor, focus}`) through them:

```ts
import {interpretTransaction, mapPoint} from '@portabletext/steps'

const steps = interpretTransaction(value, patches)

const newPoint = mapPoint(steps, {
  path: [{_key: 'b1'}, 'children', {_key: 's1'}],
  offset: 3,
})
```

`mapPoint`'s `affinity` option (default `'forward'`) decides which side of an edit a point sitting exactly on the boundary lands on: forward moves it with an insertion made at that offset, backward leaves it behind. `mapRange` maps both ends with inward affinity, so text inserted exactly at a range's edge never gets swallowed into the range.

## Step kinds

| kind           | shape                                                |
| -------------- | ---------------------------------------------------- |
| `insert.text`  | `{path, offset, length}`                             |
| `remove.text`  | `{path, offset, length}`                             |
| `move.text`    | `{from: {path, offset, length}, to: {path, offset}}` |
| `remove.node`  | `{path}`                                             |
| `move.node`    | `{from, to}`                                         |
| `set.text`     | `{path, length}`                                     |
| `set.children` | `{path, field, oldChildren, newChildren}`            |
| `set.key`      | `{path, newKey}`                                     |

Every step's `path` (or `from`/`to`) ends at the `KeyedSegment` of the node it addresses, never at a numeric or tuple segment.
