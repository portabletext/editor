import {applyAll, type InsertPatch, type JSONValue} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {applyOperation} from '../engine/core/apply-operation'
import {createEditor} from '../engine/create-editor'
import type {Path, PathSegment} from '../engine/interfaces/path'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers-batch'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createApplyPatch} from './applyPatch'
import {buildIndexMaps} from './build-index-maps'

const shapes = [
  'root',
  'container',
  'numeric container',
  'negative container',
  'container in container',
  'numeric container in container',
  'negative container in container',
  'first container sharing a key',
  'later container sharing a key by index',
  'first nested container sharing a key',
  'later nested container sharing a key',
  'text block children',
  'Portable Text in an object field',
  'sidecar',
  'sidecar through a negative row',
  'sidecar through a negative block',
  'sidecar in a first block sharing a key',
  'sidecar in a later block sharing a key',
  'sidecar with a null first item',
  'sidecar after a null row by index',
  'sidecar after a null row from the end',
  'sidecar after a null row by key',
  'two null depths by index',
  'two null depths from the end',
  'two null depths by key',
  'two null depths in containers by index',
  'two null depths in containers from end',
  'two null depths in containers by key',
  'array in an array',
  'array in an array in an array',
  'array in an array in containers',
  'array in an array in containers by index',
] as const

const lengths = [0, 1, 3]

const selectors = [
  0,
  1,
  2,
  -1,
  -2,
  -3,
  -4,
  4,
  0.5,
  1.5,
  -0.5,
  -1.5,
  0.9999999999999999,
  -0.9999999999999999,
  2.0000000000000004,
  'present key',
  'missing key',
] as const

const positions = ['before', 'after', 'replace'] as const

const payloads = [
  'one keyless item',
  'two keyless items',
  'three keyless items',
  'one keyed item',
  'two keyed items',
  'three keyed items',
  'a null item and a keyed item',
  'two items sharing a key',
  'a keyless item and a keyed item',
  'a keyed item and a keyless item',
] as const

const cases = shapes.flatMap((shape) =>
  lengths.flatMap((length) =>
    selectors.flatMap((selector) =>
      positions.flatMap((position) =>
        payloads.map((payload) => ({
          shape,
          length,
          selector,
          position,
          payload,
        })),
      ),
    ),
  ),
)

describe(createApplyPatch.name, () => {
  test.each(cases)(
    'insert $payload $position $selector into $shape with $length items lands where `applyAll` places it',
    ({shape, length, selector, position, payload}) => {
      const keyGenerator = createTestKeyGenerator()
      const existing = Array.from({length}, () => ({
        _key: keyGenerator(),
        _type: 'image',
        title: 'foo',
      }))
      const missingKey = keyGenerator()
      const items = createItems(payload, keyGenerator)
      const selectorSegment: PathSegment =
        selector === 'present key'
          ? {_key: existing.at(-1)?._key ?? missingKey}
          : selector === 'missing key'
            ? {_key: missingKey}
            : selector
      const {value, arrayPath} = createShape(shape, existing, keyGenerator)
      const patch: InsertPatch = {
        type: 'insert',
        path: [...arrayPath, selectorSegment],
        position,
        items,
        origin: 'remote',
      }

      const expected = applyAllOrUnchanged(value, patch)
      const editor = createBareEditor(structuredClone(value))

      withRemoteChanges(editor, 'patches', () => {
        createApplyPatch({...editor.snapshot.context, initialValue: value})(
          editor,
          structuredClone(patch),
        )
      })

      expect(editor.snapshot.context.value).toEqual(expected)
    },
  )
})

/**
 * `applyAll` throws where a keyed selector scans past a `null` item, and
 * `createApplyPatch` then applies nothing.
 */
function applyAllOrUnchanged(
  value: Array<PortableTextBlock>,
  patch: InsertPatch,
): Array<PortableTextBlock> {
  try {
    return applyAll(structuredClone(value), [structuredClone(patch)])
  } catch {
    return value
  }
}

function createItems(
  payload: (typeof payloads)[number],
  keyGenerator: () => string,
): Array<JSONValue> {
  switch (payload) {
    case 'one keyless item':
      return [{_type: 'image', title: 'bar'}]
    case 'two keyless items':
      return [
        {_type: 'image', title: 'bar'},
        {_type: 'image', title: 'baz'},
      ]
    case 'three keyless items':
      return [
        {_type: 'image', title: 'bar'},
        {_type: 'image', title: 'baz'},
        {_type: 'image', title: 'foo'},
      ]
    case 'one keyed item':
      return [{_key: keyGenerator(), _type: 'image', title: 'bar'}]
    case 'two keyed items':
      return [
        {_key: keyGenerator(), _type: 'image', title: 'bar'},
        {_key: keyGenerator(), _type: 'image', title: 'baz'},
      ]
    case 'three keyed items':
      return [
        {_key: keyGenerator(), _type: 'image', title: 'bar'},
        {_key: keyGenerator(), _type: 'image', title: 'baz'},
        {_key: keyGenerator(), _type: 'image', title: 'foo'},
      ]
    case 'a null item and a keyed item':
      return [
        // `JSONValue` leaves out `null`, which a patch parsed from JSON can
        // still carry.
        null as unknown as JSONValue,
        {_key: keyGenerator(), _type: 'image', title: 'bar'},
      ]
    case 'a keyless item and a keyed item':
      return [
        {_type: 'image', title: 'bar'},
        {_key: keyGenerator(), _type: 'image', title: 'baz'},
      ]
    case 'a keyed item and a keyless item':
      return [
        {_key: keyGenerator(), _type: 'image', title: 'bar'},
        {_type: 'image', title: 'baz'},
      ]
    case 'two items sharing a key': {
      const sharedKey = keyGenerator()
      return [
        {_key: sharedKey, _type: 'image', title: 'bar'},
        {_key: sharedKey, _type: 'image', title: 'baz'},
      ]
    }
  }
}

