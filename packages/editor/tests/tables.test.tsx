import {set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import type {Renderer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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

async function createTableTestEditor(options?: {children?: React.ReactNode}) {
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
    children: options?.children,
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

  describe('container rendering', () => {
    const tableRenderer: Renderer = {
      type: 'blockObject',
      name: 'table',
      render: ({attributes, children}) => (
        <div {...attributes} data-testid="table">
          {children}
        </div>
      ),
    }

    const rowRenderer: Renderer = {
      type: 'blockObject',
      name: 'table.row',
      render: ({attributes, children}) => (
        <div {...attributes} data-testid="row">
          {children}
        </div>
      ),
    }

    const cellRenderer: Renderer = {
      type: 'blockObject',
      name: 'table.row.cell',
      render: ({attributes, children}) => (
        <div {...attributes} data-testid="cell">
          {children}
        </div>
      ),
    }

    const renderers = [tableRenderer, rowRenderer, cellRenderer]

    test('renders table with registered renderers', async () => {
      const {editor, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const tableElement = page.getByTestId('table')
      await vi.waitFor(() => {
        return expect.element(tableElement).toBeInTheDocument()
      })
    })

    test('renders rows inside table', async () => {
      const {editor, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const rowElement = page.getByTestId('row')
      await vi.waitFor(() => {
        return expect.element(rowElement).toBeInTheDocument()
      })
    })

    test('renders cells inside rows', async () => {
      const {editor, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const cellElement = page.getByTestId('cell')
      await vi.waitFor(() => {
        return expect.element(cellElement).toBeInTheDocument()
      })
    })

    test('renders text content inside cells', async () => {
      const {editor, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const cellElement = page.getByTestId('cell')
      await vi.waitFor(() => {
        return expect.element(cellElement).toHaveTextContent('foo')
      })
    })

    test('table has correct data-pt-path', async () => {
      const {editor, table, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const tableElement = page.getByTestId('table')
      await vi.waitFor(() => {
        return expect
          .element(tableElement)
          .toHaveAttribute('data-pt-path', `[_key=="${table._key}"]`)
      })
    })

    test('row has correct data-pt-path', async () => {
      const {editor, table, row, initialValue} = await createTableTestEditor({
        children: <RendererPlugin renderers={renderers} />,
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const rowElement = page.getByTestId('row')
      await vi.waitFor(() => {
        return expect
          .element(rowElement)
          .toHaveAttribute(
            'data-pt-path',
            `[_key=="${table._key}"].rows[_key=="${row._key}"]`,
          )
      })
    })

    test('cell has correct data-pt-path', async () => {
      const {editor, table, row, cell, initialValue} =
        await createTableTestEditor({
          children: <RendererPlugin renderers={renderers} />,
        })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      const cellElement = page.getByTestId('cell')
      await vi.waitFor(() => {
        return expect
          .element(cellElement)
          .toHaveAttribute(
            'data-pt-path',
            `[_key=="${table._key}"].rows[_key=="${row._key}"].cells[_key=="${cell._key}"]`,
          )
      })
    })

    test('without renderer, table renders as void block object', async () => {
      const {editor, initialValue} = await createTableTestEditor()

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })

      // Without a renderer, there should be no table testid
      const tableElements = page.getByTestId('table')
      await expect.element(tableElements).not.toBeInTheDocument()
    })
  })
})
