import type {Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {withRemoteChanges} from '../src/engine-plugins/engine-plugin.remote-changes'
import {withoutNormalizing} from '../src/engine/editor/without-normalizing'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {createBareEditor} from '../test-utils/create-bare-editor.test-util'

const container = defineContainer({
  type: 'container',
  arrayField: 'content',
  render: ({children}) => <>{children}</>,
})
const table = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({children}) => <>{children}</>,
})
const row = defineContainer({
  type: 'row',
  arrayField: 'cells',
  render: ({children}) => <>{children}</>,
})
const cell = defineContainer({
  type: 'cell',
  arrayField: 'content',
  render: ({children}) => <>{children}</>,
})
const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'container',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'container'}],
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
const keys = createTestKeyGenerator()
const blockKey = keys()
const spanKey = keys()
const containerKey = keys()
const nestedBlockKey = keys()
const nestedSpanKey = keys()
const secondSpanKey = keys()
const tableKey = keys()
const rowKey = keys()
const cellKey = keys()
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
const tableValue = {
  _type: 'table',
  _key: tableKey,
  rows: [
    {
      _type: 'row',
      _key: rowKey,
      cells: [{_type: 'cell', _key: cellKey, content: [block]}],
    },
  ],
}

test.each([
  {
    name: 'a shifted keyless root block repairs both primitive children',
    initialValue: [block],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [],
          value: [
            block,
            {
              ...nestedBlock,
              _key: undefined,
              children: [nestedBlock.children[0], 'x', 'y'],
            },
            {...block, _key: 'last'},
          ],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [{...block, _key: 'inserted'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      block,
      {...block, _key: 'inserted'},
      {...nestedBlock, _key: 'generated-k2'},
      {...block, _key: 'last'},
    ],
    expectedPatches: [
      {type: 'unset', path: [2, 'children', 1], origin: 'local'},
      {type: 'unset', path: [2, 'children', 1], origin: 'local'},
      {
        type: 'set',
        path: [2, '_key'],
        value: 'generated-k2',
        origin: 'local',
      },
    ],
  },
  {
    name: 'a remotely inserted keyless block repairs after a later insert',
    initialValue: [block, {...block, _key: 'last'}],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [
            {
              ...nestedBlock,
              _key: undefined,
              children: [nestedBlock.children[0], 'x', 'y'],
            },
          ],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [{...block, _key: 'inserted'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      block,
      {...block, _key: 'inserted'},
      {...nestedBlock, _key: 'generated-k2'},
      {...block, _key: 'last'},
    ],
    expectedPatches: [
      {type: 'unset', path: [2, 'children', 1], origin: 'local'},
      {type: 'unset', path: [2, 'children', 1], origin: 'local'},
      {
        type: 'set',
        path: [2, '_key'],
        value: 'generated-k2',
        origin: 'local',
      },
    ],
  },
  {
    name: 'a shifted keyless container child repairs both primitives',
    initialValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [block, {...block, _key: 'last'}],
      },
    ],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: containerKey}, 'content'],
          value: [
            block,
            {
              ...nestedBlock,
              _key: undefined,
              children: [nestedBlock.children[0], 'x', 'y'],
            },
            {...block, _key: 'last'},
          ],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: containerKey}, 'content', {_key: blockKey}],
          position: 'after',
          items: [{...block, _key: 'inserted'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [
          block,
          {...block, _key: 'inserted'},
          {...nestedBlock, _key: 'generated-k2'},
          {...block, _key: 'last'},
        ],
      },
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 2, 'children', 1],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 2, 'children', 1],
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: containerKey}, 'content', 2, '_key'],
        value: 'generated-k2',
        origin: 'local',
      },
    ],
  },
  {
    name: 'a shifted keyless table-cell block repairs both primitives',
    initialValue: [tableValue],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
          ],
          value: [
            block,
            {
              ...nestedBlock,
              _key: 42,
              children: [null, false, nestedBlock.children[0]],
            },
            {...block, _key: 'last'},
          ],
          origin: 'remote',
        },
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      {
        ...tableValue,
        rows: [
          {
            ...tableValue.rows[0]!,
            cells: [
              {
                ...tableValue.rows[0]!.cells[0]!,
                content: [
                  {...nestedBlock, _key: 'generated-k2'},
                  {...block, _key: 'last'},
                ],
              },
            ],
          },
        ],
      },
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          0,
          'children',
          0,
        ],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          0,
          'children',
          0,
        ],
        origin: 'local',
      },
      {
        type: 'set',
        path: [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          0,
          '_key',
        ],
        value: 'generated-k2',
        origin: 'local',
      },
    ],
  },
  {
    name: 'a remote insert at the root',
    initialValue: [block],
    event: {
      type: 'patches',
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
      type: 'patches',
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
      {type: 'unset', path: [{_key: blockKey}, 'children', 1], origin: 'local'},
    ],
  },
  {
    name: "a remote insert in a container's array field",
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'patches',
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
      type: 'patches',
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
      {_type: 'container', _key: containerKey, content: [nestedBlock, 'oops']},
    ],
    event: undefined,
    expectedValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    expectedPatches: [],
  },
  {
    name: 'a null `initialValue` entry in a container',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock, null]},
    ],
    event: undefined,
    expectedValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    expectedPatches: [],
  },
  {
    name: 'a leading null `update value` entry in a container',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'update value',
      value: [
        {_type: 'container', _key: containerKey, content: [null, nestedBlock]},
      ],
    },
    expectedValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    expectedPatches: [],
  },
  {
    name: 'a middle null `update value` entry in a container',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'update value',
      value: [
        {
          _type: 'container',
          _key: containerKey,
          content: [nestedBlock, null, {...nestedBlock, _key: blockKey}],
        },
      ],
    },
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [nestedBlock, {...nestedBlock, _key: blockKey}],
      },
    ],
    expectedPatches: [],
  },
  {
    name: 'mixed non-object entries in a remotely set container array',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: containerKey}, 'content'],
          value: [null, nestedBlock, 'x', {...nestedBlock, _key: blockKey}, ''],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [nestedBlock, {...nestedBlock, _key: blockKey}],
      },
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 0],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 1],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 2],
        origin: 'local',
      },
    ],
  },
  ...([null, 'oops'] as const).map((value) => ({
    name: `an \`update value\` ${value === null ? 'null' : 'string'} entry in a container`,
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'update value' as const,
      value: [
        {
          _type: 'container',
          _key: containerKey,
          content: [nestedBlock, value],
        },
      ],
    },
    expectedValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    expectedPatches: [],
  })),
  {
    name: '`update value` into a container text block',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    event: {
      type: 'update value',
      value: [
        {
          _type: 'container',
          _key: containerKey,
          content: [{...nestedBlock, children: [...nestedBlock.children, 42]}],
        },
      ],
    },
    expectedValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    expectedPatches: [],
  },
  {
    name: '`update value` with a null before a text span',
    initialValue: [block],
    event: {
      type: 'update value',
      value: [{...block, children: [null, ...block.children]}],
    },
    expectedValue: [block],
    expectedPatches: [],
  },
  {
    name: '`update value` with a null entry in a table cell',
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
                content: [nestedBlock],
              },
            ],
          },
        ],
      },
    ],
    event: {
      type: 'update value',
      value: [
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
                  content: [nestedBlock, null],
                },
              ],
            },
          ],
        },
      ],
    },
    expectedValue: [
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
                content: [nestedBlock],
              },
            ],
          },
        ],
      },
    ],
    expectedPatches: [],
  },
  {
    name: '`update value` with a leading null entry in a table cell',
    initialValue: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [{_type: 'cell', _key: cellKey, content: [nestedBlock]}],
          },
        ],
      },
    ],
    event: {
      type: 'update value',
      value: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {_type: 'cell', _key: cellKey, content: [null, nestedBlock]},
              ],
            },
          ],
        },
      ],
    },
    expectedValue: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [{_type: 'cell', _key: cellKey, content: [nestedBlock]}],
          },
        ],
      },
    ],
    expectedPatches: [],
  },
  {
    name: 'two null entries in one remote insert',
    initialValue: [block],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [null, null],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [block],
    expectedPatches: [
      {type: 'unset', path: [1], origin: 'local'},
      {type: 'unset', path: [1], origin: 'local'},
    ],
  },
  ...(
    [
      ['x', 'y'],
      ['x', 'y', 'z'],
    ] as const
  ).map((items) => ({
    name: `${items.length} primitives inserted after the second root block`,
    initialValue: [block, {...nestedBlock, _key: containerKey}],
    event: {
      type: 'patches' as const,
      patches: [
        {
          type: 'insert' as const,
          path: [{_key: containerKey}],
          position: 'after' as const,
          items: [...items],
          origin: 'remote' as const,
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [block, {...nestedBlock, _key: containerKey}],
    expectedPatches: items.map(() => ({
      type: 'unset' as const,
      path: [2],
      origin: 'local' as const,
    })),
  })),
  {
    name: 'two primitives inserted after the second nested block',
    initialValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [nestedBlock, {...nestedBlock, _key: blockKey}],
      },
    ],
    event: {
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: containerKey}, 'content', {_key: blockKey}],
          position: 'after',
          items: ['x', 'y'],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [nestedBlock, {...nestedBlock, _key: blockKey}],
      },
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 2],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: containerKey}, 'content', 2],
        origin: 'local',
      },
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
      type: 'patches',
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
      {type: 'unset', path: [{_key: blockKey}, 'children', 1], origin: 'local'},
    ],
  },
  {
    name: '`true` in a remote insert',
    initialValue: [block],
    event: {
      type: 'patches',
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
  ...([null, false, 0, ''] as const).map((value) => ({
    name: `a falsy ${value === '' ? "''" : String(value)} in a remote root insert`,
    initialValue: [block],
    event: {
      type: 'patches' as const,
      patches: [
        {
          type: 'insert' as const,
          path: [{_key: blockKey}],
          position: 'after' as const,
          items: [value],
          origin: 'remote' as const,
        },
      ],
      snapshot: undefined,
    },
    expectedValue: [block],
    expectedPatches: [
      {type: 'unset' as const, path: [1], origin: 'local' as const},
    ],
  })),
] satisfies Array<{
  name: string
  initialValue: unknown
  event: unknown
  expectedValue: unknown
  expectedPatches: Array<Patch>
}>)(
  'Scenario: $name is removed',
  async ({initialValue, event, expectedValue, expectedPatches}) => {
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(editorEvent) => {
              if (editorEvent.type === 'patch') {
                patches.push(editorEvent.patch)
              }
            }}
          />
          <NodePlugin nodes={[container, table, row, cell]} />
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

test('Scenario: remote inserts after a non-object share one patches frame', () => {
  const editor = createBareEditor(
    [block, nestedBlock] as Array<PortableTextBlock>,
    createTestKeyGenerator('generated-'),
  )
  const insertedBlock = {...block, _key: 'inserted'}

  withRemoteChanges(editor, 'patches', () => {
    withoutNormalizing(editor, () => {
      editor.apply({
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'before',
        node: null as never,
      })
      editor.apply({
        type: 'insert',
        path: [{_key: nestedBlockKey}],
        position: 'after',
        node: insertedBlock,
      })
    })
  })

  expect(editor.snapshot.context.value).toEqual([
    block,
    nestedBlock,
    insertedBlock,
  ])
})

test.each([
  {
    name: 'a keyed children set followed by an insert through a numeric parent',
    patches: [
      {
        type: 'set',
        path: [{_key: 'b'}, 'children'],
        value: [{_type: 'span', _key: 's', text: 'foo', marks: []}, 'x'],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [0, 'children', {_key: 's'}],
        position: 'before',
        items: [{_type: 'span', _key: 't', text: 'bar', marks: []}],
        origin: 'remote',
      },
    ],
    expectedBlockKey: 'b',
    expectedChildren: [
      {_type: 'span', _key: 't', text: 'bar', marks: []},
      {_type: 'span', _key: 's', text: 'foo', marks: []},
    ],
  },
  {
    name: 'a numeric children set followed by an insert through a keyed parent',
    patches: [
      {
        type: 'set',
        path: [0, 'children'],
        value: [{_type: 'span', _key: 's', text: 'foo', marks: []}, null],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: 'b'}, 'children', {_key: 's'}],
        position: 'before',
        items: [{_type: 'span', _key: 't', text: 'bar', marks: []}],
        origin: 'remote',
      },
    ],
    expectedBlockKey: 'b',
    expectedChildren: [
      {_type: 'span', _key: 't', text: 'bar', marks: []},
      {_type: 'span', _key: 's', text: 'foo', marks: []},
    ],
  },
  {
    name: 'a children set followed by an ancestor re-key and an insert through the new key',
    patches: [
      {
        type: 'set',
        path: [{_key: 'b'}, 'children'],
        value: [{_type: 'span', _key: 's', text: 'foo', marks: []}, 0],
        origin: 'remote',
      },
      {
        type: 'set',
        path: [{_key: 'b'}, '_key'],
        value: 'b2',
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: 'b2'}, 'children', {_key: 's'}],
        position: 'before',
        items: [{_type: 'span', _key: 't', text: 'bar', marks: []}],
        origin: 'remote',
      },
    ],
    expectedBlockKey: 'b2',
    expectedChildren: [
      {_type: 'span', _key: 't', text: 'bar', marks: []},
      {_type: 'span', _key: 's', text: 'foo', marks: []},
    ],
  },
  {
    name: 'a keyed children set followed by an unset through a numeric parent',
    patches: [
      {
        type: 'set',
        path: [{_key: 'b'}, 'children'],
        value: [
          {_type: 'span', _key: 's', text: 'foo', marks: []},
          {_type: 'span', _key: 's2', text: 'bar', marks: []},
          false,
        ],
        origin: 'remote',
      },
      {type: 'unset', path: [0, 'children', {_key: 's'}], origin: 'remote'},
    ],
    expectedBlockKey: 'b',
    expectedChildren: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
  },
])('Scenario: $name', async ({patches, expectedBlockKey, expectedChildren}) => {
  const {editor} = await createTestEditor({
    initialValue: [
      {
        _type: 'block',
        _key: 'b',
        children: [{_type: 'span', _key: 's', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition: defineSchema({}),
  })

  editor.send({type: 'patches', patches, snapshot: undefined} as never)

  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: expectedBlockKey,
        children: expectedChildren,
        markDefs: [],
        style: 'normal',
      },
    ]),
  )
})

