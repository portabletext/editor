import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {afterEach, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {PortableTextEditor} from '../src/editor/PortableTextEditor'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {getNextInlineObject} from '../src/selectors/selector.get-next-inline-object'
import {getNextInlineObjects} from '../src/selectors/selector.get-next-inline-objects'
import {getPreviousInlineObject} from '../src/selectors/selector.get-previous-inline-object'
import {getPreviousInlineObjects} from '../src/selectors/selector.get-previous-inline-objects'
import {createTestEditor} from '../src/test/vitest'
import {getInline} from '../src/traversal/get-inline'
import {getNode} from '../src/traversal/get-node'
import {getTextBlock} from '../src/traversal/get-text-block'

afterEach(() => {
  vi.restoreAllMocks()
})

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'row'},
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

const calloutContainers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

test('Scenario: root array children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k12',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k13',
            text: '',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [
            {
              type: 'unset',
              path: [
                {
                  _key: 'k0',
                },
                'children',
                {
                  _key: 'k2',
                },
              ],
            },
          ],
          description:
            "Child with _key 'k2' in block with key 'k0' has invalid '_type' property (block).",
          action: 'Remove the object',
          item: {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
          i18n: {
            description:
              'inputs.portable-text.invalid-value.disallowed-child-type.description',
            action:
              'inputs.portable-text.invalid-value.disallowed-child-type.action',
            values: {
              key: 'k0',
              childKey: 'k2',
              childType: 'block',
            },
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(mutations).toEqual([])
  })
  expect(
    locator.element().querySelectorAll('[data-pt-inline="object"]').length,
  ).toEqual(0)
  expect(locator.element().textContent?.includes('inner')).toEqual(false)
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([])
  errors.mockRestore()
})

test('Scenario: root array children through remote-child', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: root array children through type', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foox',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foox',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: root array children through select-all', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: '',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-foo\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-foo\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
          {
            type: 'unset',
            path: [],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: '',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect(errors.mock.calls).toEqual([
    ['Unable to find Inline Object "block" in Schema'],
    ['Unable to find Inline Object "block" in Schema'],
  ])
  errors.mockRestore()
})

