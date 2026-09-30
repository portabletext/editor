import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {beforeEach, describe, expect, it, test} from 'vitest'
import {createActor} from 'xstate'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {editorMachine} from '../editor/editor-machine'
import {plugins} from '../engine-plugins/engine-plugins'
import {createEditor} from '../engine/create-editor'
import type {Node} from '../engine/interfaces/node'
import {defaultKeyGenerator} from '../utils/key-generator'
import {buildIndexMaps} from './build-index-maps'
import {
  insertNodePatch,
  operationToPatches,
  setNodePatch,
  textPatch,
} from './operation-to-patches'

function buildBlockIndexMap(
  schema: any,
  containers: any,
  value: any,
): Map<string, number> {
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, value, containers}, {blockIndexMap})
  return blockIndexMap
}

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
const e = createEditor()
e.containers = new Map()
e.blockIndexMap = new Map()
e.snapshot = {
  blockIndexMap: e.blockIndexMap,
  context: {
    containers: new Map(),
    converters: [],
    keyGenerator: () => 'k',
    readOnly: false,
    schema,
    selection: null,
    value: [] as any,
  },
  decoratorState: {},
} as any
// e.value reads through to e.snapshot.context.value via getter once defined
const editor = plugins(e, {
  editorActor,
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
      insertNodePatch({
        type: 'insert',
        path: [{_key: 'k2'}],
        position: 'before',
        node: {
          _key: 'k2',
          _type: 'image',
        },
      }),
    ).toEqual([
      {
        path: [{_key: 'k2'}],
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

  it('produce correct insert block patch', () => {
    expect(
      insertNodePatch({
        type: 'insert',
        path: [{_key: '1f2e64b47787'}],
        position: 'before',
        node: {
          _type: 'someObject',
          _key: 'c130395c640c',
          title: 'The Object',
        },
      }),
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
    editor.snapshot.context.value = []
    editor.onChange()
    expect(
      insertNodePatch({
        type: 'insert',
        path: [{_key: 'c130395c640c'}],
        position: 'before',
        node: {
          _type: 'someObject',
          _key: 'c130395c640c',
        },
      }),
    ).toMatchInlineSnapshot(`
      [
        {
          "items": [
            {
              "_key": "c130395c640c",
              "_type": "someObject",
            },
          ],
          "path": [
            {
              "_key": "c130395c640c",
            },
          ],
          "position": "before",
          "type": "insert",
        },
      ]
    `)
  })

  test('produce correct insert child patch', () => {
    expect(
      insertNodePatch({
        type: 'insert',
        path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
        position: 'after',
        node: {
          _type: 'someObject',
          _key: 'c130395c640c',
          title: 'The Object',
        },
      }),
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
})

describe(textPatch.name, () => {
  beforeEach(() => {
    editor.snapshot.context.value = createDefaultChildren()
    buildIndexMaps(
      {
        schema: editor.snapshot.context.schema,
        containers: editor.snapshot.context.containers,
        value: editor.snapshot.context.value as Array<PortableTextBlock>,
      },
      {
        blockIndexMap: editor.snapshot.blockIndexMap as Map<string, number>,
      },
    )
    editor.onChange()
  })

  it('produce correct insert text patch', () => {
    ;(
      editor.snapshot.context.value[0] as PortableTextTextBlock
    ).children[2]!.text = '1'
    editor.onChange()
    expect(
      textPatch(
        editor.snapshot,
        {
          type: 'insert.text',
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
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
      textPatch(
        {
          context: {
            schema: blockObjectSchema,
            containers: new Map(),
            value: blockObjectChildren,
          },
          blockIndexMap: buildBlockIndexMap(
            blockObjectSchema,
            new Map(),
            blockObjectChildren,
          ),
        },
        {
          type: 'insert.text',
          path: [{_key: 'img1'}, 'children', {_key: 'void-child'}],
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
      textPatch(
        editor.snapshot,
        {
          type: 'remove.text',
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
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
})

describe('defensive setIfMissing patches', () => {
  beforeEach(() => {
    editor.snapshot.context.value = createDefaultChildren()
    editor.onChange()
  })

  describe(insertNodePatch.name, () => {
    test('includes setIfMissing before inserting a span into children', () => {
      const patches = insertNodePatch({
        type: 'insert',
        path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
        position: 'after',
        node: {
          _type: 'span',
          _key: 'new-span',
          text: 'hello',
          marks: [],
        },
      })

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
      const patches = insertNodePatch({
        type: 'insert',
        path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
        position: 'after',
        node: {
          _type: 'someObject',
          _key: 'new-object',
          title: 'New Object',
        },
      })

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

describe(operationToPatches.name, () => {
  test('an `insert.text` patches the span text with the diff', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      operationToPatches(
        {
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
          text: 'bar',
        },
        {
          beforeValue: [textBlock(blockKey, spanKey, 'foo')],
          afterSnapshot: createTestSnapshot({
            context: {schema, value: [textBlock(blockKey, spanKey, 'foobar')]},
          }),
        },
      ),
    ).toEqual([
      diffMatchPatch('foo', 'foobar', [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ])
  })

  test('a `remove.text` patches the span text with the diff', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      operationToPatches(
        {
          type: 'remove.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
          text: 'bar',
        },
        {
          beforeValue: [textBlock(blockKey, spanKey, 'foobar')],
          afterSnapshot: createTestSnapshot({
            context: {schema, value: [textBlock(blockKey, spanKey, 'foo')]},
          }),
        },
      ),
    ).toEqual([
      diffMatchPatch('foobar', 'foo', [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ]),
    ])
  })

  test('an `insert` inserts the node', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()

    expect(
      operationToPatches(
        {
          type: 'insert',
          path: [{_key: fooBlockKey}],
          node: textBlock(barBlockKey, barSpanKey, 'bar'),
          position: 'after',
        },
        {
          beforeValue: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
          afterSnapshot: createTestSnapshot({
            context: {
              schema,
              value: [
                textBlock(fooBlockKey, fooSpanKey, 'foo'),
                textBlock(barBlockKey, barSpanKey, 'bar'),
              ],
            },
          }),
        },
      ),
    ).toEqual([
      insert([textBlock(barBlockKey, barSpanKey, 'bar')], 'after', [
        {_key: fooBlockKey},
      ]),
    ])
  })

  test('a `set` sets the value at the path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      operationToPatches(
        {type: 'set', path: [{_key: blockKey}, 'style'], value: 'h1'},
        {
          beforeValue: [textBlock(blockKey, spanKey, 'foo')],
          afterSnapshot: createTestSnapshot({
            context: {
              schema,
              value: [{...textBlock(blockKey, spanKey, 'foo'), style: 'h1'}],
            },
          }),
        },
      ),
    ).toEqual([set('h1', [{_key: blockKey}, 'style'])])
  })

  test('an `unset` unsets the path', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()

    expect(
      operationToPatches(
        {type: 'unset', path: [{_key: barBlockKey}]},
        {
          beforeValue: [
            textBlock(fooBlockKey, fooSpanKey, 'foo'),
            textBlock(barBlockKey, barSpanKey, 'bar'),
          ],
          afterSnapshot: createTestSnapshot({
            context: {
              schema,
              value: [textBlock(fooBlockKey, fooSpanKey, 'foo')],
            },
          }),
        },
      ),
    ).toEqual([unset([{_key: barBlockKey}])])
  })

  test('a `set.selection` emits nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      operationToPatches(
        {
          type: 'set.selection',
          properties: null,
          newProperties: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 3,
            },
          },
        },
        {
          beforeValue: [textBlock(blockKey, spanKey, 'foo')],
          afterSnapshot: createTestSnapshot({
            context: {schema, value: [textBlock(blockKey, spanKey, 'foo')]},
          }),
        },
      ),
    ).toEqual([])
  })
})

function textBlock(
  key: string,
  spanKey: string,
  text: string,
): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

describe(setNodePatch.name, () => {
  test('Scenario: Creating an absent `markDefs` property emits a `setIfMissing`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      setNodePatch(
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        [textBlockWithMarkDefs({blockKey, spanKey, markDefs: undefined})],
      ),
    ).toEqual([
      {
        type: 'setIfMissing',
        path: [{_key: blockKey}, 'markDefs'],
        value: [],
      },
    ])
  })

  test('Scenario: Setting an existing `markDefs` property passes through as a plain set', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    expect(
      setNodePatch(
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [],
        },
        [
          textBlockWithMarkDefs({
            blockKey,
            spanKey,
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
          }),
        ],
      ),
    ).toEqual([
      {
        type: 'set',
        path: [{_key: blockKey}, 'markDefs'],
        value: [],
      },
    ])
  })

  test('Scenario: Setting a non-empty array on an absent property passes through as a plain set', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    expect(
      setNodePatch(
        {
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [{_key: linkKey, _type: 'link', href: 'https://example.com'}],
        },
        [textBlockWithMarkDefs({blockKey, spanKey, markDefs: undefined})],
      ),
    ).toEqual([
      {
        type: 'set',
        path: [{_key: blockKey}, 'markDefs'],
        value: [{_key: linkKey, _type: 'link', href: 'https://example.com'}],
      },
    ])
  })

  test('Scenario: Block missing from the pre-apply value passes through as a plain set', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const otherBlockKey = keyGenerator()

    expect(
      setNodePatch(
        {
          type: 'set',
          path: [{_key: otherBlockKey}, 'markDefs'],
          value: [],
        },
        [textBlockWithMarkDefs({blockKey, spanKey, markDefs: undefined})],
      ),
    ).toEqual([
      {
        type: 'set',
        path: [{_key: otherBlockKey}, 'markDefs'],
        value: [],
      },
    ])
  })

  test('Scenario: Paths not ending in `markDefs` pass through as plain sets', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      setNodePatch(
        {
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
        },
        [textBlockWithMarkDefs({blockKey, spanKey, markDefs: []})],
      ),
    ).toEqual([
      {
        type: 'set',
        path: [{_key: blockKey}, 'style'],
        value: 'h1',
      },
    ])
  })
})

function textBlockWithMarkDefs({
  blockKey,
  spanKey,
  markDefs,
}: {
  blockKey: string
  spanKey: string
  markDefs: Array<PortableTextObject> | undefined
}): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
    style: 'normal',
    ...(markDefs === undefined ? {} : {markDefs}),
  }
}
