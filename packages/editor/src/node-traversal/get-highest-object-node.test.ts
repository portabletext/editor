import {describe, expect, test} from 'vitest'
import {getHighestObjectNode} from './get-highest-object-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getHighestObjectNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getHighestObjectNode(testbed.context, [])).toBeUndefined()
  })

  test('text block returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [{_key: 'k3'}]),
    ).toBeUndefined()
  })

  test('span returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
        {_key: 'k3'},
        'children',
        {_key: 'k0'},
      ]),
    ).toBeUndefined()
  })

  test('block object at path returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [{_key: 'k4'}])
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('inline object at path returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [
      {_key: 'k3'},
      'children',
      {_key: 'k1'},
    ])
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('editable container at path returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [{_key: 'k26'}]),
    ).toBeUndefined()
  })

  test('span inside cell returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
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
    ).toBeUndefined()
  })

  test('cell block returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ]),
    ).toBeUndefined()
  })

  test('cell returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
      ]),
    ).toBeUndefined()
  })

  test('row returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
      ]),
    ).toBeUndefined()
  })

  test('code span returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [
        {_key: 'k11'},
        'code',
        {_key: 'k8'},
        'children',
        {_key: 'k7'},
      ]),
    ).toBeUndefined()
  })

  test('inline object in cell returns itself', () => {
    const entry = getHighestObjectNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
      'children',
      {_key: 'k13'},
    ])
    expect(entry?.node).toBe(testbed.stockTicker2)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
      'children',
      {_key: 'k13'},
    ])
  })

  test('invalid path returns undefined', () => {
    expect(
      getHighestObjectNode(testbed.context, [{_key: 'nonexistent'}]),
    ).toBeUndefined()
  })
})
