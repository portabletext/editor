import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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

// The <colgroup> renders no text and no leaves: a DOM point normalized into
// it can resolve to nothing.
const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children}) => (
    <table data-testid="table" {...attributes}>
      <colgroup>
        <col />
        <col />
      </colgroup>
      <tbody>{children}</tbody>
    </table>
  ),
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: ({attributes, children}) => (
            <td {...attributes}>{children}</td>
          ),
        }),
      ],
    }),
  ],
})

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {
        _type: 'row',
        _key: 'r0',
        cells: [
          {
            _type: 'cell',
            _key: 'c0',
            value: [
              {
                _type: 'block',
                _key: 'b0',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 's0', text: 'A', marks: []}],
              },
            ],
          },
          {
            _type: 'cell',
            _key: 'c1',
            value: [
              {
                _type: 'block',
                _key: 'b1',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 's1', text: 'B', marks: []}],
              },
            ],
          },
        ],
      },
    ],
  },
]

function cellSpanPath(cellKey: string, blockKey: string, spanKey: string) {
  return [
    {_key: 't0'},
    'rows',
    {_key: 'r0'},
    'cells',
    {_key: cellKey},
    'value',
    {_key: blockKey},
    'children',
    {_key: spanKey},
  ]
}

describe('selection sync across leafless subtrees', () => {
  test('an element-level range over the table maps to a full-table selection', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })
    await userEvent.click(locator)

    // The range a triple-click produces: element-level endpoints spanning the
    // whole <table>, offset 0 sits before the <colgroup>.
    const table = locator.element().querySelector('[data-testid="table"]')
    expect(table).not.toBeNull()
    window
      .getSelection()
      ?.setBaseAndExtent(table!, 0, table!, table!.childNodes.length)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: cellSpanPath('c0', 'b0', 's0'), offset: 0},
        focus: {path: cellSpanPath('c1', 'b1', 's1'), offset: 1},
        backward: false,
      })
    })
  })

  test('a collapsed element-level point before the colgroup maps to the first cell', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })
    await userEvent.click(locator)

    const table = locator.element().querySelector('[data-testid="table"]')
    expect(table).not.toBeNull()
    window.getSelection()?.setBaseAndExtent(table!, 0, table!, 0)

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: cellSpanPath('c0', 'b0', 's0'), offset: 0},
        focus: {path: cellSpanPath('c0', 'b0', 's0'), offset: 0},
        backward: false,
      })
    })
  })
})
