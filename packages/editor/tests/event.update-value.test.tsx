import {
  set,
  unset,
  insert,
  diffMatchPatch,
  applyAll,
} from '@portabletext/patches'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  type ChangeEvent,
  type Patch,
  type EditorEmittedEvent,
  type PortableTextBlock,
} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('initial value key corrections', () => {
  test('Scenario: a startup value with a keyless child gets its missing key through a correction', async () => {
    const patches: Array<Patch> = []
    const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                patches.push(changePatch)
              }
            }
            if (event.type === 'change' && event.origin === 'local') {
              localChanges.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 5},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [
            {
              _key: 'b0',
            },
            'children',
            0,
            '_key',
          ],
          type: 'set',
          value: 'k2',
        },
        {
          origin: 'local',
          path: [
            {
              _key: 'b0',
            },
            'children',
            {
              _key: 'k2',
            },
            'text',
          ],
          type: 'diffMatchPatch',
          value: '@@ -1,5 +1,6 @@\n hello\n+!\n',
        },
      ])
      expect(localChanges.flatMap((change) => change.patches)).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0, '_key'],
          value: 'k2',
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('hello', 'hello!'))),
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a startup value with an empty keyless child before another keyless child emits the key corrections before the local edit', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const patches: Array<Patch> = []
    const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_type: 'span', text: '', marks: []},
            {_type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                patches.push(changePatch)
              }
            }
            if (event.type === 'change' && event.origin === 'local') {
              localChanges.push(event)
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: '',
            },
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 0},
        focus: {path: [{_key: 'b0'}, 'children', {_key: 'k2'}], offset: 0},
      },
    })
    editor.send({type: 'insert.text', text: 'baz'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 1, '_key'],
          value: 'k2',
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0, '_key'],
          value: 'k3',
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [{_key: 'b0'}, 'children'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          position: 'before',
          items: [{_key: 'k4', _type: 'span', text: 'baz', marks: []}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'baz'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k4'}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'bazbar'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          origin: 'local',
        },
      ])
      expect(localChanges.flatMap((change) => change.patches)).toEqual([
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 1, '_key'],
          value: 'k2',
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'b0'}, 'children', 0, '_key'],
          value: 'k3',
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [{_key: 'b0'}, 'children'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          position: 'before',
          items: [{_key: 'k4', _type: 'span', text: 'baz', marks: []}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('', 'baz'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k4'}],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b0'}, 'children', {_key: 'k3'}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'bazbar'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 'k2'}],
          origin: 'local',
        },
      ])
    })
    consoleWarn.mockRestore()
  })
})

test('Scenario: Update text inside a container line', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const calloutContainer = [
    defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={calloutContainer} />,
    initialValue: [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('hello', 'goodbye', [
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: goodbye'].join('\n'),
    )
  })
})

test('Scenario: Updating and then clearing placeholder value', async () => {
  const {editor} = await createTestEditor({
    schemaDefinition: defineSchema({}),
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('', 'foo', [
        {_key: 'k0'},
        'children',
        {_key: 'k1'},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({type: 'apply', patches: [unset([{_key: 'k0'}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Add a new line to a container', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const line1Key = keyGenerator()
  const span1Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: line1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'first', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  const incomingValue1 = [
    {
      _type: 'code-block',
      _key: codeBlockKey,
      lines: [
        {
          _type: 'block',
          _key: line1Key,
          children: [{_type: 'span', _key: span1Key, text: 'first', marks: []}],
          markDefs: [],
          style: 'code',
        },
        {
          _type: 'block',
          _key: 'newLine',
          children: [
            {_type: 'span', _key: 'newSpan', text: 'second', marks: []},
          ],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      insert([incomingValue1[0]!.lines[1]], 'after', [
        {_key: codeBlockKey},
        'lines',
        {_key: line1Key},
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CODE-BLOCK:',
        '  B style="code": first',
        '  B style="code": second',
      ].join('\n'),
    )
  })
})

test('Scenario: updating block object property', async () => {
  const keyGenerator = createTestKeyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      blockObjects: [{name: 'url'}],
    }),
  })

  editor.send({
    type: 'insert.block object',
    blockObject: {
      name: 'url',
      value: {
        href: 'https://www.sanity.io',
      },
    },
    placement: 'auto',
  })

  editor.send({
    type: 'apply',
    patches: [
      set('Sanity is a headless CMS', [{_key: 'k2'}, 'description']),
      set('https://www.sanity.io', [{_key: 'k2'}, 'href']),
    ],
  })

  await vi.waitFor(
    () => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          description: 'Sanity is a headless CMS',
          href: 'https://www.sanity.io',
        },
      ])
    },
    {timeout: 5000},
  )
})

test('Scenario: Updating the text of an empty span', async () => {
  const keyGenerator = createTestKeyGenerator()

  const span = {_type: 'span', _key: 'span1', text: '', marks: []}
  const emptyFirstLine = {
    _key: 'block1', // Static key
    _type: 'block',
    children: [span],
    style: 'normal' as const,
    markDefs: [],
  }
  const populatedFirstLine = {
    ...emptyFirstLine,
    children: [{...span, text: 'e'}], // Same block key, different content
  }
  const lastLine = {
    _key: 'block2', // Static key
    _type: 'block',
    children: [{_type: 'span', _key: 'span2', text: 'last line', marks: []}],
    style: 'normal' as const,
    markDefs: [],
  }

  const {editor} = await createTestEditor({
    keyGenerator,
  })

  const incomingValue2 = [emptyFirstLine, lastLine]
  editor.send({
    type: 'apply',
    patches: [insert(incomingValue2, 'before', [0])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      emptyFirstLine,
      lastLine,
    ])
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('', 'e', [
        {_key: 'block1'},
        'children',
        {_key: 'span1'},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      populatedFirstLine,
      lastLine,
    ])
  })
})

test('Scenario: Remove a line from a container', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const line1Key = keyGenerator()
  const span1Key = keyGenerator()
  const line2Key = keyGenerator()
  const span2Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: line1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'first', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
          {
            _type: 'block',
            _key: line2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'second', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [unset([{_key: codeBlockKey}, 'lines', {_key: line2Key}])],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B style="code": first'].join('\n'),
    )
  })
})

