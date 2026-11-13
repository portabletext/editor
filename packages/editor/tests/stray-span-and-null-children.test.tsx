import {applyAll} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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

test('Scenario: callout span through start value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])

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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: callout span through update value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: callout span through remote span stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}],
        position: 'after',
        items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: callout span through remote container stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k0'}],
        position: 'after',
        items: [
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
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
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested callout span through start value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])

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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                  {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                ],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested callout span through update value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                  {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                ],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested callout span through remote span stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
        ],
        position: 'after',
        items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                  {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                ],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: nested callout span through remote container stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k0'}],
        position: 'after',
        items: [
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
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
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'content',
          {_key: keys[6]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
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
                  {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                ],
              },
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
            {_key: 'k5'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: table cell span through start value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])

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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: table cell span through update value stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: table cell span through remote span stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
        ],
        position: 'after',
        items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
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
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: table cell span through remote container stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k0'}],
        position: 'after',
        items: [
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
                        ],
                      },
                      {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
                      {
                        _type: 'block',
                        _key: keys[3]!,
                        style: 'normal',
                        markDefs: [],
                        children: [
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
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: keys[5]!},
          'rows',
          {_key: keys[6]!},
          'cells',
          {_key: keys[7]!},
          'content',
          {_key: keys[0]!},
          'children',
          {_key: keys[1]!},
        ],
        offset: 3,
      },
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
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
                      {_type: 'span', _key: 'k1', text: 'foox', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: root span through remote span stays an object while typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={[...tableContainers, ...calloutContainers]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: keys[0]!}],
        position: 'after',
        items: [{_type: 'span', _key: keys[2]!, text: 'bar', marks: []}],
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
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {_type: 'span', _key: 'k2', text: 'bar', marks: []},
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
    expect(locator.element().textContent?.includes('bar')).toEqual(false)
    expect(
      locator.element().querySelectorAll('[data-pt-block="object"]').length,
    ).toEqual(1)
  })
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
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
      {_type: 'span', _key: 'k2', text: 'bar', marks: []},
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})
const selectableObject = defineBlockObject({
  type: '*',
  render: (props) =>
    props.renderDefault({
      ...props,
      attributes: {...props.attributes, 'data-selected': props.selected},
    }),
})

test('Scenario: Backspace deletes a keyed callout span object with one unset', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  await userEvent.click(page.getByText('[span: k2]'))
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k5'}, 'content', {_key: 'k2'}], offset: 0},
      focus: {path: [{_key: 'k5'}, 'content', {_key: 'k2'}], offset: 0},
      backward: false,
    })
  })
  await vi.waitFor(() => {
    expect(
      locator
        .element()
        .querySelector('[data-pt-block="object"]')
        ?.getAttribute('data-selected'),
    ).toEqual('true')
  })
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k5'}, 'content', {_key: 'k2'}],
          origin: 'local',
        },
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  })

  events.length = 0
  editor.send({type: 'history.undo'})
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [{_key: 'k5'}, 'content'],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [{_key: 'k5'}, 'content', {_key: 'k0'}],
          position: 'after',
          items: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
          origin: 'local',
        },
      },
    ])
  })
  events.length = 0
  editor.send({type: 'history.redo'})
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k5'}, 'content', {_key: 'k2'}],
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: Backspace deletes a keyless callout span object with one unset', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {_type: 'span', text: 'bar', marks: ['em'], extra: 1},
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ] as Array<PortableTextBlock>,
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  await userEvent.click(page.getByText('[span: ]'))
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k5'}, 'content', 1], offset: 0},
      focus: {path: [{_key: 'k5'}, 'content', 1], offset: 0},
      backward: false,
    })
  })
  await vi.waitFor(() => {
    expect(
      locator
        .element()
        .querySelector('[data-pt-block="object"]')
        ?.getAttribute('data-selected'),
    ).toEqual('true')
  })
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k5'}, 'content', 1],
          origin: 'local',
        },
      },
    ])
    expect(locator.element().getAttribute('contenteditable')).toEqual('true')
  })

  events.length = 0
  editor.send({type: 'history.undo'})
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', text: 'bar', marks: ['em'], extra: 1},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          path: [{_key: 'k5'}, 'content'],
          value: [],
          origin: 'local',
        },
      },
      {
        type: 'patch',
        patch: {
          type: 'insert',
          path: [{_key: 'k5'}, 'content', {_key: 'k0'}],
          position: 'after',
          items: [{_type: 'span', text: 'bar', marks: ['em'], extra: 1}],
          origin: 'local',
        },
      },
    ])
  })
  events.length = 0
  editor.send({type: 'history.redo'})
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k5'}, 'content', 1],
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: a span between root blocks in the start value reports invalid value without applying its resolution', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
      {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch' || event.type === 'invalid value') {
            events.push(event)
          }
        }}
      />
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])

  await vi.waitFor(() => {
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [{type: 'unset', path: [{_key: 'k2'}]}],
          description: "Block with _key 'k2' has invalid _type 'span'",
          action: 'Remove the block',
          item: {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          i18n: {
            description:
              'inputs.portable-text.invalid-value.disallowed-type.description',
            action: 'inputs.portable-text.invalid-value.disallowed-type.action',
            values: {key: 'k2', typeName: 'span'},
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })
})

