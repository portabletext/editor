---
'@portabletext/sanity-bridge': patch
---

fix: expand anonymous objects nested inside anonymous objects in `sanitySchemaToPortableTextSchema`

An anonymous object inside another anonymous object now converts with its fields. A table block object with anonymous rows and cells is the common shape, and compiling its conversion used to throw:

```ts
import {compileSchema} from '@portabletext/schema'
import {sanitySchemaToPortableTextSchema} from '@portabletext/sanity-bridge'
import {Schema} from '@sanity/schema'

const schema = Schema.compile({
  name: 'default',
  types: [
    {
      name: 'body',
      type: 'array',
      of: [
        {type: 'block'},
        {
          name: 'table',
          type: 'object',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          fields: [{name: 'content', type: 'string'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

compileSchema(sanitySchemaToPortableTextSchema(schema.get('body')))
// Previously threw: TypeError: Cannot read properties of undefined (reading 'map')
```

The cells came out without `fields`, and the editor runs the same `compileSchema` on its `schemaDefinition`, so an editor given this schema failed to start.

An anonymous object that contains itself through a named array type now converts too: it expands once, and its repeat inside itself has an empty field list.

```ts
const schema = Schema.compile({
  name: 'default',
  types: [
    {
      name: 'rows',
      type: 'array',
      of: [{type: 'object', fields: [{name: 'children', type: 'rows'}]}],
    },
    {
      name: 'body',
      type: 'array',
      of: [
        {type: 'block'},
        {name: 'table', type: 'object', fields: [{name: 'rows', type: 'rows'}]},
      ],
    },
  ],
})

compileSchema(sanitySchemaToPortableTextSchema(schema.get('body')))
// Previously threw the same `TypeError`
```
