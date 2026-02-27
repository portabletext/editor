import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {InternalBlockPathMap} from './block-path-map'
import {toSlateRange} from './to-slate-range'

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

    const range = toSlateRange({
      context: {
        schema,
        value: [
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
        ],
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
      blockPathMap: createBlockPathMap([[blockKey, 0]]),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 3},
      focus: {path: [0, 0], offset: 3},
    })
  })

  test('Scenario: Offset right before inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const range = toSlateRange({
      context: {
        schema,
        value: [
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
        ],
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
      blockPathMap: createBlockPathMap([[blockKey, 0]]),
    })

    expect(range).toEqual({
      anchor: {path: [0, 0], offset: 0},
      focus: {path: [0, 0], offset: 1},
    })
  })

  test("Scenario: Block object offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()

    const range = toSlateRange({
      context: {
        schema,
        value: [
          {
            _key: blockObjectKey,
            _type: 'image',
          },
        ],
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
      blockPathMap: createBlockPathMap([[blockObjectKey, 0]]),
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

    const range = toSlateRange({
      context: {
        schema,
        value: [
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
        ],
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
      blockPathMap: createBlockPathMap([[blockKey, 0]]),
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

    const range = toSlateRange({
      context: {
        schema,
        value: [
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
        ],
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
      blockPathMap: createBlockPathMap([[blockKey, 0]]),
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

    const range = toSlateRange({
      context: {
        schema,
        value: [
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
        ],
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
      blockPathMap: createBlockPathMap([[blockKey, 0]]),
    })

    expect(range).toEqual({
      anchor: {path: [0, 1, 0], offset: 0},
      focus: {path: [0, 1, 0], offset: 0},
    })
  })
})

function createBlockPathMap(
  entries: Array<[string, number]>,
): InternalBlockPathMap {
  const map = new InternalBlockPathMap()
  const maxIndex = Math.max(...entries.map(([, i]) => i))
  const value = new Array(maxIndex + 1)
  for (const [key, index] of entries) {
    value[index] = {_key: key, _type: 'block', children: []}
  }
  map.rebuild(value)
  return map
}