test('Scenario: a span between root blocks in an updated value reports invalid value without applying its resolution', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch' || event.type === 'invalid value') {
            events.push(event)
          }
        }}
      />
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
      {_type: 'span', _key: keys[2]!, text: 'bar', marks: []},
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [{type: 'unset', path: [{_key: 'k2'}]}],
          description: "Block with _key 'k2' has invalid _type 'span'",
          action: 'Remove the block',
          item: {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          i18n: {
            description:
              'inputs.portable-text.invalid-value.disallowed-type.description',
            action: 'inputs.portable-text.invalid-value.disallowed-type.action',
            values: {key: 'k2', typeName: 'span'},
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
  })
})

test('Scenario: a middle root text block with `children: null` in the start value reports invalid value without applying its resolution', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _type: 'block',
        _key: keys[0]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: keys[2]!,
        style: 'normal',
        markDefs: [],
        children: null,
      },
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch' || event.type === 'invalid value') {
            events.push(event)
          }
        }}
      />
    ),
  })
  expect(keys).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'])

  await vi.waitFor(() => {
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [{type: 'set', path: [{_key: 'k2'}], value: {children: []}}],
          description:
            "Text block with _key 'k2' has a invalid required property 'children'.",
          action: 'Reset the children property',
          item: {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: null,
          },
          i18n: {
            description:
              'inputs.portable-text.invalid-value.missing-or-invalid-children.description',
            action:
              'inputs.portable-text.invalid-value.missing-or-invalid-children.action',
            values: {key: 'k2'},
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: null,
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })

  locator.element().focus()
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    },
  })
  await vi.waitFor(() => {
    expect(window.getSelection()?.focusNode?.textContent).toEqual('foo')
    expect(window.getSelection()?.focusOffset).toEqual(3)
  })
  await userEvent.type(locator, 'x', {skipClick: true})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
      },
    ])
    expect(events).toEqual([
      {
        type: 'invalid value',
        resolution: {
          patches: [{type: 'set', path: [{_key: 'k2'}], value: {children: []}}],
          description:
            "Text block with _key 'k2' has a invalid required property 'children'.",
          action: 'Reset the children property',
          item: {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: null,
          },
          i18n: {
            description:
              'inputs.portable-text.invalid-value.missing-or-invalid-children.description',
            action:
              'inputs.portable-text.invalid-value.missing-or-invalid-children.action',
            values: {key: 'k2'},
          },
        },
        value: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: null,
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
      {
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
          origin: 'local',
        },
      },
    ])
  })
})

test('Scenario: a keyless span without text or marks in a callout stays as received without patches', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {_type: 'span'},
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span'},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([])
  })
})

test('Scenario: a keyless span without text or marks in a nested callout stays as received without patches', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {_type: 'span'},
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span'},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
    expect(events).toEqual([])
  })
})

test('Scenario: a keyless span without text or marks in a table cell stays as received without patches', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span'},
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span'},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
  })
})

test('Scenario: a collaborator span sharing the preceding block key at the root is renamed and Backspace removes only the span', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
      {
        _type: 'block',
        _key: keys[3]!,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k0'}],
        position: 'after',
        items: [{_type: 'span', _key: 'k0', text: 'bar', marks: []}],
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
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {_type: 'span', _key: 'k10', text: 'bar', marks: []},
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {type: 'set', path: [1, '_key'], value: 'k10', origin: 'local'},
      },
    ])
  })
  const valueBeforeDelete = editor.getSnapshot().context.value
  events.length = 0
  await userEvent.click(page.getByText('[span: k10]'))
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {type: 'unset', path: [{_key: 'k10'}], origin: 'local'},
      },
    ])
    expect(
      applyAll(
        valueBeforeDelete,
        events.flatMap((event) =>
          event.type === 'patch' ? [event.patch] : [],
        ),
      ),
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
      },
    ])
  })
})

