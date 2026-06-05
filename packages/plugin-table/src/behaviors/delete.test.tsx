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

function textBlock(key: string, spanKey: string, text: string): TextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
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
    content: [textBlock(blockKey, spanKey, text)],
  }
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

function pointInSpan(
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

function pointAtCell(cellKey: string) {
  return {
    path: [
      {_key: 't0'},
      'rows',
      {_key: cellKey.startsWith('r0') ? 'r0' : 'r1'},
      'cells',
      {_key: cellKey},
    ],
    offset: 0,
  }
}

function collapsed(point: ReturnType<typeof pointInSpan>) {
  return {anchor: point, focus: point, backward: false}
}

function collapsedAtCell(cellKey: string) {
  const point = pointAtCell(cellKey)
  return {anchor: point, focus: point, backward: false}
}

/**
 * Builds the expected post-delete value for a 2x2 `initialValue` table
 * given the set of cleared cell keys. Each cleared cell ends up with a
 * single empty block; we drive its block + span keys from the test's
 * key generator state.
 */
function tableWithCleared(
  cleared: Record<string, {blockKey: string; spanKey: string}>,
) {
  function cellFor(
    cellKey: string,
    originalBlock: string,
    originalSpan: string,
    originalText: string,
  ): Cell {
    const overrides = cleared[cellKey]
    if (overrides) {
      return cellWithText(cellKey, overrides.blockKey, overrides.spanKey, '')
    }
    return cellWithText(cellKey, originalBlock, originalSpan, originalText)
  }
  return [
    {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [
            cellFor('r0c0', 'r0c0b', 'r0c0s', 'AA'),
            cellFor('r0c1', 'r0c1b', 'r0c1s', 'BB'),
          ],
        },
        {
          _type: 'row',
          _key: 'r1',
          cells: [
            cellFor('r1c0', 'r1c0b', 'r1c0s', 'CC'),
            cellFor('r1c1', 'r1c1b', 'r1c1s', 'DD'),
          ],
        },
      ],
    },
  ]
}

describe('delete behaviors within tables', () => {
  test('delete.backward at offset 0 of cell start: no-op (no cross-cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointInSpan('r0c1', 'r0c1b', 'r0c1s', 0)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(editor.getSnapshot().context.selection).toEqual(collapsed(point))
    })
  })

  test('delete.forward at end of cell: no-op (no cross-cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 2)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.forward', unit: 'character'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
      expect(editor.getSnapshot().context.selection).toEqual(collapsed(point))
    })
  })

  test('delete.backward inside cell text: deletes one char within cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const startPoint = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 2)
    editor.send({type: 'select', at: {anchor: startPoint, focus: startPoint}})
    editor.send({type: 'delete.backward', unit: 'character'})

    const endPoint = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                cellWithText('r0c0', 'r0c0b', 'r0c0s', 'A'),
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
      ])
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsed(endPoint),
      )
    })
  })

  test('delete on multi-cell rectangle (2x2): clears all touched cells, collapses to top-left cell', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointInSpan('r1c1', 'r1c1b', 'r1c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c0: {blockKey: 'k8', spanKey: 'k9'},
          r0c1: {blockKey: 'k6', spanKey: 'k7'},
          r1c0: {blockKey: 'k4', spanKey: 'k5'},
          r1c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c0'),
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('delete on multi-cell rectangle in same row: clears both, leaves other row untouched', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointInSpan('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c0: {blockKey: 'k4', spanKey: 'k5'},
          r0c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c0'),
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('delete on multi-cell rectangle in cols 1+: selection lands at start of selection top-left, not table top-left', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    // Select cells in column 1 only (r0c1 + r1c1). After delete, cursor must
    // land at the start of r0c1 (top-left of the SELECTION), not r0c0.
    const anchor = pointInSpan('r0c1', 'r0c1b', 'r0c1s', 0)
    const focus = pointInSpan('r1c1', 'r1c1b', 'r1c1s', 2)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c1: {blockKey: 'k4', spanKey: 'k5'},
          r1c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c1'),
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('split (Enter) inside a cell: splits inside the cell, structure outside cell preserved', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const point = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
                  _key: 'r0c0',
                  content: [
                    textBlock('r0c0b', 'r0c0s', 'A'),
                    textBlock('k2', 'r0c0s', 'A'),
                  ],
                },
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
      ])
    })
  })

  test('split (Enter) with multi-cell rectangle selection: clears rectangle, no split', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointInSpan('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c0: {blockKey: 'k4', spanKey: 'k5'},
          r0c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c0'),
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('delete.range straddling two cells in same row: structure preserved (no cell merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointInSpan('r0c1', 'r0c1b', 'r0c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c0: {blockKey: 'k4', spanKey: 'k5'},
          r0c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c0'),
      )
    })
  })

  test('delete.range straddling rows in same table: structure preserved (no row merge)', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const anchor = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 1)
    const focus = pointInSpan('r1c1', 'r1c1b', 'r1c1s', 1)
    editor.send({type: 'select', at: {anchor, focus}})
    editor.send({type: 'delete'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        tableWithCleared({
          r0c0: {blockKey: 'k8', spanKey: 'k9'},
          r0c1: {blockKey: 'k6', spanKey: 'k7'},
          r1c0: {blockKey: 'k4', spanKey: 'k5'},
          r1c1: {blockKey: 'k2', spanKey: 'k3'},
        }),
      )
      expect(editor.getSnapshot().context.selection).toEqual(
        collapsedAtCell('r0c0'),
      )
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
            cells: [cellWithText('r0c0', 'r0c0b', 'r0c0s', '')],
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

    const point = pointInSpan('r0c0', 'r0c0b', 'r0c0s', 0)
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Engine removes the table - symmetric with backspace in an empty
      // block. This is the documented contract; intercepting would surprise
      // users.
      expect(editor.getSnapshot().context.value).toEqual([
        textBlock('r0c0b', 'r0c0s', ''),
      ])
    })
  })
})
