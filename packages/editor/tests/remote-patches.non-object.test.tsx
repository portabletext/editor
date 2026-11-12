import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

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
    name: 'two primitives in one remote insert',
    initialValue: [block],
    event: {
      type: 'patches',
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
])(
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
