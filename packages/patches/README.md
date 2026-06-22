# `@portabletext/patches`

> Apply Sanity patches to a value

Patches are the small mutation operations Sanity and the Portable Text Editor emit to describe a change: set a field, insert into an array, increment a number. This package builds those patches and applies them to a plain JavaScript value, returning the patched value, so you can replay edits locally without going through a Sanity client. It works on any JSON-compatible value, not just Portable Text.

## You might not need this

This is a low-level building block, and most apps never apply patches by hand:

- **Rendering** Portable Text? Use a serializer like [`@portabletext/react`](https://www.portabletext.org/rendering/react/) or [`@portabletext/to-html`](https://www.portabletext.org/rendering/html/), not this.
- **Editing** with the Portable Text Editor and you just want the new value? Read `event.value` off the `mutation` event; the editor has already applied the patches for you.
- **Using Sanity?** The Sanity client and Studio apply patches to your documents for you.

Reach for this package only when you have to apply Sanity patches to a value yourself, outside those flows, such as a server replaying the patches an editor sends over the wire.

## Installation

```bash
npm install @portabletext/patches
```

## Usage

`applyAll(value, patches)` applies an array of patches in order and returns a new value, without mutating the input. Build the patches with the helper functions, each of which takes the target `path` as its last argument:

```ts
import {applyAll, insert, set} from '@portabletext/patches'

applyAll({title: 'Hello'}, [set('Hello, world!', ['title'])])
// => {title: 'Hello, world!'}

applyAll({items: ['a', 'c']}, [insert(['b'], 'after', ['items', 0])])
// => {items: ['a', 'b', 'c']}
```

A `path` is an array of segments, where each segment is an object key (`'title'`), an array index (`0`), or a keyed array reference (`{_key: 'abc'}`). It defaults to `[]`, the value itself.

## Patch builders

| Builder                               | Effect                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `set(value, path)`                    | Set the value at `path`                                                                  |
| `setIfMissing(value, path)`           | Set the value at `path` only if nothing is there yet                                     |
| `unset(path)`                         | Remove the value at `path`                                                               |
| `insert(items, position, path)`       | Insert `items` `'before'`, `'after'`, or in place of (`'replace'`) the element at `path` |
| `diffMatchPatch(current, next, path)` | Apply the diff between two strings to the string at `path`                               |

`inc` and `dec` patches (increment or decrement the number at `path` by `value`) have no builder, so pass them as plain objects:

```ts
applyAll({count: 0}, [{type: 'inc', path: ['count'], value: 2}])
// => {count: 2}
```

## With the Portable Text Editor

The editor's `patch` events each carry one of these patches. Here is a full editor that keeps its own copy of the value by replaying those patches with `applyAll`, rendered live next to the editing surface:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
import {applyAll} from '@portabletext/patches'
import {useState} from 'react'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
})

export function Editor() {
  // Our own copy of the value, rebuilt from each patch the editor emits.
  const [value, setValue] = useState<Array<PortableTextBlock>>([])

  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            // Redundant in a single app: the `mutation` event already carries
            // the finished `value`. This just shows `applyAll` on a real
            // patch stream.
            setValue((current) => applyAll(current, [event.patch]))
          }
        }}
      />
      <PortableTextEditable />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </EditorProvider>
  )
}
```

As the comment notes, this is redundant in a single app: the editor's `mutation` event already carries the finished `value`, so listen for that and use `event.value` instead. `applyAll` earns its place only when you have the patches but not the value, such as a server or secondary store replaying them onto its own copy.
