import {describe, expect, test} from 'vitest'
import {getSibling} from './get-sibling'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getSibling.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getSibling(testbed.context, [], 'next')).toBeUndefined()
    expect(getSibling(testbed.context, [], 'previous')).toBeUndefined()
  })

  test('next sibling of first top-level block', () => {
    const entry = getSibling(testbed.context, [{_key: 'k3'}], 'next')
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('previous sibling of second top-level block', () => {
    const entry = getSibling(testbed.context, [{_key: 'k4'}], 'previous')
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('next sibling of last top-level block returns undefined', () => {
    expect(getSibling(testbed.context, [{_key: 'k26'}], 'next')).toBeUndefined()
  })

  test('previous sibling of first top-level block returns undefined', () => {
    expect(
      getSibling(testbed.context, [{_key: 'k3'}], 'previous'),
    ).toBeUndefined()
  })

  test('next sibling of span in text block', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      'next',
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('previous sibling of last span in text block', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k3'}, 'children', {_key: 'k2'}],
      'previous',
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('next sibling of last span in text block returns undefined', () => {
    expect(
      getSibling(
        testbed.context,
        [{_key: 'k3'}, 'children', {_key: 'k2'}],
        'next',
      ),
    ).toBeUndefined()
  })

  test('previous sibling of first span in text block returns undefined', () => {
    expect(
      getSibling(
        testbed.context,
        [{_key: 'k3'}, 'children', {_key: 'k0'}],
        'previous',
      ),
    ).toBeUndefined()
  })

  test('next sibling of first block in cell', () => {
    const entry = getSibling(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ],
      'next',
    )
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

  test('previous sibling of second block in cell', () => {
    const entry = getSibling(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k16'},
      ],
      'previous',
    )
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

  test('next sibling of last block in cell returns undefined', () => {
    expect(
      getSibling(
        testbed.context,
        [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k16'},
        ],
        'next',
      ),
    ).toBeUndefined()
  })

  test('next sibling of first cell in row', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      'next',
    )
    expect(entry?.node).toBe(testbed.cell2)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k20'},
    ])
  })

  test('previous sibling of second cell in row', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k20'}],
      'previous',
    )
    expect(entry?.node).toBe(testbed.cell1)
    expect(entry?.path).toEqual([
      {_key: 'k26'},
      'rows',
      {_key: 'k21'},
      'cells',
      {_key: 'k17'},
    ])
  })

  test('next sibling of first row in table', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}],
      'next',
    )
    expect(entry?.node).toBe(testbed.row2)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k25'}])
  })

  test('previous sibling of second row in table', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k26'}, 'rows', {_key: 'k25'}],
      'previous',
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('next sibling of span inside cell block', () => {
    const entry = getSibling(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ],
      'next',
    )
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

  test('previous sibling of inline object inside cell block', () => {
    const entry = getSibling(
      testbed.context,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k13'},
      ],
      'previous',
    )
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

  test('out of bounds path returns undefined', () => {
    expect(
      getSibling(testbed.context, [{_key: 'nonexistent'}], 'next'),
    ).toBeUndefined()
    expect(
      getSibling(testbed.context, [{_key: 'nonexistent'}], 'previous'),
    ).toBeUndefined()
  })

  test('next sibling of code line', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k11'}, 'code', {_key: 'k8'}],
      'next',
    )
    expect(entry?.node).toBe(testbed.codeLine2)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k10'}])
  })

  test('previous sibling of second code line', () => {
    const entry = getSibling(
      testbed.context,
      [{_key: 'k11'}, 'code', {_key: 'k10'}],
      'previous',
    )
    expect(entry?.node).toBe(testbed.codeLine1)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k8'}])
  })
})
