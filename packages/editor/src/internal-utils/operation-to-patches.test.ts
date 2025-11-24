import {compileSchemaDefinitionToPortableTextMemberSchemaTypes} from '@portabletext/sanity-bridge'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import type {PortableTextTextBlock} from '@sanity/types'
import {createEditor, type Descendant} from 'slate'
import {beforeEach, describe, expect, it, test} from 'vitest'
import {createActor} from 'xstate'
import {editorMachine} from '../editor/editor-machine'
import {withPlugins} from '../editor/plugins/with-plugins'
import {relayMachine} from '../editor/relay-machine'
import {defaultKeyGenerator} from '../utils/key-generator'
import {
  insertNodePatch,
  insertTextPatch,
  mergeNodePatch,
  removeNodePatch,
  removeTextPatch,
  splitNodePatch,
} from './operation-to-patches'

const schemaDefinition = defineSchema({
  inlineObjects: [{name: 'someObject'}],
})
const schema = compileSchema(schemaDefinition)
const legacySchema =
  compileSchemaDefinitionToPortableTextMemberSchemaTypes(schemaDefinition)
const editorActor = createActor(editorMachine, {
  input: {
    schema,
    keyGenerator: defaultKeyGenerator,
    getLegacySchema: () => legacySchema,
  },
})
const relayActor = createActor(relayMachine)

const e = createEditor()
e.value = []
const editor = withPlugins(e, {
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
          value: {title: 'The Object'},
          __inline: true,
          children: [{_type: 'span', _key: 'bogus', text: '', marks: []}],
        },
        {_type: 'span', _key: 'fd9b4a4e6c0b', text: '', marks: []},
      ],
    },
  ] satisfies Array<Descendant>
const createDefaultValue = () =>
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
          value: {title: 'The Object'},
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
            children: [
              {
                _key: 'void-child',
                _type: 'span',
                marks: [],
                text: '',
              },
            ],
            value: {},
          },
        ],
        {
          type: 'insert_node',
          path: [0],
          node: {
            _key: 'k2',
            _type: 'image',
            children: [
              {
                _key: 'void-child',
                _type: 'span',
                marks: [],
                text: '',
              },
            ],
            value: {},
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

  it('translates void items correctly when splitting spans', () => {
    expect(
      splitNodePatch(
        schema,
        editor.children,
        {
          type: 'split_node',
          path: [0, 0],
          position: 0,
          properties: {_type: 'span', _key: 'c130395c640c', marks: []},
        },

        createDefaultValue(),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "items": [
            {
              "_key": "773866318fa8",
              "_type": "someObject",
              "title": "The Object",
            },
          ],
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "c130395c640c",
            },
          ],
          "position": "after",
          "type": "insert",
        },
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "c130395c640c",
            },
            "text",
          ],
          "type": "set",
          "value": "",
        },
      ]
    `)
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
            value: {title: 'The Object'},
            __inline: false,
            children: [{_key: '1', _type: 'span', text: '', marks: []}],
          },
        },
        createDefaultValue(),
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
            value: {},
            __inline: false,
            children: [{_key: '1', _type: 'span', text: '', marks: []}],
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
            value: {title: 'The Object'},
            __inline: true,
            children: [{_key: '1', _type: 'span', text: '', marks: []}],
          },
        },

        createDefaultValue(),
      ),
    ).toEqual([
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
    ;(editor.children[0] as PortableTextTextBlock).children[2].text = '1'
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
        createDefaultValue(),
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

  it('produces correct remove text patch', () => {
    const before = createDefaultValue()
    ;(before[0] as PortableTextTextBlock).children[2].text = '1'
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
        createDefaultValue(),
        {
          type: 'remove_node',
          path: [0, 1],
          node: {
            _key: '773866318fa8',
            _type: 'someObject',
            value: {title: 'The object'},
            __inline: true,
            children: [{_type: 'span', _key: 'bogus', text: '', marks: []}],
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
    const val = createDefaultValue()
    expect(
      removeNodePatch(editorActor.getSnapshot().context.schema, val, {
        type: 'remove_node',
        path: [0],
        node: children[0],
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

  it('produce correct merge node patch', () => {
    const val = createDefaultValue()
    ;(val[0] as PortableTextTextBlock).children.push({
      _type: 'span',
      _key: 'r4wr323432',
      text: '1234',
      marks: [],
    })
    const block = editor.children[0] as PortableTextTextBlock
    block.children = block.children.splice(0, 3)
    block.children[2].text = '1234'
    editor.onChange()
    expect(
      mergeNodePatch(
        schema,
        editor.children,
        {
          type: 'merge_node',
          path: [0, 3],
          position: 2,
          properties: {text: '1234'},
        },
        val,
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
          "type": "set",
          "value": "1234",
        },
        {
          "path": [
            {
              "_key": "1f2e64b47787",
            },
            "children",
            {
              "_key": "r4wr323432",
            },
          ],
          "type": "unset",
        },
      ]
    `)
  })
})
