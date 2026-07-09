import {getSubSchema, type Schema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import type {ArraySchemaType, PortableTextBlock} from '@sanity/types'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {getSanitySubSchema} from './get-sanity-sub-schema'
import type {PortableTextMemberSchemaTypes} from './portable-text-member-schema-types'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

/**
 * `getSanitySubSchema` and `@portabletext/schema`'s `getSubSchema`
 * answer "what is allowed at this position?" in two type universes,
 * raw Sanity types versus the expanded Portable Text schema. Nothing
 * forces them to agree except these tests: a change to container
 * resolution on either side that drifts the answers would let the
 * editor permit one thing at a position while Studio validates
 * another, with both sides looking self-consistently correct.
 *
 * The correspondence relation: Portable Text names map to Sanity
 * `value`s for styles, lists, and decorators, and to type names for
 * everything else.
 */
describe('sub-schema agreement across the two type universes', () => {
  const sanitySchema = SanitySchema.compile({
    name: 'agreement',
    types: [
      defineType({
        type: 'object',
        name: 'codeAnnotation',
        fields: [defineField({type: 'string', name: 'note'})],
      }),
      defineType({
        type: 'object',
        name: 'callout',
        fields: [defineField({type: 'string', name: 'tone'})],
      }),
      defineType({
        type: 'object',
        name: 'code-block',
        fields: [
          defineField({
            type: 'array',
            name: 'lines',
            of: [
              defineArrayMember({
                type: 'block',
                name: 'block',
                styles: [{title: 'Code', value: 'code'}],
                lists: [],
                marks: {
                  decorators: [{title: 'Hex', value: 'hex'}],
                  annotations: [],
                },
                of: [defineArrayMember({type: 'codeAnnotation'})],
              }),
            ],
          }),
        ],
      }),
      defineType({
        type: 'array',
        name: 'content',
        of: [
          defineArrayMember({
            type: 'block',
            name: 'block',
            marks: {
              annotations: [
                {
                  name: 'link',
                  type: 'object',
                  fields: [{name: 'href', type: 'string'}],
                },
              ],
            },
          }),
          defineArrayMember({type: 'code-block'}),
          defineArrayMember({type: 'callout'}),
        ],
      }),
    ],
  })
  const rootType = sanitySchema.get(
    'content',
  ) as ArraySchemaType<PortableTextBlock>
  const convertedSchema = sanitySchemaToPortableTextSchema(rootType)

  const value: ReadonlyArray<PortableTextBlock> = [
    {
      _type: 'code-block',
      _key: 'cb1',
      lines: [
        {
          _type: 'block',
          _key: 'line1',
          style: 'code',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['hex']}],
          markDefs: [],
        },
      ],
    } as unknown as PortableTextBlock,
  ]

  test('Scenario: The root position resolves the same members on both sides', () => {
    expect(portableTextNames(convertedSchema)).toEqual(
      sanityNames(getSanitySubSchema(rootType, value, [])),
    )
  })

  test('Scenario: A restricted nested block resolves the same members on both sides', () => {
    // Portable Text side: the `of` at the code-block's `lines` field in
    // the expanded schema. This navigation follows declarations by
    // name, it is deliberately not a resolver, so the resolver under
    // test on this side is `getSubSchema` alone.
    const codeBlock = convertedSchema.blockObjects.find(
      (blockObject) => blockObject.name === 'code-block',
    )
    const linesField = codeBlock?.fields.find((field) => field.name === 'lines')
    expect(linesField?.type).toBe('array')
    const linesOf = linesField?.type === 'array' ? (linesField.of ?? []) : []

    const portableTextView = getSubSchema(convertedSchema, linesOf)
    const sanityView = getSanitySubSchema(rootType, value, [
      {_key: 'cb1'},
      'lines',
      {_key: 'line1'},
      'children',
      {_key: 's1'},
    ])

    expect(portableTextNames(portableTextView)).toEqual(sanityNames(sanityView))
    // The restriction itself, pinned explicitly so agreement can't be
    // satisfied by both sides being equally wrong about the root.
    // Sanity injects the default 'normal' style into every compiled
    // block, declared styles come after it.
    expect(portableTextNames(portableTextView)).toEqual({
      styles: ['normal', 'code'],
      lists: [],
      decorators: ['hex'],
      annotations: [],
      blockObjects: [],
      inlineObjects: ['codeAnnotation'],
    })
  })
})

function portableTextNames(schema: Schema) {
  return {
    styles: schema.styles.map((style) => style.name),
    lists: schema.lists.map((list) => list.name),
    decorators: schema.decorators.map((decorator) => decorator.name),
    annotations: schema.annotations.map((annotation) => annotation.name),
    blockObjects: schema.blockObjects.map((blockObject) => blockObject.name),
    inlineObjects: schema.inlineObjects.map(
      (inlineObject) => inlineObject.name,
    ),
  }
}

function sanityNames(memberTypes: PortableTextMemberSchemaTypes) {
  return {
    styles: memberTypes.styles.map((style) => style.value),
    lists: memberTypes.lists.map((list) => list.value),
    decorators: memberTypes.decorators.map((decorator) => decorator.value),
    annotations: memberTypes.annotations.map((annotation) => annotation.name),
    blockObjects: memberTypes.blockObjects.map(
      (blockObject) => blockObject.name,
    ),
    inlineObjects: memberTypes.inlineObjects.map(
      (inlineObject) => inlineObject.name,
    ),
  }
}
