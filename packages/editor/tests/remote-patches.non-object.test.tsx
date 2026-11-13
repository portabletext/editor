import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import type {ChangeEvent} from '../src/editor/relay'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  try {
    expect(console.error).not.toHaveBeenCalled()
  } finally {
    vi.restoreAllMocks()
  }
})

const schemaDefinition = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
              styles: [{name: 'normal'}],
              decorators: [{name: 'em'}],
            },
          ],
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
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
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
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'note',
    arrayField: 'body',
    render: ({children}) => <>{children}</>,
  }),
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

test('Scenario: insert removes null at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    null!,
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [{_key: key0}], position: 'after', items: [null!]},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [{_key: 'k0'}], position: 'after', node: null!},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes a string at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    'str',
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [{_key: key0}], position: 'after', items: ['str']},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [{_key: 'k0'}], position: 'after', node: 'str'},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: root set removes null at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    null!,
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: root set removes a string at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    'str',
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          'str',
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: keyed node set removes null at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    null!,
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: key2}], value: null!},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'set', path: [{_key: 'k2'}], value: null!}],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: positional node set removes null at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    null!,
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [1], value: null!}] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'set', path: [1], value: null!}],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes null at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        null!,
        {_type: 'span', _key: key9, text: 'bar', marks: []},
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'children', {_key: key8}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k9', text: 'bar', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'children', {_key: 'k8'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k9', text: 'bar', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: insert removes a string at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        'str',
        {_type: 'span', _key: key9, text: 'bar', marks: []},
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'children', {_key: key8}],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k9', text: 'bar', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'children', {_key: 'k8'}],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k9', text: 'bar', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: array set removes null at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        null!,
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'children'],
        value: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          null!,
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children'],
          value: [
            {_type: 'span', _key: 'k8', text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: 'k10', text: 'baz', marks: []},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: array set removes a string at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        'str',
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'children'],
        value: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          'str',
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children'],
          value: [
            {_type: 'span', _key: 'k8', text: 'foo', marks: []},
            'str',
            {_type: 'span', _key: 'k10', text: 'baz', marks: []},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: root set removes null at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        null!,
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key6,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key8, text: 'foo', marks: []},
              null!,
              {_type: 'span', _key: key10, text: 'baz', marks: []},
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'k8', text: 'foo', marks: []},
                null!,
                {_type: 'span', _key: 'k10', text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: root set removes a string at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        'str',
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key6,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key8, text: 'foo', marks: []},
              'str',
              {_type: 'span', _key: key10, text: 'baz', marks: []},
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'k8', text: 'foo', marks: []},
                'str',
                {_type: 'span', _key: 'k10', text: 'baz', marks: []},
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: keyed node set removes null at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        null!,
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'children', {_key: key9}],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children', {_key: 'k9'}],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: positional node set removes null at text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: key8, text: 'foo', marks: []},
        null!,
        {_type: 'span', _key: key10, text: 'baz', marks: []},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: key8, text: 'foo', marks: []},
          {_type: 'span', _key: key9, text: 'bar', marks: []},
          {_type: 'span', _key: key10, text: 'baz', marks: []},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: key6}, 'children', 1], value: null!},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k8', text: 'foo', marks: []},
          {_type: 'span', _key: 'k10', text: 'baz', marks: []},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'set', path: [{_key: 'k6'}, 'children', 1], value: null!},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'children', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'children', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'k8', text: 'foo', marks: []},
        {_type: 'span', _key: 'k10', text: 'baz', marks: []},
      ],
    },
  ])
})

