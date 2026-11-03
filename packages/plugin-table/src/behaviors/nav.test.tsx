import {
  defineContainer,
  defineSchema,
  type Editor,
  type EditorSelectionPoint,
  type EditorSnapshot,
  type Path,
} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getTableSelection} from '../get-table-selection'
import {TablePlugin} from '../plugin.table'
import {createTableGuards, defaultTableConfig} from '../table-config'

const {isCell, isRow} = createTableGuards(defaultTableConfig)

const schemaDefinition = defineSchema({
  lists: [{name: 'bullet'}],
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

// Same grid, but the left column holds text long enough to wrap across several
// visual lines once the cell width is constrained (see the `beforeAll` style).
const longText =
  'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(4)
const wrappedValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [cell('c00', longText), cell('c01', 'B')],
      },
      {
        _type: 'row',
        _key: 'r1',
        cells: [cell('c10', longText), cell('c11', 'D')],
      },
    ],
  },
]

const threeRowValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'A'), cell('c01', 'B')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'C'), cell('c11', 'D')]},
      {_type: 'row', _key: 'r2', cells: [cell('c20', 'E'), cell('c21', 'F')]},
    ],
  },
]

function spanPath(cellKey: string) {
  const rowKey = `r${cellKey.charAt(1)}`
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

function focusCellKey(snapshot: EditorSnapshot): string | undefined {
  const focus = snapshot.context.selection?.focus.path
  if (!focus) {
    return undefined
  }
  return getEnclosingBlock(snapshot, focus, {match: isCell})?.node._key
}

function focusRowKey(snapshot: EditorSnapshot): string | undefined {
  const focus = snapshot.context.selection?.focus.path
  if (!focus) {
    return undefined
  }
  return getEnclosingBlock(snapshot, focus, {match: isRow})?.node._key
}

function focusBlockKey(snapshot: EditorSnapshot): string | undefined {
  const focus = snapshot.context.selection?.focus.path
  if (!focus) {
    return undefined
  }
  return getEnclosingBlock(snapshot, focus)?.node._key
}

/** Places the caret at `offset` in `cellKey`, presses `key`, returns the editor. */
async function navFrom(
  cellKey: string,
  offset: number,
  key: string,
  value: typeof initialValue = initialValue,
) {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: value,
    children: <TablePlugin />,
  })
  editor.send({type: 'focus'})
  await placeCaret(editor, {path: spanPath(cellKey), offset})
  await userEvent.keyboard(`{${key}}`)
  return editor
}

