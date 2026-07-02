import {defineSchema, type EditorSnapshot} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {TablePlugin} from '../plugin.table'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
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

const cell = (key: string, text: string, marks: Array<string> = []) => ({
  _type: 'cell',
  _key: key,
  value: [
    {
      _type: 'block',
      _key: `b-${key}`,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `s-${key}`, text, marks}],
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

const mixedColumnValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [cell('c00', 'A', ['strong']), cell('c01', 'B')],
      },
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

function spanMarks(
  snapshot: EditorSnapshot,
  cellKey: string,
): Array<string> | undefined {
  const value = snapshot.context.value as typeof initialValue
  const rowIndex = cellKey.startsWith('c0') ? 0 : 1
  const cellNode = value[0]?.rows[rowIndex]?.cells.find(
    (candidate) => candidate._key === cellKey,
  )
  return cellNode?.value[0]?.children[0]?.marks
}

/**
 * Selects the left column: anchor in `c00`, focus in `c10`. The linear range
 * between them covers `c01`, which the rectangle excludes.
 */
async function selectLeftColumn(value = initialValue) {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: value,
    children: <TablePlugin />,
  })
  const focusOffset = value[0]?.rows[1]?.cells[0]?.value[0]?.children[0]?.text
    .length as number
  await userEvent.click(locator)
  editor.send({
    type: 'select',
    at: {
      anchor: {path: spanPath('c00'), offset: 0},
      focus: {path: spanPath('c10'), offset: focusOffset},
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.path.at(-1)).toEqual({
      _key: 's-c10',
    })
  })
  return editor
}

describe('rectangular selection formatting', () => {
  test('decorator.toggle on a column selection only affects the column', async () => {
    const editor = await selectLeftColumn()

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(spanMarks(snapshot, 'c00')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c10')).toEqual(['strong'])
      // The linear range covers c01, but the rectangle does not.
      expect(spanMarks(snapshot, 'c01')).toEqual([])
      expect(spanMarks(snapshot, 'c11')).toEqual([])
    })
  })

  test('decorator.toggle on a mixed column applies uniformly', async () => {
    const editor = await selectLeftColumn(mixedColumnValue)

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      // c00 was already strong; a per-cell toggle would checkerboard.
      expect(spanMarks(snapshot, 'c00')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c10')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c01')).toEqual([])
      expect(spanMarks(snapshot, 'c11')).toEqual([])
    })
  })

  test('an empty cell in the column neither blocks nor breaks the toggle', async () => {
    const editor = await selectLeftColumn([
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [cell('c00', 'A'), cell('c01', 'B')],
          },
          {
            _type: 'row',
            _key: 'r1',
            cells: [cell('c10', ''), cell('c11', 'D')],
          },
        ],
      },
    ])

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(spanMarks(snapshot, 'c00')).toEqual(['strong'])
      // The empty cell has nothing to decorate and stays untouched.
      expect(spanMarks(snapshot, 'c10')).toEqual([])
      expect(spanMarks(snapshot, 'c01')).toEqual([])
      expect(spanMarks(snapshot, 'c11')).toEqual([])
    })
  })

  test('decorator.add on a column selection only affects the column', async () => {
    const editor = await selectLeftColumn()

    editor.send({type: 'decorator.add', decorator: 'strong'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(spanMarks(snapshot, 'c00')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c10')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c01')).toEqual([])
      expect(spanMarks(snapshot, 'c11')).toEqual([])
    })
  })

  test('decorator.remove on a column selection only affects the column', async () => {
    const editor = await selectLeftColumn([
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [cell('c00', 'A', ['strong']), cell('c01', 'B', ['strong'])],
          },
          {
            _type: 'row',
            _key: 'r1',
            cells: [cell('c10', 'C', ['strong']), cell('c11', 'D', ['strong'])],
          },
        ],
      },
    ])

    editor.send({type: 'decorator.remove', decorator: 'strong'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(spanMarks(snapshot, 'c00')).toEqual([])
      expect(spanMarks(snapshot, 'c10')).toEqual([])
      // Outside the rectangle, the decorator stays.
      expect(spanMarks(snapshot, 'c01')).toEqual(['strong'])
      expect(spanMarks(snapshot, 'c11')).toEqual(['strong'])
    })
  })

  test('a single undo restores the whole column', async () => {
    const editor = await selectLeftColumn()

    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(spanMarks(editor.getSnapshot(), 'c10')).toEqual(['strong'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      const snapshot = editor.getSnapshot()
      expect(spanMarks(snapshot, 'c00')).toEqual([])
      expect(spanMarks(snapshot, 'c10')).toEqual([])
      expect(spanMarks(snapshot, 'c01')).toEqual([])
      expect(spanMarks(snapshot, 'c11')).toEqual([])
    })
  })
})
