import {compileSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type EditorEmittedEvent} from '../src'
import type {Path} from '../src/engine/interfaces/path'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'

describe('event.set', () => {
  test('Scenario: set on a block property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'h1',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: undo a set on a block property', async () => {
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
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue,
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'h1',
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

  test('Scenario: undo a set that creates a new block property', async () => {
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
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
      initialValue,
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'listItem'], value: 'bullet'})

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

  test('Scenario: undo a set on a markDef property', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: ['m0']}],
        markDefs: [{_key: 'm0', _type: 'link', href: 'https://a.com'}],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue,
    })

    editor.send({
      type: 'set',
      at: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}, 'href'],
      value: 'https://b.com',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: ['m0']}],
          markDefs: [{_key: 'm0', _type: 'link', href: 'https://b.com'}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a full-block replacement', async () => {
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

    editor.send({
      type: 'set',
      at: [{_key: 'b0'}],
      value: {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
        markDefs: [],
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a root-level value replacement', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const replacement = [
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'set', at: [], value: replacement})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(replacement)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test("Scenario: undo a set of a container's children array to []", async () => {
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
      keyGenerator: createTestKeyGenerator(),
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
      type: 'set',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells'],
      value: [],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 't0',
          _type: 'table',
          rows: [{_key: 'r0', _type: 'row', cells: []}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })
})

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])('event.set $depth', ({wrap}) => {
  test("Scenario: set on a block's children shrinking the caret's span clamps the caret to the new text length", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {wrapValue, prefix} = wrap(keyGenerator)
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const blockPath = [...prefix, {_key: blockKey}]
    const spanPath = [...blockPath, 'children', {_key: spanKey}]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestingSchemaDefinition,
      initialValue: wrapValue([block(blockKey, spanKey, 'foobarbaz')]),
      children: <NodePlugin nodes={nestingContainers} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 6},
        focus: {path: spanPath, offset: 6},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: spanPath, offset: 6},
        focus: {path: spanPath, offset: 6},
        backward: false,
      })
    })

    editor.send({
      type: 'set',
      at: [...blockPath, 'children'],
      value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(
        wrapValue([block(blockKey, spanKey, 'foo')]),
      )
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 3},
      backward: false,
    })
  })
})

const nestingSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}, {name: 'h1'}],
              decorators: [{name: 'em'}],
            },
          ],
        },
      ],
    },
  ],
})

const nestingContainers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
]

type Wrap = (keyGenerator: () => string) => {
  wrapValue: (blocks: Array<PortableTextBlock>) => Array<PortableTextBlock>
  prefix: Path
}

function atRoot(): ReturnType<Wrap> {
  return {wrapValue: (blocks) => blocks, prefix: []}
}

function inCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const calloutKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {_type: 'callout', _key: calloutKey, content: blocks},
    ],
    prefix: [{_key: calloutKey}, 'content'],
  }
}

function inNestedCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {
        _type: 'callout',
        _key: outerKey,
        content: [{_type: 'callout', _key: innerKey, content: blocks}],
      },
    ],
    prefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
  }
}

function inNote(keyGenerator: () => string): ReturnType<Wrap> {
  const noteKey = keyGenerator()

  return {
    wrapValue: (blocks) => [{_type: 'note', _key: noteKey, body: blocks}],
    prefix: [{_key: noteKey}, 'body'],
  }
}

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: compileSchema(nestingSchemaDefinition).block.name,
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