test('Scenario: insert removes null at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        null!,
        {_type: 'link', _key: key9, href: 'bar'},
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'markDefs', {_key: key8}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k9', href: 'bar'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: insert removes a string at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        'str',
        {_type: 'link', _key: key9, href: 'bar'},
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'markDefs', {_key: key8}],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k9', href: 'bar'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: array set removes null at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        null!,
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'markDefs'],
        value: [
          {_type: 'link', _key: key8, href: 'foo'},
          null!,
          {_type: 'link', _key: key10, href: 'baz'},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'markDefs'],
          value: [
            {_type: 'link', _key: 'k8', href: 'foo'},
            null!,
            {_type: 'link', _key: 'k10', href: 'baz'},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: array set removes a string at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        'str',
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'markDefs'],
        value: [
          {_type: 'link', _key: key8, href: 'foo'},
          'str',
          {_type: 'link', _key: key10, href: 'baz'},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'markDefs'],
          value: [
            {_type: 'link', _key: 'k8', href: 'foo'},
            'str',
            {_type: 'link', _key: 'k10', href: 'baz'},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: root set removes null at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        null!,
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key6,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: key8, href: 'foo'},
              null!,
              {_type: 'link', _key: key10, href: 'baz'},
            ],
            children: [
              {
                _type: 'span',
                _key: key7,
                text: 'foo',
                marks: [key8, key9, key10],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [
                {_type: 'link', _key: 'k8', href: 'foo'},
                null!,
                {_type: 'link', _key: 'k10', href: 'baz'},
              ],
              children: [
                {
                  _type: 'span',
                  _key: 'k7',
                  text: 'foo',
                  marks: ['k8', 'k9', 'k10'],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: root set removes a string at markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        'str',
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: key6,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: key8, href: 'foo'},
              'str',
              {_type: 'link', _key: key10, href: 'baz'},
            ],
            children: [
              {
                _type: 'span',
                _key: key7,
                text: 'foo',
                marks: [key8, key9, key10],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'block',
              _key: 'k6',
              style: 'normal',
              markDefs: [
                {_type: 'link', _key: 'k8', href: 'foo'},
                'str',
                {_type: 'link', _key: 'k10', href: 'baz'},
              ],
              children: [
                {
                  _type: 'span',
                  _key: 'k7',
                  text: 'foo',
                  marks: ['k8', 'k9', 'k10'],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: insert removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'content', {_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'content', {_key: 'k0'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: insert removes a string at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        'str',
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'content', {_key: key0}],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'content', {_key: 'k0'}],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: array set removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'content'],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'content'],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: array set removes a string at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        'str',
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'content'],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          'str',
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'content'],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: root set removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              null!,
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
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
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: root set removes a string at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        'str',
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              'str',
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
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
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  ],
                },
                'str',
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: keyed node set removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key6}, 'content', {_key: key2}],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'content', {_key: 'k2'}],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: positional node set removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'set', path: [{_key: key6}, 'content', 1], value: null!},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'set', path: [{_key: 'k6'}, 'content', 1], value: null!},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string at callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key6,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        'str',
        {
          _type: 'block',
          _key: key4,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key6,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          'str',
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
            _key: 'k4',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'content', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'content', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: insert removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key2,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
            },
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key7}, 'content', {_key: key6}, 'content', {_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
          ],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: insert removes a string at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: key2,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
            },
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key7}, 'content', {_key: key6}, 'content', {_key: key0}],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k2',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k0'},
          ],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: array set removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key7}, 'content', {_key: key6}, 'content'],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content'],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: array set removes a string at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key7}, 'content', {_key: key6}, 'content'],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          'str',
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content'],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: root set removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key7,
            content: [
              {
                _type: 'callout',
                _key: key6,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  null!,
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'callout',
              _key: 'k7',
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
                        {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      ],
                    },
                    null!,
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: root set removes a string at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key7,
            content: [
              {
                _type: 'callout',
                _key: key6,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  'str',
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'callout',
              _key: 'k7',
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
                        {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      ],
                    },
                    'str',
                    {
                      _type: 'block',
                      _key: 'k4',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: keyed node set removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key7}, 'content', {_key: key6}, 'content', {_key: key2}],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {_key: 'k7'},
            'content',
            {_key: 'k6'},
            'content',
            {_key: 'k2'},
          ],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: positional node set removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key7}, 'content', {_key: key6}, 'content', 1],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              null!,
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string at callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key7,
      content: [
        {
          _type: 'callout',
          _key: key6,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: key4,
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key7,
        content: [
          {
            _type: 'callout',
            _key: key6,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              'str',
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k7',
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
                _key: 'k4',
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k7'}, 'content', {_key: 'k6'}, 'content', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k7',
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
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: insert removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'bar', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
          {_key: key0},
        ],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            {_key: 'k0'},
          ],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: insert removes a string at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                'str',
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'bar', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
          {_key: key0},
        ],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            {_key: 'k0'},
          ],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: array set removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
        ],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: array set removes a string at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                'str',
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
        ],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          'str',
          {
            _type: 'block',
            _key: key4,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
          ],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            'str',
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: root set removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'table',
            _key: key6,
            rows: [
              {
                _type: 'row',
                _key: key7,
                cells: [
                  {
                    _type: 'cell',
                    _key: key8,
                    content: [
                      {
                        _type: 'block',
                        _key: key0,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key1, text: 'foo', marks: []},
                        ],
                      },
                      null!,
                      {
                        _type: 'block',
                        _key: key4,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key5, text: 'baz', marks: []},
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
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'table',
              _key: 'k6',
              rows: [
                {
                  _type: 'row',
                  _key: 'k7',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k8',
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
                        null!,
                        {
                          _type: 'block',
                          _key: 'k4',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: root set removes a string at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                'str',
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'table',
            _key: key6,
            rows: [
              {
                _type: 'row',
                _key: key7,
                cells: [
                  {
                    _type: 'cell',
                    _key: key8,
                    content: [
                      {
                        _type: 'block',
                        _key: key0,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key1, text: 'foo', marks: []},
                        ],
                      },
                      'str',
                      {
                        _type: 'block',
                        _key: key4,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key5, text: 'baz', marks: []},
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
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'table',
              _key: 'k6',
              rows: [
                {
                  _type: 'row',
                  _key: 'k7',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k8',
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
                        'str',
                        {
                          _type: 'block',
                          _key: 'k4',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: keyed node set removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
          {_key: key2},
        ],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            {_key: 'k2'},
          ],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: positional node set removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'bar', marks: []},
                    ],
                  },
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [
          {_key: key6},
          'rows',
          {_key: key7},
          'cells',
          {_key: key8},
          'content',
          1,
        ],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          value: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: initialValue removes null at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  null!,
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: initialValue removes a string at table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key6,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key8,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                },
                'str',
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'baz', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key6,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key8,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                    ],
                  },
                  'str',
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'baz', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
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
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k6'},
            'rows',
            {_key: 'k7'},
            'cells',
            {_key: 'k8'},
            'content',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k6',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k8',
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
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'baz', marks: []},
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

test('Scenario: initialValue removes null from children in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key3,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: key1, text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: key2, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key3,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key1, text: 'foo', marks: []},
              null!,
              {_type: 'span', _key: key2, text: 'bar', marks: []},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k3',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'children', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'children', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k3',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
            {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string from children in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key3,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: key1, text: 'foo', marks: []},
            'str',
            {_type: 'span', _key: key2, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key3,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key1, text: 'foo', marks: []},
              'str',
              {_type: 'span', _key: key2, text: 'bar', marks: []},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k3',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: []},
              {_type: 'span', _key: 'k2', text: 'bar', marks: []},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'children', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'children', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k3',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: []},
            {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null from markDefs in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key3,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: [key2]}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key3,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: [key2]}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k3',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'markDefs', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'markDefs', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k3',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']}],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string from markDefs in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key3,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: [key2]}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key3,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: [key2]}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k3',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'markDefs', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k3'}, 'content', {_key: 'k0'}, 'markDefs', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k3',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']}],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null from children in callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key4,
      content: [
        {
          _type: 'callout',
          _key: key3,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: []},
                null!,
                {_type: 'span', _key: key2, text: 'bar', marks: []},
              ],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key4,
        content: [
          {
            _type: 'callout',
            _key: key3,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: key1, text: 'foo', marks: []},
                  null!,
                  {_type: 'span', _key: key2, text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'callout',
            _key: 'k3',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string from children in callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key4,
      content: [
        {
          _type: 'callout',
          _key: key3,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: []},
                'str',
                {_type: 'span', _key: key2, text: 'bar', marks: []},
              ],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key4,
        content: [
          {
            _type: 'callout',
            _key: key3,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: key1, text: 'foo', marks: []},
                  'str',
                  {_type: 'span', _key: key2, text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'callout',
            _key: 'k3',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null from markDefs in callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key4,
      content: [
        {
          _type: 'callout',
          _key: key3,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
              ],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key4,
        content: [
          {
            _type: 'callout',
            _key: key3,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
                children: [
                  {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'callout',
            _key: 'k3',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                children: [
                  {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes a string from markDefs in callout in callout', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key4,
      content: [
        {
          _type: 'callout',
          _key: key3,
          content: [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
              ],
            },
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key4,
        content: [
          {
            _type: 'callout',
            _key: key3,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
                children: [
                  {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
                ],
              },
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k4',
        content: [
          {
            _type: 'callout',
            _key: 'k3',
            content: [
              {
                _type: 'block',
                _key: 'k0',
                style: 'normal',
                markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                children: [
                  {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k4',
      content: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
              ],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null from children in table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key3,
      rows: [
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                    null!,
                    {_type: 'span', _key: key2, text: 'bar', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key3,
        rows: [
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                      null!,
                      {_type: 'span', _key: key2, text: 'bar', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k3',
      rows: [
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    {_type: 'span', _key: 'k2', text: 'bar', marks: []},
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

test('Scenario: initialValue removes a string from children in table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key3,
      rows: [
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                    'str',
                    {_type: 'span', _key: key2, text: 'bar', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key3,
        rows: [
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: []},
                      'str',
                      {_type: 'span', _key: key2, text: 'bar', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                      {_type: 'span', _key: 'k2', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'children',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k3',
      rows: [
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                    {_type: 'span', _key: 'k2', text: 'bar', marks: []},
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

test('Scenario: initialValue removes null from markDefs in table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key3,
      rows: [
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key3,
        rows: [
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k3',
      rows: [
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
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

test('Scenario: initialValue removes a string from markDefs in table cell', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key3,
      rows: [
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key0,
                  style: 'normal',
                  markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key3,
        rows: [
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key0,
                    style: 'normal',
                    markDefs: [{_type: 'link', _key: key2, href: 'foo'}, 'str'],
                    children: [
                      {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k0',
                    style: 'normal',
                    markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                    children: [
                      {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k3'},
            'rows',
            {_key: 'k4'},
            'cells',
            {_key: 'k5'},
            'content',
            {_key: 'k0'},
            'markDefs',
            1,
          ],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k3',
      rows: [
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [{_type: 'link', _key: 'k2', href: 'foo'}],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
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

test('Scenario: insert removes a number at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    5,
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [{_key: key0}], position: 'after', items: [5]},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [{_key: 'k0'}], position: 'after', node: 5},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes a boolean at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    false,
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [{_key: key0}], position: 'after', items: [false]},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [{_key: 'k0'}], position: 'after', node: false},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes an array at root', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    [],
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [{_key: key0}], position: 'after', items: [[]]},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [{_key: 'k0'}], position: 'after', node: []},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes first and last non-objects in one batch', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    null!,
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: key4,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
    },
    'str',
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key0,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
      },
      {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: key4,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: key5, text: 'baz', marks: []}],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {type: 'insert', path: [0], position: 'before', items: [null!]},
      {type: 'insert', path: [-1], position: 'after', items: ['str']},
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
      {
        _type: 'block',
        _key: 'k4',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {type: 'insert', path: [0], position: 'before', node: null!},
        {type: 'insert', path: [{_key: 'k4'}], position: 'after', node: 'str'},
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [4]},
        {type: 'unset', path: [0]},
      ],
      patches: [
        {type: 'unset', path: [4], origin: 'local'},
        {type: 'unset', path: [0], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: a shifted keyless block gets the same key with and without a non-object', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const keylessSpanKey = keyGenerator()
  const insertedKey = keyGenerator()
  const insertedSpanKey = keyGenerator()
  const initialValue = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
  ]
  const keyless = {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keylessSpanKey, text: 'bar', marks: []}],
  }
  const inserted = {
    _type: 'block',
    _key: insertedKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: insertedSpanKey, text: 'baz', marks: []}],
  }
  const controlChanges: ChangeEvent[] = []
  const changes: ChangeEvent[] = []
  let controlReplica = [initialValue[0]!, inserted, keyless]
  let replica = [initialValue[0]!, null!, inserted, keyless]
  const control = await createTestEditor({
    keyGenerator,
    initialValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            controlChanges.push(event)
            if ('patches' in event) {
              controlReplica = applyAll(controlReplica, event.patches)
            }
          }
        }}
      />
    ),
  })
  const secondKeyGenerator = createTestKeyGenerator()
  for (let index = 0; index < 5; index++) {
    secondKeyGenerator()
  }
  const {editor} = await createTestEditor({
    keyGenerator: secondKeyGenerator,
    initialValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
            if ('patches' in event) {
              replica = applyAll(replica, event.patches)
            }
          }
        }}
      />
    ),
  })
  control.editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [keyless],
      },
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [inserted],
      },
    ],
  })
  expect(control.editor.getSnapshot().context.value).toEqual([
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
    },
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          node: {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
          },
          position: 'after',
        },
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          node: {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
          position: 'after',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'set',
          path: [2, '_key'],
          value: 'k7',
          inverse: {type: 'unset', path: [2, '_key']},
        },
      ],
      patches: [{type: 'set', path: [2, '_key'], value: 'k7', origin: 'local'}],
      correction: true,
    },
  ])
  expect(controlReplica).toEqual([
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
    },
  ])
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [keyless],
      },
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [null!, inserted],
      },
    ],
  })
  expect(editor.getSnapshot().context.value).toEqual(
    control.editor.getSnapshot().context.value,
  )
  expect(control.editor.getSnapshot().context.value).toEqual([
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
    },
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          node: {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
          },
          position: 'after',
        },
        {type: 'insert', path: [{_key: 'k0'}], node: null!, position: 'after'},
        {
          type: 'insert',
          path: [2],
          node: {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
          position: 'before',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [1]},
        {
          type: 'set',
          path: [2, '_key'],
          value: 'k7',
          inverse: {type: 'unset', path: [2, '_key']},
        },
      ],
      patches: [
        {type: 'unset', path: [1], origin: 'local'},
        {type: 'set', path: [2, '_key'], value: 'k7', origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          node: {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
          },
          position: 'after',
        },
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          node: {
            _type: 'block',
            _key: 'k3',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 'k4', text: 'baz', marks: []}],
          },
          position: 'after',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'set',
          path: [2, '_key'],
          value: 'k7',
          inverse: {type: 'unset', path: [2, '_key']},
        },
      ],
      patches: [{type: 'set', path: [2, '_key'], value: 'k7', origin: 'local'}],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
    },
  ])
  expect(controlReplica).toEqual([
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
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k2', text: 'bar', marks: []}],
      _key: 'k7',
    },
  ])
})