test('Scenario: a keyed container set followed by an insert through a numeric parent', async () => {
  const {editor} = await createTestEditor({
    children: <NodePlugin nodes={[container]} />,
    initialValue: [
      {_type: 'container', _key: 'c', content: [{...block, _key: 'a'}]},
    ],
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'set',
        path: [{_key: 'c'}, 'content'],
        value: [{...block, _key: 'a'}, 'x'],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [0, 'content', {_key: 'a'}],
        position: 'before',
        items: [{...nestedBlock, _key: 'n'}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'container',
        _key: 'c',
        content: [
          {...nestedBlock, _key: 'n'},
          {...block, _key: 'a'},
        ],
      },
    ]),
  )
})

test.each([
  {
    name: 'root block',
    initialValue: [{...block, _key: 'b'}],
    childrenPath: [{_key: 'b'}, 'children'],
    keyPath: [0, '_key'],
    expectedValue: [{...block, _key: 'b2'}],
    expectedPatches: [
      {
        type: 'unset',
        path: [{_key: 'b2'}, 'children', 1],
        origin: 'local',
      },
    ],
  },
  {
    name: 'container block',
    initialValue: [
      {_type: 'container', _key: 'c', content: [{...block, _key: 'b'}]},
    ],
    childrenPath: [{_key: 'c'}, 'content', {_key: 'b'}, 'children'],
    keyPath: [0, 'content', 0, '_key'],
    expectedValue: [
      {_type: 'container', _key: 'c', content: [{...block, _key: 'b2'}]},
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [{_key: 'c'}, 'content', {_key: 'b2'}, 'children', 1],
        origin: 'local',
      },
    ],
  },
  {
    name: 'table-cell block',
    initialValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [
              {_type: 'cell', _key: 'l', content: [{...block, _key: 'b'}]},
            ],
          },
        ],
      },
    ],
    childrenPath: [
      {_key: 't'},
      'rows',
      {_key: 'r'},
      'cells',
      {_key: 'l'},
      'content',
      {_key: 'b'},
      'children',
    ],
    keyPath: [
      {_key: 't'},
      'rows',
      0,
      'cells',
      {_key: 'l'},
      'content',
      0,
      '_key',
    ],
    expectedValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [
              {_type: 'cell', _key: 'l', content: [{...block, _key: 'b2'}]},
            ],
          },
        ],
      },
    ],
    expectedPatches: [
      {
        type: 'unset',
        path: [
          {_key: 't'},
          'rows',
          {_key: 'r'},
          'cells',
          {_key: 'l'},
          'content',
          {_key: 'b2'},
          'children',
          1,
        ],
        origin: 'local',
      },
    ],
  },
])(
  'Scenario: a children set followed by a numeric or mixed re-key repairs a $name',
  async ({
    initialValue,
    childrenPath,
    keyPath,
    expectedValue,
    expectedPatches,
  }) => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(editorEvent) => {
              if (editorEvent.type === 'patch') {
                patches.push(editorEvent.patch)
              }
            }}
          />
          <NodePlugin nodes={[container, table, row, cell]} />
        </>
      ),
      initialValue: initialValue as never,
      keyGenerator: createTestKeyGenerator('generated-'),
      schemaDefinition,
    })
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: childrenPath,
          value: [...block.children, null],
          origin: 'remote',
        },
        {type: 'set', path: keyPath, value: 'b2', origin: 'remote'},
      ],
      snapshot: undefined,
    } as never)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(patches).toEqual(expectedPatches)
    })
  },
)

