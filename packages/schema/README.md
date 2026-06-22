# `@portabletext/schema`

A TypeScript library for defining and compiling Portable Text schemas with full type safety and editor support.

## Installation

```bash
npm install @portabletext/schema
```

## Usage

### Define a schema

```ts
import {defineSchema} from '@portabletext/schema'

const schemaDefinition = defineSchema({
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'blockquote'}],
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link'}],
  lists: [{name: 'bullet'}, {name: 'numbered'}],
})
```

### Compile schema

```ts
import {compileSchema} from '@portabletext/schema'

const schema = compileSchema(schemaDefinition)
```

## Containers and sub-schemas

A block object can act as a _container_: one of its fields is an array whose
`of` includes a `{type: 'block'}` member, which declares the text sub-schema
allowed inside it. This is how a code block, callout, or table cell restricts
what can be typed within it.

```ts
const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
  styles: [{name: 'normal'}, {name: 'h1'}],
  blockObjects: [
    {
      name: 'code-block',
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: [
            // A code line: a `code` style only, and no decorators.
            {type: 'block', styles: [{name: 'code'}], decorators: []},
          ],
        },
      ],
    },
  ],
})
```

Use `getSubSchema` to resolve what is allowed at a position inside a
container. It returns a `Schema` you can treat like any top-level one:

```ts
import {compileSchema, getSubSchema} from '@portabletext/schema'

const schema = compileSchema(schemaDefinition)
const codeBlock = schema.blockObjects.find((type) => type.name === 'code-block')
const lines = codeBlock.fields.find((field) => field.name === 'lines')

const subSchema = getSubSchema(schema, lines.of)
// subSchema.decorators === []                 (the code line forbids decorators)
// subSchema.styles     === [{name: 'code', ...}] (only the `code` style)
```

### How a nested block overrides and inherits

Each of `styles`, `decorators`, `annotations`, `lists`, and `inlineObjects`
resolves independently:

- **Declared** overrides for that property.
- **Declared empty** (`[]`) overrides to nothing, e.g. `decorators: []`
  forbids every decorator inside the container.
- **Absent** inherits from the nearest enclosing container that declares a
  block, or the root when none does.

There is no merging: a property is either declared here or taken whole from a
single source. An absent property resolves against the **nearest enclosing
container** whose block declares it, so a block nested inside a container that
restricts its own text inherits that restriction rather than the document
root. It falls back to the root only when no enclosing container declares a
block of its own (e.g. structural `table` → `row` → `cell` wrappers, where the
cell's text inherits the document). A nested block never blends multiple
ancestors; it takes exactly one inherited value. When the `of` has no
`{type: 'block'}` member at all, the container allows objects only, with no
text formatting.
