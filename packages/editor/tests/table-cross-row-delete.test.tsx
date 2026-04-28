import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
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

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..table',
    field: 'rows',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table.row',
    field: 'cells',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer<typeof schemaDefinition>({
    scope: '$..table.row.cell',
    field: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('table cross-row delete', () => {
  test('Selection from cell A1 to cell B2 (cross-row) and Backspace trims partials, keeps cells', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row1Key = keyGenerator()
    const cellA1Key = keyGenerator()
    const blockA1Key = keyGenerator()
    const spanA1Key = keyGenerator()
    const cellA2Key = keyGenerator()
    const blockA2Key = keyGenerator()
    const spanA2Key = keyGenerator()
    const row2Key = keyGenerator()
    const cellB1Key = keyGenerator()
    const blockB1Key = keyGenerator()
    const spanB1Key = keyGenerator()
    const cellB2Key = keyGenerator()
    const blockB2Key = keyGenerator()
    const spanB2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: row1Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cellA1Key,
                  content: [
                    {
                      _type: 'block',
                      _key: blockA1Key,
                      children: [
                        {_type: 'span', _key: spanA1Key, text: 'A1', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cellA2Key,
                  content: [
                    {
                      _type: 'block',
                      _key: blockA2Key,
                      children: [
                        {_type: 'span', _key: spanA2Key, text: 'A2', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              _key: row2Key,
              cells: [
                {
                  _type: 'cell',
                  _key: cellB1Key,
                  content: [
                    {
                      _type: 'block',
                      _key: blockB1Key,
                      children: [
                        {_type: 'span', _key: spanB1Key, text: 'B1', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: cellB2Key,
                  content: [
                    {
                      _type: 'block',
                      _key: blockB2Key,
                      children: [
                        {_type: 'span', _key: spanB2Key, text: 'B2', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={containers} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row1Key},
            'cells',
            {_key: cellA1Key},
            'content',
            {_key: blockA1Key},
            'children',
            {_key: spanA1Key},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: row2Key},
            'cells',
            {_key: cellB2Key},
            'content',
            {_key: blockB2Key},
            'children',
            {_key: spanB2Key},
          ],
          offset: 1,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: row1Key,
            cells: [
              {
                _type: 'cell',
                _key: cellA1Key,
                content: [
                  {
                    _type: 'block',
                    _key: blockA1Key,
                    children: [
                      {_type: 'span', _key: spanA1Key, text: 'A', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'cell',
                _key: cellA2Key,
                content: [
                  {
                    _type: 'block',
                    _key: 'k17',
                    children: [
                      {_type: 'span', _key: 'k18', text: '', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: row2Key,
            cells: [
              {
                _type: 'cell',
                _key: cellB1Key,
                content: [
                  {
                    _type: 'block',
                    _key: 'k19',
                    children: [
                      {_type: 'span', _key: 'k20', text: '', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'cell',
                _key: cellB2Key,
                content: [
                  {
                    _type: 'block',
                    _key: blockB2Key,
                    children: [
                      {_type: 'span', _key: spanB2Key, text: '2', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
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