describe('table keyboard navigation', () => {
  test('Scenario: `Tab` moves to the next cell in the row', async () => {
    const editor = await navFrom('c00', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c01')
    })
  })

  test('Scenario: `Tab` wraps to the first cell of the next row', async () => {
    const editor = await navFrom('c01', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c10')
    })
  })

  test('Scenario: `Tab` at the last cell passes through without moving', async () => {
    const editor = await navFrom('c11', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c11')
    })
  })

  test('Scenario: `Shift+Tab` moves to the previous cell', async () => {
    const editor = await navFrom('c01', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Scenario: `Shift+Tab` wraps to the last cell of the previous row', async () => {
    const editor = await navFrom('c10', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c01')
    })
  })

  test('Scenario: `Shift+Tab` at the first cell passes through without moving', async () => {
    const editor = await navFrom('c00', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Scenario: `ArrowDown` moves to the cell directly below in the same column', async () => {
    const editor = await navFrom('c01', 1, 'ArrowDown')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c11')
    })
  })

  test('Scenario: `ArrowDown` in the bottom row escapes into a block after the table', async () => {
    const editor = await navFrom('c10', 1, 'ArrowDown')
    await vi.waitFor(() => {
      // The table is the document's only block, so there is nothing below
      // to land in; the plugin inserts a placeholder after the table.
      expect(editor.getSnapshot().context.value?.[1]).toEqual({
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
      })
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('Scenario: `Tab` inside a list item indents instead of navigating', async () => {
    // Core owns `Tab`/`Shift+Tab` for list items; the cell navigation
    // yields so indenting inside a cell keeps working.
    const listValue = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [
              {
                _type: 'cell',
                _key: 'c00',
                value: [
                  {
                    _type: 'block',
                    _key: 'b-c00',
                    style: 'normal',
                    listItem: 'bullet',
                    level: 1,
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 's-c00', text: 'item', marks: []},
                    ],
                  },
                ],
              },
              cell('c01', 'B'),
            ],
          },
        ],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: listValue as typeof initialValue,
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})
    const point = {
      path: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c00'},
        'value',
        {_key: 'b-c00'},
        'children',
        {_key: 's-c00'},
      ],
      offset: 2,
    }
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })

    const listLevel = () => {
      const table = editor.getSnapshot().context.value?.[0] as unknown as {
        rows: Array<{cells: Array<{value: Array<{level?: number}>}>}>
      }
      return table.rows[0]?.cells[0]?.value[0]?.level
    }

    await userEvent.keyboard('{Tab}')
    await vi.waitFor(() => {
      expect(listLevel()).toBe(2)
    })
    // The caret stayed in the cell: no navigation happened.
    expect(focusCellKey(editor.getSnapshot())).toEqual('c00')

    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    await vi.waitFor(() => {
      expect(listLevel()).toBe(1)
    })
    expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
  })

  test('Scenario: `ArrowUp` on an image at the top of a cell inserts a text block above it', async () => {
    // A focused block object at its cell's edge belongs to the engine's
    // lonely-block-object escape (insert an empty text block beside it,
    // inside the cell), not to cell navigation.
    const imageSchema = defineSchema({
      blockObjects: [
        {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
                              of: [{type: 'block'}, {type: 'image'}],
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
    const imageValue = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [
              {
                _type: 'cell',
                _key: 'c00',
                value: [{_type: 'image', _key: 'img0', src: 'x.png'}],
              },
              cell('c01', 'B'),
            ],
          },
          {
            _type: 'row',
            _key: 'r1',
            cells: [cell('c10', 'C'), cell('c11', 'D')],
          },
        ],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: imageSchema,
      initialValue: imageValue as typeof initialValue,
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})
    const imagePoint = {
      path: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c00'},
        'value',
        {_key: 'img0'},
      ],
      offset: 0,
    }
    editor.send({type: 'select', at: {anchor: imagePoint, focus: imagePoint}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        imagePoint.path,
      )
    })

    await userEvent.keyboard('{ArrowUp}')

    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value?.[0] as unknown as {
        rows: Array<{cells: Array<{value: Array<{_type: string}>}>}>
      }
      expect(
        table.rows[0]?.cells[0]?.value.map((block) => block._type),
      ).toEqual(['block', 'image'])
    })
    expect(editor.getSnapshot().context.value).toHaveLength(1)

    // Symmetric: ArrowDown on the image (now the cell's last block)
    // inserts a text block below it, still inside the cell.
    editor.send({type: 'select', at: {anchor: imagePoint, focus: imagePoint}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        imagePoint.path,
      )
    })
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value?.[0] as unknown as {
        rows: Array<{cells: Array<{value: Array<{_type: string}>}>}>
      }
      expect(
        table.rows[0]?.cells[0]?.value.map((block) => block._type),
      ).toEqual(['block', 'image', 'block'])
    })
    expect(editor.getSnapshot().context.value).toHaveLength(1)
  })

  test('Scenario: round trips through a 3x3 table with a block above never accumulate blocks', async () => {
    // Field-reported: repeatedly arrowing through a table left a trail of
    // inserted blocks. The trigger needed a 3x3 grid, a text block above,
    // and several passes; chromium's native ArrowUp at the top row first
    // walks backwards through the top-row cells before exiting.
    const grid = (prefix: string) =>
      Array.from({length: 3}, (_, rowIndex) => ({
        _type: 'row',
        _key: `${prefix}r${rowIndex}`,
        cells: Array.from({length: 3}, (_, colIndex) =>
          cell(`${prefix}${rowIndex}${colIndex}`, ''),
        ),
      }))
    const value = [
      {
        _type: 'block',
        _key: 'above',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'above-s', text: 'above', marks: []}],
      },
      {_type: 'table', _key: 't0', rows: grid('g')},
    ] as typeof initialValue
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: value,
      children: <TablePlugin />,
    })
    editor.send({type: 'focus'})
    await placeCaret(editor, {
      path: [
        {_key: 't0'},
        'rows',
        {_key: 'gr0'},
        'cells',
        {_key: 'g00'},
        'value',
        {_key: 'b-g00'},
        'children',
        {_key: 's-g00'},
      ],
      offset: 0,
    })

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    await vi.waitFor(() => {
      expect(
        editor.getSnapshot().context.value?.map((block) => block._type),
      ).toEqual(['block', 'table', 'block'])
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
      expectDomCaretAtModelFocus(editor)
    })

    // Entering the table from outside is native caret movement, which
    // reaches the model through the throttled DOM selection sync, so each
    // entry is its own press.
    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusRowKey(editor.getSnapshot())).toEqual('gr2')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('above')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('above')
      expectDomCaretAtModelFocus(editor)
    })

    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusRowKey(editor.getSnapshot())).toEqual('gr0')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
      expectDomCaretAtModelFocus(editor)
    })

    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusRowKey(editor.getSnapshot())).toEqual('gr2')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('above')
      expectDomCaretAtModelFocus(editor)
    })
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('above')
      expectDomCaretAtModelFocus(editor)
    })
    expect(
      editor.getSnapshot().context.value?.map((block) => block._type),
    ).toEqual(['block', 'table', 'block'])
    // The 23 key presses are each a round trip to the browser, and their
    // cost scales with machine load: Firefox on a busy CI runner has
    // measured 10-15 s, against vitest's 15 s default.
  }, 60_000)

  test('Scenario: repeated `ArrowDown` escapes reuse the block below instead of accumulating', async () => {
    const editor = await navFrom('c10', 1, 'ArrowDown')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(2)
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
      expectDomCaretAtModelFocus(editor)
    })

    // Back into the table's bottom row, then out again. The placeholder
    // from the first escape already lies below; navigation must land in
    // it without inserting another. The browser moves the caret up, and
    // Chromium and Firefox pick different cells of the bottom row.
    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusRowKey(editor.getSnapshot())).toEqual('r1')
    })
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
    })
    expect(editor.getSnapshot().context.value).toHaveLength(2)
  })

  test('Scenario: `ArrowDown` in the bottom row moves into the block below', async () => {
    // Native chromium ArrowDown at a table's bottom row walks forward
    // through the cells instead of exiting, so the plugin owns the
    // sibling case: the caret lands in the block below, nothing inserts.
    const editor = await navFrom('c10', 1, 'ArrowDown', [
      ...initialValue,
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'after', marks: []}],
      },
    ] as typeof initialValue)
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('b0')
    })
    expect(editor.getSnapshot().context.value).toHaveLength(2)
  })

  test('Scenario: `ArrowUp` in the top row moves into the block above', async () => {
    const editor = await navFrom('c00', 0, 'ArrowUp', [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'before', marks: []}],
      },
      ...initialValue,
    ] as typeof initialValue)
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('b0')
    })
    expect(editor.getSnapshot().context.value).toHaveLength(2)
  })

  test('Scenario: `ArrowUp` moves to the cell directly above in the same column', async () => {
    const editor = await navFrom('c10', 0, 'ArrowUp')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Scenario: `ArrowUp` at the document-edge cell escapes into a block before the table', async () => {
    const editor = await navFrom('c00', 0, 'ArrowUp')
    await vi.waitFor(() => {
      // The table is the document's only block, so the engine's container
      // escape inserts a placeholder before it and moves the caret there.
      expect(editor.getSnapshot().context.value?.[0]).toEqual({
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: '', marks: []}],
      })
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('Scenario: `ArrowUp` lands in the last block of the cell above', async () => {
    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'row',
            _key: 'r0',
            cells: [
              {
                _type: 'cell',
                _key: 'c00',
                value: [
                  {
                    _type: 'block',
                    _key: 'c00-b0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'c00-s0', text: 'top', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'c00-b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'c00-s1',
                        text: 'bottom',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
              cell('c01', 'B'),
            ],
          },
          {
            _type: 'row',
            _key: 'r1',
            cells: [cell('c10', 'C'), cell('c11', 'D')],
          },
        ],
      },
    ]
    const editor = await navFrom('c10', 0, 'ArrowUp', value)
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('c00-b1')
    })
  })
})

