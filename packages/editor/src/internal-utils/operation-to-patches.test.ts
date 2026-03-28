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
  setNodePatch,
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

// Container schema and test data
const containerSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'codeBlock',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})
const containerSchema = compileSchema(containerSchemaDefinition)
const codeBlockEditableTypes = new Set(['codeBlock'])

const createCodeBlockChildren = (): Array<Node> => [
  {
    _type: 'codeBlock',
    _key: 'cb1',
    content: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
      },
    ],
  },
]

const createCodeBlockValue = (): Array<PortableTextBlock> => [
  {
    _type: 'codeBlock',
    _key: 'cb1',
    content: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
      },
    ],
  },
]

describe(insertNodePatch.name, () => {
  test('Scenario: Inserting block object on empty editor', () => {
    const insertSchema = compileSchema(
      defineSchema({blockObjects: [{name: 'image'}]}),
    )
    expect(
      insertNodePatch(
        {
          schema: insertSchema,
          editableTypes: new Set(),
          value: [
            {
              _key: 'k2',
              _type: 'image',
            },
          ],
        },
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
        {schema, editableTypes: new Set(), value: editor.children},
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
        {schema, editableTypes: new Set(), value: editor.children},
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
        {schema, editableTypes: new Set(), value: editor.children},
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
        {schema, editableTypes: new Set(), value: editor.children},
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
        {
          schema: blockObjectSchema,
          editableTypes: new Set(),
          value: blockObjectChildren,
        },
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
        {schema, editableTypes: new Set(), value: editor.children},
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
        {
          schema,
          editableTypes: new Set(),
          value: createDefaultChildren(),
        },
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
      removeNodePatch(
        {schema, editableTypes: new Set(), value: val},
        {
          type: 'remove_node',
          path: [0],
          node: children[0]!,
        },
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
})

describe('defensive setIfMissing patches', () => {
  beforeEach(() => {
    editor.children = createDefaultChildren()
    editor.onChange()
  })

  describe(insertNodePatch.name, () => {
    test('includes setIfMissing before inserting a span into children', () => {
      const patches = insertNodePatch(
        {schema, editableTypes: new Set(), value: editor.children},
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
        {schema, editableTypes: new Set(), value: editor.children},
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

// ============================================================
// setNodePatch - flat cases
// ============================================================

describe(setNodePatch.name, () => {
  test('set property on a top-level text block', () => {
    const children: Array<Node> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: '', marks: []}],
      },
    ]

    const patches = setNodePatch(
      {schema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0],
        properties: {style: 'normal'},
        newProperties: {style: 'h1'},
      },
    )

    expect(patches).toEqual([
      {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'},
    ])
  })

  test('set property on a top-level block object', () => {
    const blockObjectSchema = compileSchema(
      defineSchema({blockObjects: [{name: 'image'}]}),
    )
    const children: Array<Node> = [
      {
        _type: 'image',
        _key: 'img1',
        src: 'old.png',
      },
    ]

    const patches = setNodePatch(
      {schema: blockObjectSchema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0],
        properties: {src: 'old.png'},
        newProperties: {src: 'new.png'},
      },
    )

    expect(patches).toEqual([
      {type: 'set', path: [{_key: 'img1'}, 'src'], value: 'new.png'},
    ])
  })

  test('set property on a child span', () => {
    const children: Array<Node> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'hello', marks: []},
          {_type: 'span', _key: 's2', text: 'world', marks: []},
        ],
      },
    ]

    const patches = setNodePatch(
      {schema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0, 1],
        properties: {marks: []},
        newProperties: {marks: ['strong']},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}, 'marks'],
        value: ['strong'],
      },
    ])
  })

  test('change _key on a top-level block uses positional path', () => {
    const children: Array<Node> = [
      {
        _type: 'block',
        _key: 'old-key',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: '', marks: []}],
      },
    ]

    const patches = setNodePatch(
      {schema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0],
        properties: {_key: 'old-key'},
        newProperties: {_key: 'new-key'},
      },
    )

    expect(patches).toEqual([
      {type: 'set', path: [0, '_key'], value: 'new-key'},
    ])
  })

  test('change _key on a child uses positional path', () => {
    const children: Array<Node> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's1', text: 'hello', marks: []},
          {_type: 'span', _key: 'old-key', text: 'world', marks: []},
        ],
      },
    ]

    const patches = setNodePatch(
      {schema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0, 1],
        properties: {_key: 'old-key'},
        newProperties: {_key: 'new-key'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', 1, '_key'],
        value: 'new-key',
      },
    ])
  })

  test('unset a property', () => {
    const children: Array<Node> = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: '', marks: []}],
      },
    ]

    const patches = setNodePatch(
      {schema, editableTypes: new Set(), value: children},
      {
        type: 'set_node',
        path: [0],
        properties: {style: 'normal', listItem: 'bullet'},
        newProperties: {style: 'normal'},
      },
    )

    expect(patches).toEqual([
      {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'normal'},
      {type: 'unset', path: [{_key: 'b1'}, 'listItem']},
    ])
  })
})

