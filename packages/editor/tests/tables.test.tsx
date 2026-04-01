import {diffMatchPatch, set, setIfMissing, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {ContainerRendererPlugin} from '../src/plugins/plugin.internal.container-renderer'
import {createTestEditor} from '../src/test/vitest'

const tableEditableTypes = ['table', 'table.row', 'table.row.cell']

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'headerRows',
          type: 'number',
        },
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
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

async function createTableTestEditor() {
  const keyGenerator = createTestKeyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const span = {
    _key: spanKey,
    _type: 'span',
    text: 'foo',
  }
  const block = {
    _key: blockKey,
    _type: 'block',
    children: [span],
  }
  const cell = {
    _key: cellKey,
    _type: 'cell',
    content: [block],
  }
  const row = {
    _key: rowKey,
    _type: 'row',
    cells: [cell],
  }
  const table = {
    _key: tableKey,
    _type: 'table',
    rows: [row],
  }

  const initialValue = [table]

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue,
    children: <ContainerRendererPlugin types={tableEditableTypes} />,
  })

  // After rendering, normalization adds marks, markDefs, style
  const normalizedSpan = {...span, marks: []}
  const normalizedBlock = {
    ...block,
    children: [normalizedSpan],
    markDefs: [],
    style: 'normal',
  }
  const normalizedCell = {...cell, content: [normalizedBlock]}
  const normalizedRow = {...row, cells: [normalizedCell]}
  const normalizedTable = {...table, rows: [normalizedRow]}

  return {
    editor,
    locator,
    table: normalizedTable,
    row: normalizedRow,
    cell: normalizedCell,
    block: normalizedBlock,
    span: normalizedSpan,
  }
}