describe('table keyboard selection extension', () => {
  test('Scenario: `Shift+ArrowDown` extends to the cell directly below in the same column', async () => {
    const editor = await navFrom('c00', 1, 'Shift>}{ArrowDown}{/Shift')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })
    expect(editor.getSnapshot().context.selection?.anchor).toEqual({
      path: spanPath('c00'),
      offset: 1,
    })
  })

  test('Scenario: `Shift+ArrowDown` in the second column extends within that column', async () => {
    const editor = await navFrom('c01', 1, 'Shift>}{ArrowDown}{/Shift')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [1, 1],
      })
    })
  })

  test('Scenario: `Shift+ArrowUp` extends to the cell directly above in the same column', async () => {
    const editor = await navFrom('c10', 0, 'Shift>}{ArrowUp}{/Shift')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })
    expect(editor.getSnapshot().context.selection?.anchor).toEqual({
      path: spanPath('c10'),
      offset: 0,
    })
  })

  test('Scenario: Repeated `Shift+ArrowDown` grows the table selection a row at a time', async () => {
    const editor = await navFrom(
      'c00',
      1,
      'Shift>}{ArrowDown}{/Shift',
      threeRowValue,
    )
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 2],
        colRange: [0, 0],
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })
    expect(editor.getSnapshot().context.selection?.anchor).toEqual({
      path: spanPath('c00'),
      offset: 1,
    })
  })

  test('Scenario: `Shift+ArrowDown` then `Shift+ArrowUp` shrinks back to the anchor cell', async () => {
    const editor = await navFrom('c00', 1, 'Shift>}{ArrowDown}{/Shift')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 1},
        focus: {path: spanPath('c00'), offset: 1},
        backward: false,
      })
    })
  })

  test('Scenario: `Shift+ArrowDown` in the bottom row extends into the block below', async () => {
    const editor = await navFrom('c10', 1, 'Shift>}{ArrowDown}{/Shift', [
      ...initialValue,
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
    ] as typeof initialValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c10'), offset: 1},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
        backward: false,
      })
    })
    expect(editor.getSnapshot().context.value).toEqual([
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
            cells: [cell('c10', 'C'), cell('c11', 'D')],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
    ])
  })

  test('Scenario: `Shift+ArrowUp` in the top row extends into the block above', async () => {
    const editor = await navFrom('c00', 0, 'Shift>}{ArrowUp}{/Shift', [
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
      ...initialValue,
    ] as typeof initialValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 0},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
        backward: true,
      })
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
      },
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
            cells: [cell('c10', 'C'), cell('c11', 'D')],
          },
        ],
      },
    ])
  })

  test('Scenario: `Shift+ArrowDown` in the bottom row with nothing below leaves the selection unchanged', async () => {
    const editor = await navFrom('c10', 1, 'Shift>}{ArrowDown}{/Shift')
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
              cells: [cell('c10', 'Cx'), cell('c11', 'D')],
            },
          ],
        },
      ])
    })
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: spanPath('c10'), offset: 2},
      focus: {path: spanPath('c10'), offset: 2},
      backward: false,
    })
  })

  test('Scenario: `Shift+ArrowUp` in the top row with nothing above leaves the selection unchanged', async () => {
    const editor = await navFrom('c01', 0, 'Shift>}{ArrowUp}{/Shift')
    await userEvent.keyboard('x')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [cell('c00', 'A'), cell('c01', 'xB')],
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
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: spanPath('c01'), offset: 1},
      focus: {path: spanPath('c01'), offset: 1},
      backward: false,
    })
  })

  test('Scenario: `Shift+ArrowRight` at the end of a cell extends to the next cell in the row', async () => {
    const editor = await navFrom('c00', 1, 'Shift>}{ArrowRight}{/Shift')
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 0],
        colRange: [0, 1],
      })
    })
  })

  test('Scenario: `Shift+ArrowDown` and `Shift+ArrowUp` across multi-line cells move a whole row per press', async () => {
    const editor = await navFrom('c00', 8, 'Shift>}{ArrowDown}{/Shift', [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {_type: 'row', _key: 'r0', cells: [cell('c00', 'lorem\nlorem')]},
          {_type: 'row', _key: 'r1', cells: [cell('c10', 'lorem\nlorem')]},
          {_type: 'row', _key: 'r2', cells: [cell('c20', 'lorem\nlorem')]},
        ],
      },
    ])
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 8},
        focus: {path: spanPath('c10'), offset: 2},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 8},
        focus: {path: spanPath('c20'), offset: 2},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 8},
        focus: {path: spanPath('c10'), offset: 8},
        backward: false,
      })
    })
  })
})

describe('table keyboard navigation across a wrapped cell', () => {
  let wrapStyle: HTMLStyleElement

  beforeAll(() => {
    wrapStyle = document.createElement('style')
    wrapStyle.textContent =
      'table{table-layout:fixed;width:80px}td,td *{word-break:break-all}'
    document.head.append(wrapStyle)
  })

  afterAll(() => {
    wrapStyle.remove()
  })

  test('Scenario: `ArrowDown` from the last visual line crosses to the cell below', async () => {
    const editor = await navFrom(
      'c00',
      longText.length,
      'ArrowDown',
      wrappedValue,
    )
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c10')
    })
  })

  test('Scenario: `ArrowDown` from an earlier line passes through and stays in the cell', async () => {
    const editor = await navFrom('c00', 0, 'ArrowDown', wrappedValue)
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Scenario: `ArrowUp` from the first visual line crosses to the cell above', async () => {
    const editor = await navFrom('c10', 0, 'ArrowUp', wrappedValue)
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Scenario: `Shift+ArrowDown` from an earlier line extends within the cell', async () => {
    const editor = await navFrom(
      'c00',
      0,
      'Shift>}{ArrowDown}{/Shift',
      wrappedValue,
    )
    await vi.waitFor(() => {
      expect(
        editor.getSnapshot().context.selection?.focus.offset,
      ).toBeGreaterThan(0)
    })
    expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    expect(getTableSelection(editor.getSnapshot())).toEqual(undefined)
  })

  test('Scenario: `Shift+ArrowDown` from the last visual line extends to the cell below', async () => {
    const editor = await navFrom(
      'c00',
      longText.length,
      'Shift>}{ArrowDown}{/Shift',
      wrappedValue,
    )
    await vi.waitFor(() => {
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })
  })

  test('Scenario: `ArrowUp` from a later line passes through and stays in the cell', async () => {
    const editor = await navFrom(
      'c10',
      longText.length,
      'ArrowUp',
      wrappedValue,
    )
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c10')
    })
  })
})

