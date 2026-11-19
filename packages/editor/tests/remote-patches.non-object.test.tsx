import {applyAll, type JSONValue, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      block(key0, key1, 'foo'),
      block(key2, key3, 'bar'),
      block(key4, key5, 'baz'),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
        path: [{_key: key0}],
        position: 'after',
        items: [null!],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'insert',
            path: [{_key: 'k0'}],
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
            path: [1],
          },
        ],
        patches: [
          {
            type: 'unset',
            path: [1],
            origin: 'local',
          },
        ],
      },
    ]),
  )
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      block(key0, key1, 'foo'),
      block(key2, key3, 'bar'),
      block(key4, key5, 'baz'),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
        value: [block(key0, key1, 'foo'), null!, block(key4, key5, 'baz')],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [],
            value: [block('k0', 'k1', 'foo'), null!, block('k4', 'k5', 'baz')],
          },
        ],
      },
      {
        type: 'change',
        origin: 'local',
        operations: [
          {
            type: 'unset',
            path: [1],
          },
        ],
        patches: [
          {
            type: 'unset',
            path: [1],
            origin: 'local',
          },
        ],
      },
    ]),
  )
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      table(key6, [
        row(key7, [
          cell(key8, [
            block(key0, key1, 'foo'),
            block(key2, key3, 'bar'),
            block(key4, key5, 'baz'),
          ]),
        ]),
      ]),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
        value: [block(key0, key1, 'foo'), null!, block(key4, key5, 'baz')],
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
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
            value: [block('k0', 'k1', 'foo'), null!, block('k4', 'k5', 'baz')],
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
      },
    ]),
  )
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      block(key0, key1, 'foo'),
      block(key2, key3, 'bar'),
      block(key4, key5, 'baz'),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
        path: [{_key: key2}],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [{_key: 'k2'}],
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
            path: [1],
          },
        ],
        patches: [
          {
            type: 'unset',
            path: [1],
            origin: 'local',
          },
        ],
      },
    ]),
  )
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      block(key0, key1, 'foo'),
      block(key2, key3, 'bar'),
      block(key4, key5, 'baz'),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
        path: [1],
        value: null!,
      },
    ] satisfies Patch[],
  })
  await vi.waitFor(() =>
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {
            type: 'set',
            path: [1],
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
            path: [1],
          },
        ],
        patches: [
          {
            type: 'unset',
            path: [1],
            origin: 'local',
          },
        ],
      },
    ]),
  )
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
  await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      table(key3, [
        row(key4, [
          cell(key5, [
            {
              _type: 'block',
              _key: key0,
              style: 'normal',
              markDefs: [{_type: 'link', _key: key2, href: 'foo'}, null!],
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: [key2]},
              ],
            },
          ]),
        ]),
      ]),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
            }
          }}
        />
      </>
    ),
  })
  await vi.waitFor(() =>
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
      },
    ]),
  )
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
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      block(key0, key1, 'foo'),
      block(key2, key3, 'bar'),
      block(key4, key5, 'baz'),
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'change') {
              changes.push(event)
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
    expect(changes).toEqual([
      {
        type: 'change',
        origin: 'remote',
        operations: [
          {type: 'insert', path: [0], position: 'before', node: null!},
          {
            type: 'insert',
            path: [3],
            position: 'after',
            node: 'str',
          },
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
      },
    ]),
  )
})

