import {
  compileSchema,
  defineSchema,
  isSpan,
  isTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {getNodeDescendants, getNodes} from './get-nodes'
import {getSibling} from './get-sibling'
import {
  createNodeTraversalTestbed,
  resolveTestbedContainers,
  tableContainers,
} from './node-traversal-testbed'

describe(getNodes.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('all nodes from root', () => {
    const nodes = [...getNodes(testbed.snapshot)]
    const nodeValues = nodes.map((entry) => entry.node)

    expect(nodeValues).toEqual([
      testbed.textBlock1,
      testbed.span1,
      testbed.stockTicker1,
      testbed.span2,
      testbed.image,
      testbed.textBlock2,
      testbed.span3,
      testbed.codeBlock,
      testbed.codeLine1,
      testbed.codeSpan1,
      testbed.codeLine2,
      testbed.codeSpan2,
      testbed.table,
      testbed.row1,
      testbed.cell1,
      testbed.cellBlock1,
      testbed.cellSpan1,
      testbed.stockTicker2,
      testbed.cellBlock2,
      testbed.cellSpan2,
      testbed.cell2,
      testbed.cellBlock3,
      testbed.cellSpan3,
      testbed.row2,
      testbed.cell3,
      testbed.emptyBlock,
      testbed.emptySpan,
    ])
  })

  test('non-object entries are skipped at every depth', () => {
    const nonObjectValues = [null, false, 0, '', 'oops', 5, true]
    const nestedBlock = {
      ...testbed.textBlock1,
      children: [...testbed.textBlock1.children, ...nonObjectValues],
    }
    const rootSnapshot = {
      context: {
        ...testbed.snapshot.context,
        value: nonObjectValues as never,
      },
      blockIndexMap: new Map<string, number>(),
    }

    expect([...getNodes(rootSnapshot)]).toEqual([])
    expect([
      ...getNodes({
        context: {...testbed.snapshot.context, value: [nestedBlock]},
        blockIndexMap: new Map<string, number>(),
      }),
    ]).toEqual([
      {node: nestedBlock, path: [{_key: 'k3'}]},
      {
        node: testbed.span1,
        path: [{_key: 'k3'}, 'children', {_key: 'k0'}],
      },
      {
        node: testbed.stockTicker1,
        path: [{_key: 'k3'}, 'children', {_key: 'k1'}],
      },
      {
        node: testbed.span2,
        path: [{_key: 'k3'}, 'children', {_key: 'k2'}],
      },
    ])
  })

  test('numeric boundaries use raw positions around non-objects and keyless nodes', () => {
    const first = {...testbed.textBlock1, _key: undefined}
    const second = {...testbed.textBlock2, _key: undefined}
    const third = {...testbed.cellBlock1, _key: undefined}
    const siblingSnapshot = {
      context: {
        ...testbed.snapshot.context,
        value: [first, null, second] as never,
      },
      blockIndexMap: new Map<string, number>(),
    }
    const snapshot = {
      context: {
        ...testbed.snapshot.context,
        value: [first, 'oops', second, third] as never,
      },
      blockIndexMap: new Map<string, number>(),
    }
    const keyedSnapshot = {
      context: {
        ...testbed.snapshot.context,
        value: [
          testbed.textBlock1,
          null,
          testbed.image,
          testbed.textBlock2,
        ] as never,
      },
      blockIndexMap: new Map<string, number>(),
    }

    expect(getSibling(siblingSnapshot, [0], {direction: 'next'})).toEqual({
      node: second,
      path: [2],
    })
    expect(getSibling(siblingSnapshot, [2], {direction: 'previous'})).toEqual({
      node: first,
      path: [0],
    })

    expect([...getNodes(snapshot, {from: [2], to: [2]})]).toEqual([
      {node: second, path: [2]},
    ])
    expect(getSibling(keyedSnapshot, [2], {direction: 'previous'})).toEqual({
      node: testbed.textBlock1,
      path: [{_key: testbed.textBlock1._key}],
    })
    expect(getSibling(keyedSnapshot, [2], {direction: 'next'})).toEqual({
      node: testbed.textBlock2,
      path: [{_key: testbed.textBlock2._key}],
    })
    expect([...getNodes(keyedSnapshot, {from: [2], to: [2]})]).toEqual([
      {node: testbed.image, path: [{_key: testbed.image._key}]},
    ])
    expect([...getNodes(snapshot, {from: [0], to: [2]})]).toEqual([
      {node: first, path: [0]},
      {node: second, path: [2]},
    ])
  })

  test('numeric boundaries map keyed nodes after non-objects in nested arrays', () => {
    const codeBlock = {
      ...testbed.codeBlock,
      code: [
        testbed.codeLine1,
        null,
        testbed.codeLine2,
        {...testbed.codeLine1, _key: 'after-code-line'},
      ],
    }
    const cell1 = {
      ...testbed.cell1,
      content: [
        testbed.cellBlock1,
        null,
        testbed.cellBlock2,
        testbed.cellBlock3,
      ],
    }
    const row1 = {...testbed.row1, cells: [cell1, testbed.cell2]}
    const table = {...testbed.table, rows: [row1, testbed.row2]}
    const snapshot = {
      context: {
        ...testbed.snapshot.context,
        value: [
          testbed.textBlock1,
          testbed.image,
          testbed.textBlock2,
          codeBlock,
          table,
        ] as never,
      },
      blockIndexMap: new Map<string, number>(),
    }
    const containerPath = [{_key: testbed.codeBlock._key}, 'code', 2] as const
    const cellPath = [
      {_key: testbed.table._key},
      'rows',
      {_key: testbed.row1._key},
      'cells',
      {_key: testbed.cell1._key},
      'content',
      2,
    ] as const

    expect({
      containerPrevious: getSibling(snapshot, [...containerPath], {
        direction: 'previous',
      }),
      containerRange: [
        ...getNodes(snapshot, {
          at: [{_key: testbed.codeBlock._key}],
          from: [...containerPath],
          to: [...containerPath],
        }),
      ],
      containerNext: getSibling(snapshot, [...containerPath], {
        direction: 'next',
      }),
      cellPrevious: getSibling(snapshot, [...cellPath], {
        direction: 'previous',
      }),
      cellNext: getSibling(snapshot, [...cellPath], {direction: 'next'}),
      cellRange: [
        ...getNodes(snapshot, {
          at: [
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
          ],
          from: [...cellPath],
          to: [...cellPath],
        }),
      ],
    }).toEqual({
      containerPrevious: {
        node: testbed.codeLine1,
        path: [
          {_key: testbed.codeBlock._key},
          'code',
          {_key: testbed.codeLine1._key},
        ],
      },
      containerRange: [
        {
          node: testbed.codeLine2,
          path: [
            {_key: testbed.codeBlock._key},
            'code',
            {_key: testbed.codeLine2._key},
          ],
        },
      ],
      containerNext: {
        node: {...testbed.codeLine1, _key: 'after-code-line'},
        path: [
          {_key: testbed.codeBlock._key},
          'code',
          {_key: 'after-code-line'},
        ],
      },
      cellPrevious: {
        node: testbed.cellBlock1,
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock1._key},
        ],
      },
      cellNext: {
        node: testbed.cellBlock3,
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock3._key},
        ],
      },
      cellRange: [
        {
          node: testbed.cellBlock2,
          path: [
            {_key: testbed.table._key},
            'rows',
            {_key: testbed.row1._key},
            'cells',
            {_key: testbed.cell1._key},
            'content',
            {_key: testbed.cellBlock2._key},
          ],
        },
      ],
    })
  })

  test('paths are correct', () => {
    const nodes = [...getNodes(testbed.snapshot)]
    const paths = nodes.map((entry) => entry.path)

    expect(paths).toEqual([
      [{_key: 'k3'}],
      [{_key: 'k3'}, 'children', {_key: 'k0'}],
      [{_key: 'k3'}, 'children', {_key: 'k1'}],
      [{_key: 'k3'}, 'children', {_key: 'k2'}],
      [{_key: 'k4'}],
      [{_key: 'k6'}],
      [{_key: 'k6'}, 'children', {_key: 'k5'}],
      [{_key: 'k11'}],
      [{_key: 'k11'}, 'code', {_key: 'k8'}],
      [{_key: 'k11'}, 'code', {_key: 'k8'}, 'children', {_key: 'k7'}],
      [{_key: 'k11'}, 'code', {_key: 'k10'}],
      [{_key: 'k11'}, 'code', {_key: 'k10'}, 'children', {_key: 'k9'}],
      [{_key: 'k26'}],
      [{_key: 'k26'}, 'rows', {_key: 'k21'}],
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ],
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
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k16'},
      ],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k16'},
        'children',
        {_key: 'k15'},
      ],
      [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k20'}],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k20'},
        'content',
        {_key: 'k19'},
      ],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k20'},
        'content',
        {_key: 'k19'},
        'children',
        {_key: 'k18'},
      ],
      [{_key: 'k26'}, 'rows', {_key: 'k25'}],
      [{_key: 'k26'}, 'rows', {_key: 'k25'}, 'cells', {_key: 'k24'}],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k25'},
        'cells',
        {_key: 'k24'},
        'content',
        {_key: 'k23'},
      ],
      [
        {_key: 'k26'},
        'rows',
        {_key: 'k25'},
        'cells',
        {_key: 'k24'},
        'content',
        {_key: 'k23'},
        'children',
        {_key: 'k22'},
      ],
    ])
  })

  test('from a subtree', () => {
    const nodes = [...getNodes(testbed.snapshot, {at: [{_key: 'k11'}]})]
    const nodeValues = nodes.map((entry) => entry.node)

    expect(nodeValues).toEqual([
      testbed.codeLine1,
      testbed.codeSpan1,
      testbed.codeLine2,
      testbed.codeSpan2,
    ])
  })

  test('from a leaf returns empty', () => {
    const nodes = [
      ...getNodes(testbed.snapshot, {
        at: [{_key: 'k3'}, 'children', {_key: 'k0'}],
      }),
    ]

    expect(nodes).toEqual([])
  })

  test('reverse order', () => {
    const nodes = [
      ...getNodes(testbed.snapshot, {at: [{_key: 'k11'}], reverse: true}),
    ]
    const nodeValues = nodes.map((entry) => entry.node)

    expect(nodeValues).toEqual([
      testbed.codeLine2,
      testbed.codeSpan2,
      testbed.codeLine1,
      testbed.codeSpan1,
    ])
  })

  test('skips non-editable container internals', () => {
    const tableOnly = resolveTestbedContainers(
      testbed.context.schema,
      tableContainers,
    )
    const nodes = [
      ...getNodes({
        ...testbed.snapshot,
        context: {...testbed.snapshot.context, containers: tableOnly},
      }),
    ]
    const nodeValues = nodes.map((entry) => entry.node)

    // code-block itself appears (it's a root child) but its children don't
    expect(nodeValues).toContain(testbed.codeBlock)
    expect(nodeValues).not.toContain(testbed.codeLine1)
    expect(nodeValues).not.toContain(testbed.codeSpan1)

    // table internals still traversed
    expect(nodeValues).toContain(testbed.table)
    expect(nodeValues).toContain(testbed.row1)
    expect(nodeValues).toContain(testbed.cell1)
    expect(nodeValues).toContain(testbed.cellBlock1)
  })

  describe('match predicate', () => {
    test('filters by isSpan', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.span1,
        testbed.span2,
        testbed.span3,
        testbed.codeSpan1,
        testbed.codeSpan2,
        testbed.cellSpan1,
        testbed.cellSpan2,
        testbed.cellSpan3,
        testbed.emptySpan,
      ])
    })

    test('filters by isTextBlock', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          match: (node) => isTextBlock({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.textBlock2,
        testbed.codeLine1,
        testbed.codeLine2,
        testbed.cellBlock1,
        testbed.cellBlock2,
        testbed.cellBlock3,
        testbed.emptyBlock,
      ])
    })

    test('filters with custom predicate on subtree', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          at: [{_key: 'k26'}],
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.cellSpan1,
        testbed.cellSpan2,
        testbed.cellSpan3,
        testbed.emptySpan,
      ])
    })

    test('match with reverse', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          at: [{_key: 'k3'}],
          match: (node) => isSpan({schema: testbed.schema}, node),
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.span2, testbed.span1])
    })
  })

  describe('from/to range', () => {
    test('range within flat blocks', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k0'}],
          to: [{_key: 'k4'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.span1,
        testbed.stockTicker1,
        testbed.span2,
        testbed.image,
      ])
    })

    test('range within a single block', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k1'}],
          to: [{_key: 'k3'}, 'children', {_key: 'k2'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.stockTicker1,
        testbed.span2,
      ])
    })

    test('range spanning into container', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k6'}],
          to: [{_key: 'k11'}, 'code', {_key: 'k8'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock2,
        testbed.span3,
        testbed.codeBlock,
        testbed.codeLine1,
      ])
    })

    test('range within container', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k17'},
            'content',
            {_key: 'k14'},
          ],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k17'},
            'content',
            {_key: 'k16'},
          ],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row1,
        testbed.cell1,
        testbed.cellBlock1,
        testbed.cellSpan1,
        testbed.stockTicker2,
        testbed.cellBlock2,
      ])
    })

    test('range spanning across cells', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k17'},
            'content',
            {_key: 'k16'},
            'children',
            {_key: 'k15'},
          ],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k20'},
            'content',
            {_key: 'k19'},
            'children',
            {_key: 'k18'},
          ],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row1,
        testbed.cell1,
        testbed.cellBlock2,
        testbed.cellSpan2,
        testbed.cell2,
        testbed.cellBlock3,
        testbed.cellSpan3,
      ])
    })

    test('range spanning across rows', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k20'},
            'content',
            {_key: 'k19'},
          ],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k25'},
            'cells',
            {_key: 'k24'},
            'content',
            {_key: 'k23'},
            'children',
            {_key: 'k22'},
          ],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row1,
        testbed.cell2,
        testbed.cellBlock3,
        testbed.cellSpan3,
        testbed.row2,
        testbed.cell3,
        testbed.emptyBlock,
        testbed.emptySpan,
      ])
    })

    test('from at document start', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}],
          to: [{_key: 'k3'}, 'children', {_key: 'k1'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.span1,
        testbed.stockTicker1,
      ])
    })

    test('to at document end', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k26'}, 'rows', {_key: 'k25'}],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k25'},
            'cells',
            {_key: 'k24'},
            'content',
            {_key: 'k23'},
            'children',
            {_key: 'k22'},
          ],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row2,
        testbed.cell3,
        testbed.emptyBlock,
        testbed.emptySpan,
      ])
    })

    test('from equals to (single node)', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k4'}],
          to: [{_key: 'k4'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.image])
    })

    test('from equals to (single leaf node)', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k0'}],
          to: [{_key: 'k3'}, 'children', {_key: 'k0'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.textBlock1, testbed.span1])
    })

    test('from only (no to)', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k26'}, 'rows', {_key: 'k25'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row2,
        testbed.cell3,
        testbed.emptyBlock,
        testbed.emptySpan,
      ])
    })

    test('to only (no from)', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          to: [{_key: 'k4'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.span1,
        testbed.stockTicker1,
        testbed.span2,
        testbed.image,
      ])
    })
  })

  describe('from/to with match', () => {
    test('range with span filter', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}],
          to: [{_key: 'k11'}],
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.span1, testbed.span2, testbed.span3])
    })

    test('range with text block filter', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k11'}],
          match: (node) => isTextBlock({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.codeLine1,
        testbed.codeLine2,
        testbed.cellBlock1,
        testbed.cellBlock2,
        testbed.cellBlock3,
        testbed.emptyBlock,
      ])
    })

    test('range within container with match', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k26'}],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k25'},
            'cells',
            {_key: 'k24'},
            'content',
            {_key: 'k23'},
            'children',
            {_key: 'k22'},
          ],
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.cellSpan1,
        testbed.cellSpan2,
        testbed.cellSpan3,
        testbed.emptySpan,
      ])
    })
  })

  describe('reverse with from/to', () => {
    test('reverse range within flat blocks', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k0'}],
          to: [{_key: 'k4'}],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.image,
        testbed.textBlock1,
        testbed.span2,
        testbed.stockTicker1,
        testbed.span1,
      ])
    })

    test('reverse range within a single block', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k1'}],
          to: [{_key: 'k3'}, 'children', {_key: 'k2'}],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.textBlock1,
        testbed.span2,
        testbed.stockTicker1,
      ])
    })

    test('reverse range spanning container', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k6'}],
          to: [{_key: 'k11'}, 'code', {_key: 'k8'}],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.codeBlock,
        testbed.codeLine1,
        testbed.textBlock2,
        testbed.span3,
      ])
    })

    test('reverse from equals to (single node)', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k4'}],
          to: [{_key: 'k4'}],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.image])
    })

    test('reverse with match', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [{_key: 'k3'}, 'children', {_key: 'k0'}],
          to: [{_key: 'k11'}, 'code', {_key: 'k10'}, 'children', {_key: 'k9'}],
          reverse: true,
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.codeSpan2,
        testbed.codeSpan1,
        testbed.span3,
        testbed.span2,
        testbed.span1,
      ])
    })

    test('reverse range within container', () => {
      const nodes = [
        ...getNodes(testbed.snapshot, {
          from: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k17'},
            'content',
            {_key: 'k14'},
          ],
          to: [
            {_key: 'k26'},
            'rows',
            {_key: 'k21'},
            'cells',
            {_key: 'k17'},
            'content',
            {_key: 'k16'},
          ],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([
        testbed.table,
        testbed.row1,
        testbed.cell1,
        testbed.cellBlock2,
        testbed.cellBlock1,
        testbed.stockTicker2,
        testbed.cellSpan1,
      ])
    })
  })

  describe(getNodeDescendants.name, () => {
    test('container with value field includes field name in paths', () => {
      const accordionSpan = {_key: 's1', _type: 'span', text: 'details'}
      const accordionBlock = {
        _key: 'b1',
        _type: 'block',
        children: [accordionSpan],
      }
      const accordion = {
        _key: 'a1',
        _type: 'accordion',
        value: [accordionBlock],
      }

      const schema = compileSchema(
        defineSchema({
          blockObjects: [
            {
              name: 'accordion',
              fields: [
                {
                  name: 'value',
                  type: 'array',
                  of: [{type: 'block'}],
                },
              ],
            },
          ],
        }),
      )

      const descendants = [
        ...getNodeDescendants(
          {
            schema,
            containers: resolveContainers(schema, [
              defineContainer({
                type: 'accordion',
                arrayField: 'value',
              }),
            ]),
          },
          accordion,
        ),
      ]

      expect(descendants).toEqual([
        {
          node: accordionBlock,
          path: ['value', {_key: 'b1'}],
        },
        {
          node: accordionSpan,
          path: ['value', {_key: 'b1'}, 'children', {_key: 's1'}],
        },
      ])
    })
  })
})