test('Scenario: Reorder lines within a container', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const line1Key = keyGenerator()
  const span1Key = keyGenerator()
  const line2Key = keyGenerator()
  const span2Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: line1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'first', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
          {
            _type: 'block',
            _key: line2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'second', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  const incomingValue3 = [
    {
      _type: 'code-block',
      _key: codeBlockKey,
      lines: [
        {
          _type: 'block',
          _key: line2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'second', marks: []},
          ],
          markDefs: [],
          style: 'code',
        },
        {
          _type: 'block',
          _key: line1Key,
          children: [{_type: 'span', _key: span1Key, text: 'first', marks: []}],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(incomingValue3[0]!.lines, [{_key: codeBlockKey}, 'lines'])],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CODE-BLOCK:',
        '  B style="code": second',
        '  B style="code": first',
      ].join('\n'),
    )
  })
})

test('Scenario: Replace a container with a text block', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const lineKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'code here', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  const incomingValue4 = [
    {
      _type: 'block',
      _key: 'newBlock',
      children: [
        {
          _type: 'span',
          _key: 'newSpan',
          text: 'now a paragraph',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      insert(incomingValue4, 'before', [{_key: codeBlockKey}]),
      unset([{_key: codeBlockKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: now a paragraph',
    )
  })
})

test('Scenario: Adding blocks before existing block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const onEvent = vi.fn<() => EditorEmittedEvent>()

  const h2 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [{_key: keyGenerator(), _type: 'span', text: 'h2', marks: []}],
    style: 'h2',
    markDefs: [],
  }
  const h1 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [{_key: keyGenerator(), _type: 'span', text: 'h1', marks: []}],
    style: 'h1',
    markDefs: [],
  }
  const paragraph = {
    _key: keyGenerator(),
    _type: 'block',
    children: [
      {_key: keyGenerator(), _type: 'span', text: 'paragraph', marks: []},
    ],
    style: 'normal',
    markDefs: [],
  }

  const {editor} = await createTestEditor({
    children: <EventListenerPlugin on={onEvent} />,
    keyGenerator,
    schemaDefinition: defineSchema({}),
  })

  await vi.waitFor(() => {
    expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
  })

  const incomingValue5 = [h2]
  editor.send({
    type: 'apply',
    patches: [insert(incomingValue5, 'before', [0])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([h2])
  })

  editor.send({
    type: 'apply',
    patches: [insert([h1, paragraph], 'before', [{_key: h2._key}])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([h1, paragraph, h2])
  })
})

test('Scenario: Replace a text block with a container', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'paragraph', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const incomingValue6 = [
    {
      _type: 'code-block',
      _key: 'cb',
      lines: [
        {
          _type: 'block',
          _key: 'ln',
          children: [{_type: 'span', _key: 'sp', text: 'now code', marks: []}],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      insert(incomingValue6, 'before', [{_key: blockKey}]),
      unset([{_key: blockKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B style="code": now code'].join('\n'),
    )
  })
})

test('Scenario: Clearing lonely block object', async () => {
  const keyGenerator = createTestKeyGenerator()
  const imageKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'image',
        _key: imageKey,
      },
    ],
    schemaDefinition: defineSchema({
      blockObjects: [{name: 'image'}],
    }),
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: imageKey,
      },
    ])
  })

  editor.send({type: 'apply', patches: [unset([{_key: imageKey}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k3',
        children: [
          {
            _type: 'span',
            _key: 'k4',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Change a line inside a container (keyed diff)', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const lineKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'original', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('original', 'updated', [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B style="code": updated'].join('\n'),
    )
  })
})

test('Scenario: Clearing lonely text block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'foo',
            marks: [],
          },
        ],
        style: 'h1',
        markDefs: [],
      },
    ],
    schemaDefinition: defineSchema({
      styles: [{name: 'h1'}],
    }),
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'foo',
            marks: [],
          },
        ],
        style: 'h1',
        markDefs: [],
      },
    ])
  })

  editor.send({type: 'apply', patches: [unset([{_key: blockKey}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k4',
        children: [
          {
            _type: 'span',
            _key: 'k5',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Update non-block-array property on a container', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const calloutContainer = [
    defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={calloutContainer} />,
    initialValue: [
      {
        _type: 'callout',
        _key: calloutKey,
        tone: 'info',
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [set('warning', [{_key: calloutKey}, 'tone'])],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: hello'].join('\n'),
    )
  })
})

test('Scenario: Updating text while read-only', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ],
    schemaDefinition: defineSchema({}),
  })

  editor.send({
    type: 'update readOnly',
    readOnly: true,
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('foo', 'bar', [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
  })
})

test('Scenario: Deep-nested update inside a table cell', async () => {
  const deepSchema = defineSchema({
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
  })
  const tableContainers = [
    defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({children}) => <>{children}</>,
    }),
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({children}) => <>{children}</>,
    }),
    defineContainer({
      type: 'cell',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]

  const keyGenerator = createTestKeyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: deepSchema,
    children: <NodePlugin nodes={tableContainers} />,
    initialValue: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: blockKey,
                    children: [
                      {_type: 'span', _key: spanKey, text: 'cell', marks: []},
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
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('cell', 'updated cell', [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['TABLE:', '  ROW:', '    CELL:', '      B: updated cell'].join('\n'),
    )
  })
})

