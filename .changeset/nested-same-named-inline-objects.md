---
'@portabletext/sanity-bridge': patch
---

fix: keep fields of an inline object nested in a same-named inline object in `sanitySchemaToPortableTextSchema`

An inline object declared inside another inline object with the same name but different fields now converts with its own fields:

```ts
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
          name: 'card',
          type: 'object',
          fields: [
            {
              name: 'cards',
              type: 'array',
              of: [
                {
                  name: 'card',
                  type: 'object',
                  fields: [{name: 'label', type: 'string'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

sanitySchemaToPortableTextSchema(schema.get('body')).blockObjects
// The inner `card` in the `cards` field now converts as
// {type: 'object', name: 'card', title: 'Card', fields: [{name: 'label', ...}]}
// Previously: {type: 'card', title: 'Card'}
```

The inner `card` used to come out as a bare reference to the name `card`, so the editor gave it the outer `card`'s `cards` field instead of its own `label` field. Schemas where a type really contains itself convert as before.
