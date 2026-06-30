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
          name: 'headerRows',
          type: 'number',
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
  ],
})

const block = {
  _type: 'block',
  _key: 'b0',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 's0', text: '', marks: []}],
}
const cell = {_type: 'cell', _key: 'c0', value: [block]}
const row = {_type: 'row', _key: 'r0', cells: [cell]}

describe('TableRender', () => {
  test('emits data-pt-plugin-table-header-rows when node.headerRows is set', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [{_type: 'table', _key: 't0', headerRows: 1, rows: [row]}],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.getAttribute('data-pt-plugin-table-header-rows')).toBe('1')
  })

  test('omits data-pt-plugin-table-header-rows when node.headerRows is 0', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [{_type: 'table', _key: 't0', headerRows: 0, rows: [row]}],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.hasAttribute('data-pt-plugin-table-header-rows')).toBe(false)
  })

  test('omits data-pt-plugin-table-header-rows when node.headerRows is undefined', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [{_type: 'table', _key: 't0', rows: [row]}],
      children: <TablePlugin />,
    })
    const table = document.querySelector('table')
    expect(table?.hasAttribute('data-pt-plugin-table-header-rows')).toBe(false)
  })
})
