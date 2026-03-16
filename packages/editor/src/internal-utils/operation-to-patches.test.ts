import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {beforeEach, describe, expect, it, test} from 'vitest'
import {createActor} from 'xstate'
import {editorMachine} from '../editor/editor-machine'
import {relayMachine} from '../editor/relay-machine'
import {plugins} from '../slate-plugins/slate-plugins'
import {createEditor} from '../slate/create-editor'
import type {Node} from '../slate/interfaces/node'
import {defaultKeyGenerator} from '../utils/key-generator'
import {
  insertNodePatch,
  insertTextPatch,
  removeNodePatch,
  removeTextPatch,
} from './operation-to-patches'

const schemaDefinition = defineSchema({
  inlineObjects: [{name: 'someObject'}],
})
const schema = compileSchema(schemaDefinition)
const editorActor = createActor(editorMachine, {
  input: {
    schema,
    keyGenerator: defaultKeyGenerator,
  },
})
const relayActor = createActor(relayMachine)

const e = createEditor({
  schema,
  keyGenerator: defaultKeyGenerator,
})
e.children = [] as any
Object.defineProperty(e, 'value', {
  get() {
    return e.children
  },
  configurable: true,
})
const editor = plugins(e, {
  editorActor,
  relayActor,
  subscriptions: [],
})

const createDefaultChildren = () =>
  [
    {
      _type: 'block',
      _key: '1f2e64b47787',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'c130395c640c', text: '', marks: []},
        {
          _key: '773866318fa8',
          _type: 'someObject',
          title: 'The Object',
        },
        {_type: 'span', _key: 'fd9b4a4e6c0b', text: '', marks: []},
      ],
    },
  ] as Array<PortableTextBlock>

describe(insertNodePatch.name, () => {
  test('Scenario: Inserting block object on empty editor', () => {
    expect(
      insertNodePatch(
        compileSchema(defineSchema({blockObjects: [{name: 'image'}]})),
        [
          {
            _key: 'k2',
            _type: 'image',
          },
        ],
        {
          type: 'insert_node',
          path: [0],
          node: {
            _key: 'k2',
            _type: 'image',
          },
        },
        [],
      ),
    ).toEqual([
      {
        path: [],
        type: 'setIfMissing',
        value: [],
      },
      {
        path: [0],
        type: 'insert',
        items: [
          {
            _key: 'k2',
            _type: 'image',
          },
        ],
        position: 'before',
      },
    ])
  })
})

