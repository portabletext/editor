import {describe, expect, test} from 'vitest'
import {getNode} from './get-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path', () => {
    expect(getNode(testbed.context, [])).toBeUndefined()
  })

  test('text block', () => {
    const entry = getNode(testbed.context, [{_key: 'k3'}])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('span', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k3'},
      'children',
      {_key: 'k0'},
    ])
    expect(entry?.node).toBe(testbed.span1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k0'}])
  })

  test('inline object', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k3'},
      'children',
      {_key: 'k1'},
    ])
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('block object', () => {
    const entry = getNode(testbed.context, [{_key: 'k4'}])
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('second text block', () => {
    const entry = getNode(testbed.context, [{_key: 'k6'}])
    expect(entry?.node).toBe(testbed.textBlock2)
    expect(entry?.path).toEqual([{_key: 'k6'}])
  })

  test('out of bounds', () => {
    expect(getNode(testbed.context, [{_key: 'nonexistent'}])).toBeUndefined()
  })

  test('code block', () => {
    const entry = getNode(testbed.context, [{_key: 'k11'}])
    expect(entry?.node).toBe(testbed.codeBlock)
    expect(entry?.path).toEqual([{_key: 'k11'}])
  })

  test('code block -> first line', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
    ])
    expect(entry?.node).toBe(testbed.codeLine1)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k8'}])
  })

  test('code block -> second line', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k10'},
    ])
    expect(entry?.node).toBe(testbed.codeLine2)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k10'}])
  })

  test('code block -> line -> span', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
      'children',
      {_key: 'k7'},
    ])
    expect(entry?.node).toBe(testbed.codeSpan1)
    expect(entry?.path).toEqual([
      {_key: 'k11'},
      'code',
      {_key: 'k8'},
      'children',
      {_key: 'k7'},
    ])
  })

  test('table -> row', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
    ])
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('table -> row -> first cell', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
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

  test('table -> row -> second cell', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k20'},
    ])
    expect(entry?.node).toBe(testbed.cell2)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k20'},
    ])
  })

  test('cell -> first block', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k14'},
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

  test('cell -> second block', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k16'},
    ])
    expect(entry?.node).toBe(testbed.cellBlock2)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
      'content',
      {_key: 'k16'},
    ])
  })

  test('span inside cell block', () => {
    const entry = getNode(testbed.context, [
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

  test('inline object inside cell block', () => {
    const entry = getNode(testbed.context, [
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

  test('second row', () => {
    const entry = getNode(testbed.context, [
      {_key: 'k26'},
      'rows',
      {_key: 'k25'},
    ])
    expect(entry?.node).toBe(testbed.row2)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k25'}])
  })

  test('node inside non-editable container returns undefined', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    expect(
      getNode({...testbed.context, editableTypes: tableOnly}, [
        {_key: 'k11'},
        'code',
        {_key: 'k8'},
      ]),
    ).toBeUndefined()
  })
})
