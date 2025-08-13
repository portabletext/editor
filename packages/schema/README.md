# `@portabletext/schema`

A TypeScript library for defining and compiling Portable Text schemas with full type safety and editor support.

## Installation

```bash
npm install @portabletext/schema
```

## Usage

### Define a Schema

```ts
import {defineSchema} from '@portabletext/schema'

const schemaDefinition = defineSchema({
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'blockquote'}],
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link'}],
  lists: [{name: 'bullet'}, {name: 'numbered'}],
})
```

### Compile Schema

```ts
import {compileSchema} from '@portabletext/schema'

const schema = compileSchema(schemaDefinition)
```
