import {set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import type {Containers} from '../src/schema/resolve-containers'
import {withoutPatching} from '../src/slate-plugins/slate-plugin.without-patching'
import {normalize} from '../src/slate/editor/normalize'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextSlateEditor} from '../src/types/slate-editor'

const schemaDefinition = defineSchema({
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

function tableContainers(): Containers {
  return new Map([
    [
      'table',
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
    [
      'table.row',
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
    ['table.row.cell', {name: 'content', type: 'array', of: [{type: 'block'}]}],
  ])
}

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
  })

  return {
    editor,
    locator,
    table,
    row,
    cell,
    block,
    span,
    initialValue,
  }
}

function getTableCellContent(value: Array<unknown>) {
  const table = value.at(0) as Record<string, unknown>
  const rows = table['rows'] as Array<Record<string, unknown>>
  const cells = rows.at(0)!['cells'] as Array<Record<string, unknown>>
  return cells.at(0)!['content'] as Array<Record<string, unknown>>
}

describe('tables', () => {
  test('render', async () => {
    const {editor, initialValue} = await createTableTestEditor()

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual(initialValue)
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
                        children: [
                          {
                            ...span,
                            marks: ['strong'],
                          },
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
                cells: [{...cell, content: [{...block, children: undefined}]}],
              },
            ],
          },
        ])
      })
    })
  })

  describe('normalization', () => {
    test('text blocks inside containers get missing .markDefs', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const table = {
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
                    // Missing markDefs!
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
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      // Set containers so normalization traverses into containers
      slateEditorRef.current!.containers = tableContainers()

      // Force normalization with containers set
      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getTableCellContent(value).at(0)!
        expect(block['markDefs']).toEqual([])
      })
    })

    test('text blocks inside containers get missing .style', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const table = {
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
                    // Missing style!
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
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.containers = tableContainers()

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getTableCellContent(value).at(0)!
        expect(block['style']).toBe('normal')
      })
    })

    test('spans inside containers get missing .marks', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const table = {
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
                        // Missing marks!
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
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.containers = tableContainers()

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getTableCellContent(value).at(0)!
        const span = (block['children'] as Array<Record<string, unknown>>).at(
          0,
        )!
        expect(span['marks']).toEqual([])
      })
    })

    test('duplicate keys inside containers are fixed', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator() // Same key for both blocks!
      const spanKey1 = keyGenerator()
      const spanKey2 = keyGenerator()

      const table = {
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
                    _key: blockKey, // Duplicate!
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
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.containers = tableContainers()

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const blocks = getTableCellContent(value)
        expect(blocks).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [{_key: spanKey1, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: 'k8',
            _type: 'block',
            children: [{_key: spanKey2, _type: 'span', text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('empty text blocks inside containers get a span inserted', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()

      const table = {
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
                    // Empty children!
                    children: [],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.containers = tableContainers()

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getTableCellContent(value).at(0)!
        const children = block['children'] as Array<Record<string, unknown>>
        expect(children).toEqual([
          {_key: 'k6', _type: 'span', text: '', marks: []},
        ])
      })
    })

    test('text blocks with missing children inside containers get restored', async () => {
      const keyGenerator = createTestKeyGenerator()
      const slateEditorRef = React.createRef<PortableTextSlateEditor>()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()

      const table = {
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
                    // No children property at all!
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      }

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [table],
        children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
      })

      slateEditorRef.current!.containers = tableContainers()

      withoutPatching(slateEditorRef.current!, () => {
        normalize(slateEditorRef.current!, {force: true})
      })
      slateEditorRef.current!.onChange()

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const block = getTableCellContent(value).at(0)!
        const children = block['children'] as Array<Record<string, unknown>>
        expect(children).toEqual([
          {_key: 'k6', _type: 'span', text: '', marks: []},
        ])
      })
    })
  })
})