test.each([
  {
    name: 'root',
    initialValue: [{...block, _key: 'b'}],
    insertPath: [{_key: 'b'}],
    expectedValue: [
      {...block, _key: 'b'},
      {...block, _key: 'generated-k2', children: [{...block.children[0]}]},
    ],
    expectedPatches: [
      {
        type: 'set',
        path: [1, '_key'],
        value: 'generated-k2',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'generated-k2'}, 'children', 1],
        origin: 'local',
      },
    ],
  },
  {
    name: 'container',
    initialValue: [
      {_type: 'container', _key: 'c', content: [{...block, _key: 'b'}]},
    ],
    insertPath: [{_key: 'c'}, 'content', {_key: 'b'}],
    expectedValue: [
      {
        _type: 'container',
        _key: 'c',
        content: [
          {...block, _key: 'b'},
          {...block, _key: 'generated-k2', children: [{...block.children[0]}]},
        ],
      },
    ],
    expectedPatches: [
      {
        type: 'set',
        path: [{_key: 'c'}, 'content', 1, '_key'],
        value: 'generated-k2',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'c'}, 'content', {_key: 'generated-k2'}, 'children', 1],
        origin: 'local',
      },
    ],
  },
  {
    name: 'table cell',
    initialValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [
              {_type: 'cell', _key: 'l', content: [{...block, _key: 'b'}]},
            ],
          },
        ],
      },
    ],
    insertPath: [
      {_key: 't'},
      'rows',
      {_key: 'r'},
      'cells',
      {_key: 'l'},
      'content',
      {_key: 'b'},
    ],
    expectedValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [
              {
                _type: 'cell',
                _key: 'l',
                content: [
                  {...block, _key: 'b'},
                  {
                    ...block,
                    _key: 'generated-k2',
                    children: [{...block.children[0]}],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    expectedPatches: [
      {
        type: 'set',
        path: [
          {_key: 't'},
          'rows',
          {_key: 'r'},
          'cells',
          {_key: 'l'},
          'content',
          1,
          '_key',
        ],
        value: 'generated-k2',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [
          {_key: 't'},
          'rows',
          {_key: 'r'},
          'cells',
          {_key: 'l'},
          'content',
          {_key: 'generated-k2'},
          'children',
          1,
        ],
        origin: 'local',
      },
    ],
  },
])(
  'Scenario: a duplicate-keyed $name insert removes its non-object child',
  async ({initialValue, insertPath, expectedValue, expectedPatches}) => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(editorEvent) => {
              if (editorEvent.type === 'patch') {
                patches.push(editorEvent.patch)
              }
            }}
          />
          <NodePlugin nodes={[container, table, row, cell]} />
        </>
      ),
      initialValue: initialValue as never,
      keyGenerator: createTestKeyGenerator('generated-'),
      schemaDefinition,
    })
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: insertPath,
          position: 'after',
          items: [{...block, _key: 'b', children: [...block.children, null]}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    } as never)
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(patches).toEqual(expectedPatches)
    })
  },
)

