---
'@portabletext/block-tools': major
---

feat!: remove `@sanity/types` and `@portabletext/sanity-bridge` dependencies

`htmlToBlocks` now only accepts a compiled `Schema` from `@portabletext/schema`. It no longer accepts a Sanity `ArraySchemaType`.

**Migration:** If you're passing a Sanity `ArraySchemaType` to `htmlToBlocks`, you have two options:

Before:

```ts
import {htmlToBlocks} from '@portabletext/block-tools'

const bodyType = schema.get('blogPost').fields.find(f => f.name === 'body').type
htmlToBlocks(html, bodyType, options)
```

After (Sanity users, using `@portabletext/sanity-bridge`):

```ts
import {htmlToBlocks} from '@portabletext/block-tools'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'

const bodyType = schema.get('blogPost').fields.find(f => f.name === 'body').type
htmlToBlocks(html, sanitySchemaToPortableTextSchema(bodyType), options)
```

After (standalone, using `@portabletext/schema`):

```ts
import {htmlToBlocks} from '@portabletext/block-tools'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(defineSchema({...}))
htmlToBlocks(html, schema, options)
```
