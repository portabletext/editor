import {set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {InternalEditor} from '../src/editor/create-editor'
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

  // Register container types as editable so the editor knows their child
  // fields are structural, not regular data properties.
  const slateEditor = (editor as InternalEditor)._internal.slateEditor
  slateEditor.editableTypes.add('table')
  slateEditor.editableTypes.add('row')
  slateEditor.editableTypes.add('cell')

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
      const {editor, table, initialValue} = await createTableTestEditor()

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

      // Setting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('set cells', async () => {
      const {editor, table, row, initialValue} = await createTableTestEditor()

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

      // Setting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('set marks', async () => {
      const {editor, table, row, cell, block, span, initialValue} =
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

      // Setting a deeply nested property that changes the child array field
      // is a no-op because the child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('unset rows', async () => {
      const {editor, table, initialValue} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [unset([{_key: table._key}, 'rows'])],
        snapshot: undefined,
      })

      // Unsetting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('unset cells', async () => {
      const {editor, table, row, initialValue} = await createTableTestEditor()

      editor.send({
        type: 'patches',
        patches: [
          unset([{_key: table._key}, 'rows', {_key: row._key}, 'cells']),
        ],
        snapshot: undefined,
      })

      // Unsetting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('unset content', async () => {
      const {editor, table, row, cell, initialValue} =
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
          ]),
        ],
        snapshot: undefined,
      })

      // Unsetting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('unset children', async () => {
      const {editor, table, row, cell, block, initialValue} =
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

      // Unsetting a child array field via set_node is a no-op.
      // The child field is managed by insert_node/remove_node.
      await vi.waitFor(() => {
        return expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })
  })
})
