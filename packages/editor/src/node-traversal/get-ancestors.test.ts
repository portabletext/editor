import {describe, expect, test} from 'vitest'
import {getAncestors} from './get-ancestors'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getAncestors.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns empty array', () => {
    expect(getAncestors(testbed.context, [])).toEqual([])
  })

  test('top-level block has no ancestors', () => {
    expect(getAncestors(testbed.context, [{_key: 'k3'}])).toEqual([])
  })

  test('span in text block has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k3'},
      'children',
      {_key: 'k1'},
    ])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.textBlock1)
    expect(ancestors.at(0)?.path).toEqual([{_key: 'k3'}])
  })

  test('span in cell block has four ancestors', () => {
    const ancestors = getAncestors(testbed.context, [
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
    expect(ancestors).toHaveLength(4)
    expect(ancestors.at(0)?.node).toBe(testbed.cellBlock1)
    expect(ancestors.at(0)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
    expect(ancestors.at(1)?.node).toBe(testbed.cell1)
    expect(ancestors.at(1)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
    expect(ancestors.at(2)?.node).toBe(testbed.row1)
    expect(ancestors.at(2)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(ancestors.at(3)?.node).toBe(testbed.table)
    expect(ancestors.at(3)?.path).toEqual([{_key: 'k26'}])
  })

  test('block in cell has three ancestors', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
    ])
    expect(ancestors).toHaveLength(3)
    expect(ancestors.at(0)?.node).toBe(testbed.cell1)
    expect(ancestors.at(0)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
    expect(ancestors.at(1)?.node).toBe(testbed.row1)
    expect(ancestors.at(1)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(ancestors.at(2)?.node).toBe(testbed.table)
    expect(ancestors.at(2)?.path).toEqual([{_key: 'k26'}])
  })

  test('cell has two ancestors', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
    expect(ancestors).toHaveLength(2)
    expect(ancestors.at(0)?.node).toBe(testbed.row1)
    expect(ancestors.at(0)?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(ancestors.at(1)?.node).toBe(testbed.table)
    expect(ancestors.at(1)?.path).toEqual([{_key: 'k26'}])
  })

  test('row has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.table)
    expect(ancestors.at(0)?.path).toEqual([{_key: 'k26'}])
  })

  test('code span has two ancestors', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
      'children',
      {_key: 'k7'},
    ])
    expect(ancestors).toHaveLength(2)
    expect(ancestors.at(0)?.node).toBe(testbed.codeLine1)
    expect(ancestors.at(0)?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k8'}])
    expect(ancestors.at(1)?.node).toBe(testbed.codeBlock)
    expect(ancestors.at(1)?.path).toEqual([{_key: 'k11'}])
  })

  test('code line has one ancestor', () => {
    const ancestors = getAncestors(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
    ])
    expect(ancestors).toHaveLength(1)
    expect(ancestors.at(0)?.node).toBe(testbed.codeBlock)
    expect(ancestors.at(0)?.path).toEqual([{_key: 'k11'}])
  })

  test('ancestors are ordered from nearest to furthest', () => {
    const ancestors = getAncestors(testbed.context, [
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
    const paths = ancestors.map((ancestor) => ancestor.path)
    expect(paths).toEqual([
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ],
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      [{_key: 'k26'}, 'rows', {_key: 'k21'}],
      [{_key: 'k26'}],
    ])
  })
})
