import {isSpan, isTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {getNodes} from './get-nodes'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getNodes.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('all nodes from root', () => {
    const nodes = [...getNodes(testbed.context)]
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

  test('paths are correct', () => {
    const nodes = [...getNodes(testbed.context)]
    const paths = nodes.map((entry) => entry.path)

    expect(paths).toEqual([
      [0],
      [0, 0],
      [0, 1],
      [0, 2],
      [1],
      [2],
      [2, 0],
      [3],
      [3, 0],
      [3, 0, 0],
      [3, 1],
      [3, 1, 0],
      [4],
      [4, 0],
      [4, 0, 0],
      [4, 0, 0, 0],
      [4, 0, 0, 0, 0],
      [4, 0, 0, 0, 1],
      [4, 0, 0, 1],
      [4, 0, 0, 1, 0],
      [4, 0, 1],
      [4, 0, 1, 0],
      [4, 0, 1, 0, 0],
      [4, 1],
      [4, 1, 0],
      [4, 1, 0, 0],
      [4, 1, 0, 0, 0],
    ])
  })

  test('from a subtree', () => {
    const nodes = [...getNodes(testbed.context, {at: [3]})]
    const nodeValues = nodes.map((entry) => entry.node)

    expect(nodeValues).toEqual([
      testbed.codeLine1,
      testbed.codeSpan1,
      testbed.codeLine2,
      testbed.codeSpan2,
    ])
  })

  test('from a leaf returns empty', () => {
    const nodes = [...getNodes(testbed.context, {at: [0, 0]})]

    expect(nodes).toEqual([])
  })

  test('reverse order', () => {
    const nodes = [...getNodes(testbed.context, {at: [3], reverse: true})]
    const nodeValues = nodes.map((entry) => entry.node)

    expect(nodeValues).toEqual([
      testbed.codeLine2,
      testbed.codeSpan2,
      testbed.codeLine1,
      testbed.codeSpan1,
    ])
  })

  test('skips non-editable container internals', () => {
    const tableOnly = new Set(['table', 'table.row', 'table.row.cell'])
    const nodes = [...getNodes({...testbed.context, editableTypes: tableOnly})]
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
          at: [4],
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
        ...getNodes(testbed.context, {
          at: [0],
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
        ...getNodes(testbed.context, {
          from: [0, 0],
          to: [1],
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
        ...getNodes(testbed.context, {
          from: [0, 1],
          to: [0, 2],
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
        ...getNodes(testbed.context, {
          from: [2],
          to: [3, 0],
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
        ...getNodes(testbed.context, {
          from: [4, 0, 0, 0],
          to: [4, 0, 0, 1],
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
        ...getNodes(testbed.context, {
          from: [4, 0, 0, 1, 0],
          to: [4, 0, 1, 0, 0],
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
        ...getNodes(testbed.context, {
          from: [4, 0, 1, 0],
          to: [4, 1, 0, 0, 0],
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
        ...getNodes(testbed.context, {
          from: [0],
          to: [0, 1],
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
        ...getNodes(testbed.context, {
          from: [4, 1],
          to: [4, 1, 0, 0, 0],
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
        ...getNodes(testbed.context, {
          from: [1],
          to: [1],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.image])
    })

    test('from equals to (single leaf node)', () => {
      const nodes = [
        ...getNodes(testbed.context, {
          from: [0, 0],
          to: [0, 0],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.textBlock1, testbed.span1])
    })

    test('from only (no to)', () => {
      const nodes = [
        ...getNodes(testbed.context, {
          from: [4, 1],
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
        ...getNodes(testbed.context, {
          to: [1],
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
        ...getNodes(testbed.context, {
          from: [0],
          to: [3],
          match: (node) => isSpan({schema: testbed.schema}, node),
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.span1, testbed.span2, testbed.span3])
    })

    test('range with text block filter', () => {
      const nodes = [
        ...getNodes(testbed.context, {
          from: [3],
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
        ...getNodes(testbed.context, {
          from: [4],
          to: [4, 1, 0, 0, 0],
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
        ...getNodes(testbed.context, {
          from: [0, 0],
          to: [1],
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
        ...getNodes(testbed.context, {
          from: [0, 1],
          to: [0, 2],
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
        ...getNodes(testbed.context, {
          from: [2],
          to: [3, 0],
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
        ...getNodes(testbed.context, {
          from: [1],
          to: [1],
          reverse: true,
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.image])
    })

    test('reverse with match', () => {
      const nodes = [
        ...getNodes(testbed.context, {
          from: [0, 0],
          to: [3, 1, 0],
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
        ...getNodes(testbed.context, {
          from: [4, 0, 0, 0],
          to: [4, 0, 0, 1],
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
})