test.each([
  {
    name: 'container content',
    initialValue: [{_type: 'container', _key: 'c', content: [block]}],
    path: [{_key: 'c'}, 'content'],
    expectedValue: (repairedBlock: unknown) => [
      {_type: 'container', _key: 'c', content: [repairedBlock]},
    ],
  },
  {
    name: 'nested container content',
    initialValue: [
      {
        _type: 'container',
        _key: 'c',
        content: [{_type: 'container', _key: 'd', content: [block]}],
      },
    ],
    path: [{_key: 'c'}, 'content', {_key: 'd'}, 'content'],
    expectedValue: (repairedBlock: unknown) => [
      {
        _type: 'container',
        _key: 'c',
        content: [{_type: 'container', _key: 'd', content: [repairedBlock]}],
      },
    ],
  },
  {
    name: 'table cell content',
    initialValue: [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [{_type: 'cell', _key: 'l', content: [block]}],
          },
        ],
      },
    ],
    path: [{_key: 't'}, 'rows', {_key: 'r'}, 'cells', {_key: 'l'}, 'content'],
    expectedValue: (repairedBlock: unknown) => [
      {
        _type: 'table',
        _key: 't',
        rows: [
          {
            _type: 'row',
            _key: 'r',
            cells: [{_type: 'cell', _key: 'l', content: [repairedBlock]}],
          },
        ],
      },
    ],
  },
])(
  'Scenario: a keyless block containing null is repaired in $name',
  async ({initialValue, path, expectedValue}) => {
    const {editor} = await createTestEditor({
      children: <NodePlugin nodes={[container, table, row, cell]} />,
      initialValue: initialValue as never,
      keyGenerator: createTestKeyGenerator('generated-'),
      schemaDefinition,
    })
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path,
          value: [
            {
              _type: 'block',
              children: [
                {_type: 'span', text: 'foo', marks: []},
                null,
                {_type: 'span', _key: '', text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    } as never)
    const repairedBlock = {
      _type: 'block',
      _key: 'generated-k4',
      children: [
        {_type: 'span', _key: 'generated-k3', text: 'foo', marks: []},
        {_type: 'span', _key: 'generated-k2', text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual(
        expectedValue(repairedBlock),
      ),
    )
  },
)

test('Scenario: undo history survives a local children set containing null', async () => {
  const initialValue = [
    {
      _type: 'block',
      _key: 'b',
      children: [{_type: 'span', _key: 's', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ]
  const {editor} = await createTestEditor({
    initialValue,
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition: defineSchema({}),
  })
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b'}, 'children', {_key: 's'}], offset: 3},
      focus: {path: [{_key: 'b'}, 'children', {_key: 's'}], offset: 3},
    },
  })
  editor.send({type: 'insert.text', text: '!'})
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialValue[0],
        children: [{_type: 'span', _key: 's', text: 'foo!', marks: []}],
      },
    ]),
  )
  editor.send({
    type: 'set',
    at: [{_key: 'b'}, 'children'],
    value: [{_type: 'span', _key: 's', text: 'foo!', marks: []}, null],
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialValue[0],
        children: [{_type: 'span', _key: 's', text: 'foo!', marks: []}],
      },
    ]),
  )
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialValue[0],
        children: [{_type: 'span', _key: 's', text: 'foo!', marks: []}],
      },
    ]),
  )
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(consoleError.mock.calls).toEqual([])
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })
  consoleError.mockRestore()
})