// ============================================================
// setNodePatch - container cases
// ============================================================

describe(`${setNodePatch.name} - container cases`, () => {
  test('set property on a span inside a code block', () => {
    const children = createCodeBlockChildren()

    const patches = setNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: children,
      },
      {
        type: 'set_node',
        path: [0, 0, 0],
        properties: {marks: []},
        newProperties: {marks: ['strong']},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 'cb1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: ['strong'],
      },
    ])
  })

  test('set property on a block inside a code block', () => {
    const children = createCodeBlockChildren()

    const patches = setNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: children,
      },
      {
        type: 'set_node',
        path: [0, 0],
        properties: {style: 'normal'},
        newProperties: {style: 'h1'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'cb1'}, 'content', {_key: 'b1'}, 'style'],
        value: 'h1',
      },
    ])
  })

  test('change _key on a span inside a code block uses positional path', () => {
    const children = createCodeBlockChildren()

    const patches = setNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: children,
      },
      {
        type: 'set_node',
        path: [0, 0, 0],
        properties: {_key: 's1'},
        newProperties: {_key: 'new-s1'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [{_key: 'cb1'}, 'content', {_key: 'b1'}, 'children', 0, '_key'],
        value: 'new-s1',
      },
    ])
  })
})

// ============================================================
// insertTextPatch - container case
// ============================================================

describe(`${insertTextPatch.name} - container cases`, () => {
  test('insert text in a span inside a code block', () => {
    const children: Array<Node> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'hello world', marks: []},
            ],
          },
        ],
      },
    ]

    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
          },
        ],
      },
    ]

    const patches = insertTextPatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: children,
      },
      {
        type: 'insert_text',
        path: [0, 0, 0],
        text: ' world',
        offset: 5,
      },
      valueBefore,
    )

    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [
          {_key: 'cb1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'text',
        ],
        value: '@@ -1,5 +1,11 @@\n hello\n+ world\n',
      },
    ])
  })
})

// ============================================================
// removeTextPatch - container case
// ============================================================

describe(`${removeTextPatch.name} - container cases`, () => {
  test('remove text from a span inside a code block', () => {
    const children: Array<Node> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
          },
        ],
      },
    ]

    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'hello world', marks: []},
            ],
          },
        ],
      },
    ]

    const patches = removeTextPatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: children,
      },
      {
        type: 'remove_text',
        path: [0, 0, 0],
        text: ' world',
        offset: 5,
      },
      valueBefore,
    )

    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [
          {_key: 'cb1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'text',
        ],
        value: '@@ -2,10 +2,4 @@\n ello\n- world\n',
      },
    ])
  })
})

// ============================================================
// insertNodePatch - container cases
// ============================================================