test('Scenario: Selection is preserved when container lines change around it', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const line1Key = keyGenerator()
  const span1Key = keyGenerator()
  const line2Key = keyGenerator()
  const span2Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: line1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'first', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
          {
            _type: 'block',
            _key: line2Key,
            children: [
              {_type: 'span', _key: span2Key, text: 'second', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: span2Key},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: span2Key},
        ],
        offset: 3,
      },
    },
  })

  const incomingValue7 = [
    {
      _type: 'code-block',
      _key: codeBlockKey,
      lines: [
        {
          _type: 'block',
          _key: line1Key,
          children: [{_type: 'span', _key: span1Key, text: 'first', marks: []}],
          markDefs: [],
          style: 'code',
        },
        {
          _type: 'block',
          _key: line2Key,
          children: [
            {_type: 'span', _key: span2Key, text: 'second', marks: []},
          ],
          markDefs: [],
          style: 'code',
        },
        {
          _type: 'block',
          _key: 'line3',
          children: [{_type: 'span', _key: 'span3', text: 'third', marks: []}],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      insert([incomingValue7[0]!.lines[2]], 'after', [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CODE-BLOCK:',
        '  B style="code": first',
        '  B style="code": sec|ond',
        '  B style="code": third',
      ].join('\n'),
    )
  })

  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: span2Key},
      ],
      offset: 3,
    },
    focus: {
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: line2Key},
        'children',
        {_key: span2Key},
      ],
      offset: 3,
    },
    backward: false,
  })
})

test('Scenario: Changing container type (same key, different _type)', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const calloutContainer = [
    defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const sharedKey = keyGenerator()
  const lineKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: (
      <NodePlugin nodes={[...calloutContainer, ...codeBlockContainer]} />
    ),
    initialValue: [
      {
        _type: 'callout',
        _key: sharedKey,
        content: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ],
  })

  const incomingValue8 = [
    {
      _type: 'code-block',
      _key: sharedKey,
      lines: [
        {
          _type: 'block',
          _key: lineKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(incomingValue8[0], [{_key: sharedKey}])],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B style="code": hello'].join('\n'),
    )
  })
})

test('Scenario: Updating span with reordered marks', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'foo',
            marks: ['strong', 'em'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [
      set(
        ['em', 'strong'],
        [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
      ),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'foo',
            marks: ['em', 'strong'],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Line key changes while editor has selection in that line (remote rewrite)', async () => {
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'code'}],
                decorators: [],
                annotations: [],
                lists: [],
                inlineObjects: [],
              },
            ],
          },
        ],
      },
    ],
  })
  const codeBlockContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]
  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const oldLineKey = keyGenerator()
  const oldSpanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    children: <NodePlugin nodes={codeBlockContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: oldLineKey,
            children: [
              {_type: 'span', _key: oldSpanKey, text: 'code', marks: []},
            ],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: oldLineKey},
          'children',
          {_key: oldSpanKey},
        ],
        offset: 2,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: oldLineKey},
          'children',
          {_key: oldSpanKey},
        ],
        offset: 2,
      },
    },
  })

  const incomingValue9 = [
    {
      _type: 'code-block',
      _key: codeBlockKey,
      lines: [
        {
          _type: 'block',
          _key: 'newLineKey',
          children: [
            {
              _type: 'span',
              _key: 'newSpanKey',
              text: 'brand new',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'code',
        },
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(incomingValue9[0]!.lines, [{_key: codeBlockKey}, 'lines'])],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B style="code": brand new'].join('\n'),
    )
  })
})

test('Scenario: Changing block type from text to block object (same key)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  const incomingValue10 = [
    {
      _type: 'image',
      _key: blockKey,
      src: 'https://example.com/image.jpg',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(incomingValue10[0], [{_key: blockKey}])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: blockKey,
        src: 'https://example.com/image.jpg',
      },
    ])
  })
})

