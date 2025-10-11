import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'

const schema = compileSchema(defineSchema({}))

describe(blockOffsetToSpanSelectionPoint.name, () => {
  describe('simple text block ', () => {
    const keyGenerator = createTestKeyGenerator()
    const b0 = keyGenerator()
    const s0 = keyGenerator()
    const s1 = keyGenerator()
    const s2 = keyGenerator()
    const value = [
      {
        _key: b0,
        _type: 'block',
        children: [
          {_key: s0, _type: 'span', text: 'b'},
          {_key: s1, _type: 'span', text: 'a'},
          {_key: s2, _type: 'span', text: 'r'},
        ],
      },
    ]

    describe('end of block', () => {
      test('direction forward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: b0}],
              offset: 3,
            },
            direction: 'forward',
          }),
        ).toEqual({
          path: [{_key: b0}, 'children', {_key: s2}],
          offset: 1,
        })
      })

      test('direction backward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: b0}],
              offset: 3,
            },
            direction: 'backward',
          }),
        ).toEqual({
          path: [{_key: b0}, 'children', {_key: s2}],
          offset: 1,
        })
      })
    })

    describe('start of block', () => {
      test('direction forward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: b0}],
              offset: 0,
            },
            direction: 'forward',
          }),
        ).toEqual({
          path: [{_key: b0}, 'children', {_key: s0}],
          offset: 0,
        })
      })

      test('direction backward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: b0}],
              offset: 0,
            },
            direction: 'backward',
          }),
        ).toEqual({
          path: [{_key: b0}, 'children', {_key: s0}],
          offset: 0,
        })
      })
    })
  })

  describe('leading and trailing inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const leadingSpanKey = keyGenerator()
    const leadingInlineObjectKey = keyGenerator()
    const fooKey = keyGenerator()
    const trailingInlineObjectKey = keyGenerator()
    const trailingSpanKey = keyGenerator()
    const value = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {_key: leadingSpanKey, _type: 'span', text: ''},
          {_key: leadingInlineObjectKey, _type: 'stock-ticker'},
          {_key: fooKey, _type: 'span', text: 'foo'},
          {_key: trailingInlineObjectKey, _type: 'stock-ticker'},
          {_key: trailingSpanKey, _type: 'span', text: ''},
        ],
      },
    ]

    describe('start of block', () => {
      test('direction forward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 0,
            },
            direction: 'forward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: leadingSpanKey}],
          offset: 0,
        })
      })

      test('direction backward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 0,
            },
            direction: 'backward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 0,
        })
      })
    })

    describe('offset 1', () => {
      test('direction forward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 1,
            },
            direction: 'forward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 1,
        })
      })

      test('direction backward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 1,
            },
            direction: 'backward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 1,
        })
      })
    })

    describe('end of block', () => {
      test('direction forward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 3,
            },
            direction: 'forward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        })
      })

      test('direction backward', () => {
        expect(
          blockOffsetToSpanSelectionPoint({
            context: {
              schema,
              value,
            },
            blockOffset: {
              path: [{_key: blockKey}],
              offset: 3,
            },
            direction: 'backward',
          }),
        ).toEqual({
          path: [{_key: blockKey}, 'children', {_key: trailingSpanKey}],
          offset: 0,
        })
      })
    })
  })

  test('only inline objects', () => {
    const keyGenerator = createTestKeyGenerator()
    const b0 = keyGenerator()
    const b0s0 = keyGenerator()
    const b0s1 = keyGenerator()
    const b0s2 = keyGenerator()
    const value = [
      {
        _key: b0,
        _type: 'block',
        children: [
          {
            _key: b0s0,
            _type: 'stock-ticker',
          },
          {
            _key: b0s1,
            _type: 'stock-ticker',
          },
          {
            _key: b0s2,
            _type: 'stock-ticker',
          },
        ],
      },
    ]

    expect(
      blockOffsetToSpanSelectionPoint({
        context: {
          schema,
          value,
        },
        blockOffset: {
          path: [{_key: b0}],
          offset: 0,
        },
        direction: 'forward',
      }),
    ).toBeUndefined()
    expect(
      blockOffsetToSpanSelectionPoint({
        context: {
          schema,
          value,
        },
        blockOffset: {
          path: [{_key: b0}],
          offset: 1,
        },
        direction: 'forward',
      }),
    ).toBeUndefined()
  })

  test('block object', () => {
    const keyGenerator = createTestKeyGenerator()
    const b0 = keyGenerator()
    const value = [
      {
        _key: b0,
        _type: 'image',
      },
    ]

    expect(
      blockOffsetToSpanSelectionPoint({
        context: {
          schema,
          value,
        },
        blockOffset: {
          path: [{_key: b0}],
          offset: 0,
        },
        direction: 'forward',
      }),
    ).toBeUndefined()
  })

  test('text with formatting', () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const b1s0 = keyGenerator()
    const b1s1 = keyGenerator()

    const value: Array<PortableTextBlock> = [
      {
        _key: b1,
        _type: 'block',
        children: [
          {
            _key: b1s0,
            _type: 'span',
            text: 'Hello, ',
          },
          {
            _key: b1s1,
            _type: 'span',
            text: 'world!',
            marks: ['strong'],
          },
        ],
      },
    ]

    expect(
      blockOffsetToSpanSelectionPoint({
        context: {
          schema,
          value,
        },
        blockOffset: {
          path: [{_key: b1}],
          offset: 9,
        },
        direction: 'forward',
      }),
    ).toEqual({
      path: [{_key: b1}, 'children', {_key: b1s1}],
      offset: 2,
    })
  })
})
