/**
 * Micro-benchmark for `getSanitySubSchema` to establish a baseline cost
 * per call and catch regressions on the path-walk + bucketization.
 *
 * Studio's `Compositor.tsx` calls `getSanitySubSchema` inside each of
 * three render callbacks (block / inline / annotation). The callbacks
 * fire once per rendered node — so the per-call cost is multiplied by
 * the number of nodes the editor re-renders on each commit. The
 * scenarios below cover the realistic shapes:
 *
 * - Root-level block in a small document (10 blocks, depth-1 path).
 * - Root-level block in a large document (500 blocks, depth-1 path).
 *   Heaviest realistic doc; stresses the root-level `.find()` over many
 *   siblings.
 * - Depth-2 path inside a container (callout > code-block > line). The
 *   nested-container case the function is designed for.
 * - Depth-3 path. Edge case (rare in practice).
 * - Stale-path fallback in a large document. The `.find()` walk fails
 *   over many siblings, then the function returns the root
 *   bucketization.
 */

import {Schema as SanitySchema} from '@sanity/schema'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ArraySchemaType,
  type PortableTextBlock,
} from '@sanity/types'
import {bench, describe} from 'vitest'
import {getSanitySubSchema} from './get-sanity-sub-schema'

function compile(
  types: ReadonlyArray<unknown>,
): ArraySchemaType<PortableTextBlock> {
  return SanitySchema.compile({
    name: 'test',
    types: types as Parameters<typeof SanitySchema.compile>[0]['types'],
  }).get('content') as ArraySchemaType<PortableTextBlock>
}

const flatSchema = compile([
  defineType({
    type: 'object',
    name: 'image',
    fields: [defineField({type: 'string', name: 'alt'})],
  }),
  defineType({
    type: 'array',
    name: 'content',
    of: [
      defineArrayMember({type: 'block', name: 'block'}),
      defineArrayMember({type: 'image'}),
    ],
  }),
])

const nestedSchema = compile([
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

function buildFlatDoc(blockCount: number): ReadonlyArray<PortableTextBlock> {
  const blocks: PortableTextBlock[] = []
  for (let index = 0; index < blockCount; index++) {
    blocks.push({
      _type: 'block',
      _key: `b${index}`,
      children: [{_type: 'span', _key: `s${index}`, text: `block ${index}`}],
      markDefs: [],
    } as unknown as PortableTextBlock)
  }
  return blocks
}

function buildNestedDoc(blockCount: number): ReadonlyArray<PortableTextBlock> {
  // Half the blocks are callouts containing a code-block containing a
  // line; the rest are plain text blocks.
  const blocks: PortableTextBlock[] = []
  for (let index = 0; index < blockCount; index++) {
    if (index % 2 === 0) {
      blocks.push({
        _type: 'block',
        _key: `b${index}`,
        children: [{_type: 'span', _key: `s${index}`, text: `block ${index}`}],
        markDefs: [],
      } as unknown as PortableTextBlock)
    } else {
      blocks.push({
        _type: 'callout',
        _key: `b${index}`,
        content: [
          {
            _type: 'code-block',
            _key: `cb${index}`,
            lines: [
              {
                _type: 'block',
                _key: `line${index}`,
                style: 'code',
                children: [{_type: 'span', _key: `s${index}`, text: 'code'}],
                markDefs: [],
              },
            ],
          },
        ],
      } as unknown as PortableTextBlock)
    }
  }
  return blocks
}

describe('getSanitySubSchema', () => {
  const smallFlat = buildFlatDoc(10)
  const largeFlat = buildFlatDoc(500)
  const largeNested = buildNestedDoc(500)

  bench('depth-1 path, 10-block doc', () => {
    getSanitySubSchema(flatSchema, smallFlat, [{_key: 'b5'}])
  })

  bench('depth-1 path, 500-block doc', () => {
    getSanitySubSchema(flatSchema, largeFlat, [{_key: 'b250'}])
  })

  bench('depth-2 path, 500-block doc (callout > code-block)', () => {
    getSanitySubSchema(nestedSchema, largeNested, [
      {_key: 'b249'},
      'content',
      {_key: 'cb249'},
    ])
  })

  bench('depth-3 path, 500-block doc (callout > code-block > line)', () => {
    getSanitySubSchema(nestedSchema, largeNested, [
      {_key: 'b249'},
      'content',
      {_key: 'cb249'},
      'lines',
      {_key: 'line249'},
    ])
  })

  bench('stale `_key` fallback, 500-block doc', () => {
    getSanitySubSchema(flatSchema, largeFlat, [{_key: 'gone'}])
  })

  bench('root case (empty path)', () => {
    getSanitySubSchema(flatSchema, largeFlat, [])
  })
})