test('Scenario: Changing child type from span to inline object (same key)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const childKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: childKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: childKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  const incomingValue11 = [
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'stock-ticker', _key: childKey, symbol: 'AAPL'}],
      markDefs: [],
      style: 'normal',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue11[0]!.children, [{_key: blockKey}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: 'k4', text: '', marks: []},
          {_type: 'stock-ticker', _key: childKey, symbol: 'AAPL'},
          {_type: 'span', _key: 'k5', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Insert a block object INSIDE the container lines array (heterogeneous children)', async () => {
  const heteroSchema = defineSchema({
    blockObjects: [
      {name: 'separator'},
      {
        name: 'code-block',
        fields: [
          {
            name: 'lines',
            type: 'array',
            of: [{type: 'block'}, {type: 'separator'}],
          },
        ],
      },
    ],
  })

  const heteroContainer = [
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({children}) => <>{children}</>,
    }),
  ]

  const keyGenerator = createTestKeyGenerator()
  const codeBlockKey = keyGenerator()
  const lineKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: heteroSchema,
    children: <NodePlugin nodes={heteroContainer} />,
    initialValue: [
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'line one', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ],
  })

  const incomingValue12 = [
    {
      _type: 'code-block',
      _key: codeBlockKey,
      lines: [
        {
          _type: 'block',
          _key: lineKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'line one', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'separator', _key: 'sepKey'},
      ],
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      insert([incomingValue12[0]!.lines[1]], 'after', [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CODE-BLOCK:', '  B: line one', '  {SEPARATOR}'].join('\n'),
    )
  })
})

test('Scenario: Changing and adding text block children', async () => {
  const keyGenerator = createTestKeyGenerator()

  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const emptySpanKey = keyGenerator()
  const stockTickerKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      inlineObjects: [{name: 'stock-ticker'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello (NYSE:AAPL)',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const incomingValue13 = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanKey, text: 'Hello ', marks: []},
        {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'NYSE:AAPL'},
        {_type: 'span', _key: emptySpanKey, text: '', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue13[0]!.children, [{_key: blockKey}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'Hello ', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'NYSE:AAPL'},
          {_type: 'span', _key: emptySpanKey, text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Removing children from a block that is not the first block', async () => {
  const keyGenerator = createTestKeyGenerator()

  const block1Key = keyGenerator()
  const span1Key = keyGenerator()
  const block2Key = keyGenerator()
  const span2Key = keyGenerator()
  const stockTickerKey = keyGenerator()
  const span3Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      inlineObjects: [{name: 'stock-ticker'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [
          {_type: 'span', _key: span2Key, text: 'bar', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey},
          {_type: 'span', _key: span3Key, text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [
          {_type: 'span', _key: span2Key, text: 'bar', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey},
          {_type: 'span', _key: span3Key, text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  const incomingValue14 = [
    {
      _type: 'block',
      _key: block1Key,
      children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: block2Key,
      children: [{_type: 'span', _key: span2Key, text: 'foobar', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue14[1]!.children, [{_key: block2Key}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [{_type: 'span', _key: span2Key, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Reordering children within a block (same keys, different positions)', async () => {
  const keyGenerator = createTestKeyGenerator()

  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()
  const spanCKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          {_type: 'span', _key: spanCKey, text: 'C', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          {_type: 'span', _key: spanCKey, text: 'C', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  const incomingValue15 = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanCKey, text: 'C', marks: []},
        {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
        {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue15[0]!.children, [{_key: blockKey}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanCKey, text: 'C', marks: []},
          {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Updating inline object value (same key)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const span1Key = keyGenerator()
  const stockTickerKey = keyGenerator()
  const span2Key = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
          {_type: 'span', _key: span2Key, text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
          {_type: 'span', _key: span2Key, text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({
    type: 'apply',
    patches: [
      set('GOOG', [
        {_key: blockKey},
        'children',
        {_key: stockTickerKey},
        'symbol',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: span1Key, text: 'Price: ', marks: []},
          {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'GOOG'},
          {_type: 'span', _key: span2Key, text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

// Replacing the selected text block should select the image, but the selection still points to the removed span.
test.fails('Scenario: Selection restoration when block type changes', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()
  const spanCKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      blockObjects: [{name: 'image'}],
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          {_type: 'span', _key: spanCKey, text: 'C', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'A', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'B', marks: ['em']},
          {_type: 'span', _key: spanCKey, text: 'C', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanCKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanCKey}],
        offset: 1,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanCKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: spanCKey}],
        offset: 1,
      },
      backward: false,
    })
  })

  const incomingValue16 = [
    {
      _type: 'image',
      _key: blockKey,
    },
  ]
  editor.send({
    type: 'apply',
    patches: [set(incomingValue16[0], [{_key: blockKey}])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'image',
        _key: blockKey,
      },
    ])

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: blockKey}], offset: 0},
      focus: {path: [{_key: blockKey}], offset: 0},
      backward: false,
    })
  })
})

test('Scenario: Removing a custom block property', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        _map: {key: 'value'},
      },
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        _map: {key: 'value'},
      },
    ])
  })

  editor.send({
    type: 'apply',
    patches: [unset([{_key: blockKey}, '_map'])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Adding new children to a text block (pure addition)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanAKey, text: 'Hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const newValue = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanAKey, text: 'Hello', marks: []},
        {
          _type: 'span',
          _key: spanBKey,
          text: ' World',
          marks: ['strong'],
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  editor.send({
    type: 'apply',
    patches: [
      insert([newValue[0]!.children[1]], 'after', [
        {_key: blockKey},
        'children',
        {_key: spanAKey},
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(newValue)
  })
})

test('Scenario: Replacing all children with different keys', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()
  const spanCKey = keyGenerator()
  const spanDKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'old1', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'old2', marks: ['em']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const newValue = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanCKey, text: 'new1', marks: ['em']},
        {_type: 'span', _key: spanDKey, text: 'new2', marks: ['strong']},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  const incomingValue17 = newValue
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue17[0]!.children, [{_key: blockKey}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(newValue)
  })
})

test('Scenario: Reordering children and modifying text simultaneously', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'foo', marks: ['strong']},
          {_type: 'span', _key: spanBKey, text: 'bar', marks: ['em']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const newValue = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'span', _key: spanBKey, text: 'BAR', marks: ['em']},
        {_type: 'span', _key: spanAKey, text: 'FOO', marks: ['strong']},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  const incomingValue18 = newValue
  editor.send({
    type: 'apply',
    patches: [
      set(incomingValue18[0]!.children, [{_key: blockKey}, 'children']),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(newValue)
  })
})

test('Scenario: Reordering top-level blocks', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block1Key = keyGenerator()
  const span1Key = keyGenerator()
  const block2Key = keyGenerator()
  const span2Key = keyGenerator()
  const block3Key = keyGenerator()
  const span3Key = keyGenerator()

  const block1 = {
    _type: 'block',
    _key: block1Key,
    children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block2 = {
    _type: 'block',
    _key: block2Key,
    children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block3 = {
    _type: 'block',
    _key: block3Key,
    children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
    markDefs: [],
    style: 'normal',
  }

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [block1, block2, block3],
  })

  const updatedBlock1 = {
    ...block1,
    children: [
      {_type: 'span', _key: span1Key, text: 'First updated', marks: []},
    ],
  }
  const updatedBlock3 = {
    ...block3,
    children: [
      {_type: 'span', _key: span3Key, text: 'Third updated', marks: []},
    ],
  }

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('First', 'First updated', [
        {_key: block1Key},
        'children',
        {_key: span1Key},
        'text',
      ]),
      diffMatchPatch('Third', 'Third updated', [
        {_key: block3Key},
        'children',
        {_key: span3Key},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      updatedBlock1,
      block2,
      updatedBlock3,
    ])
  })
})

test('Scenario: Swapping two blocks emits no patches of its own', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const patches: Array<Patch> = []
  const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              patches.push(changePatch)
            }
          }
          if (event.type === 'change' && event.origin === 'local') {
            localChanges.push(event)
          }
        }}
      />
    ),
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: barKey}]),
      insert([bar], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, foo])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 3,
      },
    },
  })
  editor.send({type: 'insert.text', text: '!'})

  const sentinelPatch: Patch = {
    type: 'diffMatchPatch',
    path: [{_key: fooKey}, 'children', {_key: fooSpanKey}, 'text'],
    value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
    origin: 'local',
  }

  await vi.waitFor(() => {
    expect(patches).toEqual([sentinelPatch])
    expect(localChanges.flatMap((change) => change.patches)).toEqual([
      sentinelPatch,
    ])
  })
  expect(applyAll([bar, foo], patches)).toEqual(
    editor.getSnapshot().context.value,
  )
})

