import {describe, expect, test} from 'vitest'
import {isEqualMarkSet, isEqualMarks} from './equality'

describe(isEqualMarks.name, () => {
  test('order matters: value sync must write reordered marks through', () => {
    expect(isEqualMarks(['strong', 'link-key'], ['link-key', 'strong'])).toBe(
      false,
    )
    expect(isEqualMarks(['strong', 'link-key'], ['strong', 'link-key'])).toBe(
      true,
    )
  })

  test('`undefined` only equals `undefined`', () => {
    expect(isEqualMarks(undefined, undefined)).toBe(true)
    expect(isEqualMarks(undefined, [])).toBe(false)
    expect(isEqualMarks([], undefined)).toBe(false)
  })
})

describe(isEqualMarkSet.name, () => {
  test('order does not matter: marks from different provenances disagree on order', () => {
    expect(isEqualMarkSet(['strong', 'link-key'], ['link-key', 'strong'])).toBe(
      true,
    )
    expect(isEqualMarkSet([], [])).toBe(true)
  })

  test('differing sets are not equal', () => {
    expect(isEqualMarkSet(['strong'], ['em'])).toBe(false)
    expect(isEqualMarkSet(['strong'], ['strong', 'em'])).toBe(false)
    expect(isEqualMarkSet(['strong', 'em'], ['strong'])).toBe(false)
  })

  test('`undefined` only equals `undefined`', () => {
    expect(isEqualMarkSet(undefined, undefined)).toBe(true)
    expect(isEqualMarkSet(undefined, [])).toBe(false)
    expect(isEqualMarkSet([], undefined)).toBe(false)
  })
})