test('Scenario: undo history survives a local container set containing null', async () => {
  const initialValue = [
    {
      _type: 'container',
      _key: 'c',
      content: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 's', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    },
  ]
  const {editor} = await createTestEditor({
    children: <NodePlugin nodes={[container]} />,
    initialValue: initialValue as never,
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition,
  })
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: 'c'}, 'content', {_key: 'a'}, 'children', {_key: 's'}],
        offset: 3,
      },
      focus: {
        path: [{_key: 'c'}, 'content', {_key: 'a'}, 'children', {_key: 's'}],
        offset: 3,
      },
    },
  })
  editor.send({type: 'insert.text', text: '!'})
  const editedValue = [
    {
      ...initialValue[0],
      content: [
        {
          ...initialValue[0]!.content[0],
          children: [{_type: 'span', _key: 's', text: 'foo!', marks: []}],
        },
      ],
    },
  ]
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual(editedValue),
  )
  editor.send({
    type: 'set',
    at: [{_key: 'c'}, 'content'],
    value: [null, editedValue[0]!.content[0], null],
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual(editedValue),
  )
  editor.send({type: 'history.undo'})
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual(editedValue),
  )
  editor.send({type: 'history.undo'})
  await vi.waitFor(() => {
    expect(consoleError.mock.calls).toEqual([])
    expect(editor.getSnapshot().context.value).toEqual(initialValue)
  })
  consoleError.mockRestore()
})