test('Scenario: Moving the first block to the end emits no patches of its own', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const patches: Array<Patch> = []
  const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              patches.push(changePatch)
            }
          }
          if (event.type === 'change' && event.origin === 'local') {
            localChanges.push(event)
          }
        }}
      />
    ),
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: fooKey}]),
      insert([foo], 'after', [{_key: bazKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, baz, foo])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 3,
      },
    },
  })
  editor.send({type: 'insert.text', text: '!'})

  const sentinelPatch: Patch = {
    type: 'diffMatchPatch',
    path: [{_key: fooKey}, 'children', {_key: fooSpanKey}, 'text'],
    value: stringifyPatches(makePatches(makeDiff('foo', 'foo!'))),
    origin: 'local',
  }

  await vi.waitFor(() => {
    expect(patches).toEqual([sentinelPatch])
    expect(localChanges.flatMap((change) => change.patches)).toEqual([
      sentinelPatch,
    ])
  })
  expect(applyAll([bar, baz, foo], patches)).toEqual(
    editor.getSnapshot().context.value,
  )
})

test('Scenario: Moving the last block to the start emits no patches of its own', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const patches: Array<Patch> = []
  const localChanges: Array<Extract<ChangeEvent, {origin: 'local'}>> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              patches.push(changePatch)
            }
          }
          if (event.type === 'change' && event.origin === 'local') {
            localChanges.push(event)
          }
        }}
      />
    ),
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: bazKey}]),
      insert([baz], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([baz, foo, bar])
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 3,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 3,
      },
    },
  })
  editor.send({type: 'insert.text', text: '!'})

  const sentinelPatch: Patch = {
    type: 'diffMatchPatch',
    path: [{_key: barKey}, 'children', {_key: barSpanKey}, 'text'],
    value: stringifyPatches(makePatches(makeDiff('bar', 'bar!'))),
    origin: 'local',
  }

  await vi.waitFor(() => {
    expect(patches).toEqual([sentinelPatch])
    expect(localChanges.flatMap((change) => change.patches)).toEqual([
      sentinelPatch,
    ])
  })
  expect(applyAll([baz, foo, bar], patches)).toEqual(
    editor.getSnapshot().context.value,
  )
})

test('Scenario: Swapping two blocks keeps a caret or range in the third block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: barKey}]),
      insert([bar], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, foo, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    focus: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    backward: false,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: fooKey}]),
      insert([foo], 'before', [{_key: barKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([foo, bar, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    backward: false,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      backward: true,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      backward: true,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: barKey}]),
      insert([bar], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, foo, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    focus: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 1,
    },
    backward: true,
  })
})

