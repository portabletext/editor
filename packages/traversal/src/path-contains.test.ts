import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {pathContains} from './path-contains'

describe(pathContains.name, () => {
  test('a keyed path contains itself', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathContains([{_key: blockKey}], [{_key: blockKey}])).toBe(true)
  })

  test('a keyed path does not contain a path with a different key', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const otherBlockKey = keyGenerator()

    expect(pathContains([{_key: blockKey}], [{_key: otherBlockKey}])).toBe(
      false,
    )
  })

  test('a keyed path contains a path inside its subtree', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: blockKey}],
        [{_key: blockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(true)
  })

  test('a keyed path does not contain a path inside a sibling subtree', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const otherBlockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: blockKey}],
        [{_key: otherBlockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(false)
  })

  test('an index path contains itself', () => {
    expect(pathContains([0], [0])).toBe(true)
  })

  test('an index path contains a path inside its subtree', () => {
    expect(pathContains([0], [0, 'children', 1])).toBe(true)
  })

  test('an index path does not contain a path under a different index', () => {
    expect(pathContains([0], [1, 'children', 1])).toBe(false)
  })

  test('a path ending in a field name contains the paths inside that field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: blockKey}, 'children'],
        [{_key: blockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(true)
  })

  test('a path ending in a field name does not contain the paths inside another field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: blockKey}, 'markDefs'],
        [{_key: blockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(false)
  })

  test('a keyed segment does not contain an index at the same position', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains([{_key: blockKey}], [0, 'children', {_key: spanKey}]),
    ).toBe(false)
  })

  test('an index does not contain a keyed segment at the same position', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains([0], [{_key: blockKey}, 'children', {_key: spanKey}]),
    ).toBe(false)
  })

  test('the empty path contains the empty path', () => {
    expect(pathContains([], [])).toBe(true)
  })

  test('the empty path contains a keyed path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains([], [{_key: blockKey}, 'children', {_key: spanKey}]),
    ).toBe(true)
  })

  test('the empty path contains an index path', () => {
    expect(pathContains([], [0])).toBe(true)
  })

  test('a non-empty path does not contain the empty path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathContains([{_key: blockKey}], [])).toBe(false)
  })

  test('a path does not contain its own ancestor', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: blockKey}, 'children', {_key: spanKey}],
        [{_key: blockKey}],
      ),
    ).toBe(false)
  })

  test('a container contains a span nested through its fields', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: tableKey}, 'rows', {_key: rowKey}],
        [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'value',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
      ),
    ).toBe(true)
  })

  test('a container does not contain a span nested under a different row', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const otherRowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [{_key: tableKey}, 'rows', {_key: otherRowKey}],
        [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'value',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
      ),
    ).toBe(false)
  })

  test('a nested span path contains itself', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathContains(
        [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'value',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        [
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'value',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
      ),
    ).toBe(true)
  })
})
