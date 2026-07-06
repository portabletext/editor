import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {TablePlugin} from '../plugin.table'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
                      ],
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
})

function cell(key: string, text: string) {
  return {
    _type: 'cell',
    _key: key,
    value: [
      {
        _type: 'block',
        _key: `b-${key}`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `s-${key}`, text, marks: []}],
      },
    ],
  }
}

const initialValue = [
  {
    _type: 'block',
    _key: 'para',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'para-span', text: 'before', marks: []}],
  },
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'AA'), cell('c01', 'BB')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'CC'), cell('c11', 'DD')]},
    ],
  },
]

function leafPoint(cellKey: string, offset: number) {
  return {
    path: [
      {_key: 't0'},
      'rows',
      {_key: cellKey === 'c00' || cellKey === 'c01' ? 'r0' : 'r1'},
      'cells',
      {_key: cellKey},
      'value',
      {_key: `b-${cellKey}`},
      'children',
      {_key: `s-${cellKey}`},
    ],
    offset,
  }
}

describe('Feature: Chrome-Band Selection Clamp', () => {
  test('Scenario: A focus on the table freezes the selection at the previous focus', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: leafPoint('c00', 0), focus: leafPoint('c01', 1)},
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: leafPoint('c00', 0),
        focus: leafPoint('c01', 1),
        backward: false,
      })
    })

    // The drag strays into the chrome band: the focus resolves to a
    // container-level point on the table itself.
    editor.send({
      type: 'select',
      at: {
        anchor: leafPoint('c00', 0),
        focus: {path: [{_key: 't0'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: leafPoint('c00', 0),
        focus: leafPoint('c01', 1),
        backward: false,
      })
    })
  })

  test('Scenario: Without a same-table previous focus the selection clamps to the anchor cell edge', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({type: 'focus'})
    // The previous selection lives outside the table, so the freeze has
    // nothing to keep and the clamp falls back to the anchor cell's edge.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'para'}, 'children', {_key: 'para-span'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'para'}, 'children', {_key: 'para-span'}],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(0)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: leafPoint('c00', 1),
        focus: {path: [{_key: 't0'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: leafPoint('c00', 1),
        focus: leafPoint('c00', 2),
        backward: false,
      })
    })
  })

  test('Scenario: A backward drag without a same-table previous focus clamps to the cell start', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'para'}, 'children', {_key: 'para-span'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'para'}, 'children', {_key: 'para-span'}],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(0)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: leafPoint('c00', 1),
        focus: {path: [{_key: 't0'}], offset: 0},
        backward: true,
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: leafPoint('c00', 1),
        focus: leafPoint('c00', 0),
        backward: true,
      })
    })
  })

  test('Scenario: A cross-cell leaf focus passes through untouched', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: leafPoint('c00', 0), focus: leafPoint('c11', 2)},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: leafPoint('c00', 0),
        focus: leafPoint('c11', 2),
        backward: false,
      })
    })
  })
})
