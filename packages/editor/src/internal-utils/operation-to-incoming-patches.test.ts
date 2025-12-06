import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import type {Operation} from 'slate'
import {describe, expect, test} from 'vitest'
import type {OmitFromUnion} from '../type-utils'
import {operationToIncomingPatches} from './operation-to-incoming-patches'

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

describe(operationToIncomingPatches.name, () => {
  describe('insert_text', () => {
    test('generates set patch for text insertion', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 5,
          text: ' World',
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'diffMatchPatch',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      })
    })

    test('returns empty array for empty text', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_text',
          path: [0, 0],
          offset: 0,
          text: '',
        },
      )

      expect(patches).toHaveLength(0)
    })
  })

  describe('remove_text', () => {
    test('generates set patch for text removal', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'remove_text',
          path: [0, 0],
          offset: 5,
          text: ' World',
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'diffMatchPatch',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
      })
    })
  })

  describe('insert_node', () => {
    test('generates insert patch for block at root', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(1)
      expect(patches[0].type).toBe('insert')
      expect(patches[0]).toMatchObject({
        position: 'after',
        path: [{_key: 'k0'}],
      })
    })

    test('generates insert patch for span in block', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'insert_node',
          path: [0, 1],
          node: {_type: 'span', _key: 'k2', text: ' World'},
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0].type).toBe('insert')
      expect(patches[0]).toMatchObject({
        position: 'after',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      })
    })
  })

  describe('remove_node', () => {
    test('generates unset patch for block removal', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'unset',
        path: [{_key: 'k2'}],
      })
    })

    test('generates unset patch for span removal', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'unset',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
      })
    })
  })

  describe('merge_node', () => {
    test('generates set and unset patches for span merge', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(2)
      expect(patches[0]).toEqual({
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'Hello World',
      })
      expect(patches[1]).toEqual({
        type: 'unset',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
      })
    })

    test('generates set and unset patches for block merge', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(2)
      expect(patches[0].type).toBe('set')
      expect(patches[1]).toEqual({
        type: 'unset',
        path: [{_key: 'k2'}],
      })
    })
  })

  describe('split_node', () => {
    test('generates set and insert patches for span split', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello World')])],
        {
          type: 'split_node',
          path: [0, 0],
          position: 5,
          properties: {_type: 'span', _key: 'k2'},
        },
      )

      expect(patches).toHaveLength(2)
      expect(patches[0]).toEqual({
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'Hello',
      })
      expect(patches[1].type).toBe('insert')
      expect(patches[1]).toMatchObject({
        position: 'after',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      })
    })

    test('generates set and insert patches for block split', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(2)
      expect(patches[0].type).toBe('set')
      expect(patches[1].type).toBe('insert')
      expect(patches[1]).toMatchObject({
        position: 'after',
        path: [{_key: 'k0'}],
      })
    })
  })

  describe('move_node', () => {
    test('generates unset and insert patches for block move', () => {
      const patches = operationToIncomingPatches(
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

      expect(patches).toHaveLength(2)
      expect(patches[0]).toEqual({
        type: 'unset',
        path: [{_key: 'k2'}],
      })
      expect(patches[1].type).toBe('insert')
    })
  })

  describe('set_node', () => {
    test('generates set patches for text block properties', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'set_node',
          path: [0],
          properties: {},
          newProperties: {style: 'h1'},
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'set',
        path: [{_key: 'k0'}, 'style'],
        value: 'h1',
      })
    })

    test('generates set patches for span properties', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [createTextBlock('k0', [createSpan('k1', 'Hello')])],
        {
          type: 'set_node',
          path: [0, 0],
          properties: {marks: []},
          newProperties: {marks: ['strong']},
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'set',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks'],
        value: ['strong'],
      })
    })

    test('generates unset patches for removed properties', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [
          {
            _type: 'block',
            _key: 'k0',
            style: 'h1',
            children: [{_type: 'span', _key: 'k1', text: 'Hello', marks: []}],
          },
        ],
        {
          type: 'set_node',
          path: [0],
          properties: {style: 'h1'},
          newProperties: {},
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'unset',
        path: [{_key: 'k0'}, 'style'],
      })
    })

    test('handles block object value property', () => {
      const patches = operationToIncomingPatches(
        createContext(),
        [{_type: 'image', _key: 'k0'}],
        {
          type: 'set_node',
          path: [0],
          properties: {},
          newProperties: {
            value: {src: 'https://example.com/image.jpg'},
          },
        },
      )

      expect(patches).toHaveLength(1)
      expect(patches[0]).toEqual({
        type: 'set',
        path: [{_key: 'k0'}, 'src'],
        value: 'https://example.com/image.jpg',
      })
    })
  })
})
