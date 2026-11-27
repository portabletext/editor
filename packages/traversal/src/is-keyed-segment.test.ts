import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {isKeyedSegment} from './is-keyed-segment'

describe(isKeyedSegment.name, () => {
  test('an object with a `_key` is a keyed segment', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    expect(isKeyedSegment({_key: blockKey})).toBe(true)
  })

  test('a number is not a keyed segment', () => {
    expect(isKeyedSegment(0)).toBe(false)
  })

  test('a string is not a keyed segment', () => {
    expect(isKeyedSegment('children')).toBe(false)
  })

  test('null is not a keyed segment', () => {
    expect(isKeyedSegment(null)).toBe(false)
  })

  test('undefined is not a keyed segment', () => {
    expect(isKeyedSegment(undefined)).toBe(false)
  })

  test('an array without a `_key` is not a keyed segment', () => {
    expect(isKeyedSegment([0, 1])).toBe(false)
  })

  test('an object without a `_key` is not a keyed segment', () => {
    expect(isKeyedSegment({_type: 'block'})).toBe(false)
  })
})
