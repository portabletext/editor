import {Schema as SanitySchema} from '@sanity/schema'
import {expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

test('shared named types fail with a diagnostic only above the expanded-tree limit', () => {
  expect(() =>
    sanitySchemaToPortableTextSchema(createSharedTypeSchema(18)),
  ).not.toThrow()

  expect(() =>
    sanitySchemaToPortableTextSchema(createSharedTypeSchema(24)),
  ).toThrowError(
    /Portable Text schema is too large to convert: its expanded tree exceeds 50,000,000 nodes\. Shared types contributing most to the multiplication: t\d+/,
  )
})

function createSharedTypeSchema(typeCount: number) {
  const types = Array.from({length: typeCount}, (_, index) => ({
    name: `t${index}`,
    type: 'object',
    fields:
      index === typeCount - 1
        ? [{name: 'value', type: 'string'}]
        : [
            {
              name: 'first',
              type: 'array',
              of: [{type: `t${index + 1}`}],
            },
            {
              name: 'second',
              type: 'array',
              of: [{type: `t${index + 1}`}],
            },
          ],
  }))
  const schema = SanitySchema.compile({
    name: 'shared-types',
    types: [
      {
        name: 'portableText',
        type: 'array',
        of: [
          {type: 'block'},
          {
            name: 'root',
            type: 'object',
            fields: [{name: 'content', type: 'array', of: [{type: 't0'}]}],
          },
        ],
      },
      ...types,
    ],
  })
  return schema.get('portableText')
}
