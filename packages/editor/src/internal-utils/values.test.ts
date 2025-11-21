import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {toSlateBlock, VOID_CHILD_KEY} from './values'

describe(toSlateBlock.name, () => {
  describe('text block', () => {
    describe('with span', () => {
      test('with _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const spanKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [{_key: spanKey, _type: 'span', text: 'foo'}],
            },
            {
              schemaTypes: compileSchema(defineSchema({})),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
            },
          ],
        })
      })

      test('without _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const spanKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [{_key: spanKey, text: 'foo'}],
            },
            {
              schemaTypes: compileSchema(defineSchema({})),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _key: spanKey,
              _type: 'span',
              text: 'foo',
            },
          ],
        })
      })

      test('wrong _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const spanKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [{_key: spanKey, _type: 'stock-ticker', text: 'foo'}],
            },
            {
              schemaTypes: compileSchema(defineSchema({})),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _key: spanKey,
              _type: 'stock-ticker',
              children: [
                {
                  _key: VOID_CHILD_KEY,
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              value: {text: 'foo'},
              __inline: true,
            },
          ],
        })
      })
    })

    describe('with inline object', () => {
      test('known inline object _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const stockTickerKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
              ],
            },
            {
              schemaTypes: compileSchema(
                defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
              ),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              __inline: true,
              _key: stockTickerKey,
              _type: 'stock-ticker',
              children: [
                {
                  _key: VOID_CHILD_KEY,
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              value: {
                symbol: 'AAPL',
              },
            },
          ],
        })
      })

      test('unknown inline object _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const stockTickerKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
              ],
            },
            {
              schemaTypes: compileSchema(defineSchema({})),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              __inline: true,
              _key: stockTickerKey,
              _type: 'stock-ticker',
              children: [
                {
                  _key: VOID_CHILD_KEY,
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              value: {
                symbol: 'AAPL',
              },
            },
          ],
        })
      })
    })

    describe('with inline object with text prop', () => {
      test('known inline object _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const stockTickerKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'stock-ticker', _key: stockTickerKey, text: 'foo'},
              ],
            },
            {
              schemaTypes: compileSchema(
                defineSchema({inlineObjects: [{name: 'stock-ticker'}]}),
              ),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              __inline: true,
              _key: stockTickerKey,
              _type: 'stock-ticker',
              children: [
                {
                  _key: VOID_CHILD_KEY,
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              value: {
                text: 'foo',
              },
            },
          ],
        })
      })

      test('unknown inline object _type', () => {
        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const stockTickerKey = keyGenerator()

        expect(
          toSlateBlock(
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'stock-ticker', _key: stockTickerKey, text: 'foo'},
              ],
            },
            {
              schemaTypes: compileSchema(defineSchema({})),
            },
          ),
        ).toEqual({
          _type: 'block',
          _key: blockKey,
          children: [
            {
              __inline: true,
              _key: stockTickerKey,
              _type: 'stock-ticker',
              children: [
                {
                  _key: VOID_CHILD_KEY,
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              value: {
                text: 'foo',
              },
            },
          ],
        })
      })
    })
  })
})
