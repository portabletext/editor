import {Schema as SanitySchema} from '@sanity/schema'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ArraySchemaType,
  type PortableTextBlock,
  type SchemaType,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {
  createPortableTextMemberSchemaTypes,
  createPortableTextMemberSchemaTypesFromOf,
} from './portable-text-member-schema-types'

function compile(types: ReadonlyArray<unknown>) {
  return SanitySchema.compile({
    name: 'test',
    types: types as Parameters<typeof SanitySchema.compile>[0]['types'],
  }).get('content') as ArraySchemaType<PortableTextBlock>
}

describe(createPortableTextMemberSchemaTypesFromOf.name, () => {
  test('called with the root `of`, produces the same shape as the public entry point', () => {
    const root = compile([
      defineType({
        name: 'content',
        type: 'array',
        of: [
          defineArrayMember({type: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'image',
            fields: [defineField({name: 'src', type: 'string'})],
          }),
        ],
      }),
    ])

    expect(
      createPortableTextMemberSchemaTypesFromOf(root, root.of ?? []),
    ).toEqual(createPortableTextMemberSchemaTypes(root))
  })

  test('called with a non-root `of`, buckets that `of` -- not the root', () => {
    // The root carries `image` as a block object; the foreign `of` we
    // pass instead carries `caption`. The result must reflect the
    // foreign `of` (caption), not the root (image).
    const root = compile([
      defineType({
        name: 'content',
        type: 'array',
        of: [
          defineArrayMember({type: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'image',
            fields: [defineField({name: 'src', type: 'string'})],
          }),
        ],
      }),
    ])

    const foreignOf = compile([
      defineType({
        name: 'content',
        type: 'array',
        of: [
          defineArrayMember({type: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'caption',
            fields: [defineField({name: 'text', type: 'string'})],
          }),
        ],
      }),
    ]).of as ReadonlyArray<SchemaType>

    const result = createPortableTextMemberSchemaTypesFromOf(root, foreignOf)

    expect(result.blockObjects.map((t) => t.name)).toEqual(['caption'])
  })

  test('`portableText` always points at the root, even when bucketizing a non-root `of`', () => {
    const root = compile([
      defineType({
        name: 'content',
        type: 'array',
        of: [
          defineArrayMember({type: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'image',
            fields: [defineField({name: 'src', type: 'string'})],
          }),
        ],
      }),
    ])

    const foreignOf = compile([
      defineType({
        name: 'content',
        type: 'array',
        of: [
          defineArrayMember({type: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'caption',
            fields: [defineField({name: 'text', type: 'string'})],
          }),
        ],
      }),
    ]).of as ReadonlyArray<SchemaType>

    expect(
      createPortableTextMemberSchemaTypesFromOf(root, foreignOf).portableText,
    ).toBe(root)
  })
})
