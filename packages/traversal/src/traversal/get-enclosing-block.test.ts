import {describe, expect, test} from 'vitest'
import {getEnclosingBlock} from './get-enclosing-block'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getEnclosingBlock.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(getEnclosingBlock(testbed.snapshot, [])).toBeUndefined()
  })

  test('returns the block at the path when it is a block', () => {
    const entry = getEnclosingBlock(testbed.snapshot, [{_key: 'k3'}])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('walks up from a span to its text block', () => {
    const entry = getEnclosingBlock(testbed.snapshot, [
      {_key: 'k3'},
      'children',
      {_key: 'k0'},
    ])
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('walks up from a span inside a cell to the cell-internal text block', () => {
    const entry = getEnclosingBlock(testbed.snapshot, [
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

  describe('with match', () => {
    test('returns the block at the path if it matches', () => {
      const entry = getEnclosingBlock(testbed.snapshot, [{_key: 'k26'}], {
        match: (node) => node._type === 'table',
      })
      expect(entry?.node).toBe(testbed.table)
      expect(entry?.path).toEqual([{_key: 'k26'}])
    })

    test('walks up to find the closest row from a cell path', () => {
      const entry = getEnclosingBlock(
        testbed.snapshot,
        [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
        {match: (node) => node._type === 'row'},
      )
      expect(entry?.node).toBe(testbed.row1)
      expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
    })

    test('walks up to find the closest row from a span-in-cell path', () => {
      const entry = getEnclosingBlock(
        testbed.snapshot,
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
        {match: (node) => node._type === 'row'},
      )
      expect(entry?.node).toBe(testbed.row1)
      expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
    })

    test('walks up to the table from a deep cell-span path', () => {
      const entry = getEnclosingBlock(
        testbed.snapshot,
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
        {match: (node) => node._type === 'table'},
      )
      expect(entry?.node).toBe(testbed.table)
      expect(entry?.path).toEqual([{_key: 'k26'}])
    })

    test('returns undefined when no enclosing block matches', () => {
      expect(
        getEnclosingBlock(
          testbed.snapshot,
          [{_key: 'k3'}, 'children', {_key: 'k0'}],
          {match: (node) => node._type === 'table'},
        ),
      ).toBeUndefined()
    })

    test('match receives the path of each candidate', () => {
      const entry = getEnclosingBlock(
        testbed.snapshot,
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
        {
          match: (_node, path) =>
            path.filter(
              (segment) =>
                typeof segment === 'object' || typeof segment === 'number',
            ).length === 3,
        },
      )
      // 3 keyed segments = the cell
      expect(entry?.node).toBe(testbed.cell1)
      expect(entry?.path).toEqual([
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
      ])
    })

    test('returns nearest matching block when multiple ancestors match', () => {
      const entry = getEnclosingBlock(
        testbed.snapshot,
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
        {match: (node) => node._type === 'cell' || node._type === 'table'},
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
  })
})
