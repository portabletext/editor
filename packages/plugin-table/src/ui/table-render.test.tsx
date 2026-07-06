import {defineContainer, defineSchema} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {TableCell, TableContainer, TableRow} from './table-render'

const schemaDefinition = defineSchema({
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

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: (props) => <TableContainer {...props} />,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: (props) => <TableRow {...props} />,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: (props) => <TableCell {...props} />,
        }),
      ],
    }),
  ],
})

function cell(key: string, text: string) {
  return {
    _type: 'cell',
    _key: key,
    value: [
      {
        _type: 'block',
        _key: `b-${key}`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `s-${key}`, text, marks: []}],
      },
    ],
  }
}

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'A'), cell('c01', 'B')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'C'), cell('c11', 'D')]},
    ],
  },
]

describe('Feature: Read-Only Table Chrome', () => {
  test('Scenario: A read-only editor renders the table without mutation affordances', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    // Editable editors carry the full chrome: the menu trigger plus the
    // handles, lanes, and insert affordances.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(1)
      expect(
        document.querySelectorAll('button[aria-label="Insert here"]').length,
      ).toBe(2)
    })

    editor.send({type: 'update readOnly', readOnly: true})

    // The mutation affordances go; the table content stays selectable.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(0)
      expect(
        document.querySelectorAll('.pt-plugin-table-chrome button').length,
      ).toBe(0)
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        4,
      )
    })

    editor.send({type: 'update readOnly', readOnly: false})

    // Editability restores the chrome.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(1)
    })
  })
})
