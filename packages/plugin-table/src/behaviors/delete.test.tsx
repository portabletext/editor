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
                        {
                          name: 'content',
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

type Table = {
  _type: 'table'
  _key: string
  rows: ReadonlyArray<Row>
}

type Row = {
  _type: 'row'
  _key: string
  cells: ReadonlyArray<Cell>
}

type Cell = {
  _type: 'cell'
  _key: string
  content: ReadonlyArray<TextBlock>
}

type TextBlock = {
  _type: 'block'
  _key: string
  style: string
  markDefs: ReadonlyArray<unknown>
  children: ReadonlyArray<{
    _type: 'span'
    _key: string
    text: string
    marks: ReadonlyArray<string>
  }>
}

function cellWithText(
  cellKey: string,
  blockKey: string,
  spanKey: string,
  text: string,
): Cell {
  return {
    _type: 'cell',
    _key: cellKey,
    content: [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text, marks: []}],
      },
    ],
  }
}

function emptyCell(cellKey: string, blockKey: string, spanKey: string): Cell {
  return cellWithText(cellKey, blockKey, spanKey, '')
}

// 2x2 table with text in each cell
const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [
          cellWithText('r0c0', 'r0c0b', 'r0c0s', 'AA'),
          cellWithText('r0c1', 'r0c1b', 'r0c1s', 'BB'),
        ],
      },
      {
        _type: 'row',
        _key: 'r1',
        cells: [
          cellWithText('r1c0', 'r1c0b', 'r1c0s', 'CC'),
          cellWithText('r1c1', 'r1c1b', 'r1c1s', 'DD'),
        ],
      },
    ],
  },
]

function pointAt(
  cellKey: string,
  blockKey: string,
  spanKey: string,
  offset: number,
) {
  return {
    path: [
      {_key: 't0'},
      'rows',
      {_key: cellKey.startsWith('r0') ? 'r0' : 'r1'},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ],
    offset,
  }
}

function firstTable(value: ReadonlyArray<unknown>): Table {
  return value[0] as unknown as Table
}

describe('delete behaviors within tables', () => {
  test('delete.backward at offset 0 of cell start: no-op (no cross-cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointAt('r0c1', 'r0c1b', 'r0c1s', 0)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: point,
        focus: point,
        backward: false,
      })
    })
  })

  test('delete.forward at end of cell: no-op (no cross-cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointAt('r0c0', 'r0c0b', 'r0c0s', 2)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.forward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: point,
        focus: point,
        backward: false,
      })
    })
  })

  test('delete.backward inside cell text: deletes one char within cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const startPoint = pointAt('r0c0', 'r0c0b', 'r0c0s', 2)
    editor.send({type: 'select', at: {anchor: startPoint, focus: startPoint}})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      expect(table.rows[0]?.cells[0]?.content[0]?.children[0]?.text).toBe('A')
    })
  })

  test('delete.range straddling two cells in same row: structure preserved (no cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointAt('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      expect(table.rows.length).toBe(2)
      expect(table.rows[0]?.cells.length).toBe(2)
      expect(table.rows[1]?.cells.length).toBe(2)
    })
  })

  test('delete.range straddling rows in same table: structure preserved (no row merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointAt('r1c1', 'r1c1b', 'r1c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      expect(table.rows.length).toBe(2)
      expect(table.rows[0]?.cells.length).toBe(2)
      expect(table.rows[1]?.cells.length).toBe(2)
    })
  })

  test('split (Enter) inside a cell: splits inside the cell, structure outside cell preserved', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'split'})

    await vi.waitFor(() => {
      // Cells are multi-block containers by design — Enter creates a new
      // block inside the cell, not outside. The table itself stays one
      // block with the same rows and cells.
      const table = firstTable(editor.getSnapshot().context.value)
      expect(editor.getSnapshot().context.value.length).toBe(1)
      expect(table.rows.length).toBe(2)
      expect(table.rows[0]?.cells.length).toBe(2)
      expect(table.rows[0]?.cells[0]?.content.length).toBe(2)
    })
  })

  test('delete.backward in last empty cell of a single-cell table: removes the table (matches plain-block backspace semantics)', async () => {
    const onlyEmptyCellTable = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [emptyCell('r0c0', 'r0c0b', 'r0c0s')],
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: onlyEmptyCellTable,
      children: <TablePlugin />,
    })

    const point = pointAt('r0c0', 'r0c0b', 'r0c0s', 0)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Engine removes the table — symmetric with backspace in an empty block.
      // This is the documented contract; intercepting would surprise users.
      const value = editor.getSnapshot().context.value
      expect(value.find((b) => b._type === 'table')).toBeUndefined()
    })
  })

  test('delete on multi-cell rectangle: clears all touched cells, collapses to top-left cell start', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    // Select 2x2 rectangle: anchor in r0c0, focus in r1c1.
    const anchor = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointAt('r1c1', 'r1c1b', 'r1c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      // All four cells in the rectangle are cleared to empty text.
      expect(table.rows[0]?.cells[0]?.content[0]?.children[0]?.text).toBe('')
      expect(table.rows[0]?.cells[1]?.content[0]?.children[0]?.text).toBe('')
      expect(table.rows[1]?.cells[0]?.content[0]?.children[0]?.text).toBe('')
      expect(table.rows[1]?.cells[1]?.content[0]?.children[0]?.text).toBe('')
      // Table structure unchanged.
      expect(table.rows.length).toBe(2)
      expect(table.rows[0]?.cells.length).toBe(2)
    })
  })

  test('delete on multi-cell rectangle in same row: clears both, leaves other row untouched', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointAt('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      // Row 0 cells cleared.
      expect(table.rows[0]?.cells[0]?.content[0]?.children[0]?.text).toBe('')
      expect(table.rows[0]?.cells[1]?.content[0]?.children[0]?.text).toBe('')
      // Row 1 cells untouched.
      expect(table.rows[1]?.cells[0]?.content[0]?.children[0]?.text).toBe('CC')
      expect(table.rows[1]?.cells[1]?.content[0]?.children[0]?.text).toBe('DD')
    })
  })

  test('split (Enter) with multi-cell rectangle selection: clears rectangle, no split', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointAt('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointAt('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'split'})

    await vi.waitFor(() => {
      const table = firstTable(editor.getSnapshot().context.value)
      // Both touched cells cleared.
      expect(table.rows[0]?.cells[0]?.content[0]?.children[0]?.text).toBe('')
      expect(table.rows[0]?.cells[1]?.content[0]?.children[0]?.text).toBe('')
      // No new blocks added inside either cell.
      expect(table.rows[0]?.cells[0]?.content.length).toBe(1)
      expect(table.rows[0]?.cells[1]?.content.length).toBe(1)
    })
  })
})
