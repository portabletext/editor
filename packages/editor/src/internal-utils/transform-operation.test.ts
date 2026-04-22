import type {Patch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Operation} from '../slate/interfaces/operation'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {transformOperation} from './transform-operation'

const testSchema = compileSchema(defineSchema({}))

/**
 * Minimal editor mock. transformOperation only reads editor.children,
 * editor.schema, editor.containers (for block resolution), and
 * editor.selection (for set_selection target resolution).
 */
function createMockEditor(
  children: Array<{_key: string; _type: string; [key: string]: unknown}>,
  selection?: {
    focus: {path: Array<{_key: string} | string | number>; offset: number}
    anchor: {path: Array<{_key: string} | string | number>; offset: number}
  },
): PortableTextSlateEditor {
  return {
    children,
    selection: selection ?? null,
    schema: testSchema,
    containers: new Map(),
  } as unknown as PortableTextSlateEditor
}

describe('transformOperation', () => {
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

      const insertTextOperation: Operation = {
        type: 'insert_text',
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
          type: 'insert_text',
          path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
          offset: 0,
          text: 'hello',
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

      const insertTextOperation: Operation = {
        type: 'insert_text',
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

      const insertTextOperation: Operation = {
        type: 'insert_text',
        path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
        offset: 0,
        text: 'world',
      }

      const result = transformOperation(editor, unsetPatch, insertTextOperation)

      expect(result).toEqual([
        {
          type: 'insert_text',
          path: [{_key: 'block2'}, 'children', {_key: 'span2'}],
          offset: 0,
          text: 'world',
        },
      ])
    })

    test('preserves set_selection operation (no path property)', () => {
      const editor = createMockEditor([{_key: 'block2', _type: 'block'}])

      const unsetPatch: Patch = {
        type: 'unset',
        path: [{_key: 'block1'}],
      }

      const setSelectionOperation: Operation = {
        type: 'set_selection',
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
          type: 'set_selection',
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
