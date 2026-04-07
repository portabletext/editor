import {describe, expect, test} from 'vitest'
import {getParent} from './get-parent'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getParent.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('parent of top-level block', () => {
    expect(getParent(testbed.context, [{_key: 'k3'}])).toBeUndefined()
  })

  test('parent of span', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k3'},
      'children',
      {_key: 'k0'},
    ])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('parent of row', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(entry?.node).toBe(testbed.table)
    expect(entry?.path).toEqual([{_key: 'k26'}])
  })

  test('parent of cell', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('parent of block inside cell', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
  })

  test('parent of span inside cell block', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
      'children',
      {_key: 'k12'},
    ])
    expect(entry?.node).toBe(testbed.cellBlock1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
  })

  test('parent of code line', () => {
    const entry = getParent(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
    ])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([{_key: 'k11'}])
  })

  test('empty path returns undefined', () => {
    expect(getParent(testbed.context, [])).toBeUndefined()
  })
})
