import {describe, expect, test} from 'vitest'
import {getSibling} from './get-sibling'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getSibling.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('empty path returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [], {direction: 'next'}),
    ).toBeUndefined()
    expect(
      getSibling(testbed.snapshot, [], {direction: 'previous'}),
    ).toBeUndefined()
  })

  test('next sibling of first top-level block', () => {
    const entry = getSibling(testbed.snapshot, [{_key: 'k3'}], {
      direction: 'next',
    })
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('previous sibling of second top-level block', () => {
    const entry = getSibling(testbed.snapshot, [{_key: 'k4'}], {
      direction: 'previous',
    })
    expect(entry?.node).toBe(testbed.textBlock1)
    expect(entry?.path).toEqual([{_key: 'k3'}])
  })

  test('next sibling of last top-level block returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [{_key: 'k26'}], {direction: 'next'}),
    ).toBeUndefined()
  })

  test('previous sibling of first top-level block returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [{_key: 'k3'}], {direction: 'previous'}),
    ).toBeUndefined()
  })

  test('next sibling of span in text block', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      {direction: 'next'},
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('previous sibling of last span in text block', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k3'}, 'children', {_key: 'k2'}],
      {direction: 'previous'},
    )
    expect(entry?.node).toBe(testbed.stockTicker1)
    expect(entry?.path).toEqual([{_key: 'k3'}, 'children', {_key: 'k1'}])
  })

  test('next sibling of last span in text block returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [{_key: 'k3'}, 'children', {_key: 'k2'}], {
        direction: 'next',
      }),
    ).toBeUndefined()
  })

  test('previous sibling of first span in text block returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [{_key: 'k3'}, 'children', {_key: 'k0'}], {
        direction: 'previous',
      }),
    ).toBeUndefined()
  })

  test('next sibling of first block in cell', () => {
    const entry = getSibling(
      testbed.snapshot,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ],
      {direction: 'next'},
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
      testbed.snapshot,
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k16'},
      ],
      {direction: 'previous'},
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
        testbed.snapshot,
        [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k16'},
        ],
        {direction: 'next'},
      ),
    ).toBeUndefined()
  })

  test('next sibling of first cell in row', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      {direction: 'next'},
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
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k20'}],
      {direction: 'previous'},
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
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k21'}],
      {direction: 'next'},
    )
    expect(entry?.node).toBe(testbed.row2)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k25'}])
  })

  test('previous sibling of second row in table', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k26'}, 'rows', {_key: 'k25'}],
      {direction: 'previous'},
    )
    expect(entry?.node).toBe(testbed.row1)
    expect(entry?.path).toEqual([{_key: 'k26'}, 'rows', {_key: 'k21'}])
  })

  test('next sibling of span inside cell block', () => {
    const entry = getSibling(
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
      {direction: 'next'},
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
        {_key: 'k13'},
      ],
      {direction: 'previous'},
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
      getSibling(testbed.snapshot, [{_key: 'nonexistent'}], {
        direction: 'next',
      }),
    ).toBeUndefined()
    expect(
      getSibling(testbed.snapshot, [{_key: 'nonexistent'}], {
        direction: 'previous',
      }),
    ).toBeUndefined()
  })

  test('next sibling of code line', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k11'}, 'code', {_key: 'k8'}],
      {direction: 'next'},
    )
    expect(entry?.node).toBe(testbed.codeLine2)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k10'}])
  })

  test('previous sibling of second code line', () => {
    const entry = getSibling(
      testbed.snapshot,
      [{_key: 'k11'}, 'code', {_key: 'k10'}],
      {direction: 'previous'},
    )
    expect(entry?.node).toBe(testbed.codeLine1)
    expect(entry?.path).toEqual([{_key: 'k11'}, 'code', {_key: 'k8'}])
  })

  test('numeric last segment resolves as a literal index', () => {
    const entry = getSibling(testbed.snapshot, [1], {direction: 'next'})
    expect(entry?.node).toBe(testbed.textBlock2)
    expect(entry?.path).toEqual([{_key: testbed.textBlock2._key}])
  })

  test('out-of-range numeric last segment returns undefined', () => {
    expect(
      getSibling(testbed.snapshot, [99], {direction: 'next'}),
    ).toBeUndefined()
  })

  test('resolves the anchor when `blockIndexMap` misses', () => {
    // An unmaintained map (e.g. a bare engine) must not hide siblings
    // the tree plainly has; mirrors the `getNode`/`getChildren`
    // fallback.
    const snapshot = {
      context: testbed.snapshot.context,
      blockIndexMap: new Map<string, number>(),
    }

    const entry = getSibling(snapshot, [{_key: 'k3'}], {direction: 'next'})
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('resolves the anchor when `blockIndexMap` disagrees with the tree', () => {
    // A stale map (snapshots pairing a live map with a pre-apply
    // value) previously returned the wrong sibling without
    // verification.
    const snapshot = {
      context: testbed.snapshot.context,
      blockIndexMap: new Map<string, number>([['[_key=="k3"]', 2]]),
    }

    const entry = getSibling(snapshot, [{_key: 'k3'}], {direction: 'next'})
    expect(entry?.node).toBe(testbed.image)
    expect(entry?.path).toEqual([{_key: 'k4'}])
  })

  test('`match` still applies under a map miss', () => {
    const snapshot = {
      context: testbed.snapshot.context,
      blockIndexMap: new Map<string, number>(),
    }

    const entry = getSibling(snapshot, [{_key: 'k3'}], {
      direction: 'next',
      match: (node) => node._type === 'block',
    })
    expect(entry?.node).toBe(testbed.textBlock2)
  })
})
