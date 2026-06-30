import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {getTableSelection} from './derivation'
import {TablePlugin} from './plugin.table'

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
                        {
                          name: 'value',
                          type: 'array',
                          of: [{type: 'block'}],
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
    },
  ],
})

function cell(colKey: string) {
  return {
    _type: 'cell',
    _key: colKey,
    value: [
      {
        _type: 'block',
        _key: `${colKey}b`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `${colKey}s`, text: '', marks: []}],
      },
    ],
  }
}

function row(rowKey: string, colKeys: Array<string>) {
  return {
    _type: 'row',
    _key: rowKey,
    cells: colKeys.map((colKey) => cell(colKey)),
  }
}

function pointInSpan(
  tableKey: string,
  rowKey: string,
  colKey: string,
  offset = 0,
) {
  return {
    path: [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: colKey},
      'value',
      {_key: `${colKey}b`},
      'children',
      {_key: `${colKey}s`},
    ],
    offset,
  }
}

const threeByThreeValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      row('r0', ['r0c0', 'r0c1', 'r0c2']),
      row('r1', ['r1c0', 'r1c1', 'r1c2']),
      row('r2', ['r2c0', 'r2c1', 'r2c2']),
    ],
  },
]

const preBlock = {
  _type: 'block',
  _key: 'pre',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'pres', text: 'before', marks: []}],
}

const postBlock = {
  _type: 'block',
  _key: 'post',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'posts', text: 'after', marks: []}],
}

const sandwichedTable = {
  _type: 'table',
  _key: 't0',
  rows: [
    row('r0', ['r0c0', 'r0c1', 'r0c2']),
    row('r1', ['r1c0', 'r1c1', 'r1c2']),
    row('r2', ['r2c0', 'r2c1', 'r2c2']),
  ],
}

const sandwichedTableValue = [preBlock, sandwichedTable, postBlock]

const twoTablesValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [row('t0r0', ['t0r0c0', 't0r0c1'])],
  },
  {
    _type: 'table',
    _key: 't1',
    rows: [row('t1r0', ['t1r0c0', 't1r0c1'])],
  },
]

describe('getTableSelection', () => {
  test('returns undefined when selection is null', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    expect(getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('returns undefined when collapsed inside a single cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    const point = pointInSpan('t0', 'r0', 'r0c0')
    editor.send({type: 'select', at: {anchor: point, focus: point}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    expect(getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('returns undefined when anchor and focus are in the same cell at different offsets', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('t0', 'r0', 'r0c0', 0)
    const focus = pointInSpan('t0', 'r0', 'r0c0', 0)
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    expect(getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('derives rectangle when anchor and focus are different cells', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('t0', 'r0', 'r0c1')
    const focus = pointInSpan('t0', 'r2', 'r2c2')
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 2],
        colRange: [1, 2],
      })
    })
  })

  test('sorts row and col ranges regardless of direction', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('t0', 'r2', 'r2c2')
    const focus = pointInSpan('t0', 'r0', 'r0c1')
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 2],
        colRange: [1, 2],
      })
    })
  })

  test('returns undefined when one endpoint is outside any cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: sandwichedTableValue,
      children: <TablePlugin />,
    })

    const anchor = {
      path: [{_key: 'pre'}, 'children', {_key: 'pres'}],
      offset: 0,
    }
    const focus = pointInSpan('t0', 'r0', 'r0c0')
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    expect(getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('returns undefined when anchor and focus are in different tables', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: twoTablesValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('t0', 't0r0', 't0r0c0')
    const focus = pointInSpan('t1', 't1r0', 't1r0c0')
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    expect(getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('derives the canonical example: (row1, col2) → (row3, col1) on a 3x3 table', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: threeByThreeValue,
      children: <TablePlugin />,
    })

    // 1-indexed: row1/col2 = row index 0, col index 1
    // 1-indexed: row3/col1 = row index 2, col index 0
    const anchor = pointInSpan('t0', 'r0', 'r0c1')
    const focus = pointInSpan('t0', 'r2', 'r2c0')
    editor.send({type: 'select', at: {anchor, focus}})

    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 2],
        colRange: [0, 1],
      })
    })
  })
})