test('Scenario: a shifted keyless block gets the same key with and without a non-object', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const keylessSpanKey = keyGenerator()
  const insertedKey = keyGenerator()
  const insertedSpanKey = keyGenerator()
  const initialValue = [block(blockKey, spanKey, 'foo')]
  const keyless = {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keylessSpanKey, text: 'bar', marks: []}],
  }
  const inserted = block(insertedKey, insertedSpanKey, 'baz')
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
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
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
          node: block('k3', 'k4', 'baz'),
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
    },
  ])
  expect(controlReplica).toEqual([
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
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
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
  ])
  expect(editor.getSnapshot().context.value).toEqual([
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
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
          node: block('k3', 'k4', 'baz'),
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
          node: block('k3', 'k4', 'baz'),
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
    },
  ])
  expect(replica).toEqual([
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
  ])
  expect(controlReplica).toEqual([
    block('k0', 'k1', 'foo'),
    block('k3', 'k4', 'baz'),
    block('k7', 'k2', 'bar'),
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
    block(blockKey, spanKey, 'foo'),
    block(removedBlockKey, removedSpanKey, 'bar'),
    block(lastBlockKey, lastSpanKey, 'baz'),
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
    block('k0', 'k1', 'foo'),
    block('k4', 'k5', 'baz'),
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'unset', path: [{_key: 'k2'}]}],
    },
  ])
  expect(controlReplica).toEqual([
    block('k0', 'k1', 'foo'),
    block('k4', 'k5', 'baz'),
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
    block('k0', 'k1', 'foo'),
    block('k4', 'k5', 'baz'),
  ])
  expect(editor.getSnapshot().context.value).toEqual([
    block('k0', 'k1', 'foo'),
    block('k4', 'k5', 'baz'),
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
    },
  ])
  expect(controlChanges).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [{type: 'unset', path: [{_key: 'k2'}]}],
    },
  ])
  expect(replica).toEqual([block('k0', 'k1', 'foo'), block('k4', 'k5', 'baz')])
  expect(controlReplica).toEqual([
    block('k0', 'k1', 'foo'),
    block('k4', 'k5', 'baz'),
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
    block(key0, key1, 'foo'),
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
      block('k0', 'k1', 'foo'),
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
    block('k0', 'k1', 'foo'),
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
  let replica = [block(key0, key1, 'foo')]
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
      block('k0', 'k1', 'foo'),
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
    block('k0', 'k1', 'foo'),
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
  let replica = [block(key0, key1, 'foo'), block(key2, key3, 'bar')]
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
      block('k0', 'k1', 'foo'),
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
    block('k0', 'k1', 'foo'),
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: {a: 1},
      children: [{_type: 'span', _key: 'k3', text: 'baz', marks: []}],
    },
  ])
})

function block(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}
function table(key: string, rows: ReturnType<typeof row>[]) {
  return {_type: 'table', _key: key, rows}
}
function row(key: string, cells: ReturnType<typeof cell>[]) {
  return {_type: 'row', _key: key, cells}
}
function cell(key: string, content: Array<PortableTextBlock & JSONValue>) {
  return {_type: 'cell', _key: key, content}
}

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

