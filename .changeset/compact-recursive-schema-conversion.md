---
'@portabletext/sanity-bridge': patch
---

fix: fall back to a compact conversion for recursive schemas in `sanitySchemaToPortableTextSchema`

A schema where several inline objects or annotations carry a rich-text field that allows them again now converts in about 100 ms. Every nested block used to expand all of those types again, so the output multiplied with each one: five inline objects ran out of memory, which in Studio left the document on "Loading" until the tab crashed or the conversion gave up:

```ts
import {compileSchema} from '@portabletext/schema'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import {Schema} from '@sanity/schema'

const inlineObjects = ['callout', 'footnote', 'quote', 'sidenote', 'aside']

const schema = Schema.compile({
  name: 'default',
  types: [
    {
      name: 'body',
      type: 'array',
      of: [{type: 'block', of: inlineObjects.map((name) => ({type: name}))}],
    },
    ...inlineObjects.map((name) => ({
      name,
      type: 'object',
      fields: [{name: 'content', type: 'body'}],
    })),
  ],
})

// Previously ran out of memory
compileSchema(sanitySchemaToPortableTextSchema(schema.get('body')))
```

A schema whose full conversion expands inline objects and annotations at most 100,000 times produces exactly the same output as before. Past that, the schema gets a compact form, which reuses each inline object and annotation instead of expanding it again, and leaves out a nested block's lists where `compileSchema` fills them in from the root. In the compact form, some positions nested several levels deep inside recursive structures resolve an object type with no fields, so content inserted there, for example by pasting, loses those fields.
