import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
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

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test.each([
    {
      name: 'a keyed path',
      at: (barBlockKey: string) => [{_key: barBlockKey}],
    },
    {name: 'an index path', at: () => [1]},
  ])(
    'Scenario: unset by $name of the block holding the caret moves the caret to the nearest span',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
            offset: 1,
          },
          backward: false,
        })
      })

      editor.send({type: 'unset', at: at(barBlockKey)})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 3,
          },
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'unset',
            path: [{_key: barBlockKey}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, spanKey: string) => [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ],
    },
    {name: 'an index path', at: () => [0, 'children', 0, 'text']},
  ])(
    "Scenario: unset of a span's text by $name moves a caret in the span to its start",
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          backward: false,
        })
      })

      editor.send({type: 'unset', at: at(blockKey, spanKey)})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'unset',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            origin: 'local',
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: '',
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string) => [{_key: blockKey}, 'items', 0],
    },
    {name: 'an index path', at: () => [0, 'items', 0]},
  ])(
    'Scenario: unset by $name of an item in an object array field',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooItemKey = keyGenerator()
      const barItemKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'list',
            items: [
              {_key: fooItemKey, _type: 'item', title: 'foo'},
              {_key: barItemKey, _type: 'item', title: 'bar'},
            ],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({type: 'unset', at: at(blockKey)})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'list',
            items: [{_key: barItemKey, _type: 'item', title: 'bar'}],
          },
        ])
        expect(patches).toEqual([
          {
            type: 'unset',
            path: [{_key: blockKey}, 'items', {_key: fooItemKey}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (lastKey: string) => [{_key: lastKey}, 'alt'],
    },
    {name: 'a negative index path', at: () => [-1, 'alt']},
  ])(
    'Scenario: unset by $name of a property on the last block object',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const firstKey = keyGenerator()
      const lastKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        initialValue: [
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image', alt: 'bar'},
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({type: 'unset', at: at(lastKey)})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image'},
        ])
        expect(patches).toEqual([
          {
            type: 'unset',
            path: [{_key: lastKey}, 'alt'],
            origin: 'local',
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image', alt: 'bar'},
        ])
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image'},
        ])
      })
    },
  )

  test('Scenario: unset by an out-of-range negative index path keeps redo', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [{_key: blockKey, _type: 'image', alt: 'foo'}],
    })

    editor.send({type: 'set', at: [{_key: blockKey}, 'title'], value: 'bar'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'image', alt: 'foo', title: 'bar'},
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'image', alt: 'foo'},
      ])
    })

    editor.send({type: 'unset', at: [-2, 'alt']})
    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'image', alt: 'foo', title: 'bar'},
      ])
    })
  })

  test('Scenario: unset with a block index below the first block leaves the caret and content alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        backward: false,
      })
    })

    editor.send({type: 'unset', at: [-2]})
    editor.send({type: 'set', at: [{_key: blockKey}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          style: 'h1',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        backward: false,
      })
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
          origin: 'local',
        },
      ])
    })
  })

  test.each([
    {name: 'a block index below the first block', at: [-2]},
    {name: 'a block index past the last block', at: [1]},
    {name: 'a block index below the first block', at: [-2, 'alt']},
    {name: 'a block index past the last block', at: [1, 'alt']},
    {name: 'an item index below the first item', at: [0, 'items', -2]},
    {name: 'an item index past the last item', at: [0, 'items', 1]},
  ])('Scenario: unset at $at with $name changes nothing', async ({at}) => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const itemKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'list',
          alt: 'foo',
          items: [{_key: itemKey, title: 'foo'}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({type: 'unset', at})

    editor.send({type: 'set', at: [{_key: blockKey}, 'alt'], value: 'bar'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'list',
          alt: 'bar',
          items: [{_key: itemKey, title: 'foo'}],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'alt'],
          value: 'bar',
          origin: 'local',
        },
      ])
    })
  })
})
