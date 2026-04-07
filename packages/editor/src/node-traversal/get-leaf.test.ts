import {describe, expect, test} from 'vitest'
import {getLeaf} from './get-leaf'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getLeaf.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('first leaf from root (start edge)', () => {
    const entry = getLeaf(testbed.context, [], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('last leaf from root (end edge)', () => {
    const entry = getLeaf(testbed.context, [], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k25'},
      'cells',
      {_key: 'k24'},
      'content',
      {_key: 'k23'},
      'children',
      {_key: 'k22'},
    ])
  })

  test('first leaf from text block', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k3'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('last leaf from text block', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k3'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.span2)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k2'}])
  })

  test('span is already a leaf', () => {
    const entry = getLeaf(
      testbed.context,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      {edge: 'start'},
    )
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('void block object is a leaf', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k4'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('inline object is a leaf', () => {
    const entry = getLeaf(
      testbed.context,
      [{_key: 'k3'}, 'children', {_key: 'k1'}],
      {edge: 'start'},
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('empty document returns undefined', () => {
    const emptyContext = {
      ...testbed.context,
      value: [],
    }
    expect(getLeaf(emptyContext, [], {edge: 'start'})).toBeUndefined()
    expect(getLeaf(emptyContext, [], {edge: 'end'})).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(
      getLeaf(testbed.context, [{_key: 'nonexistent'}], {edge: 'start'}),
    ).toBeUndefined()
    expect(
      getLeaf(
        testbed.context,
        [{_key: 'k3'}, 'children', {_key: 'nonexistent'}],
        {edge: 'end'},
      ),
    ).toBeUndefined()
  })

  test('first leaf from code block', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k11'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.codeSpan1)
    expect(entry?.path).toEqual([
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
      'children',
      {_key: 'k7'},
    ])
  })

  test('last leaf from code block', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k11'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.codeSpan2)
    expect(entry?.path).toEqual([
      {_key: 'k11'},
      'code',
      {_key: 'k10'},
      'children',
      {_key: 'k9'},
    ])
  })

  test('first leaf from table', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k26'}], {edge: 'start'})
    expect(entry?.node).toBe(testbed.cellSpan1)
    expect(entry?.path).toEqual([
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
  })

  test('last leaf from table', () => {
    const entry = getLeaf(testbed.context, [{_key: 'k26'}], {edge: 'end'})
    expect(entry?.node).toBe(testbed.emptySpan)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k25'},
      'cells',
      {_key: 'k24'},
      'content',
      {_key: 'k23'},
      'children',
      {_key: 'k22'},
    ])
  })
})
