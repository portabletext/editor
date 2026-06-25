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
import {createPortableTextMemberSchemaTypesFromOf} from './portable-text-member-schema-types'

function compile(
  types: ReadonlyArray<unknown>,
): ArraySchemaType<PortableTextBlock> {
  return SanitySchema.compile({
    name: 'test',
    types: types as Parameters<typeof SanitySchema.compile>[0]['types'],
  }).get('content') as ArraySchemaType<PortableTextBlock>
}

describe(getSanitySubSchema.name, () => {
  const codeBlockRoot = compile([
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

  test('empty path returns the root bucketization', () => {
    expect(getSanitySubSchema(codeBlockRoot, [], [])).toEqual(
      createPortableTextMemberSchemaTypesFromOf(
        codeBlockRoot,
        codeBlockRoot.of ?? [],
      ),
    )
  })

  test('top-level keyed path returns the root bucketization (target is at root)', () => {
    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'code-block',
        _key: 'cb1',
        lines: [],
      } as unknown as PortableTextBlock,
    ]
    expect(getSanitySubSchema(codeBlockRoot, value, [{_key: 'cb1'}])).toEqual(
      createPortableTextMemberSchemaTypesFromOf(
        codeBlockRoot,
        codeBlockRoot.of ?? [],
      ),
    )
  })

  test('child of a depth-1 block returns that block child `of` bucketization', () => {
    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'code-block',
        _key: 'cb1',
        lines: [{_type: 'block', _key: 'line1', style: 'code', children: []}],
      } as unknown as PortableTextBlock,
    ]
    const result = getSanitySubSchema(codeBlockRoot, value, [
      {_key: 'cb1'},
      'lines',
      {_key: 'line1'},
    ])

    // code-block's `lines.of` is just `[block]` — no block-objects.
    expect(result.blockObjects).toEqual([])
    // `portableText` is the root array type, carries form-builder
    // context regardless of depth.
    expect(result.portableText).toBe(codeBlockRoot)
  })

  test('depth-2 walk: code-block nested inside callout resolves to code-block child `of` bucketization', () => {
    const calloutNested = compile([
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
        type: 'object',
        name: 'callout',
        fields: [
          defineField({
            type: 'array',
            name: 'content',
            of: [
              defineArrayMember({type: 'block', name: 'block'}),
              defineArrayMember({type: 'code-block'}),
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
        ],
      }),
    ])

    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: 'callout1',
        content: [
          {
            _type: 'code-block',
            _key: 'cb1',
            lines: [
              {_type: 'block', _key: 'line1', style: 'code', children: []},
            ],
          },
        ],
      } as unknown as PortableTextBlock,
    ]

    const result = getSanitySubSchema(calloutNested, value, [
      {_key: 'callout1'},
      'content',
      {_key: 'cb1'},
      'lines',
      {_key: 'line1'},
    ])

    // Code-block's `lines.of` has no block-objects — discriminates
    // from the callout-level bucketization (which DOES include
    // code-block as a block-object).
    expect(result.blockObjects).toEqual([])
  })

  test('missing key in value falls back to root bucketization', () => {
    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'code-block',
        _key: 'cb1',
        lines: [],
      } as unknown as PortableTextBlock,
    ]
    const result = getSanitySubSchema(codeBlockRoot, value, [
      {_key: 'gone'},
      'lines',
      {_key: 'line1'},
    ])

    expect(result).toEqual(
      createPortableTextMemberSchemaTypesFromOf(
        codeBlockRoot,
        codeBlockRoot.of ?? [],
      ),
    )
  })

  test('span path falls back to the root bucketization (text block `children.of` is not Portable-Text-shaped)', () => {
    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'x'}],
      } as unknown as PortableTextBlock,
    ]
    const result = getSanitySubSchema(codeBlockRoot, value, [
      {_key: 'b1'},
      'children',
      {_key: 's1'},
    ])

    expect(result).toEqual(
      createPortableTextMemberSchemaTypesFromOf(
        codeBlockRoot,
        codeBlockRoot.of ?? [],
      ),
    )
  })

  test('unregistered `_type` along the walk falls back to root bucketization', () => {
    const value: ReadonlyArray<PortableTextBlock> = [
      {
        _type: 'unknown-block-object',
        _key: 'unknown1',
        children: [{_type: 'span', _key: 's1', text: 'x'}],
      } as unknown as PortableTextBlock,
    ]
    const result = getSanitySubSchema(codeBlockRoot, value, [
      {_key: 'unknown1'},
      'children',
      {_key: 's1'},
    ])

    expect(result).toEqual(
      createPortableTextMemberSchemaTypesFromOf(
        codeBlockRoot,
        codeBlockRoot.of ?? [],
      ),
    )
  })
})