describe('operationToPatches', () => {
  beforeEach(() => {
    editor.children = createDefaultChildren()
    editor.onChange()
  })

  it('produce correct insert block patch', () => {
    expect(
      insertNodePatch(
        schema,
        editor.children,
        {
          type: 'insert_node',
          path: [0],
          node: {
            _type: 'someObject',
            _key: 'c130395c640c',
            title: 'The Object',
          },
        },
        createDefaultChildren(),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "items": [
            {
              "_key": "c130395c640c",
              "_type": "someObject",
              "title": "The Object",
            },
          ],
          "path": [
            {
              "_key": "1f2e64b47787",
            },
          ],
          "position": "before",
          "type": "insert",
        },
      ]
    `)
  })

  it('produce correct insert block patch with an empty editor', () => {
    editor.children = []
    editor.onChange()
    expect(
      insertNodePatch(
        schema,
        editor.children,
        {
          type: 'insert_node',
          path: [0],
          node: {
            _type: 'someObject',
            _key: 'c130395c640c',
          },
        },

        [],
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "path": [],
          "type": "setIfMissing",
          "value": [],
        },
        {
          "items": [
            {
              "_key": "c130395c640c",
              "_type": "someObject",
            },
          ],
          "path": [
            0,
          ],
          "position": "before",
          "type": "insert",
        },
      ]
    `)
  })

  test('produce correct insert child patch', () => {
    expect(
      insertNodePatch(
        schema,
        editor.children,
        {
          type: 'insert_node',
          path: [0, 3],
          node: {
            _type: 'someObject',
            _key: 'c130395c640c',
            title: 'The Object',
          },
        },

        createDefaultChildren(),
      ),
    ).toEqual([
      {
        type: 'setIfMissing',
        path: [{_key: '1f2e64b47787'}, 'children'],
        value: [],
      },
      {
        items: [
          {
            _key: 'c130395c640c',
            _type: 'someObject',
            title: 'The Object',
          },
        ],
        path: [
          {
            _key: '1f2e64b47787',
          },
          'children',
          {
            _key: 'fd9b4a4e6c0b',
          },
        ],
        position: 'after',
        type: 'insert',
      },
    ])
  })

  it('produce correct insert text patch', () => {
    ;(editor.children[0] as PortableTextTextBlock).children[2]!.text = '1'
    editor.onChange()
    expect(
      insertTextPatch(
        editorActor.getSnapshot().context.schema,
        editor.children,
        {
          type: 'insert_text',
          path: [0, 2],
          text: '1',
          offset: 0,
        },
        createDefaultChildren(),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "fd9b4a4e6c0b",
            },
            "text",
          ],
          "type": "diffMatchPatch",
          "value": "@@ -0,0 +1 @@
      +1
      ",
        },
      ]
    `)
  })

  it('returns empty patches when block is not a text block', () => {
    const blockObjectSchema = compileSchema(
      defineSchema({blockObjects: [{name: 'image'}]}),
    )
    const blockObjectChildren: Array<Node> = [
      {
        _key: 'img1',
        _type: 'image',
        children: [{_key: 'void-child', _type: 'span', marks: [], text: ''}],
        value: {},
      },
    ]
    const blockObjectValue: Array<PortableTextBlock> = [
      {_key: 'img1', _type: 'image'},
    ]

    expect(
      insertTextPatch(
        blockObjectSchema,
        blockObjectChildren,
        {
          type: 'insert_text',
          path: [0, 0],
          text: 'foo',
          offset: 0,
        },
        blockObjectValue,
      ),
    ).toEqual([])
  })

  it('produces correct remove text patch', () => {
    const before = createDefaultChildren()
    ;(before[0] as PortableTextTextBlock).children[2]!.text = '1'
    expect(
      removeTextPatch(
        editorActor.getSnapshot().context.schema,
        editor.children,
        {
          type: 'remove_text',
          path: [0, 2],
          text: '1',
          offset: 1,
        },

        before,
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "fd9b4a4e6c0b",
            },
            "text",
          ],
          "type": "diffMatchPatch",
          "value": "@@ -1 +0,0 @@
      -1
      ",
        },
      ]
    `)
  })

  it('produces correct remove child patch', () => {
    expect(
      removeNodePatch(
        editorActor.getSnapshot().context.schema,
        createDefaultChildren(),
        {
          type: 'remove_node',
          path: [0, 1],
          node: {
            _key: '773866318fa8',
            _type: 'someObject',
            title: 'The object',
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "773866318fa8",
            },
          ],
          "type": "unset",
        },
      ]
    `)
  })

  it('produce correct remove block patch', () => {
    const children = createDefaultChildren()
    const val = createDefaultChildren()
    expect(
      removeNodePatch(editorActor.getSnapshot().context.schema, val, {
        type: 'remove_node',
        path: [0],
        node: children[0]!,
      }),
    ).toMatchInlineSnapshot(`
      [
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
          ],
          "type": "unset",
        },
      ]
    `)
  })
})

describe('defensive setIfMissing patches', () => {
  beforeEach(() => {
    editor.children = createDefaultChildren()
    editor.onChange()
  })

  describe(insertNodePatch.name, () => {
    test('includes setIfMissing before inserting a span into children', () => {
      const patches = insertNodePatch(
        schema,
        editor.children,
        {
          type: 'insert_node',
          path: [0, 3],
          node: {
            _type: 'span',
            _key: 'new-span',
            text: 'hello',
            marks: [],
          },
        },
        createDefaultChildren(),
      )

      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: '1f2e64b47787'}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          items: [{_type: 'span', _key: 'new-span', text: 'hello', marks: []}],
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
          position: 'after',
        },
      ])
    })

    test('includes setIfMissing before inserting an inline object into children', () => {
      const patches = insertNodePatch(
        schema,
        editor.children,
        {
          type: 'insert_node',
          path: [0, 3],
          node: {
            _type: 'someObject',
            _key: 'new-object',
            title: 'New Object',
          },
        },
        createDefaultChildren(),
      )

      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: '1f2e64b47787'}, 'children'],
          value: [],
        },
        {
          type: 'insert',
          items: [
            {_key: 'new-object', _type: 'someObject', title: 'New Object'},
          ],
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
          position: 'after',
        },
      ])
    })
  })
})
