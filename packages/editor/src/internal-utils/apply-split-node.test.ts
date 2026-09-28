import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {createEditor} from '../engine/create-editor'
import {pointRef} from '../engine/editor/point-ref'
import {rangeRef} from '../engine/editor/range-ref'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {EngineOperation} from '../engine/interfaces/operation'
import {resolveContainers} from '../schema/resolve-containers-batch'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {applySplitNode} from './apply-split-node'
import {buildIndexMaps} from './build-index-maps'

describe(applySplitNode.name, () => {
  test('splitting a span inside its text removes the text after the split and inserts it as a new span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
      },
    ])
    const operations: Array<EngineOperation> = []

    withoutNormalizing(editor, () => {
      const unsubscribe = subscribeToOperations(editor, (event) => {
        operations.push(event.operation)
      })
      applySplitNode(editor, [{_key: blockKey}, 'children', {_key: spanKey}], 3)
      unsubscribe()
    })

    expect(operations).toEqual([
      {
        type: 'remove.text',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 3,
        text: 'bar',
      },
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        node: {_type: 'span', _key: 'k2', text: 'bar', marks: []},
        position: 'after',
        inverse: {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k2'}],
        },
      },
    ])
  })

  test('splitting a span at the end of its text applies no empty `remove.text`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      },
    ])
    const operations: Array<EngineOperation> = []

    withoutNormalizing(editor, () => {
      const unsubscribe = subscribeToOperations(editor, (event) => {
        operations.push(event.operation)
      })
      applySplitNode(editor, [{_key: blockKey}, 'children', {_key: spanKey}], 3)
      unsubscribe()
    })

    expect(operations).toEqual([
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        node: {_type: 'span', _key: 'k2', text: '', marks: []},
        position: 'after',
        inverse: {
          type: 'unset',
          path: [{_key: blockKey}, 'children', {_key: 'k2'}],
        },
      },
    ])
  })

  test('splitting a span at the end of its text moves a point ref at the split point into the new span', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
          {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        ],
      },
    ])
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const ref = pointRef(editor, {path: fooSpanPath, offset: 3})

    applySplitNode(editor, fooSpanPath, 3)

    expect(ref.current).toEqual({
      path: [{_key: blockKey}, 'children', {_key: 'k3'}],
      offset: 0,
    })
  })

  test('splitting a span at the end of its text keeps a range ref across the split point', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
          {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        ],
      },
    ])
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    const ref = rangeRef(editor, {
      anchor: {path: fooSpanPath, offset: 1},
      focus: {path: barSpanPath, offset: 1},
    })

    applySplitNode(editor, fooSpanPath, 3)

    expect(ref.current).toEqual({
      anchor: {path: fooSpanPath, offset: 1},
      focus: {path: barSpanPath, offset: 1},
    })
  })

  test('splitting a span at the end of its text keeps a forward selection across the split point', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
          {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        ],
      },
    ])
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    editor.snapshot.context.selection = {
      anchor: {path: fooSpanPath, offset: 1},
      focus: {path: barSpanPath, offset: 1},
      backward: false,
    }

    applySplitNode(editor, fooSpanPath, 3)

    expect(editor.snapshot.context.selection).toEqual({
      anchor: {path: fooSpanPath, offset: 1},
      focus: {path: barSpanPath, offset: 1},
      backward: false,
    })
  })

  test('splitting a span at the end of its text keeps a backward selection across the split point', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
          {_type: 'span', _key: barSpanKey, text: 'bar', marks: ['strong']},
        ],
      },
    ])
    const fooSpanPath = [{_key: blockKey}, 'children', {_key: fooSpanKey}]
    const barSpanPath = [{_key: blockKey}, 'children', {_key: barSpanKey}]
    editor.snapshot.context.selection = {
      anchor: {path: barSpanPath, offset: 1},
      focus: {path: fooSpanPath, offset: 1},
      backward: true,
    }

    applySplitNode(editor, fooSpanPath, 3)

    expect(editor.snapshot.context.selection).toEqual({
      anchor: {path: barSpanPath, offset: 1},
      focus: {path: fooSpanPath, offset: 1},
      backward: true,
    })
  })
})

function createBareEditor(
  keyGenerator: () => string,
  value: Array<PortableTextBlock>,
): PortableTextEditorEngine {
  const schema = compileSchema(defineSchema({}))
  const editor = createEditor() as PortableTextEditorEngine
  const containers = resolveContainers(schema, [])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})

  editor.containers = new Map()
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  } as PortableTextEditorEngine['snapshot']

  return editor
}
