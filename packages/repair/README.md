# `@portabletext/repair`

> Structural corrections for Portable Text values

A Portable Text value can arrive structurally broken: a block without `_type`, a node without `_key`, two siblings sharing a key, a span without `text`, a text block without `children`. Code that walks or patches such a value can't address nodes reliably, so the Portable Text Editor corrects these five flaws before anything else. This package exposes the same rules, so other code that writes Portable Text can make a value structurally sound the same way the editor does.

## You might not need this

The Portable Text Editor already runs these rules on its own value whenever it changes. Reach for this package only when you handle Portable Text outside the editor and need it to come out structurally sound, such as a server or sync layer that receives values from other writers.

## Installation

```bash
npm install @portabletext/repair
```

## Usage

`getStructuralCorrection(context, entry)` looks at one node and returns the first correction it needs, or `undefined` when the node is sound. A correction names the rule that found the flaw in `type` and carries the `patches` that fix it, typed as `@portabletext/patches` patches. Apply the patches in order, then ask again for the same node until no correction is returned, since one node can need more than one.

```ts
import {getStructuralCorrection} from '@portabletext/repair'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(defineSchema({}))

const value = [
  {_type: 'block', _key: 'b1', children: []},
  {_type: 'block', _key: 'b1', children: []},
]

getStructuralCorrection(
  {schema, keyGenerator: () => crypto.randomUUID()},
  {
    node: value[1],
    path: [1],
    parent: undefined,
    siblings: () => value,
  },
)
// => {
//   type: 'duplicate-key',
//   patches: [{type: 'set', path: [1, '_key'], value: '...'}],
// }
```

The entry describes the node and where it sits:

| Field      | Meaning                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| `node`     | The node to check. It's `unknown` because it may be broken                              |
| `path`     | The node's path in the value                                                            |
| `parent`   | The parent node and its path, or `undefined` for a block at the root                    |
| `siblings` | A function returning the array that holds the node, used only by the duplicate key rule |

`siblings` may return `undefined` when you already know the array has no duplicate keys, which skips the scan.

## Rules

The rules run in this order, and the first one that applies wins:

| Rule               | Flaw                                      | Correction                                                             |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------- |
| `missing-type`     | A node has no `_type`                     | The span type inside a text block, the text block type everywhere else |
| `missing-key`      | A node's `_key` is missing or empty       | A key from `keyGenerator`                                              |
| `duplicate-key`    | A later sibling repeats the node's `_key` | A new key for the later sibling, addressed by index                    |
| `span-text`        | A span's `text` isn't a string            | `''`                                                                   |
| `missing-children` | A text block's `children` isn't an array  | `[]`                                                                   |

Anything else, such as missing `markDefs`, adjacent spans with the same marks or an empty text block, is left to the caller.