test('Scenario: remotely inserted keyless blocks and descendants all receive keys', async () => {
  const {editor} = await createTestEditor({
    initialValue: [block],
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition: defineSchema({}),
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: '',
            children: [
              {_type: 'span', text: 'foo', marks: []},
              'x',
              {_type: 'span', _key: 42, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: '',
            children: [{_type: 'span', text: 'baz', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  } as never)

  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      block,
      {
        _type: 'block',
        _key: 'generated-k4',
        children: [
          {_type: 'span', _key: 'generated-k6', text: 'foo', marks: []},
          {_type: 'span', _key: 'generated-k5', text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'generated-k3',
        children: [
          {_type: 'span', _key: 'generated-k2', text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]),
  )
})

test.each([
  {
    name: 'nested container arrays in one update',
    initialValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [
          {
            _type: 'container',
            _key: 'inner-container',
            content: [nestedBlock],
          },
        ],
      },
    ],
    value: [
      {
        _type: 'container',
        _key: containerKey,
        content: [
          null,
          {
            _type: 'container',
            _key: 'inner-container',
            content: [nestedBlock, 'oops', block],
          },
          '',
        ],
      },
    ],
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [
          {
            _type: 'container',
            _key: 'inner-container',
            content: [nestedBlock, block],
          },
        ],
      },
    ],
  },
  {
    name: 'table row and cell arrays in one update',
    initialValue: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [{_type: 'cell', _key: cellKey, content: [block]}],
          },
        ],
      },
    ],
    value: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          null,
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              'oops',
              {_type: 'cell', _key: cellKey, content: [block]},
              0,
            ],
          },
          false,
        ],
      },
    ],
    expectedValue: [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [{_type: 'cell', _key: cellKey, content: [block]}],
          },
        ],
      },
    ],
  },
])(
  'Scenario: $name is corrected',
  async ({initialValue, value, expectedValue}) => {
    const {editor} = await createTestEditor({
      children: <NodePlugin nodes={[container, table, row, cell]} />,
      initialValue: initialValue as never,
      keyGenerator: createTestKeyGenerator('generated-'),
      schemaDefinition,
    })
    editor.send({type: 'update value', value} as never)
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual(expectedValue),
    )
  },
)

