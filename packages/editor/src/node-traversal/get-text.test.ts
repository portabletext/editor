import {describe, expect, test} from 'vitest'
import {getText} from './get-text'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getText.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('text of a text block', () => {
    expect(getText(testbed.context, [0])).toBe('hello  world')
  })

  test('text of a span', () => {
    expect(getText(testbed.context, [0, 0])).toBe('hello ')
  })

  test('text of second span', () => {
    expect(getText(testbed.context, [0, 2])).toBe(' world')
  })

  test('text of an inline object', () => {
    expect(getText(testbed.context, [0, 1])).toBe('')
  })

  test('text of a block object with no children', () => {
    expect(getText(testbed.context, [1])).toBe('')
  })

  test('text of second text block', () => {
    expect(getText(testbed.context, [2])).toBe('second block')
  })

  test('text of code block', () => {
    expect(getText(testbed.context, [3])).toBe('const a = 1console.log(a)')
  })

  test('text of code line', () => {
    expect(getText(testbed.context, [3, 0])).toBe('const a = 1')
  })

  test('text of code span', () => {
    expect(getText(testbed.context, [3, 0, 0])).toBe('const a = 1')
  })

  test('text of cell block with inline object', () => {
    expect(getText(testbed.context, [4, 0, 0, 0])).toBe('a ')
  })

  test('text of cell span', () => {
    expect(getText(testbed.context, [4, 0, 0, 0, 0])).toBe('a ')
  })

  test('text of second cell block', () => {
    expect(getText(testbed.context, [4, 0, 0, 1])).toBe('b')
  })

  test('text of cell block in second cell', () => {
    expect(getText(testbed.context, [4, 0, 1, 0])).toBe('c')
  })

  test('text of empty block', () => {
    expect(getText(testbed.context, [4, 1, 0, 0])).toBe('')
  })

  test('text of empty span', () => {
    expect(getText(testbed.context, [4, 1, 0, 0, 0])).toBe('')
  })

  test('out of bounds returns undefined', () => {
    expect(getText(testbed.context, [99])).toBeUndefined()
  })

  test('empty path returns undefined', () => {
    expect(getText(testbed.context, [])).toBeUndefined()
  })

  test('text of table includes all cell text', () => {
    expect(getText(testbed.context, [4])).toBe('a bc')
  })

  test('text of row includes all cell text', () => {
    expect(getText(testbed.context, [4, 0])).toBe('a bc')
  })

  test('text of cell includes all block text', () => {
    expect(getText(testbed.context, [4, 0, 0])).toBe('a b')
  })
})
