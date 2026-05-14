import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {resolveContainers} from '../schema/resolve-containers'
import {
  compareApplicableSchema,
  getApplicableSchema,
} from './selector.get-applicable-schema'

const baseSchemaDef = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  styles: [{name: 'normal'}, {name: 'h1'}],
  annotations: [{name: 'link', fields: []}],
  lists: [{name: 'bullet'}],
  inlineObjects: [{name: 'mention', fields: []}],
  blockObjects: [
    {name: 'image', fields: []},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [{name: 'code'}],
              styles: [{name: 'code'}],
              annotations: [],
              lists: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
  ],
})

const schema = compileSchema(baseSchemaDef)
const containers = resolveContainers(schema, [
  {kind: 'container', type: 'callout', childField: 'content'},
])

const rootBlock1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'r1',
  children: [{_type: 'span', _key: 's1', text: 'root', marks: []}],
  markDefs: [],
  style: 'normal',
}
const rootBlock2: PortableTextTextBlock = {
  _type: 'block',
  _key: 'r2',
  children: [{_type: 'span', _key: 's2', text: 'next', marks: []}],
  markDefs: [],
  style: 'normal',
}
const calloutInner: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [{_type: 'span', _key: 's3', text: 'inside', marks: []}],
  markDefs: [],
  style: 'normal',
}
const callout: PortableTextObject = {
  _type: 'callout',
  _key: 'c1',
  content: [calloutInner],
}
const image: PortableTextObject = {_type: 'image', _key: 'img1'}
const value: Array<PortableTextBlock> = [rootBlock1, rootBlock2, callout, image]

describe(getApplicableSchema.name, () => {
  test('returns empty sets when the selection is null', () => {
    expect(
      getApplicableSchema(
        createTestSnapshot({
          context: {schema, value, selection: null, containers},
        }),
      ),
    ).toEqual({
      decorators: new Set(),
      annotations: new Set(),
      lists: new Set(),
      styles: new Set(),
      blockObjects: new Set(),
      inlineObjects: new Set(),
    })
  })

  test('returns the focus block sub-schema when the caret is in a single text block', () => {
    expect(
      getApplicableSchema(
        createTestSnapshot({
          context: {
            schema,
            value,
            containers,
            selection: {
              anchor: {
                path: [{_key: 'r1'}, 'children', {_key: 's1'}],
                offset: 0,
              },
              focus: {
                path: [{_key: 'r1'}, 'children', {_key: 's1'}],
                offset: 0,
              },
            },
          },
        }),
      ),
    ).toEqual({
      decorators: new Set(['strong', 'em']),
      annotations: new Set(['link']),
      lists: new Set(['bullet']),
      styles: new Set(['normal', 'h1']),
      blockObjects: new Set(['image', 'callout']),
      inlineObjects: new Set(['mention']),
    })
  })

  test('returns the union of text-only categories across the selection', () => {
    expect(
      getApplicableSchema(
        createTestSnapshot({
          context: {
            schema,
            value,
            containers,
            selection: {
              anchor: {
                path: [{_key: 'r1'}, 'children', {_key: 's1'}],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: 'c1'},
                  'content',
                  {_key: 'b1'},
                  'children',
                  {_key: 's3'},
                ],
                offset: 6,
              },
            },
          },
        }),
      ),
    ).toEqual({
      // root has strong/em, callout has code; union is the three
      decorators: new Set(['strong', 'em', 'code']),
      // root has link; callout overrides annotations to []
      annotations: new Set(['link']),
      // root has bullet; callout overrides lists to []
      lists: new Set(['bullet']),
      // root has normal/h1, callout has code; union
      styles: new Set(['normal', 'h1', 'code']),
      // insertion is focus only - callout's sub-schema
      blockObjects: new Set(),
      inlineObjects: new Set(),
    })
  })

  test('returns empty text-only sets when the selection is on a void block', () => {
    expect(
      getApplicableSchema(
        createTestSnapshot({
          context: {
            schema,
            value,
            containers,
            selection: {
              anchor: {path: [{_key: 'img1'}], offset: 0},
              focus: {path: [{_key: 'img1'}], offset: 0},
            },
          },
        }),
      ),
    ).toEqual({
      decorators: new Set(),
      annotations: new Set(),
      lists: new Set(),
      styles: new Set(),
      // insertion still answered by focus block sub-schema
      blockObjects: new Set(['image', 'callout']),
      inlineObjects: new Set(['mention']),
    })
  })
})

describe(compareApplicableSchema.name, () => {
  test('returns true for byte-identical results', () => {
    const a = {
      decorators: new Set(['strong']),
      annotations: new Set<string>(),
      lists: new Set<string>(),
      styles: new Set(['normal']),
      blockObjects: new Set(['image']),
      inlineObjects: new Set<string>(),
    }
    expect(compareApplicableSchema(a, a)).toBe(true)
  })

  test('returns true when sets contain the same names', () => {
    const a = {
      decorators: new Set(['strong', 'em']),
      annotations: new Set<string>(),
      lists: new Set<string>(),
      styles: new Set(['normal']),
      blockObjects: new Set(['image']),
      inlineObjects: new Set<string>(),
    }
    const b = {
      decorators: new Set(['em', 'strong']),
      annotations: new Set<string>(),
      lists: new Set<string>(),
      styles: new Set(['normal']),
      blockObjects: new Set(['image']),
      inlineObjects: new Set<string>(),
    }
    expect(compareApplicableSchema(a, b)).toBe(true)
  })

  test('returns false when any set differs', () => {
    const a = {
      decorators: new Set(['strong']),
      annotations: new Set<string>(),
      lists: new Set<string>(),
      styles: new Set(['normal']),
      blockObjects: new Set<string>(),
      inlineObjects: new Set<string>(),
    }
    const b = {
      decorators: new Set(['strong', 'em']),
      annotations: new Set<string>(),
      lists: new Set<string>(),
      styles: new Set(['normal']),
      blockObjects: new Set<string>(),
      inlineObjects: new Set<string>(),
    }
    expect(compareApplicableSchema(a, b)).toBe(false)
  })
})