test('Scenario: a second patches event inserts null into a verified group', async () => {
  const secondBlock = {...nestedBlock, _key: 'second-block'}
  const {editor} = await createTestEditor({
    initialValue: [block],
    keyGenerator: createTestKeyGenerator('generated-'),
    schemaDefinition,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [secondBlock],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([block, secondBlock]),
  )
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [null],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([block, secondBlock]),
  )
})

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
          if (event.type === 'patch') {
            patches.push(event.patch)
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
        children: [{_type: 'span', _key: undoSpanKey, text: 'foo!', marks: []}],
      },
    ]),
  )
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'insert',
        path: [{_key: undoBlockKey}],
        position: 'after',
        items: ['oops'],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        ...initialValue[0],
        children: [{_type: 'span', _key: undoSpanKey, text: 'foo!', marks: []}],
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

test('Scenario: a non-object before the caret block does not break typing', async () => {
  const keyGenerator = createTestKeyGenerator()
  const caretBlockKey = keyGenerator()
  const caretSpanKey = keyGenerator()
  const caretContainerKey = keyGenerator()
  const caretBlock = {
    _type: 'block',
    _key: caretBlockKey,
    children: [{_type: 'span', _key: caretSpanKey, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const {editor} = await createTestEditor({
    children: <NodePlugin nodes={[container]} />,
    initialValue: [
      {
        _type: 'container',
        _key: caretContainerKey,
        content: [caretBlock],
      },
    ],
    keyGenerator,
    schemaDefinition,
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: caretContainerKey},
          'content',
          {_key: caretBlockKey},
          'children',
          {_key: caretSpanKey},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: caretContainerKey},
          'content',
          {_key: caretBlockKey},
          'children',
          {_key: caretSpanKey},
        ],
        offset: 3,
      },
    },
  })
  editor.send({
    type: 'update value',
    value: [
      {
        _type: 'container',
        _key: caretContainerKey,
        content: [null, caretBlock],
      },
    ],
  } as never)
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'container',
        _key: caretContainerKey,
        content: [caretBlock],
      },
    ]),
  )
  editor.send({type: 'insert.text', text: '!'})
  await vi.waitFor(() =>
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'container',
        _key: caretContainerKey,
        content: [
          {
            ...caretBlock,
            children: [
              {_type: 'span', _key: caretSpanKey, text: 'foo!', marks: []},
            ],
          },
        ],
      },
    ]),
  )
})