test('Scenario: a collaborator span sharing the preceding block key in a callout is renamed and Backspace removes only the span', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
            children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: keys[3]!,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: keys[4]!, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k5'}, 'content', {_key: 'k0'}],
        position: 'after',
        items: [{_type: 'span', _key: 'k0', text: 'bar', marks: []}],
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {_type: 'span', _key: 'k10', text: 'bar', marks: []},
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'set',
          path: [{_key: 'k5'}, 'content', 1, '_key'],
          value: 'k10',
          origin: 'local',
        },
      },
    ])
  })
  const valueBeforeDelete = editor.getSnapshot().context.value
  events.length = 0
  await userEvent.click(page.getByText('[span: k10]'))
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
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
    expect(events).toEqual([
      {
        type: 'patch',
        patch: {
          type: 'unset',
          path: [{_key: 'k5'}, 'content', {_key: 'k10'}],
          origin: 'local',
        },
      },
    ])
    expect(
      applyAll(
        valueBeforeDelete,
        events.flatMap((event) =>
          event.type === 'patch' ? [event.patch] : [],
        ),
      ),
    ).toEqual([
      {
        _type: 'callout',
        _key: 'k5',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
        ],
      },
    ])
  })
})

test('Scenario: a collaborator span sharing the preceding block key in a nested callout is renamed and Backspace removes only the span', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
              },
              {
                _type: 'block',
                _key: keys[3]!,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: 'k5'}, 'content', {_key: 'k6'}, 'content', {_key: 'k0'}],
        position: 'after',
        items: [{_type: 'span', _key: 'k0', text: 'bar', marks: []}],
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {_type: 'span', _key: 'k10', text: 'bar', marks: []},
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
          path: [{_key: 'k5'}, 'content', {_key: 'k6'}, 'content', 1, '_key'],
          value: 'k10',
          origin: 'local',
        },
      },
    ])
  })
  const valueBeforeDelete = editor.getSnapshot().context.value
  events.length = 0
  await userEvent.click(page.getByText('[span: k10]'))
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
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
          type: 'unset',
          path: [
            {_key: 'k5'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k10'},
          ],
          origin: 'local',
        },
      },
    ])
    expect(
      applyAll(
        valueBeforeDelete,
        events.flatMap((event) =>
          event.type === 'patch' ? [event.patch] : [],
        ),
      ),
    ).toEqual([
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
                children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k3',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ])
  })
})

test('Scenario: a collaborator span sharing the preceding block key in a table cell is renamed and Backspace removes only the span', async () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const events: Array<EditorEmittedEvent> = []
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
                      {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: keys[3]!,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: keys[4]!, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin
          nodes={[...tableContainers, ...calloutContainers, selectableObject]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch' || event.type === 'invalid value') {
              events.push(event)
            }
          }}
        />
      </>
    ),
  })
  await expect.element(locator).toBeVisible()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [
          {_key: 'k5'},
          'rows',
          {_key: 'k6'},
          'cells',
          {_key: 'k7'},
          'content',
          {_key: 'k0'},
        ],
        position: 'after',
        items: [{_type: 'span', _key: 'k0', text: 'bar', marks: []}],
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {_type: 'span', _key: 'k10', text: 'bar', marks: []},
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
          type: 'set',
          path: [
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            1,
            '_key',
          ],
          value: 'k10',
          origin: 'local',
        },
      },
    ])
  })
  const valueBeforeDelete = editor.getSnapshot().context.value
  events.length = 0
  await userEvent.click(page.getByText('[span: k10]'))
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
          type: 'unset',
          path: [
            {_key: 'k5'},
            'rows',
            {_key: 'k6'},
            'cells',
            {_key: 'k7'},
            'content',
            {_key: 'k10'},
          ],
          origin: 'local',
        },
      },
    ])
    expect(
      applyAll(
        valueBeforeDelete,
        events.flatMap((event) =>
          event.type === 'patch' ? [event.patch] : [],
        ),
      ),
    ).toEqual([
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
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'baz', marks: []},
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
})