describe('table keyboard navigation and the caret column', () => {
  // Identical text in the stacked cells, so the x of a given offset in one
  // cell is exactly the x of the same offset in the other.
  const columnValue = [
    {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [cell('c00', 'abcdef'), cell('c01', 'B')],
        },
        {
          _type: 'row',
          _key: 'r1',
          cells: [cell('c10', 'abcdef'), cell('c11', 'D')],
        },
        {
          _type: 'row',
          _key: 'r2',
          cells: [cell('c20', 'abcdef'), cell('c21', 'F')],
        },
      ],
    },
  ]

  test('Scenario: `ArrowDown` lands at the same column in the cell below', async () => {
    const editor = await navFrom('c00', 3, 'ArrowDown', columnValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: spanPath('c10'),
        offset: 3,
      })
    })
  })

  test('Scenario: `Shift+ArrowDown` moves the focus to the same column in the cell below', async () => {
    const editor = await navFrom(
      'c00',
      3,
      'Shift>}{ArrowDown}{/Shift',
      columnValue,
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c10'), offset: 3},
        backward: false,
      })
    })
  })

  test('Scenario: Repeated `Shift+ArrowDown` keeps the focus in the same column', async () => {
    const editor = await navFrom(
      'c00',
      3,
      'Shift>}{ArrowDown}{/Shift',
      columnValue,
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c10'), offset: 3},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c20'), offset: 3},
        backward: false,
      })
    })
  })

  test('Scenario: `Shift+ArrowUp` moves the focus to the same column in the cell above', async () => {
    const editor = await navFrom(
      'c10',
      2,
      'Shift>}{ArrowUp}{/Shift',
      columnValue,
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c10'), offset: 2},
        focus: {path: spanPath('c00'), offset: 2},
        backward: true,
      })
    })
  })

  test('Scenario: `Shift+ArrowUp` back into a multi-line anchor cell lands on its last line', async () => {
    const editor = await navFrom('c00', 3, 'Shift>}{ArrowDown}{/Shift', [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {_type: 'row', _key: 'r0', cells: [cell('c00', 'abcdef\nabcdef')]},
          {_type: 'row', _key: 'r1', cells: [cell('c10', 'abcdef')]},
        ],
      },
    ])
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c00'), offset: 10},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c10'), offset: 3},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c00'), offset: 10},
        backward: false,
      })
    })
  })

  test('Scenario: `Shift+ArrowUp` after `Shift+ArrowRight` in the cell below keeps the moved column', async () => {
    const editor = await navFrom(
      'c00',
      3,
      'Shift>}{ArrowDown}{/Shift',
      columnValue,
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c10'), offset: 3},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c10'), offset: 5},
        backward: false,
      })
    })

    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath('c00'), offset: 3},
        focus: {path: spanPath('c00'), offset: 5},
        backward: false,
      })
    })
  })

  test('Scenario: `ArrowUp` lands at the same column in the cell above', async () => {
    const editor = await navFrom('c10', 2, 'ArrowUp', columnValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: spanPath('c00'),
        offset: 2,
      })
    })
  })
})

async function placeCaret(editor: Editor, point: EditorSelectionPoint) {
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    expectDomCaretAtModelFocus(editor)
  })
}

function expectDomCaretAtModelFocus(editor: Editor) {
  const snapshot = editor.getSnapshot()
  const domSelection = window.getSelection()
  const domFocusNode = domSelection?.focusNode ?? null
  expect(document.activeElement).toBe(editor.dom.getEditorElement())
  expect(
    editor.dom.getStartBlockElement(snapshot)?.contains(domFocusNode),
  ).toBe(true)
  if (
    domFocusNode?.nodeType !== Node.TEXT_NODE ||
    domFocusNode.textContent === '\uFEFF'
  ) {
    // An element position, or the zero-width character an empty span
    // renders, has no text offset to compare with the model's.
    return
  }
  expect(domSelection?.focusOffset).toBe(
    snapshot.context.selection?.focus.offset,
  )
}

