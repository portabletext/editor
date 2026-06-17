import {describe, expect, test} from 'vitest'
import {serializePath} from '../paths/serialize-path'
import {getChildrenAt} from './get-children'
import {
  codeBlockContainer,
  createNodeTraversalTestbed,
  resolveTestbedContainers,
  tableContainers,
} from './node-traversal-testbed'

describe(getChildrenAt.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('root children', () => {
    expect(getChildrenAt(testbed.snapshot, [])).toEqual([
      {node: testbed.textBlock1, path: [{_key: 'k3'}]},
      {node: testbed.image, path: [{_key: 'k4'}]},
      {node: testbed.textBlock2, path: [{_key: 'k6'}]},
      {node: testbed.codeBlock, path: [{_key: 'k11'}]},
      {node: testbed.table, path: [{_key: 'k26'}]},
    ])
  })

  test('text block children', () => {
    expect(getChildrenAt(testbed.snapshot, [{_key: 'k3'}])).toEqual([
      {node: testbed.span1, path: [{_key: 'k3'}, 'children', {_key: 'k0'}]},
      {
        node: testbed.stockTicker1,
        path: [{_key: 'k3'}, 'children', {_key: 'k1'}],
      },
      {node: testbed.span2, path: [{_key: 'k3'}, 'children', {_key: 'k2'}]},
    ])
  })

  test('code block children (code lines)', () => {
    expect(getChildrenAt(testbed.snapshot, [{_key: 'k11'}])).toEqual([
      {node: testbed.codeLine1, path: [{_key: 'k11'}, 'code', {_key: 'k8'}]},
      {node: testbed.codeLine2, path: [{_key: 'k11'}, 'code', {_key: 'k10'}]},
    ])
  })

  test('code line children', () => {
    expect(
      getChildrenAt(testbed.snapshot, [{_key: 'k11'}, 'code', {_key: 'k8'}]),
    ).toEqual([
      {
        node: testbed.codeSpan1,
        path: [{_key: 'k11'}, 'code', {_key: 'k8'}, 'children', {_key: 'k7'}],
      },
    ])
  })

  test('table children (rows)', () => {
    expect(getChildrenAt(testbed.snapshot, [{_key: 'k26'}])).toEqual([
      {node: testbed.row1, path: [{_key: 'k26'}, 'rows', {_key: 'k21'}]},
      {node: testbed.row2, path: [{_key: 'k26'}, 'rows', {_key: 'k25'}]},
    ])
  })

  test('row children (cells)', () => {
    expect(
      getChildrenAt(testbed.snapshot, [{_key: 'k26'}, 'rows', {_key: 'k21'}]),
    ).toEqual([
      {
        node: testbed.cell1,
        path: [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      },
      {
        node: testbed.cell2,
        path: [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k20'}],
      },
    ])
  })

  test('cell with multiple blocks', () => {
    expect(
      getChildrenAt(testbed.snapshot, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
      ]),
    ).toEqual([
      {
        node: testbed.cellBlock1,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
        ],
      },
      {
        node: testbed.cellBlock2,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k16'},
        ],
      },
    ])
  })

  test('block inside cell children', () => {
    expect(
      getChildrenAt(testbed.snapshot, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ]),
    ).toEqual([
      {
        node: testbed.cellSpan1,
        path: [
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
      },
      {
        node: testbed.stockTicker2,
        path: [
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
      },
    ])
  })

  test('leaf node returns empty array', () => {
    expect(
      getChildrenAt(testbed.snapshot, [{_key: 'k3'}, 'children', {_key: 'k0'}]),
    ).toEqual([])
  })

  test('block object without children returns empty array', () => {
    expect(getChildrenAt(testbed.snapshot, [{_key: 'k4'}])).toEqual([])
  })

  test('invalid path returns empty array', () => {
    expect(getChildrenAt(testbed.snapshot, [{_key: 'nonexistent'}])).toEqual([])
  })

  test('non-editable code block returns empty array', () => {
    const tableOnly = resolveTestbedContainers(
      testbed.context.schema,
      tableContainers,
    )
    expect(
      getChildrenAt(
        {
          ...testbed.snapshot,
          context: {...testbed.snapshot.context, containers: tableOnly},
        },
        [{_key: 'k11'}],
      ),
    ).toEqual([])
  })

  test('non-editable table returns empty array', () => {
    const codeOnly = resolveTestbedContainers(testbed.context.schema, [
      codeBlockContainer,
    ])
    expect(
      getChildrenAt(
        {
          ...testbed.snapshot,
          context: {...testbed.snapshot.context, containers: codeOnly},
        },
        [{_key: 'k26'}],
      ),
    ).toEqual([])
  })

  // The existing cases above run with a populated `blockIndexMap`, so they
  // exercise the O(1) fast path. These pin the linear-scan fallback.
  test('resolves correctly when blockIndexMap is empty (fallback)', () => {
    const snapshot = {
      ...testbed.snapshot,
      blockIndexMap: new Map<string, number>(),
    }
    expect(getChildrenAt(snapshot, [{_key: 'k11'}])).toEqual([
      {node: testbed.codeLine1, path: [{_key: 'k11'}, 'code', {_key: 'k8'}]},
      {node: testbed.codeLine2, path: [{_key: 'k11'}, 'code', {_key: 'k10'}]},
    ])
  })

  test('resolves correctly when blockIndexMap disagrees with the value (fallback)', () => {
    // Point the `k11` lookup at the wrong sibling; the `_key` check rejects it
    // and rescans, so the result is unchanged.
    const staleMap = new Map(testbed.snapshot.blockIndexMap)
    staleMap.set(serializePath([{_key: 'k11'}]), 0)
    const snapshot = {...testbed.snapshot, blockIndexMap: staleMap}
    expect(getChildrenAt(snapshot, [{_key: 'k11'}])).toEqual([
      {node: testbed.codeLine1, path: [{_key: 'k11'}, 'code', {_key: 'k8'}]},
      {node: testbed.codeLine2, path: [{_key: 'k11'}, 'code', {_key: 'k10'}]},
    ])
  })
})