describe('tables', () => {
  test('render', async () => {
    const {editor, table} = await createTableTestEditor()

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([table])
    })
  })

  describe('incoming patches', () => {
    test('set headerRows', async () => {
      const {editor, table} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [set(1, [{_key: table._key}, 'headerRows'])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            headerRows: 1,
          },
        ])
      })
    })

    test('set rows', async () => {
      const {editor, table} = await createTableTestEditor()

      const newRow = {
        _key: editor.getSnapshot().context.keyGenerator(),
        _type: 'row',
        cells: [
          {
            _key: editor.getSnapshot().context.keyGenerator(),
            _type: 'cell',
            content: [
              {
                _key: editor.getSnapshot().context.keyGenerator(),
                _type: 'block',
                children: [
                  {
                    _key: editor.getSnapshot().context.keyGenerator(),
                    _type: 'span',
                    text: 'bar',
                  },
                ],
              },
            ],
          },
        ],
      }

      editor.send({
        type: 'patches',
        patches: [set([newRow], [{_key: table._key}, 'rows'])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [newRow],
          },
        ])
      })
    })

    test('set cells', async () => {
      const {editor, table, row} = await createTableTestEditor()

      const newCell = {
        _key: editor.getSnapshot().context.keyGenerator(),
        _type: 'cell',
        content: [
          {
            _key: editor.getSnapshot().context.keyGenerator(),
            _type: 'block',
            children: [
              {
                _key: editor.getSnapshot().context.keyGenerator(),
                _type: 'span',
                text: 'baz',
              },
            ],
          },
        ],
      }

      editor.send({
        type: 'patches',
        patches: [
          set(
            [newCell],
            [{_key: table._key}, 'rows', {_key: row._key}, 'cells'],
          ),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [{...row, cells: [newCell]}],
          },
        ])
      })
    })

    test('set marks', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          set(
            ['strong'],
            [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'marks',
            ],
          ),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [{...span, marks: ['strong']}],
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

    test('unset rows', async () => {
      const {editor, table} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [unset([{_key: table._key}, 'rows'])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {...table, rows: undefined},
        ])
      })
    })

    test('unset cells', async () => {
      const {editor, table, row} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([{_key: table._key}, 'rows', {_key: row._key}, 'cells']),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {...table, rows: [{...row, cells: undefined}]},
        ])
      })
    })

    test('unset content', async () => {
      const {editor, table, row, cell} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {...table, rows: [{...row, cells: [{...cell, content: undefined}]}]},
        ])
      })
    })

    test('unset children', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
            {_key: block._key},
            'children',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [{...block, children: [span]}],
                  },
                ],
              },
            ],
          },
        ])
      })
    })

    test('set text on span inside container', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          set('bar', [
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
            {_key: block._key},
            'children',
            {_key: span._key},
            'text',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [{...span, text: 'bar'}],
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

    test('insert span into text block inside container', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      const newSpan = {
        _key: editor.getSnapshot().context.keyGenerator(),
        _type: 'span',
        text: 'bar',
        marks: [],
      }

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'insert' as const,
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            items: [newSpan],
            position: 'after' as const,
            origin: 'remote' as const,
          },
        ],
        snapshot: undefined,
      })

      // Adjacent spans with matching marks are merged.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [{...span, text: 'foobar'}],
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

    test('unset span from text block inside container', async () => {
      const {editor, table, row, cell, block} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
            {_key: block._key},
            'children',
            {_key: 'k4'},
          ]),
        ],
        snapshot: undefined,
      })

      // Normalization restores an empty span.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [
                          {_key: 'k7', _type: 'span', text: '', marks: []},
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

    test('diffMatchPatch on span inside container', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      const path = [
        {_key: table._key},
        'rows',
        {_key: row._key},
        'cells',
        {_key: cell._key},
        'content',
        {_key: block._key},
        'children',
        {_key: span._key},
        'text',
      ] as const

      editor.send({
        type: 'patches',
        patches: [diffMatchPatch('foo', 'foobar', [...path])],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [{...span, text: 'foobar'}],
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

    test('set style on text block inside container', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          set('h1', [
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
            {_key: block._key},
            'style',
          ]),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [span],
                        style: 'h1',
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

    test('setIfMissing on span inside container', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      // Normalization has already set marks: [] on the span, so
      // setIfMissing is a no-op
      editor.send({
        type: 'patches',
        patches: [
          setIfMissing(
            ['strong'],
            [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'marks',
            ],
          ),
        ],
        snapshot: undefined,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            rows: [
              {
                ...row,
                cells: [
                  {
                    ...cell,
                    content: [
                      {
                        ...block,
                        children: [{...span, marks: []}],
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

    test('unset style from text block inside container', async () => {
      const {editor, table, row, cell, block} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([
            {_key: table._key},
            'rows',
            {_key: row._key},
            'cells',
            {_key: cell._key},
            'content',
            {_key: block._key},
            'style',
          ]),
        ],
        snapshot: undefined,
      })

      // Normalization restores the default style.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([table])
      })
    })
  })

  describe('normalization', () => {
    test('text blocks inside containers get missing .markDefs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('text blocks inside containers get missing .style', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('spans inside containers get missing .marks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [{_key: spanKey, _type: 'span', text: 'foo'}],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('duplicate keys inside containers are fixed', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey1,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey2,
                            _type: 'span',
                            text: 'bar',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey1,
                            _type: 'span',
                            text: 'foo',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                      {
                        _key: 'k8',
                        _type: 'block',
                        children: [
                          {
                            _key: spanKey2,
                            _type: 'span',
                            text: 'bar',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('empty text blocks inside containers get a span inserted', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [],
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {_key: 'k6', _type: 'span', text: '', marks: []},
                        ],
                        markDefs: [],
                        style: 'normal',
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

    test('text blocks with missing children inside containers get restored', async () => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        markDefs: [],
                        style: 'normal',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        children: <ContainerRendererPlugin types={tableEditableTypes} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            rows: [
              {
                _key: rowKey,
                _type: 'row',
                cells: [
                  {
                    _key: cellKey,
                    _type: 'cell',
                    content: [
                      {
                        _key: blockKey,
                        _type: 'block',
                        children: [
                          {_key: 'k6', _type: 'span', text: '', marks: []},
                        ],
                        markDefs: [],
                        style: 'normal',
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
  })
})
