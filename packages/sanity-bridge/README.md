# `@portabletext/sanity-bridge`

Converts between Sanity schemas and Portable Text schemas.

The main job is `sanitySchemaToPortableTextSchema`. A compiled Sanity
schema is lazy: types resolve through getters and class instances, and
finding out what is allowed inside a Portable Text field means walking
that graph. The editor wants the opposite, one plain, self-contained
object it can read synchronously, serialize, and hand to renderers and
plugins without knowing anything about Sanity. So the bridge walks the
type graph once, up front, and expands it into exactly that: which
styles, lists, decorators, annotations, block objects, and inline
objects a field allows, with every nested block inside a container
carrying the restrictions that apply at that exact position.

Expanding up front is also why the output can be bigger than the schema
that produced it. A type shows up in the output at every position that
embeds it, and self-referencing types are cut off rather than expanded
forever (see "Recursive schemas" below).

## Installation

```bash
npm install @portabletext/sanity-bridge
```

## Usage

### Convert Sanity schema to Portable Text schema

```ts
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import {Schema} from '@sanity/schema'
import {defineField, defineType} from '@sanity/types'

/**
 * Define the Sanity Schema
 */

const imageType = defineType({
  name: 'custom image',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      type: 'string',
    }),
  ],
})

const stockTickerType = defineType({
  name: 'stock-ticker',
  type: 'object',
  fields: [
    defineField({
      name: 'symbol',
      type: 'string',
    }),
  ],
})

const portableTextType = defineType({
  type: 'array',
  name: 'body',
  of: [
    {
      type: 'block',
      name: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H1', value: 'h1'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'H4', value: 'h4'},
        {title: 'H5', value: 'h5'},
        {title: 'H6', value: 'h6'},
        {title: 'Quote', value: 'blockquote'},
      ],
      marks: {
        annotations: [
          {
            name: 'comment',
            type: 'object',
            fields: [{type: 'string', name: 'text'}],
          },
          {
            name: 'link',
            type: 'object',
            fields: [{type: 'string', name: 'href'}],
          },
        ],
      },
      of: [{type: 'stock-ticker'}],
    },
    {type: 'custom image'},
  ],
})

/**
 * Compile the Sanity Schema
 */
const sanitySchema = Schema.compile({
  types: [portableTextType, imageType, stockTickerType],
}).get('body')

/**
 * Turn the Sanity Schema into a Portable Text Schema
 */
const portableTextSchema = sanitySchemaToPortableTextSchema(sanitySchema)
```

#### Container sub-schemas

When a block object holds an array field with a nested `{type: 'block'}`
member (a code block, callout, table cell, ...), the nested block is
resolved from its own Sanity definition: its styles, decorators,
annotations, lists, and inline objects come from that block as Sanity
compiles it, not from the top-level block.

```ts
const codeBlockType = defineType({
  type: 'object',
  name: 'code-block',
  fields: [
    defineField({
      type: 'array',
      name: 'lines',
      of: [
        // A code line: only the `code` style, no marks, no inline objects.
        {
          type: 'block',
          styles: [{title: 'Code', value: 'code'}],
          lists: [],
          marks: {decorators: [], annotations: []},
          of: [],
        },
      ],
    }),
  ],
})
```

In the converted schema the `code-block`'s line carries those restrictions,
so an editor that gates on the sub-schema offers no decorators, annotations,
or headings inside it.

Sanity has no notion of a nested block inheriting from an enclosing block, so
an undeclared property resolves to Sanity's defaults for that block. Declare
whatever a container should allow on the block member itself. The resulting
`Schema` follows the resolution rules documented in
[`@portabletext/schema`](../schema/README.md#containers-and-sub-schemas).

#### Recursive schemas

Schemas are allowed to reference themselves. An accordion whose body is
the same Portable Text array it lives in, or a footnote that carries a
rich-text field of its own, both convert fine; the conversion doesn't
loop forever trying to expand them.

When the conversion runs into a type it is already in the middle of
expanding, it stops and leaves a marker instead of expanding again:

- A named object type becomes a bare reference, just `{type: 'accordion'}`.
  The full declaration still exists at the top level, and that is where
  the editor looks it up.
- An inline object or annotation that loops back into itself gets empty
  `fields` at the point of repetition. Everything up to that point is
  fully declared.

One thing to keep in mind: every place a type is embedded gets its own
resolved sub-schema, so a schema where many types embed each other
produces output that grows with the number of embedding positions, not
just the number of types.

### Keep hold of the original Sanity types

The expanded Portable Text schema is what the editor runs on, but
Studio-side code usually wants the original Sanity types back: they
carry everything the expansion drops, validation rules, previews,
custom components. `createPortableTextMemberSchemaTypes` buckets the
members of a Portable Text array into their Sanity types, so render
callbacks and inputs can join back by name and work with the real
thing.

```ts
import {createPortableTextMemberSchemaTypes} from '@portabletext/sanity-bridge'

const memberTypes = createPortableTextMemberSchemaTypes(sanitySchema)

memberTypes.blockObjects // the original Sanity types, not conversions
memberTypes.inlineObjects
memberTypes.annotations
```

### Resolve the Sanity types at a position

Inside containers, what a position allows depends on where it sits: a
table cell's blocks are not the root's blocks. `getSanitySubSchema`
answers "which Sanity types apply here?" for a path into a value,
walking down to the nearest Portable-Text-shaped ancestor and
bucketizing its members.

```ts
import {getSanitySubSchema} from '@portabletext/sanity-bridge'

const subSchema = getSanitySubSchema(sanitySchema, value, [
  {_key: 'table1'},
  'rows',
  {_key: 'row1'},
  'cells',
  {_key: 'cell1'},
  'content',
  {_key: 'block1'},
])
```

This is the Sanity-side counterpart of the editor's own sub-schema
resolution over the expanded schema. The two answer the same question
in their respective type universes and are meant to agree position for
position.