describe('event.set with a compact path at the root', () => {
  test('Scenario: `set` at a compact span path (indexed) changes nothing', async () => {
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

    editor.send({type: 'set', at: [0, 0, 'text'], value: 'baz'})
    editor.send({
      type: 'set',
      at: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: 'baz',
              inverse: {
                type: 'set',
                path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
                value: 'bar',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
            value: 'baz',
          },
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
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.set with a compact path inside a callout', () => {
  test('Scenario: `set` at a compact span path (indexed) changes nothing', async () => {
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

    editor.send({type: 'set', at: [0, 'content', 0, 0, 'text'], value: 'baz'})
    editor.send({
      type: 'set',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
              inverse: {
                type: 'set',
                path: [
                  {_key: 'c0'},
                  'content',
                  {_key: 'b1'},
                  'children',
                  {_key: 's1'},
                  'text',
                ],
                value: 'bar',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'baz',
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
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'baz', marks: []}],
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

describe('event.set with a compact path inside a callout inside a callout', () => {
  test('Scenario: `set` at a compact span path (indexed) changes nothing', async () => {
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

    editor.send({
      type: 'set',
      at: [0, 'content', 0, 'content', 0, 0, 'text'],
      value: 'baz',
    })
    editor.send({
      type: 'set',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
              inverse: {
                type: 'set',
                path: [
                  {_key: 'c0'},
                  'content',
                  {_key: 'c1'},
                  'content',
                  {_key: 'b1'},
                  'children',
                  {_key: 's1'},
                  'text',
                ],
                value: 'bar',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [
                {_key: 'c0'},
                'content',
                {_key: 'c1'},
                'content',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'baz',
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
              {
                _type: 'block',
                _key: 'b1',
                children: [{_type: 'span', _key: 's1', text: 'baz', marks: []}],
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

describe('event.set with a compact path inside a field with its own sub-schema', () => {
  test('Scenario: `set` at a compact span path (indexed) changes nothing', async () => {
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

    editor.send({type: 'set', at: [0, 'body', 0, 0, 'text'], value: 'baz'})
    editor.send({
      type: 'set',
      at: [
        {_key: 'n0'},
        'body',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
              inverse: {
                type: 'set',
                path: [
                  {_key: 'n0'},
                  'body',
                  {_key: 'b1'},
                  'children',
                  {_key: 's1'},
                  'text',
                ],
                value: 'bar',
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [
                {_key: 'n0'},
                'body',
                {_key: 'b1'},
                'children',
                {_key: 's1'},
                'text',
              ],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ],
            value: 'baz',
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
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'baz', marks: []}],
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

const propertyDataSchemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image', fields: [{name: 'data', type: 'object'}]},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
  ],
})

describe('event.set with a path into an array inside an array at the root', () => {
  test('Scenario: `set` at a path into an array inside an array changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: propertyDataSchemaDefinition,
      initialValue: [
        {_type: 'image', _key: 'i0', data: {matrix: [[{text: 'foo'}]]}},
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
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

    editor.send({
      type: 'set',
      at: [{_key: 'i0'}, 'data', 'matrix', 0, 0, 'text'],
      value: 'bar',
    })
    editor.send({
      type: 'set',
      at: [{_key: 'i0'}, 'data', 'caption'],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [{_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
              inverse: {type: 'unset', path: [{_key: 'i0'}, 'data', 'caption']},
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [{_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [{_key: 'i0'}, 'data', 'caption'],
            value: 'baz',
          },
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: 'i0',
        data: {matrix: [[{text: 'foo'}]], caption: 'baz'},
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})

describe('event.set with a path into an array inside an array inside a callout', () => {
  test('Scenario: `set` at a path into an array inside an array changes nothing', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const consoleWarn = vi.spyOn(console, 'warn')
    onTestFinished(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })
    const events: Array<EditorEmittedEvent> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: propertyDataSchemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {_type: 'image', _key: 'i0', data: {matrix: [[{text: 'foo'}]]}},
          ],
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
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

    editor.send({
      type: 'set',
      at: [
        {_key: 'c0'},
        'content',
        {_key: 'i0'},
        'data',
        'matrix',
        0,
        0,
        'text',
      ],
      value: 'bar',
    })
    editor.send({
      type: 'set',
      at: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
      value: 'baz',
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {
          type: 'change',
          origin: 'local',
          operations: [
            {
              type: 'set',
              path: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
              inverse: {
                type: 'unset',
                path: [
                  {_key: 'c0'},
                  'content',
                  {_key: 'i0'},
                  'data',
                  'caption',
                ],
              },
            },
          ],
          patches: [
            {
              origin: 'local',
              type: 'set',
              path: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
              value: 'baz',
            },
          ],
        },
        {
          type: 'patch',
          patch: {
            origin: 'local',
            type: 'set',
            path: [{_key: 'c0'}, 'content', {_key: 'i0'}, 'data', 'caption'],
            value: 'baz',
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
            _type: 'image',
            _key: 'i0',
            data: {matrix: [[{text: 'foo'}]], caption: 'baz'},
          },
        ],
      },
    ])
    expect(consoleError.mock.calls).toEqual([])
    expect(consoleWarn.mock.calls).toEqual([])
  })
})