test('Scenario: removing the caret block matches a remote unset', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const removedBlockKey = keyGenerator()
  const removedSpanKey = keyGenerator()
  const lastBlockKey = keyGenerator()
  const lastSpanKey = keyGenerator()
  const initialValue = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: removedBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: removedSpanKey, text: 'bar', marks: []}],
    },
    {
      _type: 'block',
      _key: lastBlockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: lastSpanKey, text: 'baz', marks: []}],
    },
  ]
  const controlChanges: ChangeEvent[] = []
  const changes: ChangeEvent[] = []
  let controlReplica = [initialValue[0]!, initialValue[2]!]
  let replica = [initialValue[0]!, null!, initialValue[2]!]
  const control = await createTestEditor({
    keyGenerator,
    initialValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            controlChanges.push(event)
            if ('patches' in event) {
              controlReplica = applyAll(controlReplica, event.patches)
            }
          }
        }}
      />
    ),
  })
  const secondKeyGenerator = createTestKeyGenerator()
  for (let index = 0; index < 6; index++) {
    secondKeyGenerator()
  }
  const {editor, locator} = await createTestEditor({
    keyGenerator: secondKeyGenerator,
    initialValue,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
            if ('patches' in event) {
              replica = applyAll(replica, event.patches)
            }
          }
        }}
      />
    ),
  })
  await expect.element(control.locator).toBeVisible()
  await expect.element(locator).toBeVisible()
  const at = {
    anchor: {
      path: [{_key: removedBlockKey}, 'children', {_key: removedSpanKey}],
      offset: 1,
    },
    focus: {
      path: [{_key: removedBlockKey}, 'children', {_key: removedSpanKey}],
      offset: 1,
    },
  }
  control.editor.send({type: 'select', at})
  editor.send({type: 'select', at})
  expect(editor.getSnapshot().context.selection).toEqual({
    ...at,
    backward: false,
  })
  controlChanges.length = 0
  changes.length = 0
  control.editor.send({
    type: 'apply',
    patches: [{type: 'unset', path: [{_key: removedBlockKey}]}],
  })
  expect(control.editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    backward: false,
  })
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'unset', path: [{_key: 'k2'}]}],
    },
  ])
  expect(control.editor.getSnapshot().context.value).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'unset', path: [{_key: 'k2'}]}],
    },
  ])
  expect(controlReplica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
  editor.send({
    type: 'apply',
    patches: [{type: 'set', path: [{_key: removedBlockKey}], value: null!}],
  })
  expect(editor.getSnapshot().context.selection).toEqual(
    control.editor.getSnapshot().context.selection,
  )
  expect(control.editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    backward: false,
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
    backward: false,
  })
  expect(control.editor.getSnapshot().context.value).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
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
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'set', path: [{_key: 'k2'}], value: null!}],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [1]}],
      patches: [{type: 'unset', path: [1], origin: 'local'}],
      correction: true,
    },
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'unset', path: [{_key: 'k2'}]}],
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
  expect(controlReplica).toEqual([
    {
      _type: 'block',
      _key: 'k0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: 'k4',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
    },
  ])
})