test.each([
  {
    name: 'a root set followed by an insert that shifts the non-object',
    initialValue: [block, nestedBlock],
    patches: [
      {
        type: 'set',
        path: [],
        value: [block, 'x', nestedBlock],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'before',
        items: [{...nestedBlock, _key: 'inserted'}],
        origin: 'remote',
      },
    ],
    expectedValue: [{...nestedBlock, _key: 'inserted'}, block, nestedBlock],
  },
  {
    name: 'a children set followed by an insert that shifts null',
    initialValue: [block],
    patches: [
      {
        type: 'set',
        path: [{_key: blockKey}, 'children'],
        value: [
          block.children[0],
          null,
          {...block.children[0], _key: secondSpanKey, text: 'bar'},
        ],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        position: 'before',
        items: [{_type: 'span', _key: 'inserted-span', text: 'baz', marks: []}],
        origin: 'remote',
      },
    ],
    expectedValue: [
      {
        ...block,
        children: [
          {_type: 'span', _key: 'inserted-span', text: 'baz', marks: []},
          block.children[0],
          {...block.children[0], _key: secondSpanKey, text: 'bar'},
        ],
      },
    ],
  },
  {
    name: 'a keyless root neighbour does not consume the non-object lookup',
    initialValue: [block],
    patches: [
      {
        type: 'set',
        path: [],
        value: [{...nestedBlock, _key: undefined}, block],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: ['x'],
        origin: 'remote',
      },
    ],
    expectedValue: [{...nestedBlock, _key: 'generated-k2'}, block],
  },
  ...(
    [
      [
        'keyless before non-object in a set',
        [{...nestedBlock, _key: undefined}, 'x', block],
      ],
      [
        'non-object before keyless in a set',
        ['x', {...nestedBlock, _key: undefined}, block],
      ],
    ] as const
  ).map(([name, value]) => ({
    name,
    initialValue: [block],
    patches: [
      {type: 'set' as const, path: [], value, origin: 'remote' as const},
    ],
    expectedValue: [{...nestedBlock, _key: 'generated-k2'}, block],
  })),
  ...(
    [
      [
        'keyless before non-object in an insert',
        [{...nestedBlock, _key: undefined}, 'x'],
      ],
      [
        'non-object before keyless in an insert',
        ['x', {...nestedBlock, _key: undefined}],
      ],
    ] as const
  ).map(([name, items]) => ({
    name,
    initialValue: [block],
    patches: [
      {
        type: 'insert' as const,
        path: [{_key: blockKey}],
        position: 'after' as const,
        items,
        origin: 'remote' as const,
      },
    ],
    expectedValue: [block, {...nestedBlock, _key: 'generated-k2'}],
  })),
  {
    name: 'two keyless objects around a non-object in a set',
    initialValue: [block],
    patches: [
      {
        type: 'set',
        path: [],
        value: [
          {...nestedBlock, _key: undefined},
          'x',
          {...block, _key: undefined},
        ],
        origin: 'remote',
      },
    ],
    expectedValue: [
      {...nestedBlock, _key: 'generated-k3'},
      {...block, _key: 'generated-k2'},
    ],
  },
  {
    name: 'two keyless objects around a non-object in an insert',
    initialValue: [block],
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [
          {...nestedBlock, _key: undefined},
          'x',
          {...nestedBlock, _key: undefined},
        ],
        origin: 'remote',
      },
    ],
    expectedValue: [
      block,
      {...nestedBlock, _key: 'generated-k3'},
      {...nestedBlock, _key: 'generated-k2'},
    ],
  },
  {
    name: 'a later insert resolves after null inserted before a keyed block',
    initialValue: [block, nestedBlock],
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'before',
        items: [null],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: nestedBlockKey}],
        position: 'after',
        items: [{...block, _key: 'inserted'}],
        origin: 'remote',
      },
    ],
    expectedValue: [block, nestedBlock, {...block, _key: 'inserted'}],
  },
  {
    name: 'a primitive followed by a keyed block in one root batch',
    initialValue: [block, nestedBlock],
    patches: [
      {
        type: 'insert',
        path: [{_key: nestedBlockKey}],
        position: 'after',
        items: ['oops', {...block, _key: 'new-block'}],
        origin: 'remote',
      },
    ],
    expectedValue: [block, nestedBlock, {...block, _key: 'new-block'}],
  },
  {
    name: 'a primitive followed by inserts before it in one root batch',
    initialValue: [block, nestedBlock],
    patches: [
      {
        type: 'insert',
        path: [{_key: nestedBlockKey}],
        position: 'after',
        items: ['oops'],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'before',
        items: [
          {...block, _key: 'new-block-1'},
          {...block, _key: 'new-block-2'},
        ],
        origin: 'remote',
      },
    ],
    expectedValue: [
      {...block, _key: 'new-block-1'},
      {...block, _key: 'new-block-2'},
      block,
      nestedBlock,
    ],
  },
  {
    name: 'twenty separately inserted primitives in one root batch',
    initialValue: [block],
    patches: Array.from({length: 20}, (_, index) => ({
      type: 'insert',
      path: [{_key: blockKey}],
      position: 'after',
      items: [`oops-${index}`],
      origin: 'remote',
    })),
    expectedValue: [block],
  },
  {
    name: 'two keyless blocks in one root batch',
    initialValue: [block],
    patches: [
      {
        type: 'insert',
        path: [{_key: blockKey}],
        position: 'after',
        items: [
          {...nestedBlock, _key: undefined},
          {...nestedBlock, _key: undefined},
        ],
        origin: 'remote',
      },
    ],
    expectedValue: [
      block,
      {...nestedBlock, _key: 'generated-k3'},
      {...nestedBlock, _key: 'generated-k2'},
    ],
  },
  {
    name: 'a later patch targeting a block behind null',
    initialValue: [
      {_type: 'container', _key: containerKey, content: [nestedBlock]},
    ],
    patches: [
      {
        type: 'set',
        path: [{_key: containerKey}, 'content'],
        value: [null, nestedBlock],
        origin: 'remote',
      },
      {
        type: 'set',
        path: [
          {_key: containerKey},
          'content',
          {_key: nestedBlockKey},
          'style',
        ],
        value: 'h1',
        origin: 'remote',
      },
    ],
    expectedValue: [
      {
        _type: 'container',
        _key: containerKey,
        content: [{...nestedBlock, style: 'h1'}],
      },
    ],
  },
])(
  'Scenario: $name is corrected',
  async ({initialValue, patches, expectedValue}) => {
    const {editor} = await createTestEditor({
      children: <NodePlugin nodes={[container, table, row, cell]} />,
      initialValue: initialValue as never,
      keyGenerator: createTestKeyGenerator('generated-'),
      schemaDefinition,
    })
    editor.send({type: 'patches', patches, snapshot: undefined} as never)
    await vi.waitFor(() =>
      expect(editor.getSnapshot().context.value).toEqual(expectedValue),
    )
  },
)
