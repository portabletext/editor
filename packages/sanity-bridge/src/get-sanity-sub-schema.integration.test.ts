/**
 * Studio-shaped integration suite for `getSanitySubSchema`.
 *
 * Mirrors the realistic lookup shapes Sanity Studio's render callbacks
 * perform: `schemaTypes.blockObjects.find((t) => t.name === block._type)`,
 * `schemaTypes.decorators.find((t) => t.value === schemaType.value)`,
 * and so on. The fixtures set up the scenarios where today's flat-bucket
 * provider misresolves (container-only types, positional override), plus
 * the safety floor (root invariant, stale-path fallback) that guarantees
 * existing root-only consumers see no behavioral change.
 */

import {Schema as SanitySchema} from '@sanity/schema'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ArraySchemaType,
  type PortableTextBlock,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {getSanitySubSchema} from './get-sanity-sub-schema'
import {createPortableTextMemberSchemaTypes} from './portable-text-member-schema-types'

function compile(
  types: ReadonlyArray<unknown>,
): ArraySchemaType<PortableTextBlock> {
  return SanitySchema.compile({
    name: 'test',
    types: types as Parameters<typeof SanitySchema.compile>[0]['types'],
  }).get('content') as ArraySchemaType<PortableTextBlock>
}

describe('getSanitySubSchema (Studio-shaped integration)', () => {
  describe('container-only types at depth', () => {
    // Code-block declares its own inline-object (`codeAnnotation`) and
    // decorator (`hex`) that are only registered inside the code-block's
    // `lines.of`, not at root. Today's flat-bucket provider misses these.
    const codeBlockSchema = compile([
      defineType({
        type: 'object',
        name: 'codeAnnotation',
        fields: [defineField({type: 'string', name: 'note'})],
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
          defineArrayMember({type: 'block', name: 'block'}),
          defineArrayMember({type: 'code-block'}),
        ],
      }),
    ])

    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'code-block',
        _key: 'cb1',
        lines: [
          {
            _type: 'block',
            _key: 'line1',
            style: 'code',
            children: [
              {_type: 'span', _key: 's1', text: 'foo', marks: ['hex']},
              {_type: 'codeAnnotation', _key: 'ca1', note: 'inline'},
            ],
            markDefs: [],
          },
        ],
      } as unknown as PortableTextBlock,
    ]

    test('inline-object registered only inside the container resolves at container depth', () => {
      const schemaTypes = getSanitySubSchema(codeBlockSchema, value, [
        {_key: 'cb1'},
        'lines',
        {_key: 'line1'},
        'children',
        {_key: 'ca1'},
      ])

      // Studio's `InlineObject.tsx` does:
      //   schemaTypes.inlineObjects.find((t) => t.name === inline._type)
      expect(
        schemaTypes.inlineObjects.find((t) => t.name === 'codeAnnotation')
          ?.name,
      ).toEqual('codeAnnotation')
    })

    test('the same inline-object does NOT resolve against the root bucket', () => {
      const rootSchemaTypes =
        createPortableTextMemberSchemaTypes(codeBlockSchema)

      expect(
        rootSchemaTypes.inlineObjects.find((t) => t.name === 'codeAnnotation'),
      ).toEqual(undefined)
    })

    test('decorator registered only inside the container resolves at container depth', () => {
      const schemaTypes = getSanitySubSchema(codeBlockSchema, value, [
        {_key: 'cb1'},
        'lines',
        {_key: 'line1'},
        'children',
        {_key: 's1'},
      ])

      // Studio's `Decorator.tsx` does:
      //   schemaTypes.decorators.find((d) => d.value === schemaType.value)
      expect(
        schemaTypes.decorators.find((d) => d.value === 'hex')?.value,
      ).toEqual('hex')
    })

    test('the same decorator does NOT resolve against the root bucket', () => {
      const rootSchemaTypes =
        createPortableTextMemberSchemaTypes(codeBlockSchema)

      expect(rootSchemaTypes.decorators.find((d) => d.value === 'hex')).toEqual(
        undefined,
      )
    })
  })

  describe('positional override (same `_type` registered under different parents)', () => {
    // `calloutCard` registered as a block-object at root AND inside a
    // `callout` container's `content.of`. The two registrations point at
    // the same compiled type today (Sanity globally interns by name), so
    // the discriminating fact is which BUCKET resolves: at depth, only
    // `calloutCard` is in the bucket; at root, both `callout` and
    // `calloutCard` are.
    const positionalSchema = compile([
      defineType({
        type: 'object',
        name: 'calloutCard',
        fields: [defineField({type: 'string', name: 'rootField'})],
      }),
      defineType({
        type: 'object',
        name: 'callout',
        fields: [
          defineField({
            type: 'array',
            name: 'content',
            of: [
              defineArrayMember({type: 'block', name: 'block'}),
              defineArrayMember({type: 'calloutCard'}),
            ],
          }),
        ],
      }),
      defineType({
        type: 'array',
        name: 'content',
        of: [
          defineArrayMember({type: 'block', name: 'block'}),
          defineArrayMember({type: 'callout'}),
          defineArrayMember({type: 'calloutCard'}),
        ],
      }),
    ])

    const value: ReadonlyArray<PortableTextBlock> = [
      {_type: 'calloutCard', _key: 'rootCard'} as unknown as PortableTextBlock,
      {
        _type: 'callout',
        _key: 'callout1',
        content: [{_type: 'calloutCard', _key: 'nestedCard'}],
      } as unknown as PortableTextBlock,
    ]

    test('block-object at root resolves against the root bucket containing both callout and calloutCard', () => {
      const schemaTypes = getSanitySubSchema(positionalSchema, value, [
        {_key: 'rootCard'},
      ])

      expect(schemaTypes.blockObjects.map((t) => t.name).sort()).toEqual([
        'callout',
        'calloutCard',
      ])
    })

    test('block-object nested inside a container resolves against the container bucket containing only calloutCard', () => {
      const schemaTypes = getSanitySubSchema(positionalSchema, value, [
        {_key: 'callout1'},
        'content',
        {_key: 'nestedCard'},
      ])

      expect(schemaTypes.blockObjects.map((t) => t.name).sort()).toEqual([
        'calloutCard',
      ])
    })
  })

  describe('safety floor: root-only consumers unchanged', () => {
    const codeBlockSchema = compile([
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
                marks: {decorators: [], annotations: []},
                of: [],
              }),
            ],
          }),
        ],
      }),
      defineType({
        type: 'array',
        name: 'content',
        of: [
          defineArrayMember({type: 'block', name: 'block'}),
          defineArrayMember({type: 'code-block'}),
        ],
      }),
    ])

    test('empty path returns the root bucketization (fractal invariant at depth zero)', () => {
      expect(getSanitySubSchema(codeBlockSchema, [], [])).toEqual(
        createPortableTextMemberSchemaTypes(codeBlockSchema),
      )
    })

    test('top-level keyed path returns the root bucketization', () => {
      const value: ReadonlyArray<PortableTextBlock> = [
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [],
        } as unknown as PortableTextBlock,
      ]

      expect(
        getSanitySubSchema(codeBlockSchema, value, [{_key: 'cb1'}]),
      ).toEqual(createPortableTextMemberSchemaTypes(codeBlockSchema))
    })

    test('span path inside a root text block returns the root bucketization', () => {
      const value: ReadonlyArray<PortableTextBlock> = [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'x'}],
        } as unknown as PortableTextBlock,
      ]

      expect(
        getSanitySubSchema(codeBlockSchema, value, [
          {_key: 'b1'},
          'children',
          {_key: 's1'},
        ]),
      ).toEqual(createPortableTextMemberSchemaTypes(codeBlockSchema))
    })

    test('stale `_key` reference falls back to the root bucketization without throwing', () => {
      const value: ReadonlyArray<PortableTextBlock> = [
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [],
        } as unknown as PortableTextBlock,
      ]

      expect(
        getSanitySubSchema(codeBlockSchema, value, [
          {_key: 'gone'},
          'lines',
          {_key: 'line1'},
        ]),
      ).toEqual(createPortableTextMemberSchemaTypes(codeBlockSchema))
    })

    test('unregistered `_type` along the walk falls back to the root bucketization', () => {
      const value: ReadonlyArray<PortableTextBlock> = [
        {
          _type: 'unknown-type',
          _key: 'u1',
          children: [],
        } as unknown as PortableTextBlock,
      ]

      expect(
        getSanitySubSchema(codeBlockSchema, value, [
          {_key: 'u1'},
          'children',
          {_key: 'x'},
        ]),
      ).toEqual(createPortableTextMemberSchemaTypes(codeBlockSchema))
    })
  })
})
