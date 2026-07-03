import {defineSchema, type EditorSnapshot} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterAll, beforeAll, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {TablePlugin} from '../plugin.table'
import {createTableGuards, defaultTableConfig} from '../table-config'

const {isCell} = createTableGuards(defaultTableConfig)

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

function focusCellKey(snapshot: EditorSnapshot): string | undefined {
  const focus = snapshot.context.selection?.focus.path
  if (!focus) {
    return undefined
  }
  return getEnclosingBlock(snapshot, focus, {match: isCell})?.node._key
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
  const point = {path: spanPath(cellKey), offset}
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
  })
  await userEvent.keyboard(`{${key}}`)
  return editor
}

describe('table keyboard navigation', () => {
  test('Tab moves to the next cell in the row', async () => {
    const editor = await navFrom('c00', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c01')
    })
  })

  test('Tab wraps to the first cell of the next row', async () => {
    const editor = await navFrom('c01', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c10')
    })
  })

  test('Tab at the last cell does not move (passes through)', async () => {
    const editor = await navFrom('c11', 1, 'Tab')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c11')
    })
  })

  test('Shift+Tab moves to the previous cell', async () => {
    const editor = await navFrom('c01', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('Shift+Tab wraps to the last cell of the previous row', async () => {
    const editor = await navFrom('c10', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c01')
    })
  })

  test('Shift+Tab at the first cell does not move (passes through)', async () => {
    const editor = await navFrom('c00', 1, 'Shift>}{Tab}{/Shift')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('ArrowDown moves to the cell directly below (same column)', async () => {
    const editor = await navFrom('c01', 1, 'ArrowDown')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c11')
    })
  })

  test('ArrowDown in the bottom row escapes into a block after the table', async () => {
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

  test('Tab inside a list item indents instead of navigating', async () => {
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

  test('ArrowUp on an image at the top of a cell inserts a text block above it', async () => {
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

  test('round trips through a 3x3 table with a block above never accumulate blocks', async () => {
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
    const point = {
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
    }
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })

    // Pass 1 down: walks the rows and escapes below (nothing lies beyond).
    for (let press = 0; press < 5; press++) {
      await userEvent.keyboard('{ArrowDown}')
    }
    await vi.waitFor(() => {
      expect(
        editor.getSnapshot().context.value?.map((block) => block._type),
      ).toEqual(['block', 'table', 'block'])
    })

    // Two more full passes: up to "above", down to the escape block, up
    // again. Every neighbor now exists, so no press may insert.
    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard('{ArrowUp}')
    }
    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard('{ArrowDown}')
    }
    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard('{ArrowUp}')
    }
    await vi.waitFor(() => {
      expect(
        editor.getSnapshot().context.value?.map((block) => block._type),
      ).toEqual(['block', 'table', 'block'])
    })
  })

  test('repeated ArrowDown escapes reuse the block below instead of accumulating', async () => {
    const editor = await navFrom('c10', 1, 'ArrowDown')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(2)
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
    })

    // Back into the table's bottom row, then out again. The placeholder
    // from the first escape already lies below; navigation must land in
    // it without inserting another.
    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c11')
    })
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(focusBlockKey(editor.getSnapshot())).toEqual('k2')
    })
    expect(editor.getSnapshot().context.value).toHaveLength(2)
  })

  test('ArrowDown in the bottom row moves into the block below', async () => {
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

  test('ArrowUp in the top row moves into the block above', async () => {
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

  test('ArrowUp moves to the cell directly above (same column)', async () => {
    const editor = await navFrom('c10', 0, 'ArrowUp')
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('ArrowUp at the document-edge cell escapes into a block before the table', async () => {
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

  test('ArrowUp lands in the last block of the cell above', async () => {
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

  test('ArrowDown from the last visual line crosses to the cell below', async () => {
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

  test('ArrowDown from an earlier line stays in the cell (passes through)', async () => {
    const editor = await navFrom('c00', 0, 'ArrowDown', wrappedValue)
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('ArrowUp from the first visual line crosses to the cell above', async () => {
    const editor = await navFrom('c10', 0, 'ArrowUp', wrappedValue)
    await vi.waitFor(() => {
      expect(focusCellKey(editor.getSnapshot())).toEqual('c00')
    })
  })

  test('ArrowUp from a later line stays in the cell (passes through)', async () => {
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

describe('table keyboard navigation preserves the caret column', () => {
  // Identical text in the stacked cells, so the x of a given offset in one
  // cell is exactly the x of the same offset in the other.
  const columnValue = [
    {
      _type: 'table',
      _key: 't0',
      rows: [
        {_type: 'row', _key: 'r0', cells: [cell('c00', 'abcdef')]},
        {_type: 'row', _key: 'r1', cells: [cell('c10', 'abcdef')]},
      ],
    },
  ]

  test('ArrowDown lands at the same column in the cell below', async () => {
    const editor = await navFrom('c00', 3, 'ArrowDown', columnValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: spanPath('c10'),
        offset: 3,
      })
    })
  })

  test('ArrowUp lands at the same column in the cell above', async () => {
    const editor = await navFrom('c10', 2, 'ArrowUp', columnValue)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: spanPath('c00'),
        offset: 2,
      })
    })
  })
})
