import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {pathEquals} from './path-equals'

describe(pathEquals.name, () => {
  test('keyed segments with the same key are equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathEquals([{_key: blockKey}], [{_key: blockKey}])).toBe(true)
  })

  test('keyed segments with different keys are not equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const otherBlockKey = keyGenerator()

    expect(pathEquals([{_key: blockKey}], [{_key: otherBlockKey}])).toBe(false)
  })

  test('the same index is equal', () => {
    expect(pathEquals([0], [0])).toBe(true)
  })

  test('different indexes are not equal', () => {
    expect(pathEquals([0], [1])).toBe(false)
  })

  test('the same field name is equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathEquals(
        [{_key: blockKey}, 'children', {_key: spanKey}],
        [{_key: blockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(true)
  })

  test('different field names are not equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(
      pathEquals(
        [{_key: blockKey}, 'children'],
        [{_key: blockKey}, 'markDefs'],
      ),
    ).toBe(false)
  })

  test('a keyed segment and an index at the same position are not equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathEquals([{_key: blockKey}], [0])).toBe(false)
  })

  test('an index and a keyed segment at the same position are not equal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathEquals([0], [{_key: blockKey}])).toBe(false)
  })

  test('two empty paths are equal', () => {
    expect(pathEquals([], [])).toBe(true)
  })

  test('the empty path does not equal a non-empty path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(pathEquals([], [{_key: blockKey}])).toBe(false)
  })

  test('a path does not equal its own prefix', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathEquals(
        [{_key: blockKey}, 'children', {_key: spanKey}],
        [{_key: blockKey}],
      ),
    ).toBe(false)
  })

  test('a path does not equal a longer path that starts with it', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathEquals(
        [{_key: blockKey}],
        [{_key: blockKey}, 'children', {_key: spanKey}],
      ),
    ).toBe(false)
  })

  test('nested paths through a container field are equal when every segment matches', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathEquals(
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

  test('nested paths through a container field are not equal when one inner key differs', () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const otherCellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      pathEquals(
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
          {_key: otherCellKey},
          'value',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
      ),
    ).toBe(false)
  })
})
