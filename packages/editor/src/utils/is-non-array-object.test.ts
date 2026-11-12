import {describe, expect, test} from 'vitest'
import {isNonArrayObject} from './is-non-array-object'

describe(isNonArrayObject.name, () => {
  test('rejects null', () => {
    expect(isNonArrayObject(null)).toEqual(false)
  })

  test('rejects strings', () => {
    expect(isNonArrayObject('foo')).toEqual(false)
  })

  test('rejects numbers', () => {
    expect(isNonArrayObject(5)).toEqual(false)
  })

  test('rejects arrays', () => {
    expect(isNonArrayObject([])).toEqual(false)
  })

  test('accepts plain objects', () => {
    expect(isNonArrayObject({})).toEqual(true)
  })

  test('accepts typeless objects', () => {
    expect(isNonArrayObject({text: 'foo'})).toEqual(true)
  })
})
