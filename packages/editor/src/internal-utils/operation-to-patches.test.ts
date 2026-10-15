import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  unset,
} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
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
  textPatch,
  toKeyedPatchPath,
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
      insertNodePatch(
        {
          type: 'insert',
          path: [{_key: 'k2'}],
          position: 'before',
          node: {
            _key: 'k2',
            _type: 'image',
          },
        },
        [],
      ),
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
      insertNodePatch(
        {
          type: 'insert',
          path: [{_key: '1f2e64b47787'}],
          position: 'before',
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
    editor.snapshot.context.value = []
    editor.onChange()
    expect(
      insertNodePatch(
        {
          type: 'insert',
          path: [{_key: 'c130395c640c'}],
          position: 'before',
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
      insertNodePatch(
        {
          type: 'insert',
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
          position: 'after',
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
      const patches = insertNodePatch(
        {
          type: 'insert',
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
          position: 'after',
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
        {
          type: 'insert',
          path: [{_key: '1f2e64b47787'}, 'children', {_key: 'fd9b4a4e6c0b'}],
          position: 'after',
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

describe(toKeyedPatchPath.name, () => {
  test('rewrites indices of keyed blocks and children to keyed segments', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [textBlock(blockKey, spanKey, 'foo')],
        [0, 'children', 0, 'text'],
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: spanKey}, 'text'])
  })

  test('keeps indices into arrays of strings', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        [0, 'children', 0, 'marks', 0],
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: spanKey}, 'marks', 0])
  })

  test('keeps indices past the end of the array', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toKeyedPatchPath([textBlock(blockKey, spanKey, 'foo')], [1]),
    ).toEqual([1])
    expect(
      toKeyedPatchPath(
        [textBlock(blockKey, spanKey, 'foo')],
        [0, 'children', 1],
      ),
    ).toEqual([{_key: blockKey}, 'children', 1])
    expect(toKeyedPatchPath([], [0])).toEqual([0])
  })

  test('keeps indices of array elements without a string `_key`', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [{_type: 'table', _key: tableKey, rows: [{cells: []}, {_key: 1}]}],
        [0, 'rows', 0, 'cells'],
      ),
    ).toEqual([{_key: tableKey}, 'rows', 0, 'cells'])
    expect(
      toKeyedPatchPath(
        [{_type: 'table', _key: tableKey, rows: [{cells: []}, {_key: 1}]}],
        [0, 'rows', 1],
      ),
    ).toEqual([{_key: tableKey}, 'rows', 1])
  })

  test('keeps indices into arrays with a `null` or primitive element', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const tagKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [{_type: 'table', _key: tableKey, tags: [null, {_key: tagKey}]}],
        [0, 'tags', 1, 'name'],
      ),
    ).toEqual([{_key: tableKey}, 'tags', 1, 'name'])
    expect(
      toKeyedPatchPath(
        [{_type: 'table', _key: tableKey, tags: [{_key: tagKey}, 'foo']}],
        [0, 'tags', 0, 'name'],
      ),
    ).toEqual([{_key: tableKey}, 'tags', 0, 'name'])
  })

  test('emits paths that `applyAll` applies', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const fooTagKey = keyGenerator()
    const barTagKey = keyGenerator()
    const value = [
      {
        _type: 'table',
        _key: tableKey,
        keyedTags: [
          {_key: fooTagKey, name: 'foo'},
          {_key: barTagKey, name: 'bar'},
        ],
        tags: [null, {_key: barTagKey, name: 'bar'}],
      },
    ]

    expect(
      applyAll(value, [
        set('baz', toKeyedPatchPath(value, [0, 'keyedTags', 1, 'name'])),
        set('baz', toKeyedPatchPath(value, [0, 'tags', 1, 'name'])),
      ]),
    ).toEqual([
      {
        _type: 'table',
        _key: tableKey,
        keyedTags: [
          {_key: fooTagKey, name: 'foo'},
          {_key: barTagKey, name: 'baz'},
        ],
        tags: [null, {_key: barTagKey, name: 'baz'}],
      },
    ])
  })

  test('keeps indices of array elements with an empty or duplicate `_key`', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [
          textBlock(fooBlockKey, fooSpanKey, 'foo'),
          textBlock(fooBlockKey, barSpanKey, 'bar'),
        ],
        [1, '_key'],
      ),
    ).toEqual([1, '_key'])
    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              {_type: 'span', _key: barSpanKey, text: 'baz', marks: []},
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        [0, 'children', 0, '_key'],
      ),
    ).toEqual([{_key: fooBlockKey}, 'children', 0, '_key'])
    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              {_type: 'span', _key: barSpanKey, text: 'baz', marks: []},
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        [0, 'children', 1, 'text'],
      ),
    ).toEqual([{_key: fooBlockKey}, 'children', 1, 'text'])
  })

  test('resolves indices after keyed segments, into `markDefs`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'foo', marks: [linkKey]},
            ],
            markDefs: [{_type: 'link', _key: linkKey, href: 'https://foo'}],
            style: 'normal',
          },
        ],
        [{_key: blockKey}, 'markDefs', 0, 'href'],
      ),
    ).toEqual([{_key: blockKey}, 'markDefs', {_key: linkKey}, 'href'])
  })

  test('resolves indices through container fields and nested objects', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tagKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'table',
            _key: tableKey,
            meta: {tags: [{_key: tagKey, name: 'foo'}]},
            rows: [
              {
                _type: 'row',
                _key: rowKey,
                cells: [
                  {
                    _type: 'cell',
                    _key: cellKey,
                    content: [textBlock(blockKey, spanKey, 'bar')],
                  },
                ],
              },
            ],
          },
        ],
        [
          0,
          'rows',
          {_key: rowKey},
          'cells',
          0,
          'content',
          0,
          'children',
          0,
          'text',
        ],
      ),
    ).toEqual([
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
      'text',
    ])
    expect(
      toKeyedPatchPath(
        [
          {
            _type: 'table',
            _key: tableKey,
            meta: {tags: [{_key: tagKey, name: 'foo'}]},
          },
        ],
        [0, 'meta', 'tags', 0, 'name'],
      ),
    ).toEqual([{_key: tableKey}, 'meta', 'tags', {_key: tagKey}, 'name'])
  })

  test('keeps indices below a segment that does not resolve', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const missingBlockKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [textBlock(blockKey, spanKey, 'foo')],
        [{_key: missingBlockKey}, 'children', 0],
      ),
    ).toEqual([{_key: missingBlockKey}, 'children', 0])
    expect(
      toKeyedPatchPath([textBlock(blockKey, spanKey, 'foo')], [0, 'baz', 0]),
    ).toEqual([{_key: blockKey}, 'baz', 0])
  })

  test('keeps paths without indices', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      toKeyedPatchPath(
        [textBlock(blockKey, spanKey, 'foo')],
        [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
      ),
    ).toEqual([{_key: blockKey}, 'children', {_key: spanKey}, 'text'])
    expect(toKeyedPatchPath([textBlock(blockKey, spanKey, 'foo')], [])).toEqual(
      [],
    )
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
