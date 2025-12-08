import {describe, expect, test} from 'vitest'
import {startCase} from './start-case'

describe(startCase.name, () => {
  test('dashes with leading/trailing special chars', () => {
    expect(startCase('--foo-bar--')).toBe('Foo Bar')
  })

  test('camelCase', () => {
    expect(startCase('fooBar')).toBe('Foo Bar')
  })

  test('underscores with uppercase and special chars', () => {
    expect(startCase('__FOO_BAR__')).toBe('FOO BAR')
  })

  test('simple lowercase word', () => {
    expect(startCase('hello')).toBe('Hello')
  })

  test('already capitalized word', () => {
    expect(startCase('Hello')).toBe('Hello')
  })

  test('mixed case with underscores', () => {
    expect(startCase('my_field_name')).toBe('My Field Name')
  })

  test('empty string', () => {
    expect(startCase('')).toBe('')
  })

  test('single character', () => {
    expect(startCase('a')).toBe('A')
  })

  test('numbers in string', () => {
    expect(startCase('h1')).toBe('H1')
  })

  test('multiple consecutive separators', () => {
    expect(startCase('foo___bar')).toBe('Foo Bar')
  })
})
