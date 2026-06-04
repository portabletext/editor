import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.unset', () => {
  test('Scenario: unset a property on a block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}],
        lists: [{name: 'bullet'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({type: 'unset', at: [{_key: 'b0'}, 'level']})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: unset removes a node from an array', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'foo', marks: []},
            {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b0'}, 'children', {_key: 's1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: undo an unset of a property on a block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}],
        lists: [{name: 'bullet'}],
      }),
      initialValue,
    })

    editor.send({type: 'unset', at: [{_key: 'b0'}, 'level']})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo an unset that removes a node from an array', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [
          {_key: 's0', _type: 'span', text: 'foo', marks: []},
          {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue,
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b0'}, 'children', {_key: 's1'}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo an unset of a nested property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [
          {
            _key: 's0',
            _type: 'span',
            text: 'foo',
            marks: ['m0'],
          },
        ],
        markDefs: [{_key: 'm0', _type: 'link', href: 'https://example.com'}],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue,
    })

    editor.send({
      type: 'unset',
      at: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}, 'href'],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: ['m0']}],
          markDefs: [{_key: 'm0', _type: 'link'}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test("Scenario: undo an unset of a container's children array clears + restores", async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {
            _key: 'r0',
            _type: 'row',
            cells: [
              {
                _key: 'c0',
                _type: 'cell',
                content: [
                  {
                    _key: 'b0',
                    _type: 'block',
                    style: 'normal',
                    children: [
                      {_key: 's0', _type: 'span', text: 'foo', marks: []},
                    ],
                    markDefs: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
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
      }),
      initialValue,
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c0'},
        'content',
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 't0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'c0',
                  _type: 'cell',
                },
              ],
            },
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test("Scenario: undo an unset of a container's children array works with containers registered", async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {
            _key: 'r0',
            _type: 'row',
            cells: [
              {
                _key: 'c0',
                _type: 'cell',
                content: [
                  {
                    _key: 'b0',
                    _type: 'block',
                    style: 'normal',
                    children: [
                      {_key: 's0', _type: 'span', text: 'foo', marks: []},
                    ],
                    markDefs: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const tableContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({children}) => <>{children}</>,
      of: [
        defineContainer({
          type: 'row',
          arrayField: 'cells',
          render: ({children}) => <>{children}</>,
          of: [
            defineContainer({
              type: 'cell',
              arrayField: 'content',
              render: ({children}) => <>{children}</>,
            }),
          ],
        }),
      ],
    })
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
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
      }),
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    editor.send({
      type: 'unset',
      at: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c0'},
        'content',
      ],
    })

    // Normalization repopulates the cell with a single empty text block.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 't0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'c0',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k2',
                      _type: 'block',
                      style: 'normal',
                      children: [
                        {_key: 'k3', _type: 'span', text: '', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo an unset at the root level', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'unset', at: []})

    // Normalization re-emits an empty block after the root unset. Wait for the
    // event chain to settle before triggering undo.
    await new Promise((resolve) => setTimeout(resolve, 200))

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })
})
