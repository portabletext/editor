import {defineContainer, defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineTable} from './define-table'
import {Table, TableCell, TableRow} from './ui/table-render'

// A definition with every configurable name renamed: type names as a
// migration from a foreign table plugin would have them, the cell content
// array as `content` instead of `value`. The reference components render
// under the renamed types, pinning that they resolve the governing
// configuration from the node instead of assuming the canonical names.
const richTable = defineTable({
  containers: {
    table: defineContainer({
      type: 'richTable',
      arrayField: 'tableRows',
      render: (props) => <Table {...props} />,
    }),
    row: defineContainer({
      type: 'tableRow',
      arrayField: 'rowCells',
      render: (props) => <TableRow {...props} />,
    }),
    cell: defineContainer({
      type: 'tableCell',
      arrayField: 'content',
      render: (props) => <TableCell {...props} />,
    }),
  },
})

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'richTable',
      fields: [
        {name: 'headerRows', type: 'number'},
        {
          name: 'tableRows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'tableRow',
              fields: [
                {
                  name: 'rowCells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'tableCell',
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

function block(key: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}s`, text, marks: []}],
  }
}

function cell(key: string, text: string) {
  return {_type: 'tableCell', _key: key, content: [block(`${key}b`, text)]}
}

const initialValue = [
  {
    _type: 'richTable',
    _key: 't0',
    tableRows: [
      {
        _type: 'tableRow',
        _key: 'r0',
        rowCells: [cell('c00', 'one'), cell('c01', 'two')],
      },
      {
        _type: 'tableRow',
        _key: 'r1',
        rowCells: [cell('c10', 'three'), cell('c11', 'four')],
      },
    ],
  },
]

function spanPath(cellKey: string) {
  const rowKey = cellKey === 'c00' || cellKey === 'c01' ? 'r0' : 'r1'
  return [
    {_key: 't0'},
    'tableRows',
    {_key: rowKey},
    'rowCells',
    {_key: cellKey},
    'content',
    {_key: `${cellKey}b`},
    'children',
    {_key: `${cellKey}bs`},
  ]
}

async function createRenamedTableEditor() {
  const testEditor = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue,
    children: <richTable.Plugin />,
  })
  return testEditor
}

describe('Feature: `defineTable` with renamed containers', () => {
  test('Scenario: the reference UI renders under the renamed types', async () => {
    const {locator} = await createRenamedTableEditor()

    await vi.waitFor(() => {
      const tableElement = locator
        .element()
        .querySelector('table.pt-plugin-table')
      expect(tableElement).not.toBeNull()
      expect(tableElement?.querySelectorAll('tr')).toHaveLength(2)
      expect(tableElement?.querySelectorAll('td')).toHaveLength(4)
      expect(tableElement?.textContent).toContain('one')
    })
  })

  test('Scenario: `Tab` navigates between renamed cells', async () => {
    const {editor} = await createRenamedTableEditor()

    editor.send({type: 'focus'})
    const point = {path: spanPath('c00'), offset: 1}
    editor.send({type: 'select', at: {anchor: point, focus: point}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(point)
    })

    await userEvent.keyboard('{Tab}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.path).toEqual(
        spanPath('c01'),
      )
    })
  })

  test('Scenario: `custom.insert.row` mints renamed types and fields', async () => {
    const {editor} = await createRenamedTableEditor()

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'tableRows', {_key: 'r1'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'richTable',
          _key: 't0',
          tableRows: [
            {
              _type: 'tableRow',
              _key: 'r0',
              rowCells: [cell('c00', 'one'), cell('c01', 'two')],
            },
            {
              _type: 'tableRow',
              _key: 'r1',
              rowCells: [cell('c10', 'three'), cell('c11', 'four')],
            },
            {
              _type: 'tableRow',
              _key: 'k4',
              rowCells: [
                {
                  _type: 'tableCell',
                  _key: 'k2',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k7',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k8', text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'tableCell',
                  _key: 'k3',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k5',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k6', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: `getTableSelection` and the guards resolve the renamed shape', async () => {
    const {editor} = await createRenamedTableEditor()

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath('c00'), offset: 0},
        focus: {path: spanPath('c11'), offset: 4},
      },
    })

    await vi.waitFor(() => {
      expect(richTable.getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 't0'}],
        rowRange: [0, 1],
        colRange: [0, 1],
      })
    })

    const tableNode = editor.getSnapshot().context.value?.[0]
    if (tableNode === undefined) {
      throw new Error('missing table node')
    }
    expect(richTable.isTable(tableNode)).toBe(true)
    expect(richTable.isRow(tableNode)).toBe(false)
    expect(richTable.isCell(tableNode)).toBe(false)
  })

  test('Scenario: `createBlock` mints an insertable table with renamed types and fields', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      children: <richTable.Plugin />,
    })

    editor.send({
      type: 'insert.block',
      block: richTable.createBlock({rows: 2, columns: 2, headerRows: 1}),
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'richTable',
          _key: 'k16',
          headerRows: 1,
          tableRows: [
            {
              _type: 'tableRow',
              _key: 'k8',
              rowCells: [
                {
                  _type: 'tableCell',
                  _key: 'k4',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'tableCell',
                  _key: 'k7',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k5',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k6', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: 'tableRow',
              _key: 'k15',
              rowCells: [
                {
                  _type: 'tableCell',
                  _key: 'k11',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k9',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k10', text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'tableCell',
                  _key: 'k14',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k12',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k13', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: two definitions coexist and behaviors act only on their own tables', async () => {
    const canonicalTable = defineTable()
    const coexistenceSchema = defineSchema({
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
        {
          name: 'richTable',
          fields: [
            {
              name: 'tableRows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'tableRow',
                  fields: [
                    {
                      name: 'rowCells',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          name: 'tableCell',
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
    const canonicalValue = {
      _type: 'table',
      _key: 'ct0',
      rows: [
        {
          _type: 'row',
          _key: 'cr0',
          cells: [
            {
              _type: 'cell',
              _key: 'cc0',
              value: [
                {
                  _type: 'block',
                  _key: 'cb0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'cs0', text: 'plain', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const renamedValue = {
      _type: 'richTable',
      _key: 't0',
      tableRows: [
        {
          _type: 'tableRow',
          _key: 'r0',
          rowCells: [cell('c00', 'one')],
        },
      ],
    }
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: coexistenceSchema,
      initialValue: [canonicalValue, renamedValue],
      children: (
        <>
          <canonicalTable.Plugin />
          <richTable.Plugin />
        </>
      ),
    })

    // Both definitions' behavior sets receive the global event; only the
    // one whose config resolves the addressed row may act.
    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 'ct0'}, 'rows', {_key: 'cr0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          ...canonicalValue,
          rows: [
            canonicalValue.rows[0],
            {
              _type: 'row',
              _key: 'k3',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k2',
                  value: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k5', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        renamedValue,
      ])
    })

    editor.send({
      type: 'custom.insert.row',
      at: [{_key: 't0'}, 'tableRows', {_key: 'r0'}],
      position: 'after',
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value?.[1]).toEqual({
        ...renamedValue,
        tableRows: [
          renamedValue.tableRows[0],
          {
            _type: 'tableRow',
            _key: 'k7',
            rowCells: [
              {
                _type: 'tableCell',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k8',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k9', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
      // The canonical table is untouched by the renamed definition's insert.
      expect(value?.[0]).toEqual({
        ...canonicalValue,
        rows: [
          canonicalValue.rows[0],
          {
            _type: 'row',
            _key: 'k3',
            cells: [
              {
                _type: 'cell',
                _key: 'k2',
                value: [
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    })

    // A rectangle spanning the canonical table's two cells is visible to
    // the canonical definition's selector and invisible to the renamed one.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'ct0'},
            'rows',
            {_key: 'cr0'},
            'cells',
            {_key: 'cc0'},
            'value',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'ct0'},
            'rows',
            {_key: 'k3'},
            'cells',
            {_key: 'k2'},
            'value',
            {_key: 'k4'},
            'children',
            {_key: 'k5'},
          ],
          offset: 0,
        },
      },
    })
    await vi.waitFor(() => {
      expect(canonicalTable.getTableSelection(editor.getSnapshot())).toEqual({
        tablePath: [{_key: 'ct0'}],
        rowRange: [0, 1],
        colRange: [0, 0],
      })
    })
    expect(richTable.getTableSelection(editor.getSnapshot())).toBeUndefined()
  })

  test('Scenario: an `of` on the table or row definition warns and is ignored', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    defineTable({
      containers: {
        table: defineContainer({
          type: 'oftable',
          arrayField: 'rows',
          of: [defineContainer({type: 'stray', arrayField: 'things'})],
        }),
      },
    })

    expect(warnSpy.mock.calls).toEqual([
      [
        "[@portabletext/plugin-table] The table definition ('oftable') declares an `of`, which `defineTable` owns: the nesting is grafted as table.of → row.of → cell. The declared `of` is ignored. Cell-scoped node definitions belong on the cell definition's `of`.",
      ],
    ])
    warnSpy.mockRestore()
  })
})
