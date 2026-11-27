import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {transformOperation} from './transform-operation'

const testSchema = compileSchema(defineSchema({}))

/**
 * Minimal editor mock. transformOperation only reads editor.snapshot.context.value,
 * editor.snapshot.context.schema, editor.containers (for block resolution), and
 * editor.snapshot.context.selection (for set.selection target resolution).
 */
function createMockEditor(
  children: Array<{_key: string; _type: string; [key: string]: unknown}>,
  selection?: {
    focus: {path: Array<{_key: string} | string | number>; offset: number}
    anchor: {path: Array<{_key: string} | string | number>; offset: number}
  },
): PortableTextEditorEngine {
  return {
    children,
    selection: selection ?? null,
    schema: testSchema,
    containers: new Map(),
  } as unknown as PortableTextEditorEngine
}

describe(transformOperation.name, () => {
  describe('insert patch at block level (path.length === 1)', () => {
    test('returns the operation unchanged (keyed paths are stable)', () => {
      const editor = createMockEditor([
        {_key: 'block1', _type: 'block'},
        {_key: 'block2', _type: 'block'},
      ])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: 'block3'}],
        items: [{_key: 'block3', _type: 'block'}],
        position: 'after',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
        offset: 0,
        text: 'hello',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([
        {
          type: 'insert.text',
          path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
          offset: 0,
          text: 'hello',
        },
      ])
    })
  })

  describe('insert patch with `replace` position', () => {
    test('drops an operation inside the replaced item when the new item reuses its key', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editor = createMockEditor([{_key: blockKey, _type: 'block'}])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        items: [{_key: spanKey, _type: 'span', text: 'barbaz'}],
        position: 'replace',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
        text: 'x',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([])
    })

    test('drops an operation inside the replaced item when the new item has a new key', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const newSpanKey = keyGenerator()
      const editor = createMockEditor([{_key: blockKey, _type: 'block'}])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        items: [{_key: newSpanKey, _type: 'span', text: 'barbaz'}],
        position: 'replace',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
        text: 'x',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([])
    })

    test('drops an operation inside the replaced block', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const editor = createMockEditor([{_key: newBlockKey, _type: 'block'}])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: blockKey}],
        items: [{_key: newBlockKey, _type: 'block'}],
        position: 'replace',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
        text: 'x',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([])
    })

    test('returns an operation outside the replaced item unchanged', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const replacedSpanKey = keyGenerator()
      const editedSpanKey = keyGenerator()
      const newSpanKey = keyGenerator()
      const editor = createMockEditor([{_key: blockKey, _type: 'block'}])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: replacedSpanKey}],
        items: [{_key: newSpanKey, _type: 'span', text: 'barbaz'}],
        position: 'replace',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: editedSpanKey}],
        offset: 3,
        text: 'x',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: editedSpanKey}],
          offset: 3,
          text: 'x',
        },
      ])
    })

    test('returns an insert operation unchanged when only its sibling anchor is replaced', () => {
      const keyGenerator = createTestKeyGenerator()
      const anchorBlockKey = keyGenerator()
      const insertedBlockKey = keyGenerator()
      const newBlockKey = keyGenerator()
      const editor = createMockEditor([
        {_key: newBlockKey, _type: 'block'},
        {_key: insertedBlockKey, _type: 'block'},
      ])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: anchorBlockKey}],
        items: [{_key: newBlockKey, _type: 'block'}],
        position: 'replace',
      }

      const insertOperation: EngineOperation = {
        type: 'insert',
        path: [{_key: anchorBlockKey}],
        node: {_key: insertedBlockKey, _type: 'block'},
        position: 'after',
        inverse: {type: 'unset', path: [{_key: insertedBlockKey}]},
      }

      const result = transformOperation(editor, insertPatch, insertOperation)

      expect(result).toEqual([
        {
          type: 'insert',
          path: [{_key: anchorBlockKey}],
          node: {_key: insertedBlockKey, _type: 'block'},
          position: 'after',
          inverse: {type: 'unset', path: [{_key: insertedBlockKey}]},
        },
      ])
    })

    test('drops an insert operation whose inserted node is replaced', () => {
      const keyGenerator = createTestKeyGenerator()
      const anchorBlockKey = keyGenerator()
      const insertedBlockKey = keyGenerator()
      const editor = createMockEditor([
        {_key: anchorBlockKey, _type: 'block'},
        {_key: insertedBlockKey, _type: 'block'},
      ])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: insertedBlockKey}],
        items: [{_key: insertedBlockKey, _type: 'block'}],
        position: 'replace',
      }

      const insertOperation: EngineOperation = {
        type: 'insert',
        path: [{_key: anchorBlockKey}],
        node: {_key: insertedBlockKey, _type: 'block'},
        position: 'after',
        inverse: {type: 'unset', path: [{_key: insertedBlockKey}]},
      }

      const result = transformOperation(editor, insertPatch, insertOperation)

      expect(result).toEqual([])
    })
  })

  describe('`after` insert patch with an item reusing a key', () => {
    test('returns the operation unchanged (the editor gives the inserted copy a new key)', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const anchorSpanKey = keyGenerator()
      const editedSpanKey = keyGenerator()
      const editor = createMockEditor([{_key: blockKey, _type: 'block'}])

      const insertPatch: Patch = {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: anchorSpanKey}],
        items: [{_key: editedSpanKey, _type: 'span', text: 'barbaz'}],
        position: 'after',
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', {_key: editedSpanKey}],
        offset: 3,
        text: 'x',
      }

      const result = transformOperation(
        editor,
        insertPatch,
        insertTextOperation,
      )

      expect(result).toEqual([
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: editedSpanKey}],
          offset: 3,
          text: 'x',
        },
      ])
    })
  })

  describe('unset patch at block level (path.length === 1)', () => {
    test('drops operation targeting the same block that was removed', () => {
      const editor = createMockEditor([{_key: 'block2', _type: 'block'}])

      const unsetPatch: Patch = {
        type: 'unset',
        path: [{_key: 'block1'}],
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
        offset: 0,
        text: 'hello',
      }

      const result = transformOperation(editor, unsetPatch, insertTextOperation)

      expect(result).toEqual([])
    })

    test('preserves operation targeting a different block', () => {
      const editor = createMockEditor([{_key: 'block2', _type: 'block'}])

      const unsetPatch: Patch = {
        type: 'unset',
        path: [{_key: 'block1'}],
      }

      const insertTextOperation: EngineOperation = {
        type: 'insert.text',
        path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
        offset: 0,
        text: 'world',
      }

      const result = transformOperation(editor, unsetPatch, insertTextOperation)

      expect(result).toEqual([
        {
          type: 'insert.text',
          path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
          offset: 0,
          text: 'world',
        },
      ])
    })

    test('preserves set.selection operation (no path property)', () => {
      const editor = createMockEditor([{_key: 'block2', _type: 'block'}])

      const unsetPatch: Patch = {
        type: 'unset',
        path: [{_key: 'block1'}],
      }

      const setSelectionOperation: EngineOperation = {
        type: 'set.selection',
        properties: {
          anchor: {
            path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
            offset: 0,
          },
        },
        newProperties: {
          anchor: {
            path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
            offset: 3,
          },
          focus: {
            path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
            offset: 3,
          },
        },
      }

      const result = transformOperation(
        editor,
        unsetPatch,
        setSelectionOperation,
      )

      expect(result).toEqual([
        {
          type: 'set.selection',
          properties: {
            anchor: {
              path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
              offset: 0,
            },
          },
          newProperties: {
            anchor: {
              path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
              offset: 3,
            },
            focus: {
              path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
              offset: 3,
            },
          },
        },
      ])
    })
  })
})
