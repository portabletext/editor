---
'@portabletext/sanity-bridge': patch
---

fix: let nested blocks inherit the root inline objects and annotations in `sanitySchemaToPortableTextSchema`

A schema where several inline objects or annotations each carry a Portable Text field that allows them again now converts in milliseconds. Every nested block used to repeat all of them in full, so the output grew with every combination of those types: four inline objects produced a 307 MB definition, and five ran out of memory, which in Studio left the document on "Loading" until the tab crashed:

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

A nested block that allows exactly the root block's inline objects or annotations now leaves them out of its definition, and `compileSchema` and `getSubSchema` resolve them to the root's. What each position allows is unchanged. Nested blocks that declare their own inline objects or annotations still list them in full. In schemas where types embed each other in a cycle, where the conversion has to cut the expansion off, some positions three or more levels deep now resolve an object's fields where they used to come out empty, and a few now come out empty where they used to resolve.
