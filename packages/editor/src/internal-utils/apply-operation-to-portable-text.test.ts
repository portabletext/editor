import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {applyOperationToPortableText} from './apply-operation-to-portable-text'
import {VOID_CHILD_KEY} from './values'

function createContext() {
  const keyGenerator = createTestKeyGenerator()
  const schema = compileSchema(defineSchema({}))

  return {
    keyGenerator,
    schema,
  }
}

describe(applyOperationToPortableText.name, () => {
  describe('insert_node', () => {
    test('inserting a text block at the root', () => {
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
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_node',
            path: [1],
            node: {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'World'}],
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
        {
          _type: 'block',
          _key: k2,
          children: [{_type: 'span', _key: k3, text: 'World'}],
        },
      ])
    })

    test('inserting a text block at the beginning', () => {
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
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_node',
            path: [0],
            node: {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'World'}],
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k2,
          children: [{_type: 'span', _key: k3, text: 'World'}],
        },
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('inserting a block object at the root', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_node',
            path: [1],
            node: {
              _type: 'image',
              _key: k2,
              children: [{text: '', _key: VOID_CHILD_KEY, _type: 'span'}],
              value: {src: 'https://example.com/image.jpg'},
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
        {
          _type: 'image',
          _key: k2,
          src: 'https://example.com/image.jpg',
        },
      ])
    })

    test('inserting a span into a block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_node',
            path: [0, 1],
            node: {_type: 'span', _key: k2, text: ' World'},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k2, text: ' World'},
          ],
        },
      ])
    })

    test('inserting an inline object into a block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_node',
            path: [0, 1],
            node: {
              _type: 'stock-ticker',
              _key: k2,
              __inline: true,
              children: [{text: '', _key: VOID_CHILD_KEY, _type: 'span'}],
              value: {symbol: 'AAPL'},
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'stock-ticker', _key: k2, symbol: 'AAPL'},
          ],
        },
      ])
    })
  })

  describe('insert_text', () => {
    test('inserting text at the beginning of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'World', marks: []}],
            },
          ],
          {
            type: 'insert_text',
            path: [0, 0],
            offset: 0,
            text: 'Hello ',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello World', marks: []}],
        },
      ])
    })

    test('inserting text in the middle of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Helo', marks: []}],
            },
          ],
          {
            type: 'insert_text',
            path: [0, 0],
            offset: 2,
            text: 'l',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('inserting text at the end of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'insert_text',
            path: [0, 0],
            offset: 5,
            text: ' World',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello World', marks: []}],
        },
      ])
    })

    test('inserting empty text does nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'insert_text',
          path: [0, 0],
          offset: 0,
          text: '',
        }),
      ).toEqual(original)
    })
  })

  describe('remove_text', () => {
    test('removing text from the beginning of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_text',
            path: [0, 0],
            offset: 0,
            text: 'Hello ',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'World', marks: []}],
        },
      ])
    })

    test('removing text from the middle of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_text',
            path: [0, 0],
            offset: 5,
            text: ' ',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'HelloWorld', marks: []}],
        },
      ])
    })

    test('removing text from the end of a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_text',
            path: [0, 0],
            offset: 5,
            text: ' World',
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('removing empty text does nothing', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'remove_text',
          path: [0, 0],
          offset: 0,
          text: '',
        }),
      ).toEqual(original)
    })
  })

  describe('remove_node', () => {
    test('removing a block from the root', () => {
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
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
            {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'World', marks: []}],
            },
          ],
          {
            type: 'remove_node',
            path: [1],
            node: {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'World', marks: []}],
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('removing a span from a block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_node',
            path: [0, 1],
            node: {_type: 'span', _key: k2, text: ' World', marks: []},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('removing the first span from a block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_node',
            path: [0, 0],
            node: {_type: 'span', _key: k1, text: 'Hello', marks: []},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k2, text: ' World', marks: []}],
        },
      ])
    })

    test('removing a block object from root', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const voidChild = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
            {
              _type: 'image',
              _key: k2,
              src: 'https://example.com/image.jpg',
            },
          ],
          {
            type: 'remove_node',
            path: [1],
            node: {
              _type: 'image',
              _key: k2,
              children: [{_type: 'span', _key: voidChild, text: ''}],
              value: {src: 'https://example.com/image.jpg'},
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('removing an inline object from a block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const k3 = keyGenerator()
      const voidChild = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello ', marks: []},
                {_type: 'stock-ticker', _key: k2, symbol: 'AAPL'},
                {_type: 'span', _key: k3, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'remove_node',
            path: [0, 1],
            node: {
              _type: 'stock-ticker',
              _key: k2,
              __inline: true,
              children: [{_type: 'span', _key: voidChild, text: ''}],
              value: {symbol: 'AAPL'},
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello ', marks: []},
            {_type: 'span', _key: k3, text: ' World', marks: []},
          ],
        },
      ])
    })
  })

  describe('merge_node', () => {
    test('merging two spans', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'merge_node',
            path: [0, 1],
            position: 5,
            properties: {},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello World', marks: []}],
        },
      ])
    })

    test('merging two blocks', () => {
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
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
            {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: ' World', marks: []}],
            },
          ],
          {
            type: 'merge_node',
            path: [1],
            position: 1,
            properties: {},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k3, text: ' World', marks: []},
          ],
        },
      ])
    })
  })

  describe('split_node', () => {
    test('splitting a span', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello World', marks: []},
              ],
            },
          ],
          {
            type: 'split_node',
            path: [0, 0],
            position: 5,
            properties: {_type: 'span', _key: k2},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k2, text: ' World'},
          ],
        },
      ])
    })

    test('splitting a block', () => {
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
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'split_node',
            path: [0],
            position: 1,
            properties: {_key: k3},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
        {
          _type: 'block',
          _key: k3,
          children: [{_type: 'span', _key: k2, text: ' World', marks: []}],
        },
      ])
    })

    test('splitting a span at the beginning', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'split_node',
            path: [0, 0],
            position: 0,
            properties: {_type: 'span', _key: k2},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: '', marks: []},
            {_type: 'span', _key: k2, text: 'Hello'},
          ],
        },
      ])
    })

    describe('splitting text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const k3 = keyGenerator()
      const block = {
        _type: 'block',
        _key: k0,
        children: [
          {_type: 'span', _key: k1, text: 'Hello, ', marks: []},
          {_type: 'span', _key: k2, text: 'World', marks: [k3]},
        ],
        markDefs: [
          {
            _key: k3,
            _type: 'link',
            href: 'https://example.com',
          },
        ],
        style: 'h1',
      }

      test('no properties', () => {
        expect(
          applyOperationToPortableText(createContext(), [block], {
            type: 'split_node',
            path: [0],
            position: 1,
            properties: {},
          }),
        ).toEqual([
          {
            ...block,
            children: [block.children[0]],
          },
          {
            _type: 'block',
            children: [block.children[1]],
          },
        ])
      })

      test('with properties', () => {
        const k4 = keyGenerator()

        expect(
          applyOperationToPortableText(createContext(), [block], {
            type: 'split_node',
            path: [0],
            position: 1,
            properties: {
              _type: 'block',
              _key: k4,
              markDefs: block.markDefs,
              style: block.style,
            },
          }),
        ).toEqual([
          {
            ...block,
            children: [block.children[0]],
          },
          {
            _type: 'block',
            _key: k4,
            children: [block.children[1]],
            markDefs: block.markDefs,
            style: block.style,
          },
        ])
      })
    })

    test('splitting a block at position 0', () => {
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
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'split_node',
            path: [0],
            position: 0,
            properties: {_key: k3},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [],
        },
        {
          _type: 'block',
          _key: k3,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k2, text: ' World', marks: []},
          ],
        },
      ])
    })

    test('splitting a block after all children', () => {
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
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: []},
                {_type: 'span', _key: k2, text: ' World', marks: []},
              ],
            },
          ],
          {
            type: 'split_node',
            path: [0],
            position: 2,
            properties: {_key: k3},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k2, text: ' World', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: k3,
          children: [],
        },
      ])
    })

    test('splitting a span at the end', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'split_node',
            path: [0, 0],
            position: 5,
            properties: {_type: 'span', _key: k2},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: []},
            {_type: 'span', _key: k2, text: ''},
          ],
        },
      ])
    })
  })

  describe('move_node', () => {
    test('moving a block to the end', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const k3 = keyGenerator()
      const k4 = keyGenerator()
      const k5 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'First', marks: []}],
            },
            {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'Second', marks: []}],
            },
            {
              _type: 'block',
              _key: k4,
              children: [{_type: 'span', _key: k5, text: 'Third', marks: []}],
            },
          ],
          {
            type: 'move_node',
            path: [0],
            newPath: [2],
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k2,
          children: [{_type: 'span', _key: k3, text: 'Second', marks: []}],
        },
        {
          _type: 'block',
          _key: k4,
          children: [{_type: 'span', _key: k5, text: 'Third', marks: []}],
        },
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'First', marks: []}],
        },
      ])
    })

    test('moving a block to the beginning', () => {
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
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'First', marks: []}],
            },
            {
              _type: 'block',
              _key: k2,
              children: [{_type: 'span', _key: k3, text: 'Second', marks: []}],
            },
          ],
          {
            type: 'move_node',
            path: [1],
            newPath: [0],
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k2,
          children: [{_type: 'span', _key: k3, text: 'Second', marks: []}],
        },
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'First', marks: []}],
        },
      ])
    })

    test('moving a span within a block', () => {
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
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'First', marks: []},
                {_type: 'span', _key: k2, text: 'Second', marks: []},
                {_type: 'span', _key: k3, text: 'Third', marks: []},
              ],
            },
          ],
          {
            type: 'move_node',
            path: [0, 0],
            newPath: [0, 2],
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k2, text: 'Second', marks: []},
            {_type: 'span', _key: k3, text: 'Third', marks: []},
            {_type: 'span', _key: k1, text: 'First', marks: []},
          ],
        },
      ])
    })

    test('moving a span from one block to another', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const k3 = keyGenerator()
      const k4 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'First', marks: []},
                {_type: 'span', _key: k2, text: 'Second', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: k3,
              children: [{_type: 'span', _key: k4, text: 'Third', marks: []}],
            },
          ],
          {
            type: 'move_node',
            path: [0, 1],
            newPath: [1, 0],
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'First', marks: []}],
        },
        {
          _type: 'block',
          _key: k3,
          children: [
            {_type: 'span', _key: k2, text: 'Second', marks: []},
            {_type: 'span', _key: k4, text: 'Third', marks: []},
          ],
        },
      ])
    })

    test('moving a block object', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
            {
              _type: 'image',
              _key: k2,
              src: 'https://example.com/image.jpg',
            },
          ],
          {
            type: 'move_node',
            path: [1],
            newPath: [0],
          },
        ),
      ).toEqual([
        {
          _type: 'image',
          _key: k2,
          src: 'https://example.com/image.jpg',
        },
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })
  })

  describe('set_node', () => {
    test('setting block object properties', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'image',
              _key: k0,
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
          _key: k0,
          src: 'https://example.com/image.jpg',
        },
      ])
    })

    test('updating block object properties', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'image',
              _key: k0,
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
          _key: k0,
          src: 'https://example.com/image.jpg',
          alt: 'An image',
        },
      ])
    })

    test('removing block object properties', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [{_type: 'image', _key: k0, alt: 'An image'}],
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
      ).toEqual([{_type: 'image', _key: k0}])
    })

    test('updating block object _key', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'image',
              _key: k0,
              src: 'https://example.com/image.jpg',
            },
          ],
          {
            type: 'set_node',
            path: [0],
            properties: {_key: k0},
            newProperties: {_key: k1},
          },
        ),
      ).toEqual([
        {
          _type: 'image',
          _key: k1,
          src: 'https://example.com/image.jpg',
        },
      ])
    })

    test('updating inline object properties', () => {
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
                  _type: 'stock ticker',
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
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: ''},
            {_type: 'stock ticker', _key: k2, symbol: 'AAPL'},
            {_type: 'span', _key: k3, text: ''},
          ],
        },
      ])
    })

    test('setting text block style', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'set_node',
            path: [0],
            properties: {},
            newProperties: {style: 'h1'},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          style: 'h1',
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('setting span marks', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'set_node',
            path: [0, 0],
            properties: {marks: []},
            newProperties: {marks: ['strong']},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: ['strong']},
          ],
        },
      ])
    })

    test('updating span _key', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'set_node',
            path: [0, 0],
            properties: {_key: k1},
            newProperties: {_key: k2},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k2, text: 'Hello', marks: []}],
        },
      ])
    })

    test('removing text block style', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              style: 'h1',
              children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
            },
          ],
          {
            type: 'set_node',
            path: [0],
            properties: {style: 'h1'},
            newProperties: {},
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ])
    })

    test('setting text block markDefs', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const linkKey = keyGenerator()

      expect(
        applyOperationToPortableText(
          createContext(),
          [
            {
              _type: 'block',
              _key: k0,
              children: [
                {_type: 'span', _key: k1, text: 'Hello', marks: [linkKey]},
              ],
            },
          ],
          {
            type: 'set_node',
            path: [0],
            properties: {},
            newProperties: {
              markDefs: [
                {_key: linkKey, _type: 'link', href: 'https://example.com'},
              ],
            },
          },
        ),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_type: 'span', _key: k1, text: 'Hello', marks: [linkKey]},
          ],
        },
      ])
    })
  })

  describe('immutability', () => {
    test('original value is not mutated', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]
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
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const span = {
        _type: 'span',
        _key: k1,
        text: 'Hello',
        marks: [] as string[],
      }
      const block = {
        _type: 'block',
        _key: k0,
        children: [span],
      }
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
    test('returns original value on error', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const k2 = keyGenerator()
      const k3 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'insert_node',
          path: [100],
          node: {
            _type: 'block',
            _key: k2,
            children: [{_type: 'span', _key: k3, text: 'World', marks: []}],
          },
        }),
      ).toEqual(original)
    })

    test('handles empty value array', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()

      expect(
        applyOperationToPortableText(createContext(), [], {
          type: 'insert_node',
          path: [0],
          node: {
            _type: 'block',
            _key: k0,
            children: [{_type: 'span', _key: k1, text: 'Hello'}],
          },
        }),
      ).toEqual([
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello'}],
        },
      ])
    })

    test('remove_node on non-existent path returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'remove_node',
          path: [5],
          node: {_type: 'block', _key: 'nonexistent', children: []},
        }),
      ).toEqual(original)
    })

    test('merge_node with no previous block returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      // Trying to merge the first block (no previous to merge with)
      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'merge_node',
          path: [0],
          position: 0,
          properties: {},
        }),
      ).toEqual(original)
    })

    test('split_node on block object returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const original = [
        {
          _type: 'image',
          _key: k0,
          src: 'https://example.com/image.jpg',
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'split_node',
          path: [0],
          position: 0,
          properties: {},
        }),
      ).toEqual(original)
    })

    test('insert_text on non-existent span returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'insert_text',
          path: [0, 5],
          offset: 0,
          text: 'World',
        }),
      ).toEqual(original)
    })

    test('set_node on root path returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'set_node',
          path: [],
          properties: {},
          newProperties: {style: 'h1'},
        }),
      ).toEqual(original)
    })

    test('move_node to ancestor path returns original', () => {
      const keyGenerator = createTestKeyGenerator()
      const k0 = keyGenerator()
      const k1 = keyGenerator()
      const original = [
        {
          _type: 'block',
          _key: k0,
          children: [{_type: 'span', _key: k1, text: 'Hello', marks: []}],
        },
      ]

      // This would be an invalid move (moving a node inside itself)
      expect(
        applyOperationToPortableText(createContext(), original, {
          type: 'move_node',
          path: [0],
          newPath: [0, 0],
        }),
      ).toEqual(original)
    })
  })
})
