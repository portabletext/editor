import {set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
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

  describe('set behavior event', () => {
    test('set on block object at root level', async () => {
      const {editor, table} = await createTableTestEditor()

      editor.send({
        type: 'set',
        at: [{_key: table._key}],
        value: {headerRows: 2},
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            headerRows: 2,
          },
        ])
      })
    })

    test('set on deeply nested span via child path', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'set',
        at: [
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
        value: {marks: ['strong']},
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

    test('set text on deeply nested span', async () => {
      const {editor, table, row, cell, block, span} =
        await createTableTestEditor()

      editor.send({
        type: 'set',
        at: [
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
        value: {text: 'bar'},
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
                            text: 'bar',
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

    test('block.set delegates to set', async () => {
      const {editor, table} = await createTableTestEditor()

      editor.send({
        type: 'block.set',
        at: [{_key: table._key}],
        props: {headerRows: 3},
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            headerRows: 3,
          },
        ])
      })
    })

    test('undo reverses set', async () => {
      const {editor, table, initialValue} = await createTableTestEditor()

      editor.send({
        type: 'set',
        at: [{_key: table._key}],
        value: {headerRows: 1},
      })

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            ...table,
            headerRows: 1,
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })
  })
})
