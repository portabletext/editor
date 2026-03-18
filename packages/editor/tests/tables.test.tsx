import {set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {RendererPlugin} from '../src/plugins'
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

async function createTableTestEditor(options?: {renderers?: Array<Renderer>}) {
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
    children: options?.renderers ? (
      <RendererPlugin renderers={options.renderers} />
    ) : undefined,
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

  describe('rendering', () => {
    test('table data-path', async () => {
      const {locator, table} = await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(`[data-path="${table._key}"]`)
        expect(el).not.toBeNull()
      })
    })

    test('row data-path', async () => {
      const {locator, table, row} = await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(`[data-path="${table._key}.rows.${row._key}"]`)
        expect(el).not.toBeNull()
      })
    })

    test('cell data-path', async () => {
      const {locator, table, row, cell} = await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(
            `[data-path="${table._key}.rows.${row._key}.cells.${cell._key}"]`,
          )
        expect(el).not.toBeNull()
      })
    })

    test('block inside cell data-path', async () => {
      const {locator, table, row, cell, block} = await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(
            `[data-path="${table._key}.rows.${row._key}.cells.${cell._key}.content.${block._key}"]`,
          )
        expect(el).not.toBeNull()
      })
    })

    test('span inside cell data-path', async () => {
      const {locator, table, row, cell, block, span} =
        await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(
            `[data-path="${table._key}.rows.${row._key}.cells.${cell._key}.content.${block._key}.children.${span._key}"]`,
          )
        expect(el).not.toBeNull()
      })
    })

    test('registered renderers produce correct DOM', async () => {
      const renderers: Array<Renderer> = [
        {
          type: 'blockObject',
          name: 'table',
          render: ({attributes, children}) => (
            <table {...attributes}>
              <tbody>{children}</tbody>
            </table>
          ),
        },
        {
          type: 'blockObject',
          name: 'table.row',
          render: ({attributes, children}) => (
            <tr {...attributes}>{children}</tr>
          ),
        },
        {
          type: 'blockObject',
          name: 'table.row.cell',
          render: ({attributes, children}) => (
            <td {...attributes}>{children}</td>
          ),
        },
      ]

      const {locator} = await createTableTestEditor({renderers})

      await vi.waitFor(() => {
        const table = locator.element().querySelector('table')
        expect(table).not.toBeNull()

        const tr = table!.querySelector('tr')
        expect(tr).not.toBeNull()

        const td = tr!.querySelector('td')
        expect(td).not.toBeNull()

        expect(td!.textContent).toContain('foo')
      })
    })

    test('container is not void', async () => {
      const {locator, table} = await createTableTestEditor()

      await vi.waitFor(() => {
        const el = locator
          .element()
          .querySelector(`[data-path="${table._key}"]`)
        expect(el).not.toBeNull()
        expect(el!.hasAttribute('data-slate-void')).toBe(false)
      })
    })

    test('text content is rendered inside cell', async () => {
      const {locator} = await createTableTestEditor()

      await vi.waitFor(() => {
        expect(locator.element().textContent).toContain('foo')
      })
    })
  })
})
