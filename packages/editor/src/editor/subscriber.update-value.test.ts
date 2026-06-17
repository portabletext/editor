import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import {serializePath} from '../paths/serialize-path'
import {invalidateVerifiedGroups} from './subscriber.update-value'

/**
 * `invalidateVerifiedGroups` is the cache-invariant gate the dedup-scan
 * skip in `normalizeNode` depends on: groups whose direct membership an
 * operation changes must lose their verdict, and unrelated groups must
 * keep theirs. The dedup correctness tests prove fixes still apply; this
 * pins the invariant so a future tweak to the invalidator can't silently
 * drop the skip without surfacing here.
 */

const rootGroupId = ''
const aChildrenGroupId = serializePath([{_key: 'a'}, 'children'])
const bChildrenGroupId = serializePath([{_key: 'b'}, 'children'])

type Invalidatable = Exclude<
  EngineOperation,
  {type: 'set.selection' | 'insert.text' | 'remove.text'}
>

function withGroups(...ids: ReadonlyArray<string>): Set<string> {
  return new Set(ids)
}

function applyInvalidation(
  groups: Set<string>,
  operation: Invalidatable,
): Set<string> {
  invalidateVerifiedGroups(groups, operation)
  return groups
}

describe('invalidateVerifiedGroups', () => {
  test('drops the group an insert joins, keeps unrelated groups', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'insert',
      path: [{_key: 'a'}, 'children', 0],
      node: {_key: 'new', _type: 'span', text: '', marks: []},
      position: 'before',
    }
    applyInvalidation(groups, operation)
    expect(groups.has(aChildrenGroupId)).toBe(false)
    expect(groups.has(rootGroupId)).toBe(true)
    expect(groups.has(bChildrenGroupId)).toBe(true)
  })

  test('drops the parent group of an unset node', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'unset',
      path: [{_key: 'a'}, 'children', {_key: 'x'}],
    }
    applyInvalidation(groups, operation)
    expect(groups.has(aChildrenGroupId)).toBe(false)
    expect(groups.has(rootGroupId)).toBe(true)
    expect(groups.has(bChildrenGroupId)).toBe(true)
  })

  test('drops the field group of an unset whole-field', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'unset',
      path: [{_key: 'a'}, 'children'],
    }
    applyInvalidation(groups, operation)
    expect(groups.has(aChildrenGroupId)).toBe(false)
    expect(groups.has(rootGroupId)).toBe(true)
    expect(groups.has(bChildrenGroupId)).toBe(true)
  })

  test('drops the parent group when a `_key` changes', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'set',
      path: [{_key: 'a'}, 'children', {_key: 'x'}, '_key'],
      value: 'renamed',
    }
    applyInvalidation(groups, operation)
    expect(groups.has(aChildrenGroupId)).toBe(false)
    expect(groups.has(rootGroupId)).toBe(true)
    expect(groups.has(bChildrenGroupId)).toBe(true)
  })

  test('keeps every group when a deep property changes', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'set',
      path: [{_key: 'a'}, 'children', {_key: 'x'}, 'text'],
      value: 'hello',
    }
    applyInvalidation(groups, operation)
    expect(groups.has(rootGroupId)).toBe(true)
    expect(groups.has(aChildrenGroupId)).toBe(true)
    expect(groups.has(bChildrenGroupId)).toBe(true)
  })

  test('clears the cache when a root-level set replaces the whole value', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'set',
      path: [],
      value: [],
    }
    applyInvalidation(groups, operation)
    expect(groups.size).toBe(0)
  })

  test('clears the cache when a numeric segment makes the group id unresolvable', () => {
    const groups = withGroups(rootGroupId, aChildrenGroupId, bChildrenGroupId)
    const operation: Invalidatable = {
      type: 'insert',
      // `apply-merge-node` emits numeric anchors when prev-children is empty.
      path: [{_key: 'a'}, 'children', 0, 'children', 0],
      node: {_key: 'new', _type: 'span', text: '', marks: []},
      position: 'after',
    }
    applyInvalidation(groups, operation)
    expect(groups.size).toBe(0)
  })

  test("drops a re-inserted subtree's nested groups so a reused key cannot inherit a stale verdict", () => {
    const replacedChildrenGroupId = serializePath([
      {_key: 'a'},
      'children',
      {_key: 'replaced'},
      'children',
    ])
    const groups = withGroups(
      rootGroupId,
      aChildrenGroupId,
      replacedChildrenGroupId,
    )
    const operation: Invalidatable = {
      type: 'insert',
      path: [{_key: 'a'}, 'children', 0],
      node: {
        _key: 'replaced',
        _type: 'block',
        children: [{_key: 'c1', _type: 'span', text: '', marks: []}],
      },
      position: 'before',
    }
    applyInvalidation(groups, operation)
    expect(groups.has(aChildrenGroupId)).toBe(false)
    expect(groups.has(replacedChildrenGroupId)).toBe(false)
    expect(groups.has(rootGroupId)).toBe(true)
  })

  test('does nothing when the cache is empty (the common batch-of-edits path)', () => {
    const groups = new Set<string>()
    const operation: Invalidatable = {
      type: 'insert',
      path: [{_key: 'a'}, 'children', 0],
      node: {_key: 'new', _type: 'span', text: '', marks: []},
      position: 'before',
    }
    applyInvalidation(groups, operation)
    expect(groups.size).toBe(0)
  })
})
