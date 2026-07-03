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

/** A one-column, two-row table fragment (`P` over `Q`) copied "elsewhere". */
const columnFragment = [
  {
    _type: 'table',
    _key: 'x-t',
    rows: [
      {_type: 'row', _key: 'x-r0', cells: [cell('x-c0', 'P')]},
      {_type: 'row', _key: 'x-r1', cells: [cell('x-c1', 'Q')]},
    ],
  },
]

function pasteFragment(
  editor: {send: (event: never) => void},
  fragment: unknown,
  selection: unknown,
) {
  const dataTransfer = new DataTransfer()
  dataTransfer.setData('application/x-portable-text', JSON.stringify(fragment))
  ;(editor.send as (event: unknown) => void)({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {selection},
  })
}

async function createEditor(value = initialValue) {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: value,
    children: <TablePlugin />,
  })
  editor.send({type: 'focus'})
  return editor
}

function value(snapshot: EditorSnapshot) {
  return snapshot.context.value as typeof initialValue
}

function pastedCell(
  cellKey: string,
  blockKey: string,
  spanKey: string,
  text: string,
) {
  return {
    _type: 'cell',
    _key: cellKey,
    value: [
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

describe('pasting a table fragment into a table', () => {
  test('distributes over a target rectangle from its top-left', async () => {
    const editor = await createEditor()
    const rightColumn = {
      anchor: {path: spanPath('c01'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: rightColumn})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    pasteFragment(editor, columnFragment, rightColumn)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [cell('c00', 'A'), pastedCell('c01', 'k2', 'k3', 'P')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), pastedCell('c11', 'k4', 'k5', 'Q')],
            },
          ],
        },
      ])
      // The pasted rectangle becomes the selection.
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 't0'},
            'rows',
            {_key: 'r0'},
            'cells',
            {_key: 'c01'},
            'value',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 't0'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c11'},
            'value',
            {_key: 'k4'},
            'children',
            {_key: 'k5'},
          ],
          offset: 1,
        },
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('distributes from a caret in a cell', async () => {
    const editor = await createEditor()
    const caret = {
      anchor: {path: spanPath('c00'), offset: 1},
      focus: {path: spanPath('c00'), offset: 1},
    }
    editor.send({type: 'select', at: caret})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    pasteFragment(editor, columnFragment, caret)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [pastedCell('c00', 'k2', 'k3', 'P'), cell('c01', 'B')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [pastedCell('c10', 'k4', 'k5', 'Q'), cell('c11', 'D')],
            },
          ],
        },
      ])
    })
  })

  test('grows rows when the fragment extends past the bottom', async () => {
    const editor = await createEditor()
    const caret = {
      anchor: {path: spanPath('c10'), offset: 1},
      focus: {path: spanPath('c10'), offset: 1},
    }
    editor.send({type: 'select', at: caret})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    pasteFragment(editor, columnFragment, caret)

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      const table = value(snapshot)[0]
      expect(table?.rows).toHaveLength(3)
      // The anchor cell receives the fragment's first cell.
      expect(table?.rows[1]?.cells[0]?.value[0]?.children[0]?.text).toBe('P')
      // The overflow lands in a grown row: content in the anchor column,
      // an empty padding cell in the other.
      expect(
        table?.rows[2]?.cells.map(
          (cellNode) => cellNode.value[0]?.children[0]?.text,
        ),
      ).toEqual(['Q', ''])
      // Untouched cells stay untouched.
      expect(
        table?.rows[0]?.cells.map(
          (cellNode) => cellNode.value[0]?.children[0]?.text,
        ),
      ).toEqual(['A', 'B'])
      expect(table?.rows[1]?.cells[1]?.value[0]?.children[0]?.text).toBe('D')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('grows columns when the fragment extends past the right edge', async () => {
    const editor = await createEditor()
    const caret = {
      anchor: {path: spanPath('c01'), offset: 1},
      focus: {path: spanPath('c01'), offset: 1},
    }
    editor.send({type: 'select', at: caret})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const rowFragment = [
      {
        _type: 'table',
        _key: 'x-t',
        rows: [
          {
            _type: 'row',
            _key: 'x-r0',
            cells: [cell('x-c0', 'P'), cell('x-c1', 'Q')],
          },
        ],
      },
    ]
    pasteFragment(editor, rowFragment, caret)

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      const table = value(snapshot)[0]
      // Every row reaches the grown width; the overflow column carries
      // content in the anchor row and padding below.
      expect(
        table?.rows.map((row) =>
          row.cells.map((cellNode) => cellNode.value[0]?.children[0]?.text),
        ),
      ).toEqual([
        ['A', 'P', 'Q'],
        ['C', 'D', ''],
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('cell content is validated against the schema', async () => {
    const editor = await createEditor()
    const caret = {
      anchor: {path: spanPath('c00'), offset: 1},
      focus: {path: spanPath('c00'), offset: 1},
    }
    editor.send({type: 'select', at: caret})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const rogueFragment = [
      {
        _type: 'table',
        _key: 'x-t',
        rows: [
          {
            _type: 'row',
            _key: 'x-r0',
            cells: [
              {
                _type: 'cell',
                _key: 'x-c0',
                value: [
                  {_type: 'malicious', _key: 'x-m0', payload: 'boom'},
                  ...cell('x-c0', 'P').value,
                ],
              },
            ],
          },
        ],
      },
    ]
    pasteFragment(editor, rogueFragment, caret)

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      // The schema-unknown block never reaches the document.
      expect(JSON.stringify(snapshot.context.value)).not.toContain('malicious')
      expect(JSON.stringify(snapshot.context.value)).not.toContain('boom')
    })
  })

  test('a larger target rectangle only provides the anchor', async () => {
    const editor = await createEditor()
    const wholeTable = {
      anchor: {path: spanPath('c00'), offset: 0},
      focus: {path: spanPath('c11'), offset: 1},
    }
    editor.send({type: 'select', at: wholeTable})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    const singleCellFragment = [
      {
        _type: 'table',
        _key: 'x-t',
        rows: [{_type: 'row', _key: 'x-r0', cells: [cell('x-c0', 'P')]}],
      },
    ]
    pasteFragment(editor, singleCellFragment, wholeTable)

    await vi.waitFor(() => {
      // Only the anchor cell receives content; the extra target cells stay
      // untouched instead of clearing.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [pastedCell('c00', 'k2', 'k3', 'P'), cell('c01', 'B')],
            },
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
})