test('Scenario: insert removes null at table rows', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key0,
          cells: [
            {
              _type: 'cell',
              _key: key1,
              content: [
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        null!,
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key6,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key7, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key0,
            cells: [
              {
                _type: 'cell',
                _key: key1,
                content: [
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key6,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key7, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key8}, 'rows', {_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k6',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k7', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k8'}, 'rows', {_key: 'k0'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'rows', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k0',
          cells: [
            {
              _type: 'cell',
              _key: 'k1',
              content: [
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k6',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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

test('Scenario: array set removes null at table rows', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key0,
          cells: [
            {
              _type: 'cell',
              _key: key1,
              content: [
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        null!,
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key6,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key7, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key0,
            cells: [
              {
                _type: 'cell',
                _key: key1,
                content: [
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key6,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key7, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key8}, 'rows'],
        value: [
          {
            _type: 'row',
            _key: key0,
            cells: [
              {
                _type: 'cell',
                _key: key1,
                content: [
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          null!,
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key6,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key7, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k6',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k7', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k8'}, 'rows'],
          value: [
            {
              _type: 'row',
              _key: 'k0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k2',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'row',
              _key: 'k4',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k5',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k6',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'rows', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k0',
          cells: [
            {
              _type: 'cell',
              _key: 'k1',
              content: [
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k6',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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

test('Scenario: root set removes null at table rows', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key0,
          cells: [
            {
              _type: 'cell',
              _key: key1,
              content: [
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        null!,
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key6,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key7, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key0,
            cells: [
              {
                _type: 'cell',
                _key: key1,
                content: [
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key6,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key7, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'table',
            _key: key8,
            rows: [
              {
                _type: 'row',
                _key: key0,
                cells: [
                  {
                    _type: 'cell',
                    _key: key1,
                    content: [
                      {
                        _type: 'block',
                        _key: key2,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key3, text: 'foo', marks: []},
                        ],
                      },
                    ],
                  },
                ],
              },
              null!,
              {
                _type: 'row',
                _key: key4,
                cells: [
                  {
                    _type: 'cell',
                    _key: key5,
                    content: [
                      {
                        _type: 'block',
                        _key: key6,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key7, text: 'foo', marks: []},
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
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k6',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k7', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'table',
              _key: 'k8',
              rows: [
                {
                  _type: 'row',
                  _key: 'k0',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k1',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k2',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                          ],
                        },
                      ],
                    },
                  ],
                },
                null!,
                {
                  _type: 'row',
                  _key: 'k4',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k5',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k6',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'rows', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k0',
          cells: [
            {
              _type: 'cell',
              _key: 'k1',
              content: [
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k6',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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

test('Scenario: initialValue removes null at table rows', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key0,
          cells: [
            {
              _type: 'cell',
              _key: key1,
              content: [
                {
                  _type: 'block',
                  _key: key2,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key3, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        null!,
        {
          _type: 'row',
          _key: key4,
          cells: [
            {
              _type: 'cell',
              _key: key5,
              content: [
                {
                  _type: 'block',
                  _key: key6,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key7, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key0,
            cells: [
              {
                _type: 'cell',
                _key: key1,
                content: [
                  {
                    _type: 'block',
                    _key: key2,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key3, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          null!,
          {
            _type: 'row',
            _key: key4,
            cells: [
              {
                _type: 'cell',
                _key: key5,
                content: [
                  {
                    _type: 'block',
                    _key: key6,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key7, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k4',
            cells: [
              {
                _type: 'cell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    _key: 'k6',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k7', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'rows', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k0',
          cells: [
            {
              _type: 'cell',
              _key: 'k1',
              content: [
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k6',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k7', text: 'foo', marks: []},
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

test('Scenario: insert removes null at table cells', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key0,
              content: [
                {
                  _type: 'block',
                  _key: key1,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key2, text: 'foo', marks: []},
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'cell',
              _key: key3,
              content: [
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key0,
                content: [
                  {
                    _type: 'block',
                    _key: key1,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key2, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: key3,
                content: [
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key8}, 'rows', {_key: key7}, 'cells', {_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k0',
                content: [
                  {
                    _type: 'block',
                    _key: 'k1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k3',
                content: [
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', {_key: 'k0'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1]},
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                },
              ],
            },
            {
              _type: 'cell',
              _key: 'k3',
              content: [
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
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

test('Scenario: array set removes null at table cells', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key0,
              content: [
                {
                  _type: 'block',
                  _key: key1,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key2, text: 'foo', marks: []},
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'cell',
              _key: key3,
              content: [
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key0,
                content: [
                  {
                    _type: 'block',
                    _key: key1,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key2, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: key3,
                content: [
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key8}, 'rows', {_key: key7}, 'cells'],
        value: [
          {
            _type: 'cell',
            _key: key0,
            content: [
              {
                _type: 'block',
                _key: key1,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key2, text: 'foo', marks: []}],
              },
            ],
          },
          null!,
          {
            _type: 'cell',
            _key: key3,
            content: [
              {
                _type: 'block',
                _key: key4,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key5, text: 'foo', marks: []}],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k0',
                content: [
                  {
                    _type: 'block',
                    _key: 'k1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k3',
                content: [
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells'],
          value: [
            {
              _type: 'cell',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'cell',
              _key: 'k3',
              content: [
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1]},
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                },
              ],
            },
            {
              _type: 'cell',
              _key: 'k3',
              content: [
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
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

test('Scenario: root set removes null at table cells', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key0,
              content: [
                {
                  _type: 'block',
                  _key: key1,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key2, text: 'foo', marks: []},
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'cell',
              _key: key3,
              content: [
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key0,
                content: [
                  {
                    _type: 'block',
                    _key: key1,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key2, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: key3,
                content: [
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'table',
            _key: key8,
            rows: [
              {
                _type: 'row',
                _key: key7,
                cells: [
                  {
                    _type: 'cell',
                    _key: key0,
                    content: [
                      {
                        _type: 'block',
                        _key: key1,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key2, text: 'foo', marks: []},
                        ],
                      },
                    ],
                  },
                  null!,
                  {
                    _type: 'cell',
                    _key: key3,
                    content: [
                      {
                        _type: 'block',
                        _key: key4,
                        style: 'normal',
                        markDefs: [],
                        children: [
                          {_type: 'span', _key: key5, text: 'foo', marks: []},
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
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k0',
                content: [
                  {
                    _type: 'block',
                    _key: 'k1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k3',
                content: [
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'table',
              _key: 'k8',
              rows: [
                {
                  _type: 'row',
                  _key: 'k7',
                  cells: [
                    {
                      _type: 'cell',
                      _key: 'k0',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k1',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                          ],
                        },
                      ],
                    },
                    null!,
                    {
                      _type: 'cell',
                      _key: 'k3',
                      content: [
                        {
                          _type: 'block',
                          _key: 'k4',
                          style: 'normal',
                          markDefs: [],
                          children: [
                            {_type: 'span', _key: 'k5', text: 'foo', marks: []},
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
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1]},
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                },
              ],
            },
            {
              _type: 'cell',
              _key: 'k3',
              content: [
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
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

test('Scenario: initialValue removes null at table cells', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'table',
      _key: key8,
      rows: [
        {
          _type: 'row',
          _key: key7,
          cells: [
            {
              _type: 'cell',
              _key: key0,
              content: [
                {
                  _type: 'block',
                  _key: key1,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key2, text: 'foo', marks: []},
                  ],
                },
              ],
            },
            null!,
            {
              _type: 'cell',
              _key: key3,
              content: [
                {
                  _type: 'block',
                  _key: key4,
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: key5, text: 'foo', marks: []},
                  ],
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
    schemaDefinition,
    initialValue: [
      {
        _type: 'table',
        _key: key8,
        rows: [
          {
            _type: 'row',
            _key: key7,
            cells: [
              {
                _type: 'cell',
                _key: key0,
                content: [
                  {
                    _type: 'block',
                    _key: key1,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key2, text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              null!,
              {
                _type: 'cell',
                _key: key3,
                content: [
                  {
                    _type: 'block',
                    _key: key4,
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: key5, text: 'foo', marks: []},
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
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k0',
                content: [
                  {
                    _type: 'block',
                    _key: 'k1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k3',
                content: [
                  {
                    _type: 'block',
                    _key: 'k4',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k5', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [
        {type: 'unset', path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1]},
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'rows', {_key: 'k7'}, 'cells', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'table',
      _key: 'k8',
      rows: [
        {
          _type: 'row',
          _key: 'k7',
          cells: [
            {
              _type: 'cell',
              _key: 'k0',
              content: [
                {
                  _type: 'block',
                  _key: 'k1',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                  ],
                },
              ],
            },
            {
              _type: 'cell',
              _key: 'k3',
              content: [
                {
                  _type: 'block',
                  _key: 'k4',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k5', text: 'foo', marks: []},
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

test('Scenario: insert removes null at block object field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'note',
      _key: key8,
      body: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'note',
        _key: key8,
        body: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key8}, 'body', {_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'k8',
        body: [
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
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k8'}, 'body', {_key: 'k0'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'body', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'body', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'note',
      _key: 'k8',
      body: [
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
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: array set removes null at block object field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'note',
      _key: key8,
      body: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'note',
        _key: key8,
        body: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key8}, 'body'],
        value: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'k8',
        body: [
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
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k8'}, 'body'],
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
            },
            null!,
            {
              _type: 'block',
              _key: 'k2',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'body', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'body', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'note',
      _key: 'k8',
      body: [
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
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: root set removes null at block object field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'note',
      _key: key8,
      body: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'note',
        _key: key8,
        body: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'note',
            _key: key8,
            body: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              },
              null!,
              {
                _type: 'block',
                _key: key2,
                style: 'normal',
                markDefs: [],
                children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'k8',
        body: [
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
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'note',
              _key: 'k8',
              body: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo', marks: []},
                  ],
                },
                null!,
                {
                  _type: 'block',
                  _key: 'k2',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'body', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'body', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'note',
      _key: 'k8',
      body: [
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
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: initialValue removes null at block object field', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'note',
      _key: key8,
      body: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
        },
        null!,
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'note',
        _key: key8,
        body: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
          },
          null!,
          {
            _type: 'block',
            _key: key2,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'note',
        _key: 'k8',
        body: [
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
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k8'}, 'body', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k8'}, 'body', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'note',
      _key: 'k8',
      body: [
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
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
        },
      ],
    },
  ])
})

test('Scenario: insert removes null at nested text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: key2, text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: key3, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key2, text: 'foo', marks: []},
              {_type: 'span', _key: key3, text: 'bar', marks: []},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key8}, 'content', {_key: key0}, 'children', {_key: key2}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
              {_type: 'span', _key: 'k2', text: 'foo', marks: []},
              {_type: 'span', _key: 'k3', text: 'bar', marks: []},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
            {_type: 'span', _key: 'k2', text: 'foo', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
          ],
        },
      ],
    },
  ])
})

test('Scenario: array set removes null at nested text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: key2, text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: key3, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key2, text: 'foo', marks: []},
              {_type: 'span', _key: key3, text: 'bar', marks: []},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key8}, 'content', {_key: key0}, 'children'],
        value: [
          {_type: 'span', _key: key2, text: 'foo', marks: []},
          null!,
          {_type: 'span', _key: key3, text: 'bar', marks: []},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
              {_type: 'span', _key: 'k2', text: 'foo', marks: []},
              {_type: 'span', _key: 'k3', text: 'bar', marks: []},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children'],
          value: [
            {_type: 'span', _key: 'k2', text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
            {_type: 'span', _key: 'k2', text: 'foo', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
          ],
        },
      ],
    },
  ])
})

test('Scenario: root set removes null at nested text children', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: key2, text: 'foo', marks: []},
            null!,
            {_type: 'span', _key: key3, text: 'bar', marks: []},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: key2, text: 'foo', marks: []},
              {_type: 'span', _key: key3, text: 'bar', marks: []},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key8,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: key2, text: 'foo', marks: []},
                  null!,
                  {_type: 'span', _key: key3, text: 'bar', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
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
              {_type: 'span', _key: 'k2', text: 'foo', marks: []},
              {_type: 'span', _key: 'k3', text: 'bar', marks: []},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
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
                    {_type: 'span', _key: 'k2', text: 'foo', marks: []},
                    null!,
                    {_type: 'span', _key: 'k3', text: 'bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'children', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
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
            {_type: 'span', _key: 'k2', text: 'foo', marks: []},
            {_type: 'span', _key: 'k3', text: 'bar', marks: []},
          ],
        },
      ],
    },
  ])
})

test('Scenario: insert removes null at nested markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: key2, href: 'foo'},
            null!,
            {_type: 'link', _key: key3, href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: key2, href: 'foo'},
              {_type: 'link', _key: key3, href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key8}, 'content', {_key: key0}, 'markDefs', {_key: key2}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k8',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: 'k2', href: 'foo'},
              {_type: 'link', _key: 'k3', href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [
            {_key: 'k8'},
            'content',
            {_key: 'k0'},
            'markDefs',
            {_key: 'k2'},
          ],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k8',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: 'k2', href: 'foo'},
            {_type: 'link', _key: 'k3', href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
          ],
        },
      ],
    },
  ])
})

test('Scenario: array set removes null at nested markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: key2, href: 'foo'},
            null!,
            {_type: 'link', _key: key3, href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: key2, href: 'foo'},
              {_type: 'link', _key: key3, href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [{_key: key8}, 'content', {_key: key0}, 'markDefs'],
        value: [
          {_type: 'link', _key: key2, href: 'foo'},
          null!,
          {_type: 'link', _key: key3, href: 'bar'},
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k8',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: 'k2', href: 'foo'},
              {_type: 'link', _key: 'k3', href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs'],
          value: [
            {_type: 'link', _key: 'k2', href: 'foo'},
            null!,
            {_type: 'link', _key: 'k3', href: 'bar'},
          ],
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k8',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: 'k2', href: 'foo'},
            {_type: 'link', _key: 'k3', href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
          ],
        },
      ],
    },
  ])
})

test('Scenario: root set removes null at nested markDefs', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key8 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'callout',
      _key: key8,
      content: [
        {
          _type: 'block',
          _key: key0,
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: key2, href: 'foo'},
            null!,
            {_type: 'link', _key: key3, href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
          ],
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'callout',
        _key: key8,
        content: [
          {
            _type: 'block',
            _key: key0,
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: key2, href: 'foo'},
              {_type: 'link', _key: key3, href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
            ],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'callout',
            _key: key8,
            content: [
              {
                _type: 'block',
                _key: key0,
                style: 'normal',
                markDefs: [
                  {_type: 'link', _key: key2, href: 'foo'},
                  null!,
                  {_type: 'link', _key: key3, href: 'bar'},
                ],
                children: [
                  {_type: 'span', _key: key1, text: 'foo', marks: [key2, key3]},
                ],
              },
            ],
          },
        ],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: 'k8',
        content: [
          {
            _type: 'block',
            _key: 'k0',
            style: 'normal',
            markDefs: [
              {_type: 'link', _key: 'k2', href: 'foo'},
              {_type: 'link', _key: 'k3', href: 'bar'},
            ],
            children: [
              {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
            ],
          },
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [],
          value: [
            {
              _type: 'callout',
              _key: 'k8',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  style: 'normal',
                  markDefs: [
                    {_type: 'link', _key: 'k2', href: 'foo'},
                    null!,
                    {_type: 'link', _key: 'k3', href: 'bar'},
                  ],
                  children: [
                    {
                      _type: 'span',
                      _key: 'k1',
                      text: 'foo',
                      marks: ['k2', 'k3'],
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
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
        },
      ],
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k8'}, 'content', {_key: 'k0'}, 'markDefs', 1],
          origin: 'local',
        },
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'callout',
      _key: 'k8',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [
            {_type: 'link', _key: 'k2', href: 'foo'},
            {_type: 'link', _key: 'k3', href: 'bar'},
          ],
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2', 'k3']},
          ],
        },
      ],
    },
  ])
})

test('Scenario: a local edit after removing null from markDefs emits only its change', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        null!,
        {_type: 'link', _key: key9, href: 'bar'},
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'markDefs', {_key: key8}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k9', href: 'bar'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          position: 'after',
          node: null!,
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
  editor.send({
    type: 'set',
    at: [{_key: key6}, 'children', {_key: key7}, 'text'],
    value: 'bar',
  })
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'bar', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          node: null!,
          position: 'after',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
          value: 'bar',
          inverse: {
            type: 'set',
            path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
            value: 'foo',
          },
        },
      ],
      patches: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
          value: 'bar',
          origin: 'local',
        },
      ],
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'bar', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: a local edit after removing a string from markDefs emits only its change', async () => {
  const keyGenerator = createTestKeyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key6,
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: key8, href: 'foo'},
        'str',
        {_type: 'link', _key: key9, href: 'bar'},
        {_type: 'link', _key: key10, href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
      ],
    },
  ]
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: key6,
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: key8, href: 'foo'},
          {_type: 'link', _key: key9, href: 'bar'},
          {_type: 'link', _key: key10, href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: key7, text: 'foo', marks: [key8, key9, key10]},
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
              if ('patches' in event) {
                replica = applyAll(replica, event.patches)
              }
            }
          }}
        />
      </>
    ),
  })
  editor.send({
    type: 'apply',
    patches: [
      {
        type: 'insert',
        path: [{_key: key6}, 'markDefs', {_key: key8}],
        position: 'after',
        items: ['str'],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k6',
        style: 'normal',
        markDefs: [
          {_type: 'link', _key: 'k8', href: 'foo'},
          {_type: 'link', _key: 'k9', href: 'bar'},
          {_type: 'link', _key: 'k10', href: 'baz'},
        ],
        children: [
          {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
        ],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          position: 'after',
          node: 'str',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'foo', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
  editor.send({
    type: 'set',
    at: [{_key: key6}, 'children', {_key: key7}, 'text'],
    value: 'bar',
  })
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'bar', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k6'}, 'markDefs', {_key: 'k8'}],
          node: 'str',
          position: 'after',
        },
      ],
    },
    {
      type: 'change',
      origin: 'local',
      operations: [{type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1]}],
      patches: [
        {type: 'unset', path: [{_key: 'k6'}, 'markDefs', 1], origin: 'local'},
      ],
      correction: true,
    },
    {
      type: 'change',
      origin: 'local',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
          value: 'bar',
          inverse: {
            type: 'set',
            path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
            value: 'foo',
          },
        },
      ],
      patches: [
        {
          type: 'set',
          path: [{_key: 'k6'}, 'children', {_key: 'k7'}, 'text'],
          value: 'bar',
          origin: 'local',
        },
      ],
    },
  ])
  expect(replica).toEqual([
    {
      _type: 'block',
      _key: 'k6',
      style: 'normal',
      markDefs: [
        {_type: 'link', _key: 'k8', href: 'foo'},
        {_type: 'link', _key: 'k9', href: 'bar'},
        {_type: 'link', _key: 'k10', href: 'baz'},
      ],
      children: [
        {_type: 'span', _key: 'k7', text: 'bar', marks: ['k8', 'k9', 'k10']},
      ],
    },
  ])
})

test('Scenario: non-array markDefs on load without non-object entries', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: 'oops' as never,
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
  ]
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: replica,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
            if ('patches' in event) {
              replica = applyAll(replica, event.patches)
            }
          }
        }}
      />
    ),
  })
  await expect.element(locator).toBeVisible()
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: 'oops',
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([])
  expect(replica).toEqual([
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
      markDefs: 'oops',
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
  ])
})

test('Scenario: non-array markDefs on remote insert without non-object entries', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
  ]
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: replica,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
            if ('patches' in event) {
              replica = applyAll(replica, event.patches)
            }
          }
        }}
      />
    ),
  })
  await expect.element(locator).toBeVisible()
  const patches = [
    {
      type: 'insert',
      path: [{_key: key0}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: key2,
          style: 'normal',
          markDefs: 'oops' as never,
          children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
        },
      ],
    },
  ] satisfies Patch[]
  replica = applyAll(replica, patches)
  editor.send({type: 'apply', patches})
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: 'oops',
        children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          node: {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: 'oops',
            children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          },
        },
      ],
    },
  ])
  expect(replica).toEqual([
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
      markDefs: 'oops',
      children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
    },
  ])
})

test('Scenario: non-array markDefs on remote node set without non-object entries', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const changes: ChangeEvent[] = []
  let replica = [
    {
      _type: 'block',
      _key: key0,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
    },
    {
      _type: 'block',
      _key: key2,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: key3, text: 'bar', marks: []}],
    },
  ]
  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: replica,
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
            if ('patches' in event) {
              replica = applyAll(replica, event.patches)
            }
          }
        }}
      />
    ),
  })
  await expect.element(locator).toBeVisible()
  const patches = [
    {
      type: 'set',
      path: [{_key: key2}],
      value: {
        _type: 'block',
        _key: key2,
        style: 'normal',
        markDefs: {a: 1} as never,
        children: [{_type: 'span', _key: key3, text: 'baz', marks: []}],
      },
    },
  ] satisfies Patch[]
  replica = applyAll(replica, patches)
  editor.send({type: 'apply', patches})
  await vi.waitFor(() =>
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
        _key: 'k2',
        style: 'normal',
        markDefs: {a: 1},
        children: [{_type: 'span', _key: 'k3', text: 'baz', marks: []}],
      },
    ]),
  )
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: 'k2'}],
          value: {
            _type: 'block',
            _key: 'k2',
            style: 'normal',
            markDefs: {a: 1},
            children: [{_type: 'span', _key: 'k3', text: 'baz', marks: []}],
          },
        },
      ],
    },
  ])
  expect(replica).toEqual([
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
      markDefs: {a: 1},
      children: [{_type: 'span', _key: 'k3', text: 'baz', marks: []}],
    },
  ])
})
