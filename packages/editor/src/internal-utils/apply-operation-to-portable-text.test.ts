import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import type {Operation} from 'slate'
import {describe, expect, test} from 'vitest'
import type {OmitFromUnion} from '../type-utils'
import {applyOperationToPortableText} from './apply-operation-to-portable-text'

type TestOperation = OmitFromUnion<Operation, 'type', 'set_selection'>

function createContext() {
  const keyGenerator = createTestKeyGenerator()
  const schema = compileSchema(defineSchema({}))

  return {
    keyGenerator,
    schema,
  }
}

function createTextBlock(
  key: string,
  children: Array<{
    _key: string
    _type: string
    text: string
    marks?: string[]
  }>,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children,
  }
}

function createSpan(key: string, text: string, marks: string[] = []) {
  return {_type: 'span', _key: key, text, marks}
}

describe(applyOperationToPortableText.name, () => {
  describe('insert_node', () => {
    test('inserting a text block at the root', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [1],
          node: {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'World'}],
          },
        },
      )

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual({
        _type: 'block',
        _key: 'k2',
        children: [{_type: 'span', _key: 'k3', text: 'World'}],
      })
    })

    test('inserting a text block at the beginning', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [0],
          node: {
            _type: 'block',
            _key: 'k2',
            children: [{_type: 'span', _key: 'k3', text: 'World'}],
          },
        },
      )

      expect(result).toHaveLength(2)
      expect(result[0]._key).toBe('k2')
      expect(result[1]._key).toBe('k0')
    })

    test('inserting a block object at the root', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [1],
          node: {
            _type: 'image',
            _key: 'k2',
            children: [{text: '', _key: 'void-child', _type: 'span'}],
            value: {src: 'https://example.com/image.jpg'},
          },
        } as TestOperation,
      )

      expect(result).toHaveLength(2)
      expect(result[1]).toEqual({
        _type: 'image',
        _key: 'k2',
        src: 'https://example.com/image.jpg',
      })
    })

    test('inserting a span into a block', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [0, 1],
          node: {_type: 'span', _key: 'k2', text: ' World'},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Hello', marks: []},
          {_type: 'span', _key: 'k2', text: ' World'},
        ],
      })
    })

    test('inserting an inline object into a block', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [0, 1],
          node: {
            _type: 'stock-ticker',
            _key: 'k2',
            __inline: true,
            children: [{text: '', _key: 'void-child', _type: 'span'}],
            value: {symbol: 'AAPL'},
          },
        } as TestOperation,
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Hello', marks: []},
          {_type: 'stock-ticker', _key: 'k2', symbol: 'AAPL'},
        ],
      })
    })
  })

  describe('insert_text', () => {
    test('inserting text at the beginning of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'World')])],
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 0,
          text: 'Hello ',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello World', marks: []}],
      })
    })

    test('inserting text in the middle of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Helo')])],
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 2,
          text: 'l',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
      })
    })

    test('inserting text at the end of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 5,
          text: ' World',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello World', marks: []}],
      })
    })

    test('inserting empty text does nothing', () => {
      const original = [createTextBlock('k0', [createSpan('k1', 'Hello')])]
      const result = applyOperationToPortableText(createContext(), original, {
        type: 'insert_text',
        path: [0, 0],
        offset: 0,
        text: '',
      })

      expect(result).toEqual(original)
    })
  })

  describe('remove_text', () => {
    test('removing text from the beginning of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'remove_text',
          path: [0, 0],
          offset: 0,
          text: 'Hello ',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'World', marks: []}],
      })
    })

    test('removing text from the middle of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'remove_text',
          path: [0, 0],
          offset: 5,
          text: ' ',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'HelloWorld', marks: []}],
      })
    })

    test('removing text from the end of a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'remove_text',
          path: [0, 0],
          offset: 5,
          text: ' World',
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
      })
    })

    test('removing empty text does nothing', () => {
      const original = [createTextBlock('k0', [createSpan('k1', 'Hello')])]
      const result = applyOperationToPortableText(createContext(), original, {
        type: 'remove_text',
        path: [0, 0],
        offset: 0,
        text: '',
      })

      expect(result).toEqual(original)
    })
  })

  describe('remove_node', () => {
    test('removing a block from the root', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [createSpan('k1', 'Hello')]),
          createTextBlock('k2', [createSpan('k3', 'World')]),
        ],
        {
          type: 'remove_node',
          path: [1],
          node: createTextBlock('k2', [createSpan('k3', 'World')]),
        } as TestOperation,
      )

      expect(result).toHaveLength(1)
      expect(result[0]._key).toBe('k0')
    })

    test('removing a span from a block', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [
            createSpan('k1', 'Hello'),
            createSpan('k2', ' World'),
          ]),
        ],
        {
          type: 'remove_node',
          path: [0, 1],
          node: createSpan('k2', ' World'),
        } as TestOperation,
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
      })
    })

    test('removing the first span from a block', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [
            createSpan('k1', 'Hello'),
            createSpan('k2', ' World'),
          ]),
        ],
        {
          type: 'remove_node',
          path: [0, 0],
          node: createSpan('k1', 'Hello'),
        } as TestOperation,
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k2', text: ' World', marks: []}],
      })
    })
  })

  describe('merge_node', () => {
    test('merging two spans', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [
            createSpan('k1', 'Hello'),
            createSpan('k2', ' World'),
          ]),
        ],
        {
          type: 'merge_node',
          path: [0, 1],
          position: 5,
          properties: {},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello World', marks: []}],
      })
    })

    test('merging two blocks', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [createSpan('k1', 'Hello')]),
          createTextBlock('k2', [createSpan('k3', ' World')]),
        ],
        {
          type: 'merge_node',
          path: [1],
          position: 1,
          properties: {},
        },
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Hello', marks: []},
          {_type: 'span', _key: 'k3', text: ' World', marks: []},
        ],
      })
    })
  })

  describe('split_node', () => {
    test('splitting a span', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'split_node',
          path: [0, 0],
          position: 5,
          properties: {_type: 'span', _key: 'k2'},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Hello', marks: []},
          {_type: 'span', _key: 'k2', text: ' World'},
        ],
      })
    })

    test('splitting a block', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [
            createSpan('k1', 'Hello'),
            createSpan('k2', ' World'),
          ]),
        ],
        {
          type: 'split_node',
          path: [0],
          position: 1,
          properties: {_key: 'k3'},
        },
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
      })
      expect(result[1]).toEqual({
        _type: 'block',
        _key: 'k3',
        children: [{_type: 'span', _key: 'k2', text: ' World', marks: []}],
      })
    })

    test('splitting a span at the beginning', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'split_node',
          path: [0, 0],
          position: 0,
          properties: {_type: 'span', _key: 'k2'},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: '', marks: []},
          {_type: 'span', _key: 'k2', text: 'Hello'},
        ],
      })
    })
  })

  describe('move_node', () => {
    test('moving a block to the end', () => {
      // move_node: path is source, newPath is destination (where it ends up)
      // Moving k0 from position 0 to position 2 means it ends up at position 2
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [createSpan('k1', 'First')]),
          createTextBlock('k2', [createSpan('k3', 'Second')]),
          createTextBlock('k4', [createSpan('k5', 'Third')]),
        ],
        {
          type: 'move_node',
          path: [0],
          newPath: [2],
        },
      )

      expect(result).toHaveLength(3)
      expect(result[0]._key).toBe('k2')
      expect(result[1]._key).toBe('k4')
      expect(result[2]._key).toBe('k0')
    })

    test('moving a block to the beginning', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [createSpan('k1', 'First')]),
          createTextBlock('k2', [createSpan('k3', 'Second')]),
        ],
        {
          type: 'move_node',
          path: [1],
          newPath: [0],
        },
      )

      expect(result).toHaveLength(2)
      expect(result[0]._key).toBe('k2')
      expect(result[1]._key).toBe('k0')
    })

    test('moving a span within a block', () => {
      // Moving k1 from position 0 to position 2 means it ends up at position 2
      const result = applyOperationToPortableText(
        createContext(),
        [
          createTextBlock('k0', [
            createSpan('k1', 'First'),
            createSpan('k2', 'Second'),
            createSpan('k3', 'Third'),
          ]),
        ],
        {
          type: 'move_node',
          path: [0, 0],
          newPath: [0, 2],
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k2', text: 'Second', marks: []},
          {_type: 'span', _key: 'k3', text: 'Third', marks: []},
          {_type: 'span', _key: 'k1', text: 'First', marks: []},
        ],
      })
    })
  })

  describe('set_node', () => {
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

    test('setting text block style', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'set_node',
          path: [0],
          properties: {},
          newProperties: {style: 'h1'},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
      })
    })

    test('setting span marks', () => {
      const result = applyOperationToPortableText(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'set_node',
          path: [0, 0],
          properties: {marks: []},
          newProperties: {marks: ['strong']},
        },
      )

      expect(result[0]).toEqual({
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'Hello', marks: ['strong']},
        ],
      })
    })
  })

  describe('immutability', () => {
    test('original value is not mutated', () => {
      const original = [createTextBlock('k0', [createSpan('k1', 'Hello')])]
      const originalJson = JSON.stringify(original)

      applyOperationToPortableText(createContext(), original, {
        type: 'insert_text',
        path: [0, 0],
        offset: 5,
        text: ' World',
      })

      expect(JSON.stringify(original)).toBe(originalJson)
    })

    test('nested objects are not mutated', () => {
      const span = createSpan('k1', 'Hello')
      const block = createTextBlock('k0', [span])
      const original = [block]
      const originalSpanText = span.text

      applyOperationToPortableText(createContext(), original, {
        type: 'insert_text',
        path: [0, 0],
        offset: 5,
        text: ' World',
      })

      expect(span.text).toBe(originalSpanText)
    })
  })

  describe('edge cases', () => {
    test('handles out-of-bounds insert gracefully', () => {
      const original = [createTextBlock('k0', [createSpan('k1', 'Hello')])]

      // Insert at an out-of-bounds path - the patch-based implementation
      // handles this gracefully by inserting at position 0
      const result = applyOperationToPortableText(createContext(), original, {
        type: 'insert_node',
        path: [100],
        node: createTextBlock('k2', [createSpan('k3', 'World')]),
      } as TestOperation)

      // Block is inserted (implementation handles edge case gracefully)
      expect(result).toHaveLength(2)
    })

    test('handles empty value array', () => {
      const result = applyOperationToPortableText(createContext(), [], {
        type: 'insert_node',
        path: [0],
        node: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'Hello'}],
        },
      } as TestOperation)

      expect(result).toHaveLength(1)
      expect(result[0]._key).toBe('k0')
    })
  })
})
