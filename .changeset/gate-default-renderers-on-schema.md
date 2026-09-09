---
'@portabletext/markdown': minor
---

feat: gate the default markdown renderers on the schema in `portableTextToMarkdown`

`portableTextToMarkdown` now accepts an optional `schema`. When set, each built-in type renderer (`callout`, `code`, `horizontal-rule`, `html`, `image`, `table`) runs only when the schema declares that type at the matching position (`blockObjects` for a block, `inlineObjects` for an inline object); an undeclared type falls back to `unknownType`, whose default output is a `json:object` fence (or tagged code span, inline) that reparses back to the same value under the same schema. Renderers you pass in `types` are never gated. The gate checks the type name only, so declare each type with its fields: `markdownToPortableText` cannot rebuild a value from a fieldless declaration. Omit `schema` and every default renderer stays active, as before.


```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {portableTextToMarkdown} from '@portabletext/markdown'

const schema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'code',
        fields: [
          {name: 'code', type: 'string'},
          {name: 'language', type: 'string'},
        ],
      },
    ],
  }),
)

portableTextToMarkdown(blocks, {schema})
// a `code` block renders as a fenced code block; a `table` block
// (undeclared) renders as a `json:object` fence instead
```

Pass the same schema to `markdownToPortableText` to keep the round trip consistent.