test('Scenario: Moving the block holding the caret keeps the caret', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: fooKey}]),
      insert([foo], 'after', [{_key: bazKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, baz, foo])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: barKey}, 'children', {_key: barSpanKey}],
      offset: 2,
    },
    focus: {
      path: [{_key: barKey}, 'children', {_key: barSpanKey}],
      offset: 2,
    },
    backward: false,
  })
})

// Moving a block should keep its selected range, but removing it first relocates the anchor to its neighbour.
test.fails('Scenario: Swapping two blocks keeps a range whose anchor is in the moved block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: barKey}]),
      insert([bar], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([bar, foo, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: barKey}, 'children', {_key: barSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    backward: false,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: true,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: true,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: fooKey}]),
      insert([foo], 'before', [{_key: barKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([foo, bar, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: barKey}, 'children', {_key: barSpanKey}],
      offset: 2,
    },
    backward: false,
  })
})

// Moving a block should keep its selected range, but removing it first relocates the anchor to its neighbour.
test.fails('Scenario: Moving a block across several blocks keeps a range whose anchor is in the moved block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const quxKey = keyGenerator()
  const quxSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const qux = textBlock(quxKey, quxSpanKey, 'qux')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [foo, bar, baz, qux],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 2,
      },
      backward: true,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 2,
      },
      backward: true,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: quxKey}]),
      insert([qux], 'after', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([foo, qux, bar, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
      offset: 2,
    },
    backward: true,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: true,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: barKey}, 'children', {_key: barSpanKey}],
        offset: 2,
      },
      backward: true,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: bazKey}]),
      insert([baz], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([baz, foo, qux, bar])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: barKey}, 'children', {_key: barSpanKey}],
      offset: 2,
    },
    backward: false,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: bazKey}]),
      insert([baz], 'after', [{_key: barKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([foo, qux, bar, baz])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: quxKey}, 'children', {_key: quxSpanKey}],
      offset: 2,
    },
    backward: false,
  })
})

// Moving a block should keep its selected range, but removing it first relocates the anchor to its neighbour.
test.fails('Scenario: Moving a block that also changes type keeps a range whose anchor is in the moved block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const imageKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      blockObjects: [{name: 'image'}, {name: 'video'}],
    }),
    initialValue: [foo, {_type: 'image', _key: imageKey}, baz],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: imageKey}], offset: 0},
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: imageKey}], offset: 0},
      focus: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: imageKey}]),
      insert([{_type: 'video', _key: imageKey}], 'before', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {_type: 'video', _key: imageKey},
      foo,
      baz,
    ])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: imageKey}], offset: 0},
    focus: {
      path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
    },
    backward: false,
  })
})

// Moving a text block that becomes a block object should reset the range to the start of foo, but the range is kept across bar and foo.
test.fails('Scenario: Moving a text block that becomes a block object resets a range whose anchor is in it', async () => {
  const keyGenerator = createTestKeyGenerator()
  const fooKey = keyGenerator()
  const fooSpanKey = keyGenerator()
  const barKey = keyGenerator()
  const barSpanKey = keyGenerator()
  const bazKey = keyGenerator()
  const bazSpanKey = keyGenerator()
  const foo = textBlock(fooKey, fooSpanKey, 'foo')
  const bar = textBlock(barKey, barSpanKey, 'bar')
  const baz = textBlock(bazKey, bazSpanKey, 'baz')
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
    initialValue: [foo, bar, baz],
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 2,
      },
      backward: true,
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: bazKey}, 'children', {_key: bazSpanKey}],
        offset: 1,
      },
      focus: {
        path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
        offset: 2,
      },
      backward: true,
    })
  })

  editor.send({
    type: 'apply',
    patches: [
      unset([{_key: bazKey}]),
      insert([{_type: 'image', _key: bazKey}], 'after', [{_key: fooKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      foo,
      {_type: 'image', _key: bazKey},
      bar,
    ])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
      offset: 0,
    },
    focus: {
      path: [{_key: fooKey}, 'children', {_key: fooSpanKey}],
      offset: 0,
    },
    backward: false,
  })
})

