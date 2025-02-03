import type {Patch} from '@portabletext/patches'
import {createEditor, type Descendant} from 'slate'
import {beforeEach, describe, expect, it} from 'vitest'
import {createActor} from 'xstate'
import {coreBehaviors} from '../../behaviors/behavior.core'
import {schemaType} from '../../editor/__tests__/PortableTextEditorTester'
import {createEditorSchema} from '../../editor/create-editor-schema'
import {editorMachine} from '../../editor/editor-machine'
import {defaultKeyGenerator} from '../../editor/key-generator'
import {withPlugins} from '../../editor/plugins/with-plugins'
import {createApplyPatch} from '../applyPatch'
import {VOID_CHILD_KEY} from '../values'

const schemaTypes = createEditorSchema(schemaType)

const patchToOperations = createApplyPatch(schemaTypes)

const editor = withPlugins(createEditor(), {
  editorActor: createActor(editorMachine, {
    input: {
      behaviors: coreBehaviors,
      schema: schemaTypes,
      keyGenerator: defaultKeyGenerator,
    },
  }),
  subscriptions: [],
})

const createDefaultValue = (): Descendant[] => [
  {
    _type: 'image',
    _key: 'c01739b0d03b',
    children: [
      {
        _key: VOID_CHILD_KEY,
        _type: 'span',
        text: '',
        marks: [],
      },
    ],
    __inline: false,
    value: {
      asset: {
        _ref: 'image-f52f71bc1df46e080dabe43a8effe8ccfb5f21de-4032x3024-png',
        _type: 'reference',
      },
    },
  },
]

describe('operationToPatches', () => {
  beforeEach(() => {
    editor.onChange()
  })

  it('makes the correct operations for block objects', () => {
    editor.children = createDefaultValue()
    const patches = [
      {
        type: 'unset',
        path: [{_key: 'c01739b0d03b'}, 'hotspot'],
        origin: 'remote',
      },
      {type: 'unset', path: [{_key: 'c01739b0d03b'}, 'crop'], origin: 'remote'},
      {
        type: 'set',
        path: [{_key: 'c01739b0d03b'}, 'asset'],
        value: {
          _ref: 'image-b5681d9d0b2b6c922238e7c694500dd7c1349b19-256x256-jpg',
          _type: 'reference',
        },
        origin: 'remote',
      },
    ] as Patch[]
    patches.forEach((p) => {
      patchToOperations(editor, p)
    })
    expect(editor.children).toEqual([
      {
        __inline: false,
        _key: 'c01739b0d03b',
        _type: 'image',
        children: [
          {
            _key: VOID_CHILD_KEY,
            _type: 'span',
            marks: [],
            text: '',
          },
        ],
        value: {
          asset: {
            _ref: 'image-b5681d9d0b2b6c922238e7c694500dd7c1349b19-256x256-jpg',
            _type: 'reference',
          },
        },
      },
    ])
  })
  it('will not create operations for insertion inside blocks', () => {
    editor.children = [
      {
        _type: 'someType',
        _key: 'c01739b0d03b',
        children: [
          {
            _key: VOID_CHILD_KEY,
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        __inline: false,
        value: {
          asset: {
            _ref: 'image-f52f71bc1df46e080dabe43a8effe8ccfb5f21de-4032x3024-png',
            _type: 'reference',
          },
          nestedArray: [],
        },
      },
    ]
    const patches = [
      {
        type: 'insert',
        path: [{_key: 'c01739b0d03b'}, 'nestedArray'],
        origin: 'remote',
      },
    ] as Patch[]
    patches.forEach((p) => {
      patchToOperations(editor, p)
    })
    expect(editor.children).toMatchInlineSnapshot(`
      [
        {
          "__inline": false,
          "_key": "c01739b0d03b",
          "_type": "someType",
          "children": [
            {
              "_key": "${VOID_CHILD_KEY}",
              "_type": "span",
              "marks": [],
              "text": "",
            },
          ],
          "value": {
            "asset": {
              "_ref": "image-f52f71bc1df46e080dabe43a8effe8ccfb5f21de-4032x3024-png",
              "_type": "reference",
            },
            "nestedArray": [],
          },
        },
      ]
    `)
  })
  it('will not create operations for removal inside blocks', () => {
    editor.children = [
      {
        _type: 'someType',
        _key: 'c01739b0d03b',
        children: [
          {
            _key: VOID_CHILD_KEY,
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        __inline: false,
        value: {
          asset: {
            _ref: 'image-f52f71bc1df46e080dabe43a8effe8ccfb5f21de-4032x3024-png',
            _type: 'reference',
          },
          nestedArray: [
            {
              _key: 'foo',
              _type: 'nestedValue',
            },
          ],
        },
      },
    ]
    const patches = [
      {
        type: 'unset',
        path: [{_key: 'c01739b0d03b'}, 'nestedArray', 0],
        origin: 'remote',
      },
    ] as Patch[]
    patches.forEach((p) => {
      patchToOperations(editor, p)
    })
    expect(editor.children).toMatchInlineSnapshot(`
      [
        {
          "__inline": false,
          "_key": "c01739b0d03b",
          "_type": "someType",
          "children": [
            {
              "_key": "${VOID_CHILD_KEY}",
              "_type": "span",
              "marks": [],
              "text": "",
            },
          ],
          "value": {
            "asset": {
              "_ref": "image-f52f71bc1df46e080dabe43a8effe8ccfb5f21de-4032x3024-png",
              "_type": "reference",
            },
            "nestedArray": [
              {
                "_key": "foo",
                "_type": "nestedValue",
              },
            ],
          },
        },
      ]
    `)
  })
  it('will not create operations for setting data inside blocks', () => {
    editor.children = [
      {
        _key: '1335959d4d03',
        _type: 'block',
        children: [
          {
            _key: '9bd868adcd6b',
            _type: 'span',
            marks: [],
            text: '1 ',
          },
          {
            _key: '6f75d593f3fc',
            _type: 'span',
            marks: ['11de7fcea659'],
            text: '2',
          },
          {
            _key: '033618a7f081',
            _type: 'span',
            marks: [],
            text: ' 3',
          },
        ],
        markDefs: [
          {
            _key: '11de7fcea659',
            _type: 'link',
          },
        ],
        style: 'normal',
      },
    ]
    const patches = [
      {
        type: 'set',
        path: [{_key: '1335959d4d03'}, 'markDefs', {_key: '11de7fcea659'}],
        origin: 'remote',
        value: {href: 'http://www.test.com'},
      },
    ] as Patch[]
    patches.forEach((p) => {
      patchToOperations(editor, p)
    })
    expect(editor.children).toMatchInlineSnapshot(`
      [
        {
          "_key": "1335959d4d03",
          "_type": "block",
          "children": [
            {
              "_key": "9bd868adcd6b",
              "_type": "span",
              "marks": [],
              "text": "1 ",
            },
            {
              "_key": "6f75d593f3fc",
              "_type": "span",
              "marks": [
                "11de7fcea659",
              ],
              "text": "2",
            },
            {
              "_key": "033618a7f081",
              "_type": "span",
              "marks": [],
              "text": " 3",
            },
          ],
          "markDefs": [
            {
              "_key": "11de7fcea659",
              "_type": "link",
            },
          ],
          "style": "normal",
        },
      ]
    `)
  })
})
