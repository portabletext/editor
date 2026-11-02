import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {resolveOperationPath} from './resolve-operation-path'

describe(resolveOperationPath.name, () => {
  test('counts negative indices from the end of their array', () => {
    const keyGenerator = createTestKeyGenerator()
    const firstKey = keyGenerator()
    const lastKey = keyGenerator()
    const rowKey = keyGenerator()
    const itemKey = keyGenerator()
    const value = [
      {_key: firstKey, _type: 'image'},
      {
        _key: lastKey,
        _type: 'grid',
        rows: [{_key: rowKey, items: [{_key: itemKey, title: 'foo'}]}],
      },
    ]

    expect(resolveOperationPath(value, [-1, 'alt'])).toEqual([
      {_key: lastKey},
      'alt',
    ])
    expect(resolveOperationPath(value, [-2])).toEqual([{_key: firstKey}])
    expect(
      resolveOperationPath(value, [-1, 'rows', -1, 'items', -1, 'title']),
    ).toEqual([
      {_key: lastKey},
      'rows',
      {_key: rowKey},
      'items',
      {_key: itemKey},
      'title',
    ])
  })

  test('resolves an index outside its array to undefined', () => {
    const keyGenerator = createTestKeyGenerator()
    const firstKey = keyGenerator()
    const lastKey = keyGenerator()
    const itemKey = keyGenerator()
    const value = [
      {_key: firstKey, _type: 'image'},
      {_key: lastKey, _type: 'list', items: [{_key: itemKey, title: 'foo'}]},
    ]

    expect(resolveOperationPath(value, [-3, 'alt'])).toBeUndefined()
    expect(resolveOperationPath(value, [2, 'alt'])).toBeUndefined()
    expect(resolveOperationPath(value, [-3])).toBeUndefined()
    expect(resolveOperationPath(value, [2])).toBeUndefined()
    expect(resolveOperationPath(value, [-1, 'items', -2])).toBeUndefined()
    expect(resolveOperationPath(value, [-1, 'items', 1])).toBeUndefined()
    expect(
      resolveOperationPath(value, [-1, 'items', 1], {insert: true}),
    ).toBeUndefined()
  })

  test('lets an insert address the first item of an empty array', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [{_key: blockKey, _type: 'list', items: []}]

    expect(resolveOperationPath(value, [-1, 'items', -1])).toBeUndefined()
    expect(resolveOperationPath(value, [-1, 'items', 0])).toBeUndefined()
    expect(
      resolveOperationPath(value, [-1, 'items', -1], {insert: true}),
    ).toEqual([{_key: blockKey}, 'items', 0])
    expect(
      resolveOperationPath(value, [-1, 'items', 0], {insert: true}),
    ).toEqual([{_key: blockKey}, 'items', 0])
    expect(
      resolveOperationPath(value, [-1, 'items', 1], {insert: true}),
    ).toBeUndefined()
  })

  test('keeps indices into a value that is not an array', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [{_key: blockKey, _type: 'list'}]

    expect(resolveOperationPath(value, [-1, 'title', -1])).toEqual([
      {_key: blockKey},
      'title',
      -1,
    ])
  })

  test('turns negative indices of elements without a unique key into absolute indices', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [{_key: blockKey, _type: 'list', tags: ['foo', 'bar']}]

    expect(resolveOperationPath(value, [-1, 'tags', -1])).toEqual([
      {_key: blockKey},
      'tags',
      1,
    ])
  })
})
