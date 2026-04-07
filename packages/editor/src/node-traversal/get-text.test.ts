import {describe, expect, test} from 'vitest'
import {getText} from './get-text'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getText.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('text of a text block', () => {
    expect(getText(testbed.context, [{_key: 'k3'}])).toBe('hello  world')
  })

  test('text of a span', () => {
    expect(
      getText(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k0'}]),
    ).toBe('hello ')
  })

  test('text of second span', () => {
    expect(
      getText(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k2'}]),
    ).toBe(' world')
  })

  test('text of an inline object', () => {
    expect(
      getText(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k1'}]),
    ).toBe('')
  })

  test('text of a block object with no children', () => {
    expect(getText(testbed.context, [{_key: 'k4'}])).toBe('')
  })

  test('text of second text block', () => {
    expect(getText(testbed.context, [{_key: 'k6'}])).toBe('second block')
  })

  test('text of code block', () => {
    expect(getText(testbed.context, [{_key: 'k11'}])).toBe(
      'const a = 1console.log(a)',
    )
  })

  test('text of code line', () => {
    expect(
      getText(testbed.context, [{_key: 'k11'}, 'code', {_key: 'k8'}]),
    ).toBe('const a = 1')
  })

  test('text of code span', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k11'},
        'code',
        {_key: 'k8'},
        'children',
        {_key: 'k7'},
      ]),
    ).toBe('const a = 1')
  })

  test('text of cell block with inline object', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ]),
    ).toBe('a ')
  })

  test('text of cell span', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ]),
    ).toBe('a ')
  })

  test('text of second cell block', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k16'},
      ]),
    ).toBe('b')
  })

  test('text of cell block in second cell', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k20'},
        'content',
        {_key: 'k19'},
      ]),
    ).toBe('c')
  })

  test('text of empty block', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k25'},
        'cells',
        {_key: 'k24'},
        'content',
        {_key: 'k23'},
      ]),
    ).toBe('')
  })

  test('text of empty span', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k25'},
        'cells',
        {_key: 'k24'},
        'content',
        {_key: 'k23'},
        'children',
        {_key: 'k22'},
      ]),
    ).toBe('')
  })

  test('out of bounds returns undefined', () => {
    expect(getText(testbed.context, [{_key: 'nonexistent'}])).toBeUndefined()
  })

  test('empty path returns undefined', () => {
    expect(getText(testbed.context, [])).toBeUndefined()
  })

  test('text of table includes all cell text', () => {
    expect(getText(testbed.context, [{_key: 'k26'}])).toBe('a bc')
  })

  test('text of row includes all cell text', () => {
    expect(
      getText(testbed.context, [{_key: 'k26'}, 'rows', {_key: 'k21'}]),
    ).toBe('a bc')
  })

  test('text of cell includes all block text', () => {
    expect(
      getText(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
      ]),
    ).toBe('a b')
  })
})