test('Scenario: root array children through remote-parent', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[8]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k8',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through remote-child', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through type', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foox',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foox',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through select-all', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: '',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-foo\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-foo\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: '',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect(errors.mock.calls).toEqual([
    ['Unable to find Inline Object "block" in Schema'],
    ['Unable to find Inline Object "block" in Schema'],
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through remote-container', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'callout',
            _key: keys[8]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: keys[2]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[3]!,
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k8',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 array children through update', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: keys[2]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[3]!,
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through remote-child', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through type', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foox',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k6',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k6',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'callout',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foox',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through select-all', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[6]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: '',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k6',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-foo\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k6',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k6',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k6',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k6',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-foo\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k6',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k6',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k6',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'callout',
                _key: 'k6',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: '',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect(errors.mock.calls).toEqual([
    ['Unable to find Inline Object "block" in Schema'],
    ['Unable to find Inline Object "block" in Schema'],
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through remote-container', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'callout',
            _key: keys[8]!,
            content: [
              {
                _type: 'callout',
                _key: keys[6]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: keys[2]!,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: keys[3]!,
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        _type: 'callout',
        _key: 'k8',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout2 array children through update', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'callout',
            _key: keys[6]!,
            content: [
              {
                _type: 'block',
                _key: keys[0]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[1]!,
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: keys[2]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[3]!,
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'callout',
            _key: 'k6',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: table array children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: keys[2]!,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: keys[3]!,
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: table array children through remote-child', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: table array children through type', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foox',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'rows',
            {
              _key: 'k6',
            },
            'cells',
            {
              _key: 'k7',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'rows',
              {
                _key: 'k6',
              },
              'cells',
              {
                _key: 'k7',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'table',
            _key: 'k5',
            rows: [
              {
                _type: 'row',
                _key: 'k6',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k1',
                            text: 'foox',
                            marks: [],
                          },
                          {
                            _type: 'block',
                            _key: 'k2',
                            style: 'normal',
                            markDefs: [],
                            children: [
                              {
                                _type: 'span',
                                _key: 'k3',
                                text: 'inner',
                                marks: [],
                              },
                            ],
                          },
                          {
                            _type: 'span',
                            _key: 'k4',
                            text: 'baz',
                            marks: [],
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
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: table array children through select-all', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'rows',
          {
            _key: keys[6]!,
          },
          'cells',
          {
            _key: keys[7]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: '',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'rows',
            {
              _key: 'k6',
            },
            'cells',
            {
              _key: 'k7',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-foo\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'rows',
            {
              _key: 'k6',
            },
            'cells',
            {
              _key: 'k7',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'rows',
            {
              _key: 'k6',
            },
            'cells',
            {
              _key: 'k7',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
            'text',
          ],
          value: '@@ -1,3 +0,0 @@\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'rows',
            {
              _key: 'k6',
            },
            'cells',
            {
              _key: 'k7',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'rows',
              {
                _key: 'k6',
              },
              'cells',
              {
                _key: 'k7',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-foo\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'rows',
              {
                _key: 'k6',
              },
              'cells',
              {
                _key: 'k7',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'rows',
              {
                _key: 'k6',
              },
              'cells',
              {
                _key: 'k7',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
              'text',
            ],
            value: '@@ -1,3 +0,0 @@\n-baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'rows',
              {
                _key: 'k6',
              },
              'cells',
              {
                _key: 'k7',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'table',
            _key: 'k5',
            rows: [
              {
                _type: 'row',
                _key: 'k6',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k7',
                    content: [
                      {
                        _type: 'block',
                        _key: 'k0',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k1',
                            text: '',
                            marks: [],
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
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect(errors.mock.calls).toEqual([
    ['Unable to find Inline Object "block" in Schema'],
    ['Unable to find Inline Object "block" in Schema'],
  ])
  errors.mockRestore()
})

test('Scenario: table array children through remote-container', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'table',
            _key: keys[8]!,
            rows: [
              {
                _type: 'row',
                _key: keys[6]!,
                cells: [
                  {
                    _type: 'cell',
                    _key: keys[7]!,
                    content: [
                      {
                        _type: 'block',
                        _key: keys[0]!,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: keys[1]!,
                            text: 'foo',
                            marks: [],
                          },
                          {
                            _type: 'block',
                            _key: keys[2]!,
                            style: 'normal',
                            markDefs: [],
                            children: [
                              {
                                _type: 'span',
                                _key: keys[3]!,
                                text: 'inner',
                                marks: [],
                              },
                            ],
                          },
                          {
                            _type: 'span',
                            _key: keys[4]!,
                            text: 'baz',
                            marks: [],
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
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: table array children through update', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'table',
        _key: keys[5]!,
        rows: [
          {
            _type: 'row',
            _key: keys[6]!,
            cells: [
              {
                _type: 'cell',
                _key: keys[7]!,
                content: [
                  {
                    _type: 'block',
                    _key: keys[0]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: keys[1]!,
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: keys[2]!,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: keys[3]!,
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: keys[4]!,
                        text: 'baz',
                        marks: [],
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
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k5',
        rows: [
          {
            _type: 'row',
            _key: 'k6',
            cells: [
              {
                _type: 'cell',
                _key: 'k7',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k1',
                        text: 'foo',
                        marks: [],
                      },
                      {
                        _type: 'block',
                        _key: 'k2',
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {
                            _type: 'span',
                            _key: 'k3',
                            text: 'inner',
                            marks: [],
                          },
                        ],
                      },
                      {
                        _type: 'span',
                        _key: 'k4',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 string children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 null children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: null,
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: null,
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: callout1 missing children through start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(locator.element().textContent?.includes('inner')).toEqual(false)
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: root array children through update', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [
            {
              type: 'unset',
              path: [
                {
                  _key: 'k0',
                },
                'children',
                {
                  _key: 'k2',
                },
              ],
            },
          ],
          description:
            "Child with _key 'k2' in block with key 'k0' has invalid '_type' property (block).",
          action: 'Remove the object',
          item: {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
          i18n: {
            description:
              'inputs.portable-text.invalid-value.disallowed-child-type.description',
            action:
              'inputs.portable-text.invalid-value.disallowed-child-type.action',
            values: {
              key: 'k0',
              childKey: 'k2',
              childType: 'block',
            },
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(mutations).toEqual([])
  })
  expect(
    locator.element().querySelectorAll('[data-pt-inline="object"]').length,
  ).toEqual(0)
  expect(locator.element().textContent?.includes('inner')).toEqual(false)
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([])
  errors.mockRestore()
})

test('Scenario: root array children through backspace', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(0))
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.undo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k3',
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'inner',
                  marks: [],
                },
              ],
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.redo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'inner',
                  marks: [],
                },
              ],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: root array children through insert.block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  editor.send({
    type: 'insert.block',
    block: {
      _type: 'block',
      _key: keys[8]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo',
          marks: [],
        },
        {
          _type: 'block',
          _key: keys[2]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[3]!,
              text: 'inner',
              marks: [],
            },
          ],
        },
        {
          _type: 'span',
          _key: keys[4]!,
          text: 'baz',
          marks: [],
        },
      ],
    },
    placement: 'after',
    select: 'end',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k8',
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k8',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                  marks: [],
                },
                {
                  _type: 'span',
                  _key: 'k4',
                  text: 'baz',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k8',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k8',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'k8',
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k8',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k8',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
          {
            _type: 'block',
            _key: 'k8',
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([])
  errors.mockRestore()
})

test('Scenario: root array children through insert.child', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  editor.send({
    type: 'insert.child',
    child: {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[3]!,
          text: 'inner',
          marks: [],
        },
      ],
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([])
    expect(mutations).toEqual([])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([])
  errors.mockRestore()
})

test('Scenario: root array children through paste', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  const dataTransfer = new DataTransfer()
  dataTransfer.setData(
    'application/x-portable-text',
    safeStringify([
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ]),
  )
  editor.send({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {selection: editor.getSnapshot().context.selection!},
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foofoobazbaz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [
            {
              _key: 'k0',
            },
            'markDefs',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k16',
              marks: [],
              text: '',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k14',
              text: 'foo',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k15',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+foo\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,9 @@\n foofoo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k15',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k16',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -2,8 +2,11 @@\n oofoobaz\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'set',
            path: [
              {
                _key: 'k0',
              },
              'markDefs',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k16',
                marks: [],
                text: '',
              },
            ],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k14',
                text: 'foo',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k15',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+foo\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,9 @@\n foofoo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k15',
              },
            ],
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k16',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -2,8 +2,11 @@\n oofoobaz\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foofoobazbaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([])
  errors.mockRestore()
})

test('Scenario: callout1 array children through backspace-keyless', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'inner',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
                _key: 'k14',
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(0))
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            1,
            '_key',
          ],
          value: 'k14',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'set',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            value: 'k14',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.undo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
                _key: 'k14',
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            1,
            '_key',
          ],
          value: 'k14',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'inner',
                  marks: [],
                },
              ],
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'set',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            value: 'k14',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                    _key: 'k14',
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.redo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            1,
            '_key',
          ],
          value: 'k14',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'inner',
                  marks: [],
                },
              ],
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k14',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k5',
            },
            'content',
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'set',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              1,
              '_key',
            ],
            value: 'k14',
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k3',
                    text: 'inner',
                    marks: [],
                  },
                ],
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foo',
                    marks: [],
                  },
                  {
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 'k3',
                        text: 'inner',
                        marks: [],
                      },
                    ],
                    _key: 'k14',
                  },
                  {
                    _type: 'span',
                    _key: 'k4',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k14',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k5',
              },
              'content',
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'callout',
            _key: 'k5',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: 'k1',
                    text: 'foobaz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: root string children through backspace', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const mutations: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
            if (event.type === 'mutation') {
              mutations.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: 'oops',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: 'oops',
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(0))
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.undo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: 'oops',
          },
          {
            _type: 'span',
            _key: 'k4',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: 'oops',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'history.redo',
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 'k1',
            text: 'foobaz',
            marks: [],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'span',
              _key: 'k4',
              text: 'baz',
              marks: [],
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [
            {
              _key: 'k0',
            },
            'children',
          ],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: 'oops',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          origin: 'local',
        },
      },
    ])
    expect(mutations).toEqual([
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,6 +1,3 @@\n foo\n-baz\n',
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [
              {
                _key: 'k0',
              },
              'children',
            ],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
            ],
            position: 'after',
            items: [
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: 'oops',
              },
              {
                _type: 'span',
                _key: 'k4',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        type: 'mutation',
        patches: [
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k2',
              },
            ],
            origin: 'local',
          },
          {
            type: 'diffMatchPatch',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k1',
              },
              'text',
            ],
            value: '@@ -1,3 +1,6 @@\n foo\n+baz\n',
            origin: 'local',
          },
          {
            type: 'unset',
            path: [
              {
                _key: 'k0',
              },
              'children',
              {
                _key: 'k4',
              },
            ],
            origin: 'local',
          },
        ],
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'k1',
                text: 'foobaz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
  errors.mockRestore()
})

test('Scenario: Arrow keys cross a nested text block as an inline object at the root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: Arrow keys cross a nested text block as an inline object at the callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[2]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: Shift and ArrowRight select across a nested text block at the root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: 'foo',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'bar',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: Shift and ArrowRight select across a nested text block at the callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.selection).toEqual({
      backward: false,
      anchor: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        offset: 3,
      },
      focus: {
        path: [
          {
            _key: keys[5]!,
          },
          'content',
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[4]!,
          },
        ],
        offset: 0,
      },
    }),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: A nested text block keeps a non-object child without patches at the callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  'x',
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  'x',
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: Hidden right to left text leaves the parent direction unchanged at the root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: '',
            marks: [],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {
            _key: keys[0]!,
          },
          'children',
          {
            _key: keys[1]!,
          },
        ],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'אבג',
                marks: [],
              },
            ],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keys[1]!,
            text: '',
            marks: [],
          },
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[3]!,
                text: 'אבג',
                marks: [],
              },
            ],
          },
          {
            _type: 'span',
            _key: keys[4]!,
            text: 'baz',
            marks: [],
          },
        ],
      },
    ])
  })
  await vi.waitFor(() =>
    expect(
      locator
        .element()
        .querySelector('[data-pt-block="text"]')
        ?.getAttribute('dir'),
    ).toEqual(null),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: Hidden right to left text leaves the parent direction unchanged at the callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: '',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'אבג',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() => {
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1)
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: keys[5]!,
        content: [
          {
            _type: 'block',
            _key: keys[0]!,
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: '',
                marks: [],
              },
              {
                _type: 'block',
                _key: keys[2]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'אבג',
                    marks: [],
                  },
                ],
              },
              {
                _type: 'span',
                _key: keys[4]!,
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ])
  })
  await vi.waitFor(() =>
    expect(
      locator
        .element()
        .querySelector('[data-pt-block="text"]')
        ?.getAttribute('dir'),
    ).toEqual(null),
  )
  expect(events).toEqual([])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: adjacent nested text blocks at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual([
    'k0',
    'k1',
    'k2',
    'k3',
    'k4',
    'k5',
    'k6',
    'k7',
    'k8',
    'k9',
    'k10',
    'k11',
  ])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: keys[6]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(2),
  )
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
      focus: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('Z')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k14', text: '', marks: []},
          {
            _type: 'block',
            _key: 'k6',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k4', text: 'baz', marks: []},
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [{_key: 'k0'}, 'children'],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
          position: 'before',
          items: [{_type: 'span', _key: 'k14', text: '', marks: []}],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+Z\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,4 +1,3 @@\n foo\n-Z\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested text block as first child at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual([
    'k0',
    'k1',
    'k2',
    'k3',
    'k4',
    'k5',
    'k6',
    'k7',
    'k8',
    'k9',
    'k10',
    'k11',
  ])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'before',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
      focus: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('Z')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k14', text: '', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [{_key: 'k0'}, 'children'],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          position: 'before',
          items: [{_type: 'span', _key: 'k14', text: '', marks: []}],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+Z\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,4 +1,3 @@\n foo\n-Z\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested text block as last child at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 12}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin nodes={calloutContainers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual([
    'k0',
    'k1',
    'k2',
    'k3',
    'k4',
    'k5',
    'k6',
    'k7',
    'k8',
    'k9',
    'k10',
    'k11',
  ])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
      focus: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => expect(window.getSelection()?.focusOffset).toEqual(3))
  await userEvent.keyboard('Z')
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k14', text: '', marks: []},
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [{_key: 'k0'}, 'children'],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          position: 'after',
          items: [{_type: 'span', _key: 'k14', text: '', marks: []}],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+Z\n',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,4 +1,3 @@\n foo\n-Z\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested text block selectors', async () => {
  const portableTextEditorRef = createRef<PortableTextEditor>()
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  expect
    .soft(
      PortableTextEditor.isVoid(
        portableTextEditorRef.current!,
        getNode(editor.getSnapshot(), [
          {_key: keys[0]!},
          'children',
          {_key: keys[2]!},
        ])!.node,
      ),
    )
    .toEqual(true)
  expect
    .soft(
      PortableTextEditor.isVoid(
        portableTextEditorRef.current!,
        getNode(editor.getSnapshot(), [{_key: keys[0]!}])!.node,
      ),
    )
    .toEqual(false)
  expect
    .soft(
      PortableTextEditor.isVoid(portableTextEditorRef.current!, {
        ...getNode(editor.getSnapshot(), [
          {_key: keys[0]!},
          'children',
          {_key: keys[2]!},
        ])!.node,
      }),
    )
    .toEqual(true)
  expect
    .soft(
      getTextBlock(editor.getSnapshot(), [
        {_key: keys[0]!},
        'children',
        {_key: keys[2]!},
      ]),
    )
    .toEqual(undefined)
  expect
    .soft(
      getInline(editor.getSnapshot(), [
        {_key: keys[0]!},
        'children',
        {_key: keys[2]!},
      ]),
    )
    .toEqual({
      node: {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
    })
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 0,
      },
      focus: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        offset: 0,
      },
    },
  })
  expect.soft(getNextInlineObject(editor.getSnapshot())).toEqual({
    node: {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
  })
  expect.soft(getNextInlineObjects(editor.getSnapshot())).toEqual([
    {
      node: {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
    },
  ])
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[4]!}],
        offset: 0,
      },
      focus: {
        path: [{_key: keys[0]!}, 'children', {_key: keys[4]!}],
        offset: 0,
      },
    },
  })
  expect.soft(getPreviousInlineObject(editor.getSnapshot())).toEqual({
    node: {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
  })
  expect.soft(getPreviousInlineObjects(editor.getSnapshot())).toEqual([
    {
      node: {
        _type: 'block',
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
    },
  ])
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: nested text block child.set', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            events.push(event)
          }
        }}
      />
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  editor.send({
    type: 'child.set',
    at: [{_key: keys[0]!}, 'children', {_key: keys[2]!}],
    props: {style: 'other'},
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k4', text: 'baz', marks: []},
        ],
      },
    ])
    expect(events).toEqual([])
  })
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: nested text block child.unset', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            events.push(event)
          }
        }}
      />
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  editor.send({
    type: 'child.unset',
    at: [{_key: keys[0]!}, 'children', {_key: keys[2]!}],
    props: ['style'],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k4', text: 'baz', marks: []},
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}, 'style'],
          origin: 'local',
        },
      },
    ])
  })
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: nested text block block.set', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            events.push(event)
          }
        }}
      />
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'foo',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  editor.send({
    type: 'block.set',
    at: [{_key: keys[0]!}, 'children', {_key: keys[2]!}],
    props: {style: 'normal'},
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k2',
            style: 'foo',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k4', text: 'baz', marks: []},
        ],
      },
    ])
    expect(events).toEqual([])
  })
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: nested text block block.unset', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
          {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            events.push(event)
          }
        }}
      />
    ),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: keys[2]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  editor.send({
    type: 'block.unset',
    at: [{_key: keys[0]!}, 'children', {_key: keys[2]!}],
    props: ['style', '_key'],
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {
            _type: 'block',
            _key: 'k7',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {_type: 'span', _key: 'k4', text: 'baz', marks: []},
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}, '_key'],
          value: 'k7',
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k7'}, 'style'],
          origin: 'local',
        },
      },
    ])
  })
  expect([...new Set(errors.mock.calls.flat())]).toEqual([
    'Unable to find Inline Object "block" in Schema',
  ])
})

