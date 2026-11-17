import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {defineContainer} from '../../renderers/renderer.types'
import {resolveContainers} from '../../schema/resolve-containers'
import {normalize} from '../editor/normalize'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {EngineOperation} from '../interfaces/operation'
import {inTestChange} from './change.test-utils'
import {normalizeNode} from './normalize-node'

test('a non-object root entry emits only an unset', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    keyGenerator,
  )
  editor.snapshot.context.value.push('oops' as never)
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    return apply(operation)
  }

  inTestChange(editor, () => normalizeNode(editor, ['oops' as never, [1]]))

  expect(operations).toEqual([
    {
      type: 'unset',
      path: [1],
    },
  ])
  expect(editor.snapshot.context.value).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ])
})

test('a non-object child emits only an unset', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ] as Array<PortableTextBlock>
  const editor = createBareEditor(value, keyGenerator)
  const block = value[0] as {children: Array<unknown>}
  block.children.unshift(42)
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    return apply(operation)
  }

  inTestChange(editor, () =>
    normalizeNode(editor, [42 as never, [{_key: blockKey}, 'children', 0]]),
  )

  expect(operations).toEqual([
    {
      type: 'unset',
      path: [{_key: blockKey}, 'children', 0],
    },
  ])
  expect(editor.snapshot.context.value).toEqual([
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ])
})

test('a removed path is not re-queued', () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: firstBlockKey,
        children: [{_type: 'span', _key: firstSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: secondBlockKey,
        children: [
          {_type: 'span', _key: secondSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
    keyGenerator,
  )
  editor.snapshot.context.value.splice(1, 0, 'oops' as never)

  withoutNormalizing(editor, () => {
    inTestChange(editor, () => normalizeNode(editor, ['oops' as never, [1]]))

    expect(editor.dirtyPaths).toEqual([[]])
  })
})

test('a typeless child gets no bracketing span at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const childKey = keyGenerator()
  const editor = createBareEditor(
    [{_key: blockKey, children: [{_key: childKey, text: 'foo'}]}] as never,
    keyGenerator,
  )
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    return apply(operation)
  }
  inTestChange(editor, () => normalize(editor, {force: true}))
  expect(operations).toEqual([
    {
      type: 'set',
      path: [{_key: 'k0'}, '_type'],
      value: 'block',
      inverse: {type: 'unset', path: [{_key: 'k0'}, '_type']},
    },
    {
      type: 'set',
      path: [{_key: 'k0'}, 'markDefs'],
      value: [],
      inverse: {type: 'unset', path: [{_key: 'k0'}, 'markDefs']},
    },
    {
      type: 'set',
      path: [{_key: 'k0'}, 'style'],
      value: 'normal',
      inverse: {type: 'unset', path: [{_key: 'k0'}, 'style']},
    },
  ])
})

test('a typeless child gets no bracketing span in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const childKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [{_key: blockKey, children: [{_key: childKey, text: 'foo'}]}],
      },
    ] as never,
    keyGenerator,
  )
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
  )
  editor.snapshot.context.schema = schema
  editor.snapshot.context.containers = resolveContainers(schema, [
    defineContainer({type: 'callout', arrayField: 'content'}),
  ])
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    return apply(operation)
  }
  inTestChange(editor, () => normalize(editor, {force: true}))
  expect(operations).toEqual([
    {
      type: 'set',
      path: [{_key: 'k2'}, 'content', {_key: 'k0'}, '_type'],
      value: 'block',
      inverse: {
        type: 'unset',
        path: [{_key: 'k2'}, 'content', {_key: 'k0'}, '_type'],
      },
    },
    {
      type: 'set',
      path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'markDefs'],
      value: [],
      inverse: {
        type: 'unset',
        path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'markDefs'],
      },
    },
    {
      type: 'set',
      path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'style'],
      value: 'normal',
      inverse: {
        type: 'unset',
        path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'style'],
      },
    },
  ])
})