describe('existing remote-patch repairs', () => {
  const container = defineContainer({
    type: 'container',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  })
  const schemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'container',
        fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      },
    ],
  })
  const keys = createTestKeyGenerator()
  const blockKey = keys()
  const spanKey = keys()
  const containerKey = keys()
  const nestedBlockKey = keys()
  const nestedSpanKey = keys()
  const secondSpanKey = keys()
  const block = {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const nestedBlock = {
    _type: 'block',
    _key: nestedBlockKey,
    children: [{_type: 'span', _key: nestedSpanKey, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }

  test.each([
    {
      name: 'a remote insert at the root',
      initialValue: [block],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'after',
            items: ['oops'],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [block],
      expectedPatches: [{type: 'unset', path: [1], origin: 'local'}],
    },
    {
      name: "a remote insert in a root text block's children",
      initialValue: [block],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            position: 'after',
            items: [42],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [block],
      expectedPatches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', 1],
          origin: 'local',
        },
      ],
    },
    {
      name: "a remote insert in a container's array field",
      initialValue: [
        {_type: 'container', _key: containerKey, content: [nestedBlock]},
      ],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: containerKey}, 'content', {_key: nestedBlockKey}],
            position: 'after',
            items: ['oops'],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [
        {_type: 'container', _key: containerKey, content: [nestedBlock]},
      ],
      expectedPatches: [
        {
          type: 'unset',
          path: [{_key: containerKey}, 'content', 1],
          origin: 'local',
        },
      ],
    },
    {
      name: 'a remote insert in a text block inside a container',
      initialValue: [
        {_type: 'container', _key: containerKey, content: [nestedBlock]},
      ],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [
              {_key: containerKey},
              'content',
              {_key: nestedBlockKey},
              'children',
              {_key: nestedSpanKey},
            ],
            position: 'after',
            items: [42],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [
        {_type: 'container', _key: containerKey, content: [nestedBlock]},
      ],
      expectedPatches: [
        {
          type: 'unset',
          path: [
            {_key: containerKey},
            'content',
            {_key: nestedBlockKey},
            'children',
            1,
          ],
          origin: 'local',
        },
      ],
    },
    {
      name: '`initialValue` in a container',
      initialValue: [
        {
          _type: 'container',
          _key: containerKey,
          content: [nestedBlock, 'oops'],
        },
      ],
      event: undefined,
      expectedValue: [
        {_type: 'container', _key: containerKey, content: [nestedBlock]},
      ],
      expectedPatches: [
        {
          type: 'unset',
          path: [{_key: containerKey}, 'content', 1],
          origin: 'local',
        },
      ],
    },
    {
      name: 'two primitives in one remote insert',
      initialValue: [block],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'after',
            items: ['oops', 42],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [block],
      expectedPatches: [
        {type: 'unset', path: [2], origin: 'local'},
        {type: 'unset', path: [1], origin: 'local'},
      ],
    },
    {
      name: 'a primitive between two spans',
      initialValue: [
        {
          ...block,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            position: 'after',
            items: ['oops'],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [
        {
          ...block,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo', marks: []},
            {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
          ],
        },
      ],
      expectedPatches: [
        {
          type: 'unset',
          path: [{_key: blockKey}, 'children', 1],
          origin: 'local',
        },
      ],
    },
    {
      name: '`true` in a remote insert',
      initialValue: [block],
      event: {
        type: 'apply',
        patches: [
          {
            type: 'insert',
            path: [{_key: blockKey}],
            position: 'after',
            items: [true],
            origin: 'remote',
          },
        ],
        snapshot: undefined,
      },
      expectedValue: [block],
      expectedPatches: [{type: 'unset', path: [1], origin: 'local'}],
    },
  ])(
    'Scenario: $name is removed',
    async ({initialValue, event, expectedValue, expectedPatches}) => {
      const patches: Array<Patch> = []
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <EventListenerPlugin
              on={(editorEvent) => {
                if (
                  editorEvent.type === 'change' &&
                  editorEvent.origin === 'local'
                ) {
                  patches.push(...editorEvent.patches)
                }
              }}
            />
            <NodePlugin nodes={[container]} />
          </>
        ),
        initialValue: initialValue as never,
        keyGenerator: createTestKeyGenerator('generated-'),
        schemaDefinition,
      })
      if (event) {
        editor.send(event as never)
      }
      await vi.waitFor(() =>
        expect(editor.getSnapshot().context.value).toEqual(expectedValue),
      )
      await expect.element(locator).toBeVisible()
      await vi.waitFor(() => expect(patches).toEqual(expectedPatches))
    },
  )

  test('Scenario: undo after a remote removal reverts only the local edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const undoBlockKey = keyGenerator()
    const undoSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: undoBlockKey,
        children: [{_type: 'span', _key: undoSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
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
      initialValue,
      keyGenerator,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: undoBlockKey}, 'children', {_key: undoSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: undoBlockKey}, 'children', {_key: undoSpanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {_type: 'span', _key: undoSpanKey, text: 'foo!', marks: []},
          ],
        },
      ]),
    )
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'insert',
          path: [{_key: undoBlockKey}],
          position: 'after',
          items: ['oops'],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {_type: 'span', _key: undoSpanKey, text: 'foo!', marks: []},
          ],
        },
      ]),
    )
    editor.send({type: 'history.undo'})
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual(initialValue),
    )
    await vi.waitFor(() =>
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: undoBlockKey}, 'children', {_key: undoSpanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
          origin: 'local',
        },
        {type: 'unset', path: [1], origin: 'local'},
        {
          type: 'diffMatchPatch',
          path: [{_key: undoBlockKey}, 'children', {_key: undoSpanKey}, 'text'],
          value: '@@ -1,4 +1,3 @@\n foo\n-!\n',
          origin: 'local',
        },
      ]),
    )
  })
})

test('Scenario: remote set preserves an annotation without a type', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const changes: ChangeEvent[] = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [block(key0, key1, 'foo')],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
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
        path: [{_key: key0}, 'markDefs'],
        value: [{_key: key2, href: 'foo'}],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes.length).toEqual(1)
  })
  expect(editor.getSnapshot().context.value).toEqual([
    {...block(key0, key1, 'foo'), markDefs: [{_key: key2, href: 'foo'}]},
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: key0}, 'markDefs'],
          value: [{_key: key2, href: 'foo'}],
        },
      ],
    },
  ])
})

test('Scenario: remote set preserves duplicate annotation keys', async () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const changes: ChangeEvent[] = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [block(key0, key1, 'foo')],
    children: (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'change') {
            changes.push(event)
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
        path: [{_key: key0}, 'markDefs'],
        value: [
          {_type: 'link', _key: key2, href: 'foo'},
          {_key: key2, href: 'bar'},
        ],
      },
    ],
  })
  await vi.waitFor(() => {
    expect(changes.length).toEqual(1)
  })
  expect(editor.getSnapshot().context.value).toEqual([
    {
      ...block(key0, key1, 'foo'),
      markDefs: [
        {_type: 'link', _key: key2, href: 'foo'},
        {_key: key2, href: 'bar'},
      ],
    },
  ])
  expect(changes).toEqual([
    {
      type: 'change',
      origin: 'remote',
      operations: [
        {
          type: 'set',
          path: [{_key: key0}, 'markDefs'],
          value: [
            {_type: 'link', _key: key2, href: 'foo'},
            {_key: key2, href: 'bar'},
          ],
        },
      ],
    },
  ])
})
