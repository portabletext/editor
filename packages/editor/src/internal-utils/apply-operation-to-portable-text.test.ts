import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {applyOperationToPortableText} from './apply-operation-to-portable-text'

function createContext() {
  const keyGenerator = createTestKeyGenerator()
  const schema = compileSchema(defineSchema({}))

  return {
    keyGenerator,
    schema,
  }
}

describe(applyOperationToPortableText.name, () => {
  test('setting block object properties', () => {
    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _type: 'image',
            _key: 'k0',
          },
        ],
        {
          type: 'set_node',
          path: [0],
          properties: {},
          newProperties: {
            value: {src: 'https://example.com/image.jpg'},
          },
        },
      ),
    ).toEqual([
      {
        _type: 'image',
        _key: 'k0',
        src: 'https://example.com/image.jpg',
      },
    ])
  })

  test('updating block object properties', () => {
    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _type: 'image',
            _key: 'k0',
            src: 'https://example.com/image.jpg',
          },
        ],
        {
          type: 'set_node',
          path: [0],
          properties: {
            value: {src: 'https://example.com/image.jpg'},
          },
          newProperties: {
            value: {
              src: 'https://example.com/image.jpg',
              alt: 'An image',
            },
          },
        },
      ),
    ).toEqual([
      {
        _type: 'image',
        _key: 'k0',
        src: 'https://example.com/image.jpg',
        alt: 'An image',
      },
    ])
  })

  test('removing block object properties', () => {
    expect(
      applyOperationToPortableText(
        createContext(),
        [{_type: 'image', _key: 'k0', alt: 'An image'}],
        {
          type: 'set_node',
          path: [0],
          properties: {
            value: {
              alt: 'An image',
            },
          },
          newProperties: {value: {}},
        },
      ),
    ).toEqual([{_type: 'image', _key: 'k0'}])
  })

  test('updating block object _key', () => {
    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _type: 'image',
            _key: 'k0',
            src: 'https://example.com/image.jpg',
          },
        ],
        {
          type: 'set_node',
          path: [0],
          properties: {_key: 'k0'},
          newProperties: {_key: 'k1'},
        },
      ),
    ).toEqual([
      {
        _type: 'image',
        _key: 'k1',
        src: 'https://example.com/image.jpg',
      },
    ])
  })

  test('updating inline object properties', () => {
    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: '',
              },
              {
                _key: 'k2',
                _type: 'stock ticker',
              },
              {
                _key: 'k3',
                _type: 'span',
                text: '',
              },
            ],
          },
        ],
        {
          type: 'set_node',
          path: [0, 1],
          properties: {},
          newProperties: {
            value: {
              symbol: 'AAPL',
            },
          },
        },
      ),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: ''},
          {_type: 'stock ticker', _key: 'k2', symbol: 'AAPL'},
          {_type: 'span', _key: 'k3', text: ''},
        ],
      },
    ])
  })

  test('updating block object with a field named "text"', () => {
    const keyGenerator = createTestKeyGenerator()
    const k0 = keyGenerator()

    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _type: 'quote',
            _key: k0,
            text: 'h',
          },
        ],
        {
          type: 'set_node',
          path: [0],
          properties: {
            value: {text: 'h'},
          },
          newProperties: {
            value: {text: 'hello'},
          },
        },
      ),
    ).toEqual([
      {
        _type: 'quote',
        _key: k0,
        text: 'hello',
      },
    ])
  })

  test('updating inline object with a field named "text"', () => {
    const keyGenerator = createTestKeyGenerator()
    const k0 = keyGenerator()
    const k1 = keyGenerator()
    const k2 = keyGenerator()
    const k3 = keyGenerator()

    expect(
      applyOperationToPortableText(
        createContext(),
        [
          {
            _key: k0,
            _type: 'block',
            children: [
              {
                _key: k1,
                _type: 'span',
                text: '',
              },
              {
                _key: k2,
                _type: 'mention',
                text: 'J',
              },
              {
                _key: k3,
                _type: 'span',
                text: '',
              },
            ],
          },
        ],
        {
          type: 'set_node',
          path: [0, 1],
          properties: {
            value: {text: 'J'},
          },
          newProperties: {
            value: {text: 'John Doe'},
          },
        },
      ),
    ).toEqual([
      {
        _type: 'block',
        _key: k0,
        children: [
          {_type: 'span', _key: k1, text: ''},
          {_type: 'mention', _key: k2, text: 'John Doe'},
          {_type: 'span', _key: k3, text: ''},
        ],
      },
    ])
  })
})
