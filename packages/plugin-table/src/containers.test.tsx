import {defineSchema} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {TablePlugin} from './plugin.table'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'headerRow',
          type: 'boolean',
        },
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

const block = {
  _type: 'block',
  _key: 'b0',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 's0', text: '', marks: []}],
}
const cell = {_type: 'cell', _key: 'c0', content: [block]}
const row = {_type: 'row', _key: 'r0', cells: [cell]}

describe('TableRender', () => {
  test('emits data-pt-plugin-table-header-row when node.headerRow is true', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {_type: 'table', _key: 't0', headerRow: true, rows: [row]},
      ],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.getAttribute('data-pt-plugin-table-header-row')).toBe('true')
  })

  test('omits data-pt-plugin-table-header-row when node.headerRow is false', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {_type: 'table', _key: 't0', headerRow: false, rows: [row]},
      ],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.hasAttribute('data-pt-plugin-table-header-row')).toBe(false)
  })

  test('omits data-pt-plugin-table-header-row when node.headerRow is undefined', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [{_type: 'table', _key: 't0', rows: [row]}],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.hasAttribute('data-pt-plugin-table-header-row')).toBe(false)
  })
})