describe(`${insertNodePatch.name} - container cases`, () => {
  test('insert a span into a block inside a code block', () => {
    const valueAfter: Array<Node> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'hello', marks: []},
              {_type: 'span', _key: 's2', text: ' world', marks: []},
            ],
          },
        ],
      },
    ]

    const patches = insertNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: valueAfter,
      },
      {
        type: 'insert_node',
        path: [0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' world',
          marks: [],
        },
      },
      createCodeBlockValue(),
    )

    expect(patches).toEqual([
      {
        type: 'setIfMissing',
        path: [{_key: 'cb1'}, 'content', {_key: 'b1'}, 'children'],
        value: [],
      },
      {
        type: 'insert',
        items: [{_type: 'span', _key: 's2', text: ' world', marks: []}],
        path: [{_key: 'cb1'}, 'content', {_key: 'b1'}, 'children', 0],
        position: 'after',
      },
    ])
  })

  test('insert a block into a code block content', () => {
    const valueAfter: Array<Node> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
          },
          {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's2', text: '', marks: []}],
          },
        ],
      },
    ]

    const patches = insertNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: valueAfter,
      },
      {
        type: 'insert_node',
        path: [0, 1],
        node: {
          _type: 'block',
          _key: 'b2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's2', text: '', marks: []}],
        },
      },
      createCodeBlockValue(),
    )

    expect(patches).toEqual([
      {
        type: 'setIfMissing',
        path: [{_key: 'cb1'}, 'content'],
        value: [],
      },
      {
        type: 'insert',
        items: [
          {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's2', text: '', marks: []}],
          },
        ],
        path: [{_key: 'cb1'}, 'content', 0],
        position: 'after',
      },
    ])
  })
})

// ============================================================
// removeNodePatch - container cases
// ============================================================

describe(`${removeNodePatch.name} - container cases`, () => {
  test('remove a span from a block inside a code block', () => {
    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'hello', marks: []},
              {_type: 'span', _key: 's2', text: ' world', marks: []},
            ],
          },
        ],
      },
    ]

    const patches = removeNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: valueBefore,
      },
      {
        type: 'remove_node',
        path: [0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' world',
          marks: [],
        },
      },
    )

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [
          {_key: 'cb1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's2'},
        ],
      },
    ])
  })

  test('remove a block from a code block content', () => {
    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'codeBlock',
        _key: 'cb1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
          },
          {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's2', text: '', marks: []}],
          },
        ],
      },
    ]

    const patches = removeNodePatch(
      {
        schema: containerSchema,
        editableTypes: codeBlockEditableTypes,
        value: valueBefore,
      },
      {
        type: 'remove_node',
        path: [0, 1],
        node: {
          _type: 'block',
          _key: 'b2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's2', text: '', marks: []}],
        },
      },
    )

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [{_key: 'cb1'}, 'content', {_key: 'b2'}],
      },
    ])
  })
})

// ============================================================
// Table tests - deep nesting (table -> row -> cell -> block -> span)
// ============================================================

const tableSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
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
const tableSchema = compileSchema(tableSchemaDefinition)
const tableEditableTypes = new Set(['table', 'table.row', 'table.row.cell'])

