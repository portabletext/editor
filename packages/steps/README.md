# `@portabletext/steps`

> Keep carets, selections and comments in place while a Portable Text document changes under them

Comments, highlights and remote cursors point at text by position. When the document changes, those positions go stale. `@portabletext/steps` reads the patches of a change and tells you where each position ends up, so anything anchored to the text stays on the same text.

```ts
import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {interpretChange, mapPoint, mapRange} from '@portabletext/steps'

const span = [{_key: 'b1'}, 'children', {_key: 's1'}]

// "world", with your caret at the end
const value: Array<PortableTextBlock> = [
  {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', marks: [], text: 'world'}],
    markDefs: [],
  },
]
const caret = {path: span, offset: 5}
const comment = {
  anchor: {path: span, offset: 0},
  focus: {path: span, offset: 5},
}

// A collaborator types "Hello " at the start
const patches: Array<Patch> = [
  {
    type: 'diffMatchPatch',
    path: [...span, 'text'],
    value: '@@ -1,5 +1,11 @@\n+Hello \n world\n',
  },
]

const steps = interpretChange({value}, patches)

mapPoint(steps, caret)
// {path: span, offset: 11}, still after "world"

mapRange(steps, comment)
// offsets 6 to 11, still around "world"
```

If the collaborator had deleted "world" instead, `mapRange(steps, comment)` returns a collapsed range at offset `0` in the now-empty span:

```ts continue
const deletion = interpretChange({value}, [
  {
    type: 'diffMatchPatch',
    path: [...span, 'text'],
    value: '@@ -1,5 +0,0 @@\n-world\n',
  },
])
mapRange(deletion, comment)
// {anchor: {path: span, offset: 0}, focus: {path: span, offset: 0}}
```

## What it understands

Recognizes these Portable Text Editor edits at root and inside containers: typing and deleting text, inserting and deleting inline objects, decorators and annotations, styles and lists, splitting and joining blocks, moving blocks, inserting and deleting text blocks and block objects, cut, and plain-text paste across blocks. Undo and redo of these edits are recognized too. String diffs that rename keys are decoded against the value you pass.

An empty patch list returns an empty step array. Clearing the document with a final `unset []` collapses ranges at the start of the editor's empty first line. Pass that retained empty line as the value for the next edit, including its `setIfMissing []` and `insert before [0]` patches.

Steps describe how positions move, not everything that changed: a new node gives no step. In particular, inserting a block or inline object does not carry a caret into it.

Patches from other writers (SDKs, mutators, Agent Actions and scripts), merged changes, and patch orders the editor never emits are outside the supported input and can return `undefined`. Mapping through `undefined` returns `null`.

## You might not need this

If you edit with the Portable Text Editor, it already moves its own selection. If you only need to apply patches, use [`@portabletext/patches`](https://www.npmjs.com/package/@portabletext/patches).

## Installation

```bash
npm install @portabletext/steps
```

## Reference

### Passing changes

Call `interpretChange` once per change, with `value` set to the document before the patches. Never merge two changes' patches into one call. Map ranges change by change, passing each mapped range to the next change's `mapRange` call. Patches addressed to a whole document start with the field name: keep only your Portable Text field's patches, remove the field name from the start of each path, and start a new call at each `setIfMissing` on the field itself. Every top-level block needs a unique, non-empty `_key`; keys inside a block are checked only in blocks the change touches.

### Functions

| function                                     | returns                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `interpretChange({value, schema?}, patches)` | a `ReadonlyArray<Step>`, or `undefined` for an unrecognized change                                                       |
| `mapPoint(steps, point, {affinity}?)`        | the point after the change, or `null` when no span remains or the steps are `undefined`                                  |
| `mapRange(steps, range)`                     | the range after the change, its ends moved inward, or `null` when either end maps to `null` or the steps are `undefined` |

An empty step array represents a recognized edit that does not move points. Pass `schema` next to `value` for custom block and span types; without it, `interpretChange` uses the default `block` and `span` types. Points must address the value passed to `interpretChange`. Returned points may be frozen.

`mapPoint` defaults to `affinity: 'forward'`. At an insertion offset, forward affinity moves after inserted text and backward affinity stays before it. Inside moved text the point follows it; at its start only forward follows, and at its end only backward follows. A point already where moved text lands stays before it, whatever its affinity. Mapping an unrecognized change returns `null`.

`mapRange` takes `{anchor, focus, backward?}`. Set `backward: true` when the focus comes before the anchor in the document; omit it or pass `false` otherwise. The flag must match the document: `mapRange` never reads the document, and a wrong flag lets typed text at either edge into the range. It maps the start with forward affinity and the end with backward affinity. Text inserted at either edge stays outside. Once the ends meet during a change, the remaining steps map them as one point with backward affinity and return a collapsed range. A range already collapsed maps the same way. The returned `backward` is unchanged, and the key stays omitted when it was omitted in the input. After a dragged block makes the ends cross, they keep their own positions: `backward` is the direction passed in, not their document order.

A `remove.node` step carries `nearest`, the point a caret inside the removed node goes to. It is picked from the document as it was just before that removal: either the end of the last span before the removed node or the start of the first span after it. A previous span that is a sibling of the removed node wins; otherwise the span sharing the longer common path with the removed node wins, and the next span wins a tie. If no span remains, `nearest` is `null`. `mapPoint` follows this point through the later steps too.

### Steps

Only these six kinds occur in `Step`:

| type          | shape                                                |
| ------------- | ---------------------------------------------------- |
| `insert.text` | `{path, offset, length}`                             |
| `remove.text` | `{path, offset, length}`                             |
| `move.text`   | `{from: {path, offset, length}, to: {path, offset}}` |
| `remove.node` | `{path, nearest}`                                    |
| `move.node`   | `{from, to}`                                         |
| `set.key`     | `{path, newKey}`                                     |

An array segment uses a unique nonempty `_key` when available, otherwise its numeric index. Paths reach through nested object fields. A point inside a moved node follows it. Other points stay put. A `remove.node` step removes descendants and shifts later numeric siblings when its path ends in a numeric index.

The public exports are `interpretChange`, `mapPoint`, `mapRange`, and the types `Step`, `Point`, `Range`. Individual step kinds have no exported types. Use `Extract<Step, {type: 'move.text'}>` when you need one kind.
