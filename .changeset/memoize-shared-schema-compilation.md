---
'@portabletext/schema': patch
---

fix: compile shared schema objects once per block inheritance in `compileSchema`

A schema definition that reuses the same field or object at several positions, like the output of `sanitySchemaToPortableTextSchema`, now compiles each reused object once instead of once per position. A chain of types that each list the next type twice used to run out of memory at 24 levels and now compiles in under a millisecond:

```ts
import {compileSchema, type InlineObjectOfDefinition} from '@portabletext/schema'

let member: InlineObjectOfDefinition = {
  type: 'object',
  name: 't23',
  fields: [{name: 'value', type: 'string'}],
}
for (let index = 22; index >= 0; index--) {
  member = {
    type: 'object',
    name: `t${index}`,
    fields: [
      {name: 'first', type: 'array', of: [member]},
      {name: 'second', type: 'array', of: [member]},
    ],
  }
}

// Previously ran out of memory
compileSchema({
  blockObjects: [
    {name: 'root', fields: [{name: 'content', type: 'array', of: [member]}]},
  ],
})
```

The compiled schema is unchanged. Where the definition shares an object, the compiled schema shares the compiled object too.
