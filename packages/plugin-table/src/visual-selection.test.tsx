import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
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

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [
          textCell('r0c0', 'r0c0b', 'r0c0s', 'AA'),
          textCell('r0c1', 'r0c1b', 'r0c1s', 'BB'),
        ],
      },
      {
        _type: 'row',
        _key: 'r1',
        cells: [
          textCell('r1c0', 'r1c0b', 'r1c0s', 'CC'),
          textCell('r1c1', 'r1c1b', 'r1c1s', 'DD'),
        ],
      },
    ],
  },
]

function textCell(
  cellKey: string,
  blockKey: string,
  spanKey: string,
  text: string,
) {
  return {
    _type: 'cell' as const,
    _key: cellKey,
    value: [
      {
        _type: 'block' as const,
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span' as const, _key: spanKey, text, marks: []}],
      },
    ],
  }
}

function point(
  rowKey: string,
  cellKey: string,
  blockKey: string,
  spanKey: string,
  offset: number,
) {
  return {
    path: [
      {_key: 't0'},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'value',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ],
    offset,
  }
}

function cellEdges(cellKey: string) {
  const td = document.querySelector(
    `td[data-pt-path*='cells[_key=="${cellKey}"]']`,
  )
  if (!td) {
    return null
  }
  return {
    top: td.hasAttribute('data-pt-plugin-table-selected-edge-top'),
    right: td.hasAttribute('data-pt-plugin-table-selected-edge-right'),
    bottom: td.hasAttribute('data-pt-plugin-table-selected-edge-bottom'),
    left: td.hasAttribute('data-pt-plugin-table-selected-edge-left'),
  }
}

describe('visual selection chrome (default Cell render)', () => {
  test('1x2 horizontal selection: r0c0 has top+bottom+left, r0c1 has top+bottom+right', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: point('r0', 'r0c0', 'r0c0b', 'r0c0s', 0),
        focus: point('r0', 'r0c1', 'r0c1b', 'r0c1s', 2),
      },
    })

    await vi.waitFor(() => {
      expect(cellEdges('r0c0')).toEqual({
        top: true,
        right: false,
        bottom: true,
        left: true,
      })
      expect(cellEdges('r0c1')).toEqual({
        top: true,
        right: true,
        bottom: true,
        left: false,
      })
      // Cells outside the selection have no edges.
      expect(cellEdges('r1c0')).toEqual({
        top: false,
        right: false,
        bottom: false,
        left: false,
      })
      expect(cellEdges('r1c1')).toEqual({
        top: false,
        right: false,
        bottom: false,
        left: false,
      })
    })
  })

  test('2x2 selection: outer cells get outer edges, no interior edges leak', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: point('r0', 'r0c0', 'r0c0b', 'r0c0s', 0),
        focus: point('r1', 'r1c1', 'r1c1b', 'r1c1s', 2),
      },
    })

    await vi.waitFor(() => {
      expect(cellEdges('r0c0')).toEqual({
        top: true,
        right: false,
        bottom: false,
        left: true,
      })
      expect(cellEdges('r0c1')).toEqual({
        top: true,
        right: true,
        bottom: false,
        left: false,
      })
      expect(cellEdges('r1c0')).toEqual({
        top: false,
        right: false,
        bottom: true,
        left: true,
      })
      expect(cellEdges('r1c1')).toEqual({
        top: false,
        right: true,
        bottom: true,
        left: false,
      })
    })
  })

  test('collapsed selection inside a single cell: no cells get any edge', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <TablePlugin />,
    })

    const p = point('r0', 'r0c0', 'r0c0b', 'r0c0s', 1)
    editor.send({type: 'select', at: {anchor: p, focus: p}})

    await vi.waitFor(() => {
      for (const key of ['r0c0', 'r0c1', 'r1c0', 'r1c1']) {
        expect(cellEdges(key)).toEqual({
          top: false,
          right: false,
          bottom: false,
          left: false,
        })
      }
    })
  })
})