describe('table keyboard navigation in nested content', () => {
  describe('a callout at the edge of a cell', () => {
    test('Scenario: `ArrowDown` from a callout at the end of a cell moves to the cell below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan} = edgeCallouts(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: topSpan, offset: 3},
        'ArrowDown',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: bottomSpan, offset: 3},
          focus: {path: bottomSpan, offset: 3},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` from a callout at the end of a cell extends to the cell below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, table, topSpan, bottomSpan} = edgeCallouts(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: topSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: topSpan, offset: 3},
          focus: {path: bottomSpan, offset: 3},
          backward: false,
        })
      })
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: table._key}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })

    test('Scenario: `ArrowUp` from a callout at the start of a cell moves to the cell above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan} = edgeCallouts(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: bottomSpan, offset: 0},
        'ArrowUp',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: topSpan, offset: 0},
          focus: {path: topSpan, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` from a callout at the start of a cell extends to the cell above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, table, topSpan, bottomSpan} = edgeCallouts(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: bottomSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: bottomSpan, offset: 0},
          focus: {path: topSpan, offset: 0},
          backward: true,
        })
      })
      expect(getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: table._key}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })

    test('Scenario: `Shift+ArrowDown` from a callout in a callout at the end of a cell extends to the cell below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const innerBlock = textBlock(keyGenerator, 'bar')
      const innerCallout = calloutBlock(keyGenerator, [innerBlock])
      const outerCallout = calloutBlock(keyGenerator, [innerCallout])
      const topCell = cellBlock(keyGenerator, [
        textBlock(keyGenerator, 'foo'),
        outerCallout,
      ])
      const bottomBlock = textBlock(keyGenerator, 'bar')
      const bottomCell = cellBlock(keyGenerator, [bottomBlock])
      const table = tableBlock(keyGenerator, [
        [topCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'baz')])],
        [bottomCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'baz')])],
      ])
      const innerSpan = spanPathIn(
        table,
        topCell,
        outerCallout,
        innerCallout,
        innerBlock,
      )
      const editor = await nestedNavFrom(
        keyGenerator,
        [table],
        {path: innerSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: innerSpan, offset: 3},
          focus: {path: spanPathIn(table, bottomCell, bottomBlock), offset: 3},
          backward: false,
        })
      })
    })
  })

  describe('a table in a callout', () => {
    test('Scenario: `Shift+ArrowDown` in the bottom row extends into the block below the table in the callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const below = textBlock(keyGenerator, 'bar')
      const box = calloutBlock(keyGenerator, [
        textBlock(keyGenerator, 'foo'),
        grid.table,
        below,
      ])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [box],
        {path: caretSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 3},
          focus: {path: spanPathIn(box, below), offset: 3},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in a table in a callout extends down the column', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const editor = await nestedNavFrom(
        keyGenerator,
        [box],
        {path: spanPathIn(box, grid.table, ...grid.at(0, 1)), offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(getTableSelection(editor.getSnapshot())).toEqual({
          tablePath: [{_key: box._key}, 'content', {_key: grid.table._key}],
          rowRange: [0, 1],
          colRange: [1, 1],
        })
      })
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: spanPathIn(box, grid.table, ...grid.at(0, 1)),
          offset: 3,
        },
        focus: {path: spanPathIn(box, grid.table, ...grid.at(1, 1)), offset: 3},
        backward: false,
      })
    })

    test('Scenario: `Shift+ArrowUp` in the top row, the table first in the callout, extends into the block above the callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const above = textBlock(keyGenerator, '')
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [above, box, textBlock(keyGenerator, '')],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(above), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row, the table last in the callout, extends into the block below the callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const below = textBlock(keyGenerator, '')
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [textBlock(keyGenerator, ''), box, below],
        {path: caretSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 3},
          focus: {path: spanPathIn(below), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row, the callout last in the document, leaves the selection unchanged', async () => {
      const keyGenerator = createTestKeyGenerator()
      const above = textBlock(keyGenerator, 'foo')
      const caretBlock = textBlock(keyGenerator, 'baz')
      const topLeft = cellBlock(keyGenerator, [textBlock(keyGenerator, 'foo')])
      const topRight = cellBlock(keyGenerator, [textBlock(keyGenerator, 'bar')])
      const caretCell = cellBlock(keyGenerator, [caretBlock])
      const bottomRight = cellBlock(keyGenerator, [
        textBlock(keyGenerator, 'foo'),
      ])
      const table = tableBlock(keyGenerator, [
        [topLeft, topRight],
        [caretCell, bottomRight],
      ])
      const box = calloutBlock(keyGenerator, [table])
      const caretSpan = spanPathIn(box, table, caretCell, caretBlock)
      const editor = await nestedNavFrom(
        keyGenerator,
        [above, box],
        {path: caretSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await userEvent.keyboard('x')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          above,
          {
            ...box,
            content: [
              {
                ...table,
                rows: [
                  table.rows[0],
                  {
                    ...table.rows[1],
                    cells: [
                      {
                        ...caretCell,
                        value: [
                          {
                            ...caretBlock,
                            children: [
                              {...caretBlock.children[0], text: 'bazx'},
                            ],
                          },
                        ],
                      },
                      bottomRight,
                    ],
                  },
                ],
              },
            ],
          },
        ])
      })
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: caretSpan, offset: 4},
        focus: {path: caretSpan, offset: 4},
        backward: false,
      })
    })
  })

  describe('a table in a callout in a callout', () => {
    test('Scenario: `Shift+ArrowUp` in the top row extends into the block above the inner callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, outer, inner, grid, outerAbove} =
        calloutInCallout(keyGenerator)
      const caretSpan = spanPathIn(outer, inner, grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(outer, outerAbove), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row extends into the block below the inner callout', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, outer, inner, grid, outerBelow} =
        calloutInCallout(keyGenerator)
      const caretSpan = spanPathIn(outer, inner, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: caretSpan, offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 3},
          focus: {path: spanPathIn(outer, outerBelow), offset: 3},
          backward: false,
        })
      })
    })
  })

  describe('a table in a table cell', () => {
    test('Scenario: `Shift+ArrowDown` in the inner table extends down its column', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const outerCell = cellBlock(keyGenerator, [grid.table])
      const outer = tableBlock(keyGenerator, [
        [outerCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'bar')])],
      ])
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer],
        {
          path: spanPathIn(outer, outerCell, grid.table, ...grid.at(0, 1)),
          offset: 3,
        },
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(getTableSelection(editor.getSnapshot())).toEqual({
          tablePath: [
            {_key: outer._key},
            'rows',
            {_key: outer.rows[0]._key},
            'cells',
            {_key: outerCell._key},
            'value',
            {_key: grid.table._key},
          ],
          rowRange: [0, 1],
          colRange: [1, 1],
        })
      })
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: spanPathIn(outer, outerCell, grid.table, ...grid.at(0, 1)),
          offset: 3,
        },
        focus: {
          path: spanPathIn(outer, outerCell, grid.table, ...grid.at(1, 1)),
          offset: 3,
        },
        backward: false,
      })
    })

    test('Scenario: `ArrowUp` into a cell that ends with a table lands in its bottom row', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const topCell = cellBlock(keyGenerator, [grid.table])
      const bottomBlock = textBlock(keyGenerator, 'baz')
      const bottomCell = cellBlock(keyGenerator, [bottomBlock])
      const outer = tableBlock(keyGenerator, [[topCell], [bottomCell]])
      const landing = spanPathIn(outer, topCell, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer],
        {path: spanPathIn(outer, bottomCell, bottomBlock), offset: 0},
        'ArrowUp',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: landing, offset: 0},
          focus: {path: landing, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row of a table that ends a cell extends into the outer cell below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan} = stackedInnerTables(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: topSpan(1), offset: 3},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: topSpan(1), offset: 3},
          focus: {path: bottomSpan(0), offset: 3},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` in the top row of a table that starts a cell extends into the outer cell above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan} = stackedInnerTables(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        {path: bottomSpan(0), offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: bottomSpan(0), offset: 0},
          focus: {path: topSpan(1), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: Repeated `Shift+ArrowDown` out of an inner table walks down the inner table below, and `Shift+ArrowUp` walks back', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan, lastSpan} =
        stackedInnerTables(keyGenerator)
      const anchor = {path: topSpan(1), offset: 3}
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        anchor,
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: bottomSpan(0), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: bottomSpan(1), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: bottomSpan(0), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: anchor,
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: bottomSpan(0), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: bottomSpan(1), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: lastSpan, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: Repeated `Shift+ArrowUp` out of an inner table walks up the inner table above, and `Shift+ArrowDown` walks back', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {value, topSpan, bottomSpan} = stackedInnerTables(keyGenerator)
      const anchor = {path: bottomSpan(0), offset: 0}
      const editor = await nestedNavFrom(
        keyGenerator,
        value,
        anchor,
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: topSpan(1), offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: topSpan(0), offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: topSpan(1), offset: 0},
          backward: true,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: anchor,
          backward: false,
        })
      })
    })

    test("Scenario: `Shift+ArrowDown` anchored above an inner table in the same cell extends down the inner table's column", async () => {
      const keyGenerator = createTestKeyGenerator()
      const aboveBlock = textBlock(keyGenerator, 'foo')
      const grid = gridTable(keyGenerator)
      const outerCell = cellBlock(keyGenerator, [aboveBlock, grid.table])
      const outer = tableBlock(keyGenerator, [
        [outerCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'bar')])],
      ])
      const anchor = {path: spanPathIn(outer, outerCell, aboveBlock), offset: 0}
      const focus = {
        path: spanPathIn(outer, outerCell, grid.table, ...grid.at(0, 0)),
        offset: 3,
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: nestedSchemaDefinition,
        initialValue: [outer],
        children: (
          <>
            <TablePlugin />
            <NodePlugin nodes={calloutNodes} />
          </>
        ),
      })
      editor.send({type: 'focus'})
      editor.send({type: 'select', at: {anchor, focus}})
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus,
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {
            path: spanPathIn(outer, outerCell, grid.table, ...grid.at(1, 0)),
            offset: 3,
          },
          backward: false,
        })
      })
    })

    test('Scenario: Repeated `Shift+ArrowDown` out of a table two cells deep walks down the outermost table', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const middleCell = cellBlock(keyGenerator, [grid.table])
      const middle = tableBlock(keyGenerator, [[middleCell]])
      const topCell = cellBlock(keyGenerator, [middle])
      const secondBlock = textBlock(keyGenerator, 'bar')
      const secondCell = cellBlock(keyGenerator, [secondBlock])
      const thirdBlock = textBlock(keyGenerator, 'baz')
      const thirdCell = cellBlock(keyGenerator, [thirdBlock])
      const outer = tableBlock(keyGenerator, [
        [topCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'foo')])],
        [secondCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'foo')])],
        [thirdCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'foo')])],
      ])
      const anchor = {
        path: spanPathIn(
          outer,
          topCell,
          middle,
          middleCell,
          grid.table,
          ...grid.at(1, 0),
        ),
        offset: 3,
      }
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer],
        anchor,
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: spanPathIn(outer, secondCell, secondBlock), offset: 3},
          backward: false,
        })
      })

      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor,
          focus: {path: spanPathIn(outer, thirdCell, thirdBlock), offset: 3},
          backward: false,
        })
      })
    })
  })

  describe('a container beside a table', () => {
    test('Scenario: `Shift+ArrowUp` in the top row extends into the last block of the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout, last} = emptyCallout(keyGenerator)
      const grid = gridTable(keyGenerator)
      const caretSpan = spanPathIn(grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [callout, grid.table],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(callout, last), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row extends into the first block of the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const {callout, first} = emptyCallout(keyGenerator)
      const caretSpan = spanPathIn(grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, callout],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(callout, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` in the top row extends into the last block of a callout in the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout: inner, last} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        textBlock(keyGenerator, ''),
        inner,
      ])
      const grid = gridTable(keyGenerator)
      const caretSpan = spanPathIn(grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer, grid.table],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(outer, inner, last), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row extends into the first block of a callout in the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const {callout: inner, first} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        inner,
        textBlock(keyGenerator, ''),
      ])
      const caretSpan = spanPathIn(grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, outer],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(outer, inner, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` in the top row extends into the bottom row of the table above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const above = gridTable(keyGenerator, 3)
      const grid = gridTable(keyGenerator)
      const caretSpan = spanPathIn(grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [above.table, grid.table],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(above.table, ...above.at(2, 0)), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` in the bottom row extends into the top row of the table below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const below = gridTable(keyGenerator, 3)
      const caretSpan = spanPathIn(grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, below.table],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(below.table, ...below.at(0, 0)), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` out of a table in a callout extends into the last block of the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout, last} = emptyCallout(keyGenerator)
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [callout, box],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(callout, last), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` out of a table in a callout extends into the first block of the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const {callout, first} = emptyCallout(keyGenerator)
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [box, callout],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(callout, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` out of a table in a callout extends into the last block of a callout in the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout: inner, last} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        textBlock(keyGenerator, ''),
        inner,
      ])
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer, box],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(outer, inner, last), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` out of a table in a callout extends into the first block of a callout in the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const {callout: inner, first} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        inner,
        textBlock(keyGenerator, ''),
      ])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [box, outer],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(outer, inner, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `Shift+ArrowUp` out of a table in a callout extends into the bottom row of the table above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const above = gridTable(keyGenerator, 3)
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [above.table, box],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowUp}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(above.table, ...above.at(2, 0)), offset: 0},
          backward: true,
        })
      })
    })

    test('Scenario: `Shift+ArrowDown` out of a table in a callout extends into the top row of the table below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const box = calloutBlock(keyGenerator, [grid.table])
      const below = gridTable(keyGenerator, 3)
      const caretSpan = spanPathIn(box, grid.table, ...grid.at(1, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [box, below.table],
        {path: caretSpan, offset: 0},
        'Shift>}{ArrowDown}{/Shift',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: caretSpan, offset: 0},
          focus: {path: spanPathIn(below.table, ...below.at(0, 0)), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowUp` in the top row moves into the last block of the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout, last} = emptyCallout(keyGenerator)
      const grid = gridTable(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        [callout, grid.table],
        {path: spanPathIn(grid.table, ...grid.at(0, 0)), offset: 0},
        'ArrowUp',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPathIn(callout, last), offset: 0},
          focus: {path: spanPathIn(callout, last), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowDown` in the bottom row moves into the first block of the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const {callout, first} = emptyCallout(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, callout],
        {path: spanPathIn(grid.table, ...grid.at(1, 0)), offset: 0},
        'ArrowDown',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPathIn(callout, first), offset: 0},
          focus: {path: spanPathIn(callout, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowUp` in the top row moves into the last block of a callout in the callout above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {callout: inner, last} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        textBlock(keyGenerator, ''),
        inner,
      ])
      const grid = gridTable(keyGenerator)
      const editor = await nestedNavFrom(
        keyGenerator,
        [outer, grid.table],
        {path: spanPathIn(grid.table, ...grid.at(0, 0)), offset: 0},
        'ArrowUp',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPathIn(outer, inner, last), offset: 0},
          focus: {path: spanPathIn(outer, inner, last), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowDown` in the bottom row moves into the first block of a callout in the callout below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const {callout: inner, first} = emptyCallout(keyGenerator)
      const outer = calloutBlock(keyGenerator, [
        inner,
        textBlock(keyGenerator, ''),
      ])
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, outer],
        {path: spanPathIn(grid.table, ...grid.at(1, 0)), offset: 0},
        'ArrowDown',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPathIn(outer, inner, first), offset: 0},
          focus: {path: spanPathIn(outer, inner, first), offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowUp` in the top row moves into the bottom row of the table above', async () => {
      const keyGenerator = createTestKeyGenerator()
      const above = gridTable(keyGenerator, 3)
      const grid = gridTable(keyGenerator)
      const landing = spanPathIn(above.table, ...above.at(2, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [above.table, grid.table],
        {path: spanPathIn(grid.table, ...grid.at(0, 0)), offset: 0},
        'ArrowUp',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: landing, offset: 0},
          focus: {path: landing, offset: 0},
          backward: false,
        })
      })
    })

    test('Scenario: `ArrowDown` in the bottom row moves into the top row of the table below', async () => {
      const keyGenerator = createTestKeyGenerator()
      const grid = gridTable(keyGenerator)
      const below = gridTable(keyGenerator, 3)
      const landing = spanPathIn(below.table, ...below.at(0, 0))
      const editor = await nestedNavFrom(
        keyGenerator,
        [grid.table, below.table],
        {path: spanPathIn(grid.table, ...grid.at(1, 0)), offset: 0},
        'ArrowDown',
      )
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: landing, offset: 0},
          focus: {path: landing, offset: 0},
          backward: false,
        })
      })
    })
  })
})

describe('table keyboard navigation in a callout laid out as a row', () => {
  let rowStyle: HTMLStyleElement

  beforeAll(() => {
    rowStyle = document.createElement('style')
    rowStyle.textContent = 'aside{display:flex;align-items:flex-start}'
    document.head.append(rowStyle)
  })

  afterAll(() => {
    rowStyle.remove()
  })

  test('Scenario: `ArrowDown` in the bottom row moves to the start of the block beside the table in the callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const grid = gridTable(keyGenerator)
    const beside = textBlock(keyGenerator, 'foo')
    const box = calloutBlock(keyGenerator, [grid.table, beside])
    const editor = await nestedNavFrom(
      keyGenerator,
      [box],
      {path: spanPathIn(box, grid.table, ...grid.at(1, 0)), offset: 3},
      'ArrowDown',
    )
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPathIn(box, beside), offset: 0},
        focus: {path: spanPathIn(box, beside), offset: 0},
        backward: false,
      })
    })
  })
})

const nestedSchemaDefinition = defineSchema({
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
                          of: [
                            {type: 'block'},
                            {type: 'callout'},
                            {type: 'table'},
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
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}, {type: 'table'}],
        },
      ],
    },
  ],
})

const calloutNodes = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({attributes, children}) => (
      <aside {...attributes}>{children}</aside>
    ),
  }),
]

async function nestedNavFrom(
  keyGenerator: () => string,
  value: Array<FixtureBlock>,
  point: EditorSelectionPoint,
  key: string,
) {
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: nestedSchemaDefinition,
    initialValue: value,
    children: (
      <>
        <TablePlugin />
        <NodePlugin nodes={calloutNodes} />
      </>
    ),
  })
  editor.send({type: 'focus'})
  await placeCaret(editor, point)
  await userEvent.keyboard(`{${key}}`)
  return editor
}

/** A table `[foo, callout[bar] | baz] / [callout[bar], foo | baz]` between two blocks. */
function edgeCallouts(keyGenerator: () => string) {
  const above = textBlock(keyGenerator, 'foo')
  const topBlock = textBlock(keyGenerator, 'bar')
  const topCallout = calloutBlock(keyGenerator, [topBlock])
  const topCell = cellBlock(keyGenerator, [
    textBlock(keyGenerator, 'foo'),
    topCallout,
  ])
  const bottomBlock = textBlock(keyGenerator, 'bar')
  const bottomCallout = calloutBlock(keyGenerator, [bottomBlock])
  const bottomCell = cellBlock(keyGenerator, [
    bottomCallout,
    textBlock(keyGenerator, 'foo'),
  ])
  const table = tableBlock(keyGenerator, [
    [topCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'baz')])],
    [bottomCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'baz')])],
  ])
  return {
    value: [above, table, textBlock(keyGenerator, 'foo')],
    table,
    topSpan: spanPathIn(table, topCell, topCallout, topBlock),
    bottomSpan: spanPathIn(table, bottomCell, bottomCallout, bottomBlock),
  }
}

/** `[foo, callout[bar, callout[2x2 table], baz], foo]`. */
function calloutInCallout(keyGenerator: () => string) {
  const outerAbove = textBlock(keyGenerator, 'bar')
  const grid = gridTable(keyGenerator)
  const inner = calloutBlock(keyGenerator, [grid.table])
  const outerBelow = textBlock(keyGenerator, 'baz')
  const outer = calloutBlock(keyGenerator, [outerAbove, inner, outerBelow])
  return {
    value: [
      textBlock(keyGenerator, 'foo'),
      outer,
      textBlock(keyGenerator, 'foo'),
    ],
    outer,
    inner,
    grid,
    outerAbove,
    outerBelow,
  }
}

/**
 * `[foo, table[[2x2 table | bar], [2x2 table | baz], ['' | bar]], foo]`:
 * the spans of the first column of the top and bottom inner tables, and of
 * the outer table's last row.
 */
function stackedInnerTables(keyGenerator: () => string) {
  const top = gridTable(keyGenerator)
  const topCell = cellBlock(keyGenerator, [top.table])
  const bottom = gridTable(keyGenerator)
  const bottomCell = cellBlock(keyGenerator, [bottom.table])
  const lastBlock = textBlock(keyGenerator, '')
  const lastCell = cellBlock(keyGenerator, [lastBlock])
  const outer = tableBlock(keyGenerator, [
    [topCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'bar')])],
    [bottomCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'baz')])],
    [lastCell, cellBlock(keyGenerator, [textBlock(keyGenerator, 'bar')])],
  ])
  return {
    value: [
      textBlock(keyGenerator, 'foo'),
      outer,
      textBlock(keyGenerator, 'foo'),
    ],
    topSpan: (row: number) =>
      spanPathIn(outer, topCell, top.table, ...top.at(row, 0)),
    bottomSpan: (row: number) =>
      spanPathIn(outer, bottomCell, bottom.table, ...bottom.at(row, 0)),
    lastSpan: spanPathIn(outer, lastCell, lastBlock),
  }
}

/** A callout of three empty blocks. */
function emptyCallout(keyGenerator: () => string) {
  const first = textBlock(keyGenerator, '')
  const middle = textBlock(keyGenerator, '')
  const last = textBlock(keyGenerator, '')
  return {
    callout: calloutBlock(keyGenerator, [first, middle, last]),
    first,
    last,
  }
}

/**
 * A two-column table of `rowCount` rows, one block per cell, and the cell
 * and block at a row and column.
 */
function gridTable(keyGenerator: () => string, rowCount = 2) {
  const texts = ['foo', 'bar', 'baz']
  const rows = Array.from({length: rowCount}, (_, rowIndex) =>
    [0, 1].map((columnIndex) => {
      const block = textBlock(
        keyGenerator,
        texts[(rowIndex * 2 + columnIndex) % 3],
      )
      return {cell: cellBlock(keyGenerator, [block]), block}
    }),
  )
  const table = tableBlock(
    keyGenerator,
    rows.map((row) => row.map(({cell}) => cell)),
  )
  return {
    table,
    at: (rowIndex: number, columnIndex: number) =>
      [
        rows[rowIndex][columnIndex].cell,
        rows[rowIndex][columnIndex].block,
      ] as const,
  }
}

type FixtureTextBlock = {
  _type: 'block'
  _key: string
  style: 'normal'
  markDefs: []
  children: [{_type: 'span'; _key: string; text: string; marks: []}]
}
type FixtureCell = {_type: 'cell'; _key: string; value: Array<FixtureBlock>}
type FixtureTable = {
  _type: 'table'
  _key: string
  rows: Array<{_type: 'row'; _key: string; cells: Array<FixtureCell>}>
}
type FixtureCallout = {
  _type: 'callout'
  _key: string
  content: Array<FixtureBlock>
}
type FixtureBlock = FixtureTextBlock | FixtureTable | FixtureCallout

function textBlock(keyGenerator: () => string, text: string): FixtureTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
  }
}

function calloutBlock(
  keyGenerator: () => string,
  content: Array<FixtureBlock>,
): FixtureCallout {
  return {_type: 'callout', _key: keyGenerator(), content}
}

function cellBlock(
  keyGenerator: () => string,
  value: Array<FixtureBlock>,
): FixtureCell {
  return {_type: 'cell', _key: keyGenerator(), value}
}

function tableBlock(
  keyGenerator: () => string,
  rows: Array<Array<FixtureCell>>,
): FixtureTable {
  return {
    _type: 'table',
    _key: keyGenerator(),
    rows: rows.map((cells) => ({_type: 'row', _key: keyGenerator(), cells})),
  }
}

/**
 * The path of the span of the text block that ends `nodes`, a chain of
 * nested fixture nodes starting at the document root.
 */
function spanPathIn(
  ...nodes: [...Array<FixtureBlock | FixtureCell>, FixtureTextBlock]
): Path {
  const path: Path = []
  let parent: FixtureBlock | FixtureCell | undefined
  for (const node of nodes) {
    if (parent?._type === 'table') {
      const row = parent.rows.find((candidate) =>
        candidate.cells.some((cell) => cell._key === node._key),
      )
      path.push('rows', {_key: row?._key ?? ''}, 'cells')
    } else if (parent?._type === 'cell') {
      path.push('value')
    } else if (parent?._type === 'callout') {
      path.push('content')
    }
    path.push({_key: node._key})
    parent = node
  }
  if (parent?._type !== 'block') {
    throw new Error('The last node must be a text block')
  }
  return [...path, 'children', {_key: parent.children[0]._key}]
}