test('Scenario: isVoid distinguishes duplicate keys with nested first', async () => {
  const portableTextEditorRef = createRef<PortableTextEditor>()
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const parent = {
    _type: 'block',
    _key: keys[0]!,
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
      {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
    ],
  }
  const root = {
    _type: 'block',
    _key: keys[3]!,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
  }
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [parent, root],
    children: (
      <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
    ),
  })
  editor.send({
    type: 'patches',
    snapshot: undefined,
    patches: [
      {
        type: 'insert',
        origin: 'remote',
        position: 'after',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        items: [{...root}],
      },
    ],
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  const rootNode = getNode(editor.getSnapshot(), [{_key: keys[3]!}])!.node
  const nestedNode = getNode(editor.getSnapshot(), [
    {_key: keys[0]!},
    'children',
    {_key: keys[3]!},
  ])!.node
  expect
    .soft(PortableTextEditor.isVoid(portableTextEditorRef.current!, rootNode))
    .toEqual(false)
  expect
    .soft(PortableTextEditor.isVoid(portableTextEditorRef.current!, nestedNode))
    .toEqual(true)
  expect
    .soft(
      PortableTextEditor.isVoid(portableTextEditorRef.current!, {...rootNode}),
    )
    .toEqual(false)
  expect
    .soft(
      PortableTextEditor.isVoid(portableTextEditorRef.current!, {
        ...nestedNode,
      }),
    )
    .toEqual(false)
})