test('Scenario: Multiple blocks with children changes in same update', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block1Key = keyGenerator()
  const spanAKey = keyGenerator()
  const block2Key = keyGenerator()
  const spanBKey = keyGenerator()
  const spanCKey = keyGenerator()
  const spanDKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: spanAKey, text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [
          {_type: 'span', _key: spanBKey, text: 'world', marks: []},
          {_type: 'span', _key: spanCKey, text: '!', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  const newValue = [
    {
      _type: 'block',
      _key: block1Key,
      children: [
        {_type: 'span', _key: spanAKey, text: 'hello', marks: []},
        {_type: 'span', _key: spanDKey, text: ' there', marks: ['strong']},
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: block2Key,
      children: [{_type: 'span', _key: spanBKey, text: 'world', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ]

  editor.send({
    type: 'apply',
    patches: [
      insert([newValue[0]!.children[1]], 'after', [
        {_key: block1Key},
        'children',
        {_key: spanAKey},
      ]),
      unset([{_key: block2Key}, 'children', {_key: spanCKey}]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual(newValue)
  })
})

test('Scenario: Removing blocks from the end (remote value has fewer blocks)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block1Key = keyGenerator()
  const span1Key = keyGenerator()
  const block2Key = keyGenerator()
  const span2Key = keyGenerator()
  const block3Key = keyGenerator()
  const span3Key = keyGenerator()

  const block1 = {
    _type: 'block',
    _key: block1Key,
    children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block2 = {
    _type: 'block',
    _key: block2Key,
    children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block3 = {
    _type: 'block',
    _key: block3Key,
    children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
    markDefs: [],
    style: 'normal',
  }

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [block1, block2, block3],
  })

  editor.send({type: 'apply', patches: [unset([{_key: block3Key}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([block1, block2])
  })
})

test('Scenario: Removing blocks from the middle (remote value drops a middle block)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const block1Key = keyGenerator()
  const span1Key = keyGenerator()
  const block2Key = keyGenerator()
  const span2Key = keyGenerator()
  const block3Key = keyGenerator()
  const span3Key = keyGenerator()

  const block1 = {
    _type: 'block',
    _key: block1Key,
    children: [{_type: 'span', _key: span1Key, text: 'First', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block2 = {
    _type: 'block',
    _key: block2Key,
    children: [{_type: 'span', _key: span2Key, text: 'Second', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const block3 = {
    _type: 'block',
    _key: block3Key,
    children: [{_type: 'span', _key: span3Key, text: 'Third', marks: []}],
    markDefs: [],
    style: 'normal',
  }

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [block1, block2, block3],
  })

  editor.send({type: 'apply', patches: [unset([{_key: block2Key}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([block1, block3])
  })
})

test("Scenario: Updating an inline object's `text` field", async () => {
  const schemaDefinition = defineSchema({
    inlineObjects: [
      {name: 'inlineNote', fields: [{name: 'text', type: 'string'}]},
    ],
  })
  const {editor} = await createTestEditor({
    schemaDefinition,
    initialValue: [
      {
        _key: 'b1',
        _type: 'block',
        children: [
          {_key: 's1', _type: 'span', text: '', marks: []},
          {_key: 'n1', _type: 'inlineNote', text: ''},
          {_key: 's2', _type: 'span', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
  })

  editor.send({
    type: 'apply',
    patches: [set('hello', [{_key: 'b1'}, 'children', {_key: 'n1'}, 'text'])],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'b1',
        _type: 'block',
        children: [
          {_key: 's1', _type: 'span', text: '', marks: []},
          {_key: 'n1', _type: 'inlineNote', text: 'hello'},
          {_key: 's2', _type: 'span', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: replacing a whole value with the same block/span keys emits no patches', async () => {
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            for (const changePatch of event.patches) {
              patches.push(changePatch)
            }
          }
        }}
      />
    ),
  })

  editor.send({
    type: 'apply',
    patches: [
      diffMatchPatch('foo', 'foo!', [
        {_key: 'b0'},
        'children',
        {_key: 's0'},
        'text',
      ]),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'foo!', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  const patchesAtSettle = [...patches]
  expect(patchesAtSettle).toEqual([])

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 4},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 4},
    },
  })
  editor.send({type: 'insert.text', text: ' foo'})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'foo! foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  await vi.waitFor(() => {
    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: stringifyPatches(makePatches(makeDiff('foo!', 'foo! foo'))),
        origin: 'local',
      },
    ])
  })
})

test('Scenario: Clearing synced value with an empty array', async () => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
  })

  editor.send({
    type: 'apply',
    patches: [
      insert(
        [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        'before',
        [0],
      ),
    ],
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({type: 'apply', patches: [unset([{_key: 'b0'}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

test('Scenario: Clearing locally typed text with an empty array after the value echoed back', async () => {
  let hostValue: Array<PortableTextBlock> | undefined
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({}),
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change' && event.origin === 'local') {
            hostValue = applyAll(hostValue, event.patches)
          }
        }}
      />
    ),
  })

  await userEvent.click(locator)
  await userEvent.type(locator, 'foo')

  await vi.waitFor(() => {
    expect(hostValue).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({type: 'apply', patches: []})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  editor.send({type: 'apply', patches: [unset([{_key: 'k0'}])]})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

describe('block object children', () => {
  const childrenFieldSchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'gallery',
        fields: [
          {name: 'title', type: 'string'},
          {
            name: 'children',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'item',
                fields: [{name: 'label', type: 'string'}],
              },
            ],
          },
        ],
      },
    ],
  })
  test('Scenario: Loading a gallery keeps its children without patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const textPath1 = [{_key: fooKey}, 'children', {_key: fooSpanKey}]

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      gallery(galleryKey, itemKey, 'a'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                patches.push(changePatch)
              }
            }
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'gallery',
          _key: galleryKey,
          title: 'T',
          children: [{_type: 'item', _key: itemKey, label: 'a'}],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: textPath1, offset: 3},
        focus: {path: textPath1, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: 'x'})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [{_key: fooKey}, 'children', {_key: fooSpanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
        },
      ])
    })
  })

  test('Scenario: Updating a gallery replaces its children', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      gallery(galleryKey, itemKey, 'a'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change' && event.origin === 'local') {
              for (const changePatch of event.patches) {
                patches.push(changePatch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'set',
          path: [{_key: galleryKey}, 'children'],
          value: [{_type: 'item', _key: itemKey, label: 'b'}],
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'gallery',
          _key: galleryKey,
          title: 'T',
          children: [{_type: 'item', _key: itemKey, label: 'b'}],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Replacing a gallery at root keeps the incoming children', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const replacementKey = keyGenerator()
    const replacementItemKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue: [
        textBlock(fooKey, fooSpanKey, 'foo'),
        gallery(galleryKey, itemKey, 'a'),
        textBlock(barKey, barSpanKey, 'bar'),
      ],
    })
    editor.send({
      type: 'apply',
      patches: [
        {type: 'unset', path: [{_key: galleryKey}]},
        {
          type: 'insert',
          path: [{_key: barKey}],
          position: 'before',
          items: [gallery(replacementKey, replacementItemKey, 'b')],
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'gallery',
          _key: replacementKey,
          title: 'T',
          children: [{_type: 'item', _key: replacementItemKey, label: 'b'}],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Removing a gallery children field removes it from the held value', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue: [
        textBlock(fooKey, fooSpanKey, 'foo'),
        gallery(galleryKey, itemKey, 'a'),
        textBlock(barKey, barSpanKey, 'bar'),
      ],
    })
    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: [{_key: galleryKey}, 'children']}],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_type: 'gallery', _key: galleryKey, title: 'T'},
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
  function textBlock(
    key: string,
    spanKey: string,
    text: string,
  ): PortableTextBlock {
    return {
      _type: 'block',
      _key: key,
      children: [{_type: 'span', _key: spanKey, text, marks: []}],
      markDefs: [],
      style: 'normal',
    }
  }
  function gallery(key: string, itemKey: string, label: string) {
    return {
      _type: 'gallery',
      _key: key,
      title: 'T',
      children: [{_type: 'item', _key: itemKey, label}],
    }
  }
})

describe('block object children containers', () => {
  const childrenFieldSchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {name: 'title', type: 'string'},
          {name: 'children', type: 'array', of: [{type: 'block'}]},
        ],
      },
    ],
  })

  const childrenFieldNodes = [
    defineContainer({
      type: 'callout',
      arrayField: 'children',
      render: ({attributes, children}) => <div {...attributes}>{children}</div>,
    }),
  ]

  test('Scenario: Updating a children container renders its new content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()

    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      callout(calloutKey, innerBlockKey, innerSpanKey, 'inside'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: <NodePlugin nodes={childrenFieldNodes} />,
    })

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooinsidebar')
    })
    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('inside', 'inside!', [
          {_key: calloutKey},
          'children',
          {_key: innerBlockKey},
          'children',
          {_key: innerSpanKey},
          'text',
        ]),
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          title: 'T',
          children: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inside!', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooinside!bar')
    })
  })

  test('Scenario: Updating a children container preserves its caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()

    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const nestedPath = [
      {_key: calloutKey},
      'children',
      {_key: innerBlockKey},
      'children',
      {_key: innerSpanKey},
    ]

    const initialValue = [
      textBlock(fooKey, fooSpanKey, 'foo'),
      callout(calloutKey, innerBlockKey, innerSpanKey, 'inside'),
      textBlock(barKey, barSpanKey, 'bar'),
    ]
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: <NodePlugin nodes={childrenFieldNodes} />,
    })

    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooinsidebar')
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: nestedPath, offset: 3},
        focus: {path: nestedPath, offset: 3},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: nestedPath, offset: 3},
        focus: {path: nestedPath, offset: 3},
        backward: false,
      })
    })
    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('inside', 'inside!', [
          {_key: calloutKey},
          'children',
          {_key: innerBlockKey},
          'children',
          {_key: innerSpanKey},
          'text',
        ]),
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          title: 'T',
          children: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inside!', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('fooinside!bar')
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: nestedPath, offset: 3},
        focus: {path: nestedPath, offset: 3},
        backward: false,
      })
    })
  })
  test('Scenario: Replacing a callout at root keeps and renders its incoming blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const replacementKey = keyGenerator()
    const replacementBlockKey = keyGenerator()
    const replacementSpanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue: [
        textBlock(fooKey, fooSpanKey, 'foo'),
        callout(calloutKey, innerBlockKey, innerSpanKey, 'baz'),
        textBlock(barKey, barSpanKey, 'bar'),
      ],
      children: <NodePlugin nodes={childrenFieldNodes} />,
    })
    editor.send({
      type: 'apply',
      patches: [
        {type: 'unset', path: [{_key: calloutKey}]},
        {
          type: 'insert',
          path: [{_key: barKey}],
          position: 'before',
          items: [
            callout(
              replacementKey,
              replacementBlockKey,
              replacementSpanKey,
              'baz',
            ),
          ],
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: replacementKey,
          title: 'T',
          children: [
            {
              _type: 'block',
              _key: replacementBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: replacementSpanKey,
                  text: 'baz',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: barKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(locator.element().textContent).toEqual('foobazbar')
    })
  })

  function textBlock(blockKey: string, spanKey: string, text: string) {
    return {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: spanKey, text, marks: []}],
      markDefs: [],
      style: 'normal',
    }
  }

  function callout(
    key: string,
    blockKey: string,
    spanKey: string,
    text: string,
  ) {
    return {
      _type: 'callout',
      _key: key,
      title: 'T',
      children: [textBlock(blockKey, spanKey, text)],
    }
  }
})

function textBlock(
  key: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}
