import {defineSchema, type PortableTextBlock} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {TablePlugin} from './plugin.table'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {name: 'alignment', type: 'array'},
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

function cell(key: string) {
  return {
    _type: 'cell',
    _key: key,
    value: [
      {
        _type: 'block',
        _key: `${key}-b`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `${key}-s`, text: '', marks: []}],
      },
    ],
  }
}

// 2x2 table with per-column alignment ['left', 'right'].
function tableValue(
  alignment?: Array<'left' | 'center' | 'right' | null>,
): Array<PortableTextBlock> {
  return [
    {
      _type: 'table',
      _key: 't0',
      ...(alignment ? {alignment} : {}),
      rows: [
        {_type: 'row', _key: 'r0', cells: [cell('c00'), cell('c01')]},
        {_type: 'row', _key: 'r1', cells: [cell('c10'), cell('c11')]},
      ],
    },
  ]
}

const cellAt = (column: 0 | 1) => [
  {_key: 't0'},
  'rows',
  {_key: 'r0'},
  'cells',
  {_key: column === 0 ? 'c00' : 'c01'},
]

function readAlignment(value: Array<PortableTextBlock>): unknown {
  return (value[0] as {alignment?: unknown}).alignment
}

describe('column alignment is preserved through structural edits', () => {
  test('insert.column after splices a null into the alignment array', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableValue(['left', 'right']),
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: cellAt(0),
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(readAlignment(editor.getSnapshot().context.value)).toEqual([
        'left',
        null,
        'right',
      ])
    })
  })

  test('insert.column before splices a null at the new column index', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableValue(['left', 'right']),
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: cellAt(0),
      position: 'before',
    })

    await vi.waitFor(() => {
      expect(readAlignment(editor.getSnapshot().context.value)).toEqual([
        null,
        'left',
        'right',
      ])
    })
  })

  test('unset.column removes the deleted column from the alignment array', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableValue(['left', 'right']),
      children: <TablePlugin />,
    })

    editor.send({type: 'custom.unset.column', at: cellAt(0)})

    await vi.waitFor(() => {
      expect(readAlignment(editor.getSnapshot().context.value)).toEqual([
        'right',
      ])
    })
  })

  test('move.column reorders the alignment array with the columns', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableValue(['left', 'right']),
      children: <TablePlugin />,
    })

    editor.send({type: 'custom.move.column', at: cellAt(0), to: cellAt(1)})

    await vi.waitFor(() => {
      expect(readAlignment(editor.getSnapshot().context.value)).toEqual([
        'right',
        'left',
      ])
    })
  })

  test('a table without alignment stays without it after a column edit', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: tableValue(),
      children: <TablePlugin />,
    })

    editor.send({
      type: 'custom.insert.column',
      at: cellAt(0),
      position: 'after',
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      // The new column landed (3 cells per row), and no alignment was invented.
      const table = value[0] as unknown as {
        rows: Array<{cells: unknown[]}>
      }
      expect(table.rows[0]?.cells).toHaveLength(3)
      expect(readAlignment(value)).toBeUndefined()
    })
  })
})
