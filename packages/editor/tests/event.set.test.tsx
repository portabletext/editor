import {compileSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import type {Path} from '../src/engine/interfaces/path'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {
  compactSpanPaths,
  textBlock,
  textBlockDepths,
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

describe.each(textBlockDepths)(
  'event.set with a compact path $depth',
  ({wrap}) => {
    test.each(compactSpanPaths)(
      'Scenario: `set` at a compact span path ($form) changes nothing',
      async ({path: compactPath}) => {
        const consoleError = vi.spyOn(console, 'error')
        const consoleWarn = vi.spyOn(console, 'warn')
        onTestFinished(() => {
          consoleError.mockRestore()
          consoleWarn.mockRestore()
        })
        const keyGenerator = createTestKeyGenerator()
        const depth = wrap(keyGenerator)
        const fooBlockKey = keyGenerator()
        const fooSpanKey = keyGenerator()
        const barBlockKey = keyGenerator()
        const barSpanKey = keyGenerator()
        const barSpanPath = [
          ...depth.keyedPrefix,
          {_key: barBlockKey},
          'children',
          {_key: barSpanKey},
        ]
        const patches: Array<Patch> = []

        const {editor} = await createTestEditor({
          keyGenerator,
          schemaDefinition: textBlockDepthsSchemaDefinition,
          initialValue: depth.wrapValue([
            textBlock(depth.blockName, fooBlockKey, fooSpanKey, 'foo'),
            textBlock(depth.blockName, barBlockKey, barSpanKey, 'bar'),
          ]),
          children: (
            <>
              <NodePlugin nodes={textBlockDepthsContainers} />
              <EventListenerPlugin
                on={(event) => {
                  if (event.type === 'patch') {
                    patches.push(event.patch)
                  }
                }}
              />
            </>
          ),
        })

        editor.send({
          type: 'set',
          at: [...compactPath(depth, fooBlockKey, fooSpanKey), 'text'],
          value: 'baz',
        })
        editor.send({
          type: 'set',
          at: [...barSpanPath, 'text'],
          value: 'baz',
        })

        await vi.waitFor(() => {
          expect(patches).toEqual([
            {
              origin: 'local',
              type: 'set',
              path: [...barSpanPath, 'text'],
              value: 'baz',
            },
          ])
        })
        expect(editor.getSnapshot().context.value).toEqual(
          depth.wrapValue([
            textBlock(depth.blockName, fooBlockKey, fooSpanKey, 'foo'),
            textBlock(depth.blockName, barBlockKey, barSpanKey, 'baz'),
          ]),
        )
        expect(consoleError.mock.calls).toEqual([])
        expect(consoleWarn.mock.calls).toEqual([])
      },
    )
  },
)

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

const propertyDataPlacements: Array<{
  placement: string
  wrap: (keyGenerator: () => string) => {
    wrapValue: (image: PortableTextBlock) => Array<PortableTextBlock>
    prefix: Path
  }
}> = [
  {
    placement: 'at the root',
    wrap: () => ({
      wrapValue: (image) => [image],
      prefix: [],
    }),
  },
  {
    placement: 'inside a callout',
    wrap: (keyGenerator: () => string) => {
      const calloutKey = keyGenerator()

      return {
        wrapValue: (image) => [
          {_type: 'callout', _key: calloutKey, content: [image]},
        ],
        prefix: [{_key: calloutKey}, 'content'],
      }
    },
  },
]

describe.each(propertyDataPlacements)(
  'event.set with a path into an array inside an array $placement',
  ({wrap}) => {
    test('Scenario: `set` at a path into an array inside an array changes nothing', async () => {
      const keyGenerator = createTestKeyGenerator()
      const imageKey = keyGenerator()
      const {wrapValue, prefix} = wrap(keyGenerator)
      const dataPath = [...prefix, {_key: imageKey}, 'data']
      const patches: Array<Patch> = []

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: propertyDataSchemaDefinition,
        initialValue: wrapValue(imageWithMatrix(imageKey, 'foo')),
        children: (
          <>
            <NodePlugin
              nodes={[
                defineContainer({type: 'callout', arrayField: 'content'}),
              ]}
            />
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  patches.push(event.patch)
                }
              }}
            />
          </>
        ),
      })

      editor.send({
        type: 'set',
        at: [...dataPath, 'matrix', 0, 0, 'text'],
        value: 'bar',
      })
      editor.send({
        type: 'set',
        at: dataPath,
        value: {matrix: [[{text: 'baz'}]]},
      })

      await vi.waitFor(() => {
        expect(patches).toEqual([
          {
            origin: 'local',
            type: 'set',
            path: dataPath,
            value: {matrix: [[{text: 'baz'}]]},
          },
        ])
      })
      expect(editor.getSnapshot().context.value).toEqual(
        wrapValue(imageWithMatrix(imageKey, 'baz')),
      )
    })
  },
)

function imageWithMatrix(imageKey: string, text: string): PortableTextBlock {
  return {_type: 'image', _key: imageKey, data: {matrix: [[{text}]]}}
}
