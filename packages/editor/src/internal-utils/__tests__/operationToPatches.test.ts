import type {PortableTextTextBlock} from '@sanity/types'
import {createEditor, type Descendant} from 'slate'
import {beforeEach, describe, expect, it} from 'vitest'
import {createActor} from 'xstate'
import {schemaType} from '../../editor/__tests__/PortableTextEditorTester'
import {editorMachine} from '../../editor/editor-machine'
import {legacySchemaToEditorSchema} from '../../editor/editor-schema'
import {defaultKeyGenerator} from '../../editor/key-generator'
import {createLegacySchema} from '../../editor/legacy-schema'
import {withPlugins} from '../../editor/plugins/with-plugins'
import {createOperationToPatches} from '../operationToPatches'

const legacySchema = createLegacySchema(schemaType)
const schemaTypes = legacySchemaToEditorSchema(legacySchema)
const editorActor = createActor(editorMachine, {
  input: {
    schema: schemaTypes,
    keyGenerator: defaultKeyGenerator,
    getLegacySchema: () => legacySchema,
  },
})

const operationToPatches = createOperationToPatches(editorActor)

const editor = withPlugins(createEditor(), {
  editorActor,
  subscriptions: [],
})

const createDefaultValue = () =>
  [
    {
      _type: 'myTestBlockType',
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
  ] as Descendant[]

describe('operationToPatches', () => {
  beforeEach(() => {
    editor.children = createDefaultValue()
    editor.onChange()
  })

  it('translates void items correctly when splitting spans', () => {
    expect(
      operationToPatches.splitNodePatch(
        editor,
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
      operationToPatches.insertNodePatch(
        editor,
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
      operationToPatches.insertNodePatch(
        editor,
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

  it('produce correct insert child patch', () => {
    expect(
      operationToPatches.insertNodePatch(
        editor,
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
            "children",
            {
              "_key": "fd9b4a4e6c0b",
            },
          ],
          "position": "after",
          "type": "insert",
        },
      ]
    `)
  })

  it('produce correct insert text patch', () => {
    ;(editor.children[0] as PortableTextTextBlock).children[2].text = '1'
    editor.onChange()
    expect(
      operationToPatches.insertTextPatch(
        editor,
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
      operationToPatches.removeTextPatch(
        editor,
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
      operationToPatches.removeNodePatch(
        editor,
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
              "_key": "773866318fa8",
            },
          ],
          "type": "unset",
        },
      ]
    `)
  })

  it('produce correct remove block patch', () => {
    const val = createDefaultValue()
    expect(
      operationToPatches.removeNodePatch(
        editor,
        {
          type: 'remove_node',
          path: [0],
          node: val[0],
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
      operationToPatches.mergeNodePatch(
        editor,
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
