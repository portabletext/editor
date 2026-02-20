import type {PortableTextBlock} from '@portabletext/schema'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {buildBlockMap, type BlockMap} from './block-map'
import {toSlateRange} from './to-slate-range'

function makeBlockMap(value: Array<PortableTextBlock>): BlockMap {
  const blockMap: BlockMap = new Map()
  buildBlockMap({value}, blockMap)
  return blockMap
}

describe(toSlateRange.name, () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [{name: 'image'}],
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    }),
  )

  test('Scenario: Ambiguous offset inside text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'foo',
          },
          {
            _key: keyGenerator(),
            _type: 'stock-ticker',
          },
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'bar',
          },
        ],
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockKey}],
            // Could point to either before or after the inline object
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}],
            // Could point to either before or after the inline object
            offset: 3,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 3},
      focus: {path: [0, 0], offset: 3},
    })
  })

  test('Scenario: Offset right before inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: "'",
          },
          {
            _key: keyGenerator(),
            _type: 'stock-ticker',
          },
          {
            _key: keyGenerator(),
            _type: 'span',
            text: "foo'",
          },
        ],
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}],
            offset: 1,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 1},
    })
  })

  test("Scenario: Block object offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockObjectKey,
        _type: 'image',
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockObjectKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockObjectKey}],
            offset: 3,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 0},
    })
  })

  test("Scenario: Child that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const removedChildKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'foobar',
          },
        ],
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: removedChildKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: removedChildKey}],
            offset: 3,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 0},
    })
  })

  test("Scenario: Span offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text: 'foo',
          },
        ],
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 3},
      focus: {path: [0, 0], offset: 3},
    })
  })

  test("Scenario: Inline object offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const inlineObjectKey = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo'},
          {
            _key: inlineObjectKey,
            _type: 'stock-ticker',
            symbol: 'AAPL',
          },
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'bar',
          },
        ],
      },
    ]

    const range = toSlateRange({
      context: {
        schema,
        value,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
            offset: 3,
          },
        },
      },
      blockMap: makeBlockMap(value),
    })

    expect(range).toEqual({
      anchor: {path: [0, 1, 0], offset: 0},
      focus: {path: [0, 1, 0], offset: 0},
    })
  })
})
