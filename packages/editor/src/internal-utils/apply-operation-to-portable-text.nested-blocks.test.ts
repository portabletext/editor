import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {Node} from 'slate'
import {describe, expect, test} from 'vitest'
import {applyOperationToPortableText} from './apply-operation-to-portable-text'

/**
 * These tests exercise `applyOperationToPortableText` with nested block
 * structures (depth > 2). Nested blocks (e.g., table cells containing PT
 * content) produce paths at depth 3+.
 *
 * Coverage:
 * - All 8 operation types with nested text blocks + spans (depth 2-3)
 * - Nested inline objects inside text blocks inside containers
 * - Nested block objects as direct children of containers
 * - Depth 4+ (table > row > cell > block > span) to verify arbitrary depth
 */

function createContext() {
  const keyGenerator = createTestKeyGenerator()
  const schema = compileSchema(defineSchema({}))

  return {
    keyGenerator,
    schema,
  }
}

/**
 * The basic nesting model used in most tests: a container block at the root
 * whose children are text blocks containing spans. This gives depth-3 paths
 * (container > block > span). Deeper nesting (depth 4+) is tested separately
 * with a table > row > cell > block > span structure.
 */

describe(`${applyOperationToPortableText.name} — nested blocks`, () => {
  describe('insert_text', () => {
    test('inserting text into a span inside a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey = keyGenerator()

      // A container block with a nested text block inside it.
      // Path to the span: [0, 0, 0] (container → nestedBlock → span)
      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_text',
          path: [0, 0, 0],
          offset: 5,
          text: ' World',
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'Hello World',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  describe('remove_text', () => {
    test('removing text from a span inside a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'Hello World',
                  marks: [],
                },
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_text',
          path: [0, 0, 0],
          offset: 5,
          text: ' World',
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('insert_node', () => {
    test('inserting a text block into a nested container (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const existingBlockKey = keyGenerator()
      const existingSpanKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: existingBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: existingSpanKey,
                  text: 'First',
                  marks: [],
                },
              ],
            },
          ],
        },
      ]

      // Insert a new text block as the second child of the container
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_node',
          path: [0, 1],
          node: {
            _type: 'block',
            _key: newBlockKey,
            children: [{_type: 'span', _key: newSpanKey, text: 'Second'}],
          },
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: existingBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: existingSpanKey,
                  text: 'First',
                  marks: [],
                },
              ],
            },
            {
              _type: 'block',
              _key: newBlockKey,
              children: [{_type: 'span', _key: newSpanKey, text: 'Second'}],
            },
          ],
        },
      ])
    })

    test('inserting a span into a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const existingSpanKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: existingSpanKey,
                  text: 'Hello',
                  marks: [],
                },
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_node',
          path: [0, 0, 1],
          node: {_type: 'span', _key: newSpanKey, text: ' World'},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: existingSpanKey,
                  text: 'Hello',
                  marks: [],
                },
                {_type: 'span', _key: newSpanKey, text: ' World'},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('remove_node', () => {
    test('removing a text block from a nested container (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey1 = keyGenerator()
      const spanKey1 = keyGenerator()
      const blockKey2 = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey1,
              children: [
                {_type: 'span', _key: spanKey1, text: 'First', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: blockKey2,
              children: [
                {_type: 'span', _key: spanKey2, text: 'Second', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_node',
          path: [0, 1],
          node: {
            _type: 'block',
            _key: blockKey2,
            children: [
              {_type: 'span', _key: spanKey2, text: 'Second', marks: []},
            ],
          },
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey1,
              children: [
                {_type: 'span', _key: spanKey1, text: 'First', marks: []},
              ],
            },
          ],
        },
      ])
    })

    test('removing a span from a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_node',
          path: [0, 0, 1],
          node: {_type: 'span', _key: spanKey2, text: ' World', marks: []},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('merge_node', () => {
    test('merging two spans inside a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'merge_node',
          path: [0, 0, 1],
          position: 5,
          properties: {},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey1,
                  text: 'Hello World',
                  marks: [],
                },
              ],
            },
          ],
        },
      ])
    })

    test('merging two text blocks inside a nested container (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey1 = keyGenerator()
      const spanKey1 = keyGenerator()
      const blockKey2 = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey1,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: blockKey2,
              children: [
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'merge_node',
          path: [0, 1],
          position: 1,
          properties: {},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey1,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('split_node', () => {
    test('splitting a span inside a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey = keyGenerator()
      const newSpanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'Hello World',
                  marks: [],
                },
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'split_node',
          path: [0, 0, 0],
          position: 5,
          properties: {_type: 'span', _key: newSpanKey},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
                {_type: 'span', _key: newSpanKey, text: ' World'},
              ],
            },
          ],
        },
      ])
    })

    test('splitting a nested text block (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()
      const newBlockKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ]

      // Split the nested block after the first child
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'split_node',
          path: [0, 0],
          position: 1,
          properties: {_key: newBlockKey},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Hello', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: newBlockKey,
              children: [
                {_type: 'span', _key: spanKey2, text: ' World', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('set_node', () => {
    test('setting span marks inside a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'set_node',
          path: [0, 0, 0],
          properties: {marks: []},
          newProperties: {marks: ['strong']},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'Hello',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ])
    })

    test('setting style on a nested text block (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'set_node',
          path: [0, 0],
          properties: {},
          newProperties: {style: 'h1'},
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              style: 'h1',
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  describe('move_node', () => {
    test('moving a span within a nested text block (depth 3)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const nestedBlockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()
      const spanKey3 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'First', marks: []},
                {_type: 'span', _key: spanKey2, text: 'Second', marks: []},
                {_type: 'span', _key: spanKey3, text: 'Third', marks: []},
              ],
            },
          ],
        },
      ]

      // Move first span to the end
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'move_node',
          path: [0, 0, 0],
          newPath: [0, 0, 2],
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: nestedBlockKey,
              children: [
                {_type: 'span', _key: spanKey2, text: 'Second', marks: []},
                {_type: 'span', _key: spanKey3, text: 'Third', marks: []},
                {_type: 'span', _key: spanKey1, text: 'First', marks: []},
              ],
            },
          ],
        },
      ])
    })

    test('moving a text block between nested containers (depth 2)', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey1 = keyGenerator()
      const containerKey2 = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emptyBlockKey = keyGenerator()
      const emptySpanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey1,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
        {
          _type: 'tableCell',
          _key: containerKey2,
          children: [
            {
              _type: 'block',
              _key: emptyBlockKey,
              children: [
                {_type: 'span', _key: emptySpanKey, text: '', marks: []},
              ],
            },
          ],
        },
      ]

      // Move the text block from first container to second container
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'move_node',
          path: [0, 0],
          newPath: [1, 1],
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey1,
          children: [],
        },
        {
          _type: 'tableCell',
          _key: containerKey2,
          children: [
            {
              _type: 'block',
              _key: emptyBlockKey,
              children: [
                {_type: 'span', _key: emptySpanKey, text: '', marks: []},
              ],
            },
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  // ---------------------------------------------------------------
  // Nested inline objects
  // ---------------------------------------------------------------
  // An inline object (e.g., inline image) sitting alongside spans
  // inside a text block that is itself nested in a container.
  // Structure: container → text block → [span, inlineObject, span]
  // Paths: inline object at [0, 0, 1], spans at [0, 0, 0] and [0, 0, 2]

  describe('nested inline objects', () => {
    test('insert_node — inserting an inline object into a nested text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const inlineKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      // Slate marks inline objects with __inline and wraps their
      // fields in a `value` property. The insert_node handler
      // unwraps `value` back into the PT node.
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_node',
          path: [0, 0, 1],
          node: {
            _type: 'inlineImage',
            _key: inlineKey,
            __inline: true,
            children: [{text: ''}],
            value: {src: 'cat.png'},
          } as unknown as Node,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
                {_type: 'inlineImage', _key: inlineKey, src: 'cat.png'},
              ],
            },
          ],
        },
      ])
    })

    test('remove_node — removing an inline object from a nested text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const inlineKey = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Before', marks: []},
                {_type: 'inlineImage', _key: inlineKey, src: 'cat.png'},
                {_type: 'span', _key: spanKey2, text: 'After', marks: []},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_node',
          path: [0, 0, 1],
          node: {
            _type: 'inlineImage',
            _key: inlineKey,
            src: 'cat.png',
          } as unknown as Node,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Before', marks: []},
                {_type: 'span', _key: spanKey2, text: 'After', marks: []},
              ],
            },
          ],
        },
      ])
    })

    test('set_node — updating properties on a nested inline object', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const inlineKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
                {_type: 'inlineImage', _key: inlineKey, src: 'cat.png'},
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'set_node',
          path: [0, 0, 1],
          properties: {src: 'cat.png'} as Partial<Node>,
          newProperties: {src: 'dog.png'} as Partial<Node>,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
                {_type: 'inlineImage', _key: inlineKey, src: 'dog.png'},
              ],
            },
          ],
        },
      ])
    })

    test('move_node — moving an inline object within a nested text block', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const inlineKey = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey1, text: 'Before', marks: []},
                {_type: 'inlineImage', _key: inlineKey, src: 'cat.png'},
                {_type: 'span', _key: spanKey2, text: 'After', marks: []},
              ],
            },
          ],
        },
      ]

      // Move inline object from index 1 to index 0 (before the first span)
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'move_node',
          path: [0, 0, 1],
          newPath: [0, 0, 0],
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'inlineImage', _key: inlineKey, src: 'cat.png'},
                {_type: 'span', _key: spanKey1, text: 'Before', marks: []},
                {_type: 'span', _key: spanKey2, text: 'After', marks: []},
              ],
            },
          ],
        },
      ])
    })
  })

  // ---------------------------------------------------------------
  // Nested block objects
  // ---------------------------------------------------------------
  // A block object (e.g., image block) as a direct child of a container,
  // sitting alongside text blocks. No children array on the block object.
  // Structure: container → [text block, block object]
  // Paths: block object at [0, 1]

  describe('nested block objects', () => {
    test('insert_node — inserting a block object into a container', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const imageKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      // Slate represents block objects as Elements (with children).
      // The insert_node handler strips children and unwraps `value`
      // back into the PT node.
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_node',
          path: [0, 1],
          node: {
            _type: 'image',
            _key: imageKey,
            children: [{text: ''}],
            value: {src: 'photo.jpg'},
          } as unknown as Node,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
            {_type: 'image', _key: imageKey, src: 'photo.jpg'},
          ],
        },
      ])
    })

    test('remove_node — removing a block object from a container', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const imageKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
            {_type: 'image', _key: imageKey, src: 'photo.jpg'},
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_node',
          path: [0, 1],
          node: {
            _type: 'image',
            _key: imageKey,
            src: 'photo.jpg',
          } as unknown as Node,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ])
    })

    test('set_node — updating properties on a nested block object', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey = keyGenerator()
      const imageKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {_type: 'image', _key: imageKey, src: 'photo.jpg', alt: ''},
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'set_node',
          path: [0, 0],
          properties: {alt: ''} as Partial<Node>,
          newProperties: {alt: 'A photo'} as Partial<Node>,
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey,
          children: [
            {
              _type: 'image',
              _key: imageKey,
              src: 'photo.jpg',
              alt: 'A photo',
            },
          ],
        },
      ])
    })

    test('move_node — moving a block object between containers', () => {
      const keyGenerator = createTestKeyGenerator()
      const containerKey1 = keyGenerator()
      const containerKey2 = keyGenerator()
      const imageKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const value = [
        {
          _type: 'tableCell',
          _key: containerKey1,
          children: [{_type: 'image', _key: imageKey, src: 'photo.jpg'}],
        },
        {
          _type: 'tableCell',
          _key: containerKey2,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
          ],
        },
      ]

      // Move image from first container to second container
      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'move_node',
          path: [0, 0],
          newPath: [1, 1],
        }),
      ).toEqual([
        {
          _type: 'tableCell',
          _key: containerKey1,
          children: [],
        },
        {
          _type: 'tableCell',
          _key: containerKey2,
          children: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'Hello', marks: []},
              ],
            },
            {_type: 'image', _key: imageKey, src: 'photo.jpg'},
          ],
        },
      ])
    })
  })

  // ---------------------------------------------------------------
  // Depth 4+ (table → row → cell → block → span)
  // ---------------------------------------------------------------
  // Proves the loop-based helpers work beyond depth 3.
  // Structure: table → tableRow → tableCell → block → span
  // Span path: [0, 0, 0, 0, 0]

  describe('depth 4+ (table → row → cell → block → span)', () => {
    function createDeepValue(keyGenerator: () => string) {
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      return {
        value: [
          {
            _type: 'table',
            _key: tableKey,
            children: [
              {
                _type: 'tableRow',
                _key: rowKey,
                children: [
                  {
                    _type: 'tableCell',
                    _key: cellKey,
                    children: [
                      {
                        _type: 'block',
                        _key: blockKey,
                        children: [
                          {
                            _type: 'span',
                            _key: spanKey,
                            text: 'Deep text',
                            marks: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        keys: {tableKey, rowKey, cellKey, blockKey, spanKey},
      }
    }

    test('insert_text at depth 5 (span inside table → row → cell → block)', () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, keys} = createDeepValue(keyGenerator)

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'insert_text',
          path: [0, 0, 0, 0, 0],
          offset: 9,
          text: ' here',
        }),
      ).toEqual([
        {
          _type: 'table',
          _key: keys.tableKey,
          children: [
            {
              _type: 'tableRow',
              _key: keys.rowKey,
              children: [
                {
                  _type: 'tableCell',
                  _key: keys.cellKey,
                  children: [
                    {
                      _type: 'block',
                      _key: keys.blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: keys.spanKey,
                          text: 'Deep text here',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('remove_text at depth 5', () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, keys} = createDeepValue(keyGenerator)

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'remove_text',
          path: [0, 0, 0, 0, 0],
          offset: 4,
          text: ' text',
        }),
      ).toEqual([
        {
          _type: 'table',
          _key: keys.tableKey,
          children: [
            {
              _type: 'tableRow',
              _key: keys.rowKey,
              children: [
                {
                  _type: 'tableCell',
                  _key: keys.cellKey,
                  children: [
                    {
                      _type: 'block',
                      _key: keys.blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: keys.spanKey,
                          text: 'Deep',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('split_node — splitting a span at depth 5', () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, keys} = createDeepValue(keyGenerator)
      const newSpanKey = keyGenerator()

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'split_node',
          path: [0, 0, 0, 0, 0],
          position: 4,
          properties: {_type: 'span', _key: newSpanKey},
        }),
      ).toEqual([
        {
          _type: 'table',
          _key: keys.tableKey,
          children: [
            {
              _type: 'tableRow',
              _key: keys.rowKey,
              children: [
                {
                  _type: 'tableCell',
                  _key: keys.cellKey,
                  children: [
                    {
                      _type: 'block',
                      _key: keys.blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: keys.spanKey,
                          text: 'Deep',
                          marks: [],
                        },
                        {_type: 'span', _key: newSpanKey, text: ' text'},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    test('merge_node — merging two spans at depth 5', () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()

      const value = [
        {
          _type: 'table',
          _key: tableKey,
          children: [
            {
              _type: 'tableRow',
              _key: rowKey,
              children: [
                {
                  _type: 'tableCell',
                  _key: cellKey,
                  children: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: spanKey1,
                          text: 'Deep',
                          marks: [],
                        },
                        {
                          _type: 'span',
                          _key: spanKey2,
                          text: ' text',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]

      expect(
        applyOperationToPortableText(createContext(), value, {
          type: 'merge_node',
          path: [0, 0, 0, 0, 1],
          position: 4,
          properties: {},
        }),
      ).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          children: [
            {
              _type: 'tableRow',
              _key: rowKey,
              children: [
                {
                  _type: 'tableCell',
                  _key: cellKey,
                  children: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: spanKey1,
                          text: 'Deep text',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })
})
