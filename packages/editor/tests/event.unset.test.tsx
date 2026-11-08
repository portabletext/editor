import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

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
})

describe('event.unset with a compact path at the root', () => {
  test('Scenario: `unset` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'unset', at: [0, 0]})
    editor.send({type: 'unset', at: [{_key: 'b1'}]})

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'unset',
              path: [{_key: 'b1'}],
              inverse: {
                type: 'insert',
                path: [{_key: 'b0'}],
                node: {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                position: 'after',
              },
            },
          ],
          patches: [{origin: 'local', type: 'unset', path: [{_key: 'b1'}]}],
        },
        {
          type: 'patch',
          patch: {origin: 'local', type: 'unset', path: [{_key: 'b1'}]},
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.unset with a compact path inside a callout', () => {
  test('Scenario: `unset` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'unset', at: [0, 'content', 0, 0]})
    editor.send({type: 'unset', at: [{_key: 'c0'}, 'content', {_key: 'b1'}]})

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'unset',
              path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
              inverse: {
                type: 'insert',
                path: [{_key: 'c0'}, 'content', {_key: 'b0'}],
                node: {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                position: 'after',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'unset',
              path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'unset',
            path: [{_key: 'c0'}, 'content', {_key: 'b1'}],
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.unset with a compact path inside a callout inside a callout', () => {
  test('Scenario: `unset` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'unset', at: [0, 'content', 0, 'content', 0, 0]})
    editor.send({
      type: 'unset',
      at: [{_key: 'c0'}, 'content', {_key: 'c1'}, 'content', {_key: 'b1'}],
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'unset',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
              ],
              inverse: {
                type: 'insert',
                path: [
                  {_key: 'c0'},
                  'content',
                  {_key: 'c1'},
                  'content',
                  {_key: 'b0'},
                ],
                node: {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                position: 'after',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'unset',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
              ],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'unset',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
            ],
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.unset with a compact path inside a field with its own sub-schema', () => {
  test('Scenario: `unset` at a compact span path (indexed) changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: textBlockDepthsSchemaDefinition,
      initialValue: [
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'bar', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={textBlockDepthsContainers} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch' || event.type === 'change') {
                events.push(event)
              }
            }}
          />
        </>
      ),
    })

    editor.send({type: 'unset', at: [0, 'body', 0, 0]})
    editor.send({type: 'unset', at: [{_key: 'n0'}, 'body', {_key: 'b1'}]})

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'unset',
              path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
              inverse: {
                type: 'insert',
                path: [{_key: 'n0'}, 'body', {_key: 'b0'}],
                node: {
                  _type: 'block',
                  _key: 'b1',
                  children: [
                    {_type: 'span', _key: 's1', text: 'bar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                position: 'after',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'unset',
              path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'unset',
            path: [{_key: 'n0'}, 'body', {_key: 'b1'}],
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})
