import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {isObjectNode, isPartialSpanNode, isSpanNode} from './portable-text-node'

const schema = compileSchema(defineSchema({}))

describe(isPartialSpanNode.name, () => {
  test('object with only text property', () => {
    expect(isPartialSpanNode({text: 'Hello'})).toBe(true)
  })

  test('non-objects', () => {
    expect(isPartialSpanNode(null)).toBe(false)
    expect(isPartialSpanNode(undefined)).toBe(false)
    expect(isPartialSpanNode('text')).toBe(false)
    expect(isPartialSpanNode(123)).toBe(false)
  })

  test('text is not a string', () => {
    expect(isPartialSpanNode({text: 123})).toBe(false)
    expect(isPartialSpanNode({text: null})).toBe(false)
    expect(isPartialSpanNode({text: undefined})).toBe(false)
  })

  test('inline object with text field and _type', () => {
    expect(
      isPartialSpanNode({_type: 'mention', _key: 'abc123', text: 'John Doe'}),
    ).toBe(false)
  })

  test('block object with text field and _type', () => {
    expect(
      isPartialSpanNode({
        _type: 'quote',
        _key: 'abc123',
        text: 'Hello world',
        source: 'Anonymous',
      }),
    ).toBe(false)
  })
})

describe(isSpanNode.name, () => {
  test('span with _type="span"', () => {
    expect(isSpanNode({schema}, {_type: 'span', text: 'Hello'})).toBe(true)
  })

  test('partial span (no _type, has text)', () => {
    expect(isSpanNode({schema}, {text: 'Hello'})).toBe(true)
  })

  test('object with children', () => {
    expect(
      isSpanNode({schema}, {_type: 'span', text: 'Hello', children: []}),
    ).toBe(false)
  })

  test('object with different _type', () => {
    expect(isSpanNode({schema}, {_type: 'mention', text: 'Hello'})).toBe(false)
  })
})

describe(isObjectNode.name, () => {
  test('inline object', () => {
    expect(
      isObjectNode(
        {schema},
        {_type: 'stock-ticker', _key: 'abc', symbol: 'AAPL'},
      ),
    ).toBe(true)
  })

  test('block object', () => {
    expect(
      isObjectNode(
        {schema},
        {_type: 'image', _key: 'abc', src: 'https://example.com'},
      ),
    ).toBe(true)
  })

  test('inline object with text field', () => {
    expect(
      isObjectNode(
        {schema},
        {_type: 'mention', _key: 'abc123', text: 'John Doe'},
      ),
    ).toBe(true)
  })

  test('block object with text field', () => {
    expect(
      isObjectNode(
        {schema},
        {
          _type: 'quote',
          _key: 'abc123',
          text: 'Hello world',
          source: 'Anonymous',
        },
      ),
    ).toBe(true)
  })

  test('span', () => {
    expect(
      isObjectNode(
        {schema},
        {_type: 'span', _key: 'abc', text: 'Hello', marks: []},
      ),
    ).toBe(false)
  })

  test('text block', () => {
    expect(
      isObjectNode(
        {schema},
        {
          _type: 'block',
          _key: 'abc',
          children: [{_type: 'span', text: 'Hello'}],
        },
      ),
    ).toBe(false)
  })
})
