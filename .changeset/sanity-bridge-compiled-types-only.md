---
'@portabletext/sanity-bridge': major
---

feat!: convert compiled Sanity schema types only in `@portabletext/sanity-bridge`

`sanitySchemaToPortableTextSchema` now takes a compiled Sanity array type only, and `sanitySchemaDefinitionToPortableTextSchema` is removed. Passing a raw (uncompiled) definition throws an error telling you to compile it first, where it was previously compiled for you. The package no longer depends on `@sanity/schema` at runtime.

To migrate, compile your definitions with `Schema.compile` from `@sanity/schema`, together with every type they reference by name, and pass the array type you get from `.get(name)`:

```ts
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import {Schema} from '@sanity/schema'

// Before
sanitySchemaToPortableTextSchema(richText)
sanitySchemaDefinitionToPortableTextSchema(richText, {types: [customUrl]})

// After
const sanitySchema = Schema.compile({
  name: 'default',
  types: [richText, customUrl],
})
sanitySchemaToPortableTextSchema(sanitySchema.get('richText'))
```

Passing a compiled type that is not an array still throws, and still explains when the name collides with one of Sanity's built-in types. A field or array member type that is merely named like a built-in, such as a `string` field, no longer gets that collision hint.