const createTableChildren = (): Array<Node> => [
  {
    _type: 'table',
    _key: 't1',
    rows: [
      {
        _type: 'row',
        _key: 'r1',
        cells: [
          {
            _type: 'cell',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 's1', text: 'cell text', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

const createTableValue = (): Array<PortableTextBlock> => [
  {
    _type: 'table',
    _key: 't1',
    rows: [
      {
        _type: 'row',
        _key: 'r1',
        cells: [
          {
            _type: 'cell',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b1',
                style: 'normal',
                markDefs: [],
                children: [
                  {_type: 'span', _key: 's1', text: 'cell text', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

describe('table - deep nesting', () => {
  // setNodePatch

  test('set property on a span inside a table cell (path [0,0,0,0,0])', () => {
    const children = createTableChildren()

    const patches = setNodePatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'set_node',
        path: [0, 0, 0, 0, 0],
        properties: {marks: []},
        newProperties: {marks: ['strong']},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: ['strong'],
      },
    ])
  })

  test('set property on a block inside a table cell (path [0,0,0,0])', () => {
    const children = createTableChildren()

    const patches = setNodePatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'set_node',
        path: [0, 0, 0, 0],
        properties: {style: 'normal'},
        newProperties: {style: 'h1'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'style',
        ],
        value: 'h1',
      },
    ])
  })

  test('set property on a cell (path [0,0,0])', () => {
    const children = createTableChildren()

    const patches = setNodePatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'set_node',
        path: [0, 0, 0],
        properties: {},
        newProperties: {someProperty: 'value'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'someProperty',
        ],
        value: 'value',
      },
    ])
  })

  test('change _key on a span inside a table cell uses positional path', () => {
    const children = createTableChildren()

    const patches = setNodePatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'set_node',
        path: [0, 0, 0, 0, 0],
        properties: {_key: 's1'},
        newProperties: {_key: 'new-s1'},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          0,
          '_key',
        ],
        value: 'new-s1',
      },
    ])
  })

  // insertTextPatch

  test('insert text in a span inside a table cell', () => {
    const children: Array<Node> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text added',
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
    ]

    const patches = insertTextPatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'insert_text',
        path: [0, 0, 0, 0, 0],
        text: ' added',
        offset: 9,
      },
      createTableValue(),
    )

    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'text',
        ],
        value: '@@ -2,8 +2,14 @@\n ell text\n+ added\n',
      },
    ])
  })

  // removeTextPatch

  test('remove text from a span inside a table cell', () => {
    const children: Array<Node> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 's1', text: 'cell', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text',
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
    ]

    const patches = removeTextPatch(
      {schema: tableSchema, editableTypes: tableEditableTypes, value: children},
      {
        type: 'remove_text',
        path: [0, 0, 0, 0, 0],
        text: ' text',
        offset: 4,
      },
      valueBefore,
    )

    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'text',
        ],
        value: '@@ -1,9 +1,4 @@\n cell\n- text\n',
      },
    ])
  })

  // insertNodePatch

  test('insert a span into a block inside a table cell', () => {
    const valueAfter: Array<Node> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: 's2',
                        text: ' more',
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
    ]

    const patches = insertNodePatch(
      {
        schema: tableSchema,
        editableTypes: tableEditableTypes,
        value: valueAfter,
      },
      {
        type: 'insert_node',
        path: [0, 0, 0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' more',
          marks: [],
        },
      },
      createTableValue(),
    )

    expect(patches).toEqual([
      {
        type: 'setIfMissing',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
        ],
        value: [],
      },
      {
        type: 'insert',
        items: [{_type: 'span', _key: 's2', text: ' more', marks: []}],
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          0,
        ],
        position: 'after',
      },
    ])
  })

  test('insert a block into a table cell content', () => {
    const valueAfter: Array<Node> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'b2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 's2', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const patches = insertNodePatch(
      {
        schema: tableSchema,
        editableTypes: tableEditableTypes,
        value: valueAfter,
      },
      {
        type: 'insert_node',
        path: [0, 0, 0, 1],
        node: {
          _type: 'block',
          _key: 'b2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's2', text: '', marks: []}],
        },
      },
      createTableValue(),
    )

    expect(patches).toEqual([
      {
        type: 'setIfMissing',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
        ],
        value: [],
      },
      {
        type: 'insert',
        items: [
          {
            _type: 'block',
            _key: 'b2',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: 's2', text: '', marks: []}],
          },
        ],
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          0,
        ],
        position: 'after',
      },
    ])
  })

  // removeNodePatch

  test('remove a span from a block inside a table cell', () => {
    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text',
                        marks: [],
                      },
                      {
                        _type: 'span',
                        _key: 's2',
                        text: ' more',
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
    ]

    const patches = removeNodePatch(
      {
        schema: tableSchema,
        editableTypes: tableEditableTypes,
        value: valueBefore,
      },
      {
        type: 'remove_node',
        path: [0, 0, 0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' more',
          marks: [],
        },
      },
    )

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 's2'},
        ],
      },
    ])
  })

  test('remove a block from a table cell content', () => {
    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'table',
        _key: 't1',
        rows: [
          {
            _type: 'row',
            _key: 'r1',
            cells: [
              {
                _type: 'cell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _type: 'span',
                        _key: 's1',
                        text: 'cell text',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _type: 'block',
                    _key: 'b2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 's2', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const patches = removeNodePatch(
      {
        schema: tableSchema,
        editableTypes: tableEditableTypes,
        value: valueBefore,
      },
      {
        type: 'remove_node',
        path: [0, 0, 0, 1],
        node: {
          _type: 'block',
          _key: 'b2',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's2', text: '', marks: []}],
        },
      },
    )

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b2'},
        ],
      },
    ])
  })
})

// ============================================================
// Multiple array field tests
// ============================================================

const multiFieldSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'widget',
      fields: [
        {
          name: 'tags',
          type: 'array',
          // No 'of' - this is a plain string array, not a child container field
        },
        {
          name: 'items',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})
