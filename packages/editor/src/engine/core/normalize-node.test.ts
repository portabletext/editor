import {type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {invalidateVerifiedGroups} from '../../editor/subscriber.update-value'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {setNormalizing} from '../editor/set-normalizing'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {EngineOperation} from '../interfaces/operation'
import {normalizeNode} from './normalize-node'

test('an inserted null invalidates a verified sibling group', () => {
  const groups = new Set([''])
  invalidateVerifiedGroups(groups, {
    type: 'insert',
    path: [0],
    node: null as never,
    position: 'before',
  })
  expect(groups.size).toBe(0)
})

test('one primitive insert into 1,000 blocks has constant normalization cost', () => {
  const keyGenerator = createTestKeyGenerator()
  const value = Array.from({length: 1_000}, (_, index) => ({
    _type: 'block' as const,
    _key: `block-${index}`,
    children: [
      {
        _type: 'span' as const,
        _key: `span-${index}`,
        text: 'foo',
        marks: [],
      },
    ],
    markDefs: [],
    style: 'normal',
  }))
  const editor = createBareEditor(value, keyGenerator)
  let normalizeNodeVisits = 0
  const originalNormalizeNode = editor.normalizeNode
  editor.normalizeNode = (...args) => {
    normalizeNodeVisits++
    return originalNormalizeNode(...args)
  }

  withRemoteChanges(editor, 'patches', () => {
    withoutNormalizing(editor, () => {
      editor.apply({
        type: 'insert',
        path: [{_key: 'block-999'}],
        node: 'oops' as never,
        position: 'after',
      })
    })
  })

  expect(normalizeNodeVisits).toBe(3)
  expect(editor.snapshot.context.value).toEqual(value)
})

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
  setNormalizing(editor, false)
  editor.apply({
    type: 'set',
    path: [],
    value: [...editor.snapshot.context.value, 'oops'] as never,
  })
  setNormalizing(editor, true)
  editor.dirtyPaths = []
  editor.dirtyPathKeys.clear()
  editor.childArrayRepairPaths.clear()
  editor.childArrayRepairPathPrefixes.clear()
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    apply(operation)
  }

  normalizeNode(editor, ['oops' as never, [1]])

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
  setNormalizing(editor, false)
  editor.apply({
    type: 'set',
    path: [{_key: blockKey}, 'children'],
    value: [
      42,
      {_type: 'span', _key: spanKey, text: 'foo', marks: []},
    ] as never,
  })
  setNormalizing(editor, true)
  editor.dirtyPaths = []
  editor.dirtyPathKeys.clear()
  editor.childArrayRepairPaths.clear()
  editor.childArrayRepairPathPrefixes.clear()
  const operations: Array<EngineOperation> = []
  const apply = editor.apply
  editor.apply = (operation) => {
    operations.push(structuredClone(operation))
    apply(operation)
  }

  normalizeNode(editor, [42 as never, [{_key: blockKey}, 'children', 0]])

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
    normalizeNode(editor, ['oops' as never, [1]])

    expect(editor.dirtyPaths).toEqual([[]])
  })
})