function createShape(
  shape: (typeof shapes)[number],
  existing: Array<PortableTextBlock>,
  keyGenerator: () => string,
): {value: Array<PortableTextBlock>; arrayPath: Path} {
  const blockKey = keyGenerator()
  const innerKey = keyGenerator()
  const otherKey = keyGenerator()
  const other = {_key: otherKey, _type: 'image', title: 'baz'}

  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const nullRows = (items: Array<unknown>) => [
    null,
    {
      _key: rowKey,
      cells: [null, {_key: cellKey, items}],
    },
  ]
  const inTwoContainers = (image: Record<string, unknown>) => [
    {
      _key: blockKey,
      _type: 'section',
      boxes: [
        {
          _key: innerKey,
          _type: 'box',
          content: [{_key: otherKey, _type: 'image', ...image}],
        },
      ],
    },
  ]

  switch (shape) {
    case 'sidecar with a null first item':
      return {
        value: [{_key: blockKey, _type: 'image', items: [null, ...existing]}],
        arrayPath: [{_key: blockKey}, 'items'],
      }
    case 'sidecar after a null row by index':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'image',
            rows: [null, {_key: rowKey, items: existing}],
          },
        ],
        arrayPath: [{_key: blockKey}, 'rows', 1, 'items'],
      }
    case 'sidecar after a null row from the end':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'image',
            rows: [null, {_key: rowKey, items: existing}],
          },
        ],
        arrayPath: [{_key: blockKey}, 'rows', -1, 'items'],
      }
    case 'sidecar after a null row by key':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'image',
            rows: [null, {_key: rowKey, items: existing}],
          },
        ],
        arrayPath: [{_key: blockKey}, 'rows', {_key: rowKey}, 'items'],
      }
    case 'two null depths by index':
      return {
        value: [{_key: blockKey, _type: 'image', rows: nullRows(existing)}],
        arrayPath: [{_key: blockKey}, 'rows', 1, 'cells', 1, 'items'],
      }
    case 'two null depths from the end':
      return {
        value: [{_key: blockKey, _type: 'image', rows: nullRows(existing)}],
        arrayPath: [{_key: blockKey}, 'rows', -1, 'cells', -1, 'items'],
      }
    case 'two null depths by key':
      return {
        value: [{_key: blockKey, _type: 'image', rows: nullRows(existing)}],
        arrayPath: [
          {_key: blockKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'items',
        ],
      }
    case 'two null depths in containers by index':
      return {
        value: inTwoContainers({rows: nullRows(existing)}),
        arrayPath: [
          ...[{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
          ...[{_key: otherKey}, 'rows', 1, 'cells', 1, 'items'],
        ],
      }
    case 'two null depths in containers from end':
      return {
        value: inTwoContainers({rows: nullRows(existing)}),
        arrayPath: [
          ...[{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
          ...[{_key: otherKey}, 'rows', -1, 'cells', -1, 'items'],
        ],
      }
    case 'two null depths in containers by key':
      return {
        value: inTwoContainers({rows: nullRows(existing)}),
        arrayPath: [
          ...[{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
          ...[{_key: otherKey}, 'rows', {_key: rowKey}, 'cells'],
          ...[{_key: cellKey}, 'items'],
        ],
      }
    case 'array in an array':
      return {
        value: [{_key: blockKey, _type: 'image', rows: [existing]}],
        arrayPath: [{_key: blockKey}, 'rows', 0],
      }
    case 'array in an array in an array':
      return {
        value: [{_key: blockKey, _type: 'image', rows: [[[], existing]]}],
        arrayPath: [{_key: blockKey}, 'rows', 0, -1],
      }
    case 'array in an array in containers':
      return {
        value: inTwoContainers({rows: [['baz'], existing]}),
        arrayPath: [
          ...[{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
          ...[{_key: otherKey}, 'rows', -1],
        ],
      }
    case 'array in an array in containers by index':
      return {
        value: inTwoContainers({rows: [[existing]]}),
        arrayPath: [0, 'boxes', 0, 'content', 0, 'rows', 0, 0],
      }
    case 'root':
      return {value: existing, arrayPath: []}
    case 'sidecar through a negative block':
      return {
        value: [other, {_key: blockKey, _type: 'image', items: existing}],
        arrayPath: [-1, 'items'],
      }
    case 'container':
      return {
        value: [{_key: blockKey, _type: 'box', content: existing}],
        arrayPath: [{_key: blockKey}, 'content'],
      }
    case 'numeric container':
      return {
        value: [{_key: blockKey, _type: 'box', content: existing}, other],
        arrayPath: [0, 'content'],
      }
    case 'negative container':
      return {
        value: [other, {_key: blockKey, _type: 'box', content: existing}],
        arrayPath: [-1, 'content'],
      }
    case 'container in container':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'section',
            boxes: [{_key: innerKey, _type: 'box', content: existing}],
          },
        ],
        arrayPath: [{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
      }
    case 'numeric container in container':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'section',
            boxes: [
              {_key: innerKey, _type: 'box', content: existing},
              {_key: keyGenerator(), _type: 'box', content: []},
            ],
          },
          other,
        ],
        arrayPath: [0, 'boxes', 0, 'content'],
      }
    case 'negative container in container':
      return {
        value: [
          other,
          {
            _key: blockKey,
            _type: 'section',
            boxes: [
              {_key: keyGenerator(), _type: 'box', content: []},
              {_key: innerKey, _type: 'box', content: existing},
            ],
          },
        ],
        arrayPath: [-1, 'boxes', -1, 'content'],
      }
    case 'first container sharing a key':
      return {
        value: [
          {_key: blockKey, _type: 'box', content: existing},
          {_key: blockKey, _type: 'box', content: [other]},
        ],
        arrayPath: [{_key: blockKey}, 'content'],
      }
    case 'later container sharing a key by index':
      return {
        value: [
          {_key: blockKey, _type: 'box', content: [other]},
          {_key: blockKey, _type: 'box', content: existing},
        ],
        arrayPath: [1, 'content'],
      }
    case 'first nested container sharing a key':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'section',
            boxes: [
              {_key: innerKey, _type: 'box', content: existing},
              {_key: innerKey, _type: 'box', content: [other]},
            ],
          },
        ],
        arrayPath: [{_key: blockKey}, 'boxes', {_key: innerKey}, 'content'],
      }
    case 'later nested container sharing a key':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'section',
            boxes: [
              {_key: innerKey, _type: 'box', content: [other]},
              {_key: innerKey, _type: 'box', content: existing},
            ],
          },
        ],
        arrayPath: [{_key: blockKey}, 'boxes', 1, 'content'],
      }
    case 'sidecar in a first block sharing a key':
      return {
        value: [
          {_key: blockKey, _type: 'image', items: existing},
          {_key: blockKey, _type: 'image', items: [other]},
        ],
        arrayPath: [{_key: blockKey}, 'items'],
      }
    case 'sidecar in a later block sharing a key':
      return {
        value: [
          {_key: blockKey, _type: 'image', items: [other]},
          {_key: blockKey, _type: 'image', items: existing},
        ],
        arrayPath: [1, 'items'],
      }
    case 'text block children':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'block',
            children: existing,
            markDefs: [],
            style: 'normal',
          },
        ],
        arrayPath: [{_key: blockKey}, 'children'],
      }
    case 'Portable Text in an object field':
      return {
        value: [{_key: blockKey, _type: 'figure', caption: {body: existing}}],
        arrayPath: [{_key: blockKey}, 'caption', 'body'],
      }
    case 'sidecar':
      return {
        value: [{_key: blockKey, _type: 'image', items: existing}],
        arrayPath: [{_key: blockKey}, 'items'],
      }
    case 'sidecar through a negative row':
      return {
        value: [
          {
            _key: blockKey,
            _type: 'image',
            rows: [
              {_key: keyGenerator(), items: []},
              {_key: innerKey, items: existing},
            ],
          },
        ],
        arrayPath: [{_key: blockKey}, 'rows', -1, 'items'],
      }
  }
}

function createBareEditor(
  value: Array<PortableTextBlock>,
): PortableTextEditorEngine {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {name: 'image'},
        {
          name: 'box',
          fields: [{name: 'content', type: 'array', of: [{type: 'image'}]}],
        },
        {
          name: 'section',
          fields: [{name: 'boxes', type: 'array', of: [{type: 'box'}]}],
        },
        {
          name: 'figure',
          fields: [
            {
              name: 'caption',
              type: 'object',
              fields: [{name: 'body', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        },
      ],
    }),
  )
  const editor = createEditor() as PortableTextEditorEngine
  // `applyAll` may leave content the editor would normalize (a null block,
  // a keyless span), so the comparison runs on the raw operations.
  editor.apply = (operation) => {
    applyOperation(editor, operation)
  }
  const containers = resolveContainers(schema, [
    defineContainer({type: 'box', arrayField: 'content'}),
    defineContainer({type: 'section', arrayField: 'boxes'}),
  ])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})

  editor.containers = new Map()
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.lastSyncedValue = structuredClone(value)
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator: createTestKeyGenerator('generated-'),
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  } as PortableTextEditorEngine['snapshot']

  return editor
}