test('Scenario: isVoid distinguishes duplicate keys with root first', async () => {
  const portableTextEditorRef = createRef<PortableTextEditor>()
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const parent = {
    _type: 'block',
    _key: keys[0]!,
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
      {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
    ],
  }
  const root = {
    _type: 'block',
    _key: keys[3]!,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
  }
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [root, parent],
    children: (
      <InternalPortableTextEditorRefPlugin ref={portableTextEditorRef} />
    ),
  })
  editor.send({
    type: 'patches',
    snapshot: undefined,
    patches: [
      {
        type: 'insert',
        origin: 'remote',
        position: 'after',
        path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
        items: [{...root}],
      },
    ],
  })
  await vi.waitFor(() =>
    expect(
      locator.element().querySelectorAll('[data-pt-inline="object"]').length,
    ).toEqual(1),
  )
  const rootNode = getNode(editor.getSnapshot(), [{_key: keys[3]!}])!.node
  const nestedNode = getNode(editor.getSnapshot(), [
    {_key: keys[0]!},
    'children',
    {_key: keys[3]!},
  ])!.node
  expect
    .soft(PortableTextEditor.isVoid(portableTextEditorRef.current!, rootNode))
    .toEqual(false)
  expect
    .soft(PortableTextEditor.isVoid(portableTextEditorRef.current!, nestedNode))
    .toEqual(true)
  expect
    .soft(
      PortableTextEditor.isVoid(portableTextEditorRef.current!, {...rootNode}),
    )
    .toEqual(false)
  expect
    .soft(
      PortableTextEditor.isVoid(portableTextEditorRef.current!, {
        ...nestedNode,
      }),
    )
    .toEqual(false)
})
