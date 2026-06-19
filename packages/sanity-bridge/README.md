# `@portabletext/sanity-bridge`

A TypeScript library for converting between Sanity schemas and Portable Text schemas, enabling seamless integration between Sanity CMS and Portable Text editors.

## Installation

```bash
npm install @portabletext/sanity-bridge
```

## Usage

### Convert Sanity Schema to Portable Text Schema

```ts
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

### Convert Portable Text Schema to Sanity Schema

```ts
import {compileSchemaDefinitionToPortableTextMemberSchemaTypes} from '@portabletext/sanity-bridge'

// Convert Portable Text schema definition to Sanity types
const sanityMemberTypes =
  compileSchemaDefinitionToPortableTextMemberSchemaTypes({
    styles: [{name: 'normal'}, {name: 'h1'}],
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link'}],
    blockObjects: [{name: 'image', fields: [{name: 'url', type: 'url'}]}],
  })
```

### Additional helper functions

```ts
import {
  createPortableTextMemberSchemaTypes,
  portableTextMemberSchemaTypesToSchema,
} from '@portabletext/sanity-bridge'

// Extract Portable Text member types from Sanity schema
const memberTypes = createPortableTextMemberSchemaTypes(sanityPortableTextType)

// Convert to first-class Portable Text schema
const portableTextSchema = portableTextMemberSchemaTypesToSchema(memberTypes)
```
