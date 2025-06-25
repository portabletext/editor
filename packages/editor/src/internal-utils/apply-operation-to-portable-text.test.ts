import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {applyOperationToPortableText} from './apply-operation-to-portable-text'
import {createTestKeyGenerator} from './test-key-generator'

function createContext() {
  const keyGenerator = createTestKeyGenerator()
  const schema = compileSchemaDefinition(defineSchema({}))

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
})
