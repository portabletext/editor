import {defineSchema, type EditorSnapshot} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {getEnclosingBlock} from '@portabletext/editor/traversal'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {TablePlugin} from '../plugin.table'
import {isCell} from './types'

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

async function navFrom(
  cellKey: string,
  offset: number,
  key: string,
  value: typeof initialValue = initialValue,
) {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: value,
    children: <TablePlugin />,
  })
  await userEvent.click(locator)
  const point = {path: spanPath(cellKey), offset}
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  await new Promise((resolve) => setTimeout(resolve, 0))
  await userEvent.keyboard(`{${key}}`)
  await new Promise((resolve) => setTimeout(resolve, 50))
  return focusCellKey(editor.getSnapshot())
}

describe('table keyboard navigation', () => {
  test('Tab moves to the next cell in the row', async () => {
    expect(await navFrom('c00', 1, 'Tab')).toEqual('c01')
  })

  test('Tab wraps to the first cell of the next row', async () => {
    expect(await navFrom('c01', 1, 'Tab')).toEqual('c10')
  })

  test('Tab at the last cell does not move (passes through)', async () => {
    expect(await navFrom('c11', 1, 'Tab')).toEqual('c11')
  })

  test('Shift+Tab moves to the previous cell', async () => {
    expect(await navFrom('c01', 1, 'Shift>}{Tab}{/Shift')).toEqual('c00')
  })

  test('Shift+Tab wraps to the last cell of the previous row', async () => {
    expect(await navFrom('c10', 1, 'Shift>}{Tab}{/Shift')).toEqual('c01')
  })

  test('Shift+Tab at the first cell does not move (passes through)', async () => {
    expect(await navFrom('c00', 1, 'Shift>}{Tab}{/Shift')).toEqual('c00')
  })

  test('ArrowDown moves to the cell directly below (same column)', async () => {
    expect(await navFrom('c01', 1, 'ArrowDown')).toEqual('c11')
  })

  test('ArrowDown in the bottom row does not move (passes through)', async () => {
    expect(await navFrom('c10', 1, 'ArrowDown')).toEqual('c10')
  })

  test('ArrowUp moves to the cell directly above (same column)', async () => {
    expect(await navFrom('c10', 0, 'ArrowUp')).toEqual('c00')
  })

  test('ArrowUp in the top row does not move (passes through)', async () => {
    expect(await navFrom('c00', 0, 'ArrowUp')).toEqual('c00')
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
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: value,
      children: <TablePlugin />,
    })
    await userEvent.click(locator)
    const point = {path: spanPath('c10'), offset: 0}
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await new Promise((resolve) => setTimeout(resolve, 0))
    await userEvent.keyboard('{ArrowUp}')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(focusBlockKey(editor.getSnapshot())).toEqual('c00-b1')
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
    expect(
      await navFrom('c00', longText.length, 'ArrowDown', wrappedValue),
    ).toEqual('c10')
  })

  test('ArrowDown from an earlier line stays in the cell (passes through)', async () => {
    expect(await navFrom('c00', 0, 'ArrowDown', wrappedValue)).toEqual('c00')
  })

  test('ArrowUp from the first visual line crosses to the cell above', async () => {
    expect(await navFrom('c10', 0, 'ArrowUp', wrappedValue)).toEqual('c00')
  })

  test('ArrowUp from a later line stays in the cell (passes through)', async () => {
    expect(
      await navFrom('c10', longText.length, 'ArrowUp', wrappedValue),
    ).toEqual('c10')
  })
})
