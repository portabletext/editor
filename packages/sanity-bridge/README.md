# `@portabletext/sanity-bridge`

A TypeScript library for converting between Sanity schemas and Portable Text schemas, enabling seamless integration between Sanity CMS and Portable Text editors.

## Installation

```bash
npm install @portabletext/sanity-bridge
```

**Peer Dependencies:**

```bash
npm install @sanity/schema @sanity/types
```

## Usage

### Convert Sanity Schema to Portable Text Schema

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
