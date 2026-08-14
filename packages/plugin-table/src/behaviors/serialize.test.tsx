import {defineSchema, type EditorSnapshot} from '@portabletext/editor'
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

const cell = (key: string, text: string) => ({
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
})

// 2x2 grid: c00 c01 / c10 c11
const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'A'), cell('c01', 'B')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'C'), cell('c11', 'D')]},
    ],
  },
]

function spanPath(cellKey: string) {
  const rowKey = cellKey.startsWith('c0') ? 'r0' : 'r1'
  return [
    {_key: 't0'},
    'rows',
    {_key: rowKey},
    'cells',
    {_key: cellKey},
    'value',
    {_key: `b-${cellKey}`},
    'children',
    {_key: `s-${cellKey}`},
  ]
}

const leftColumnSelection = {
  anchor: {path: spanPath('c00'), offset: 0},
  focus: {path: spanPath('c10'), offset: 1},
}

function value(snapshot: EditorSnapshot) {
  return snapshot.context.value as typeof initialValue
}

/**
 * Selects the left column: anchor in `c00`, focus in `c10`. The linear range
 * between them covers `c01`, which the rectangle excludes.
 */
async function selectLeftColumn() {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue,
    children: <TablePlugin />,
  })
  editor.send({type: 'focus'})
  editor.send({type: 'select', at: leftColumnSelection})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
  })
  return editor
}

describe('rectangular selection copy/cut', () => {
  test('copying a column selection writes tab-separated text to `text/plain`', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      // One column: rows joined by newlines, no tabs. A wider rectangle
      // joins the cells of each row with tabs (the spreadsheet convention).
      expect(dataTransfer.getData('text/plain')).toBe('A\nC')
    })
  })

  test('copying the whole table writes rows of tab-joined cells to `text/plain`', async () => {
    const wholeTableSelection = {
      anchor: {path: spanPath('c00'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})
    editor.send({type: 'select', at: wholeTableSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: wholeTableSelection},
    })

    await vi.waitFor(() => {
      expect(dataTransfer.getData('text/plain')).toBe('A\tB\nC\tD')
    })
  })

  test('copying a column selection serializes only the column', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      // The linear fragment would include c01 (`B`).
      expect(
        JSON.parse(dataTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c00', 'A')]},
            {_type: 'row', _key: 'r1', cells: [cell('c10', 'C')]},
          ],
        },
      ])
      const markdown = dataTransfer.getData('text/markdown')
      expect(markdown).toBe(['|  |', '| --- |', '| A |', '| C |'].join('\n'))
    })
  })

  test('slicing keeps header rows positional', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          headerRows: 1,
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [cell('c00', 'A'), cell('c01', 'B')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ],
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})

    // Right column (c01 -> c11): the header row is included.
    const rightColumnSelection = {
      anchor: {path: spanPath('c01'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: rightColumnSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const columnTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer: columnTransfer},
      position: {selection: rightColumnSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(columnTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          headerRows: 1,
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c01', 'B')]},
            {_type: 'row', _key: 'r1', cells: [cell('c11', 'D')]},
          ],
        },
      ])
    })

    // Bottom row (c10 -> c11): the header row is excluded, so the copy
    // carries no header rows.
    const bottomRowSelection = {
      anchor: {path: spanPath('c10'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: bottomRowSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path.at(-1)).toEqual(
        {_key: 's-c11'},
      )
    })

    const rowTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer: rowTransfer},
      position: {selection: bottomRowSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(rowTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          headerRows: 0,
          rows: [
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ])
    })
  })

  test('cutting a column selection serializes the column and clears it', async () => {
    const editor = await selectLeftColumn()
    const dataTransfer = new DataTransfer()

    editor.send({
      type: 'clipboard.cut',
      originEvent: {dataTransfer},
      position: {selection: leftColumnSelection},
    })

    await vi.waitFor(() => {
      expect(
        JSON.parse(dataTransfer.getData('application/x-portable-text')),
      ).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {_type: 'row', _key: 'r0', cells: [cell('c00', 'A')]},
            {_type: 'row', _key: 'r1', cells: [cell('c10', 'C')]},
          ],
        },
      ])
      // The column cells cleared; the rest of the table is untouched.
      const snapshot = editor.getSnapshot()
      expect(
        value(snapshot)[0]?.rows[0]?.cells[0]?.value[0]?.children[0]?.text,
      ).toBe('')
      expect(
        value(snapshot)[0]?.rows[1]?.cells[0]?.value[0]?.children[0]?.text,
      ).toBe('')
      expect(
        value(snapshot)[0]?.rows[0]?.cells[1]?.value[0]?.children[0]?.text,
      ).toBe('B')
      expect(
        value(snapshot)[0]?.rows[1]?.cells[1]?.value[0]?.children[0]?.text,
      ).toBe('D')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })
})