const multiFieldSchema = compileSchema(multiFieldSchemaDefinition)
const widgetEditableTypes = new Set(['widget'])

const createMultiFieldChildren = (): Array<Node> => [
  {
    _type: 'widget',
    _key: 'w1',
    tags: ['tag1', 'tag2'],
    items: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'widget text', marks: []}],
      },
    ],
  },
]

const createMultiFieldValue = (): Array<PortableTextBlock> => [
  {
    _type: 'widget',
    _key: 'w1',
    tags: ['tag1', 'tag2'],
    items: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'widget text', marks: []}],
      },
    ],
  },
]

describe('multiple array fields', () => {
  test(`${setNodePatch.name} resolves correct child field when multiple array fields exist`, () => {
    const children = createMultiFieldChildren()

    const patches = setNodePatch(
      {
        schema: multiFieldSchema,
        editableTypes: widgetEditableTypes,
        value: children,
      },
      {
        type: 'set_node',
        path: [0, 0, 0],
        properties: {marks: []},
        newProperties: {marks: ['strong']},
      },
    )

    expect(patches).toEqual([
      {
        type: 'set',
        path: [
          {_key: 'w1'},
          'items',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: ['strong'],
      },
    ])
  })

  test(`${insertNodePatch.name} resolves correct child field when multiple array fields exist`, () => {
    const valueAfter: Array<Node> = [
      {
        _type: 'widget',
        _key: 'w1',
        tags: ['tag1', 'tag2'],
        items: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'widget text', marks: []},
              {_type: 'span', _key: 's2', text: ' more', marks: []},
            ],
          },
        ],
      },
    ]

    const patches = insertNodePatch(
      {
        schema: multiFieldSchema,
        editableTypes: widgetEditableTypes,
        value: valueAfter,
      },
      {
        type: 'insert_node',
        path: [0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' more',
          marks: [],
        },
      },
      createMultiFieldValue(),
    )

    expect(patches).toEqual([
      {
        type: 'setIfMissing',
        path: [{_key: 'w1'}, 'items', {_key: 'b1'}, 'children'],
        value: [],
      },
      {
        type: 'insert',
        items: [{_type: 'span', _key: 's2', text: ' more', marks: []}],
        path: [{_key: 'w1'}, 'items', {_key: 'b1'}, 'children', 0],
        position: 'after',
      },
    ])
  })

  test(`${removeNodePatch.name} resolves correct child field when multiple array fields exist`, () => {
    const valueBefore: Array<PortableTextBlock> = [
      {
        _type: 'widget',
        _key: 'w1',
        tags: ['tag1', 'tag2'],
        items: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {_type: 'span', _key: 's1', text: 'widget text', marks: []},
              {_type: 'span', _key: 's2', text: ' more', marks: []},
            ],
          },
        ],
      },
    ]

    const patches = removeNodePatch(
      {
        schema: multiFieldSchema,
        editableTypes: widgetEditableTypes,
        value: valueBefore,
      },
      {
        type: 'remove_node',
        path: [0, 0, 1],
        node: {
          _type: 'span',
          _key: 's2',
          text: ' more',
          marks: [],
        },
      },
    )

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [{_key: 'w1'}, 'items', {_key: 'b1'}, 'children', {_key: 's2'}],
      },
    ])
  })

  test(`${insertTextPatch.name} resolves correct child field when multiple array fields exist`, () => {
    const children: Array<Node> = [
      {
        _type: 'widget',
        _key: 'w1',
        tags: ['tag1', 'tag2'],
        items: [
          {
            _type: 'block',
            _key: 'b1',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 's1',
                text: 'widget text added',
                marks: [],
              },
            ],
          },
        ],
      },
    ]

    const patches = insertTextPatch(
      {
        schema: multiFieldSchema,
        editableTypes: widgetEditableTypes,
        value: children,
      },
      {
        type: 'insert_text',
        path: [0, 0, 0],
        text: ' added',
        offset: 11,
      },
      createMultiFieldValue(),
    )

    expect(patches).toEqual([
      {
        type: 'diffMatchPatch',
        path: [
          {_key: 'w1'},
          'items',
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'text',
        ],
        value: '@@ -4,8 +4,14 @@\n get text\n+ added\n',
      },
    ])
  })
})
