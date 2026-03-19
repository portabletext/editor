import {describe, expect, test} from 'vitest'
import {getNodes} from './get-nodes'
import {createTestbed} from './testbed'

describe(getNodes.name, () => {
  const testbed = createTestbed()

  test('all nodes from root', () => {
    const nodes = [...getNodes(testbed.root, [], testbed.schema)]
    const nodeValues = nodes.map(([node]) => node)

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
    const nodes = [...getNodes(testbed.root, [], testbed.schema)]
    const paths = nodes.map(([, path]) => path)

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
    const nodes = [...getNodes(testbed.root, [3], testbed.schema)]
    const nodeValues = nodes.map(([node]) => node)

    expect(nodeValues).toEqual([
      testbed.codeLine1,
      testbed.codeSpan1,
      testbed.codeLine2,
      testbed.codeSpan2,
    ])
  })

  test('from a leaf returns empty', () => {
    const nodes = [...getNodes(testbed.root, [0, 0], testbed.schema)]

    expect(nodes).toEqual([])
  })

  test('reverse order', () => {
    const nodes = [
      ...getNodes(testbed.root, [3], testbed.schema, {reverse: true}),
    ]
    const nodeValues = nodes.map(([node]) => node)

    expect(nodeValues).toEqual([
      testbed.codeLine2,
      testbed.codeSpan2,
      testbed.codeLine1,
      testbed.codeSpan1,
    ])
  })
})
