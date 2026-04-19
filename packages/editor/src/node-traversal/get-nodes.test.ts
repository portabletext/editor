import {
  compileSchema,
  defineSchema,
  isSpan,
  isTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {makeContainerConfig} from '../schema/make-container-config'
import {resolveContainers} from '../schema/resolve-containers'
import {getNodeDescendants, getNodes} from './get-nodes'
import {
  createNodeTraversalTestbed,
  resolveTestbedContainers,
  tableContainers,
} from './node-traversal-testbed'

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
    const nodes = [...getNodes(testbed.context, {at: [{_key: 'k11'}]})]
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
      ...getNodes(testbed.context, {
        at: [{_key: 'k3'}, 'children', {_key: 'k0'}],
      }),
    ]

    expect(nodes).toEqual([])
  })

  test('reverse order', () => {
    const nodes = [
      ...getNodes(testbed.context, {at: [{_key: 'k11'}], reverse: true}),
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
    const nodes = [...getNodes({...testbed.context, containers: tableOnly})]
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
          from: [{_key: 'k4'}],
          to: [{_key: 'k4'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.image])
    })

    test('from equals to (single leaf node)', () => {
      const nodes = [
        ...getNodes(testbed.context, {
          from: [{_key: 'k3'}, 'children', {_key: 'k0'}],
          to: [{_key: 'k3'}, 'children', {_key: 'k0'}],
        }),
      ]
      const nodeValues = nodes.map((entry) => entry.node)

      expect(nodeValues).toEqual([testbed.textBlock1, testbed.span1])
    })

    test('from only (no to)', () => {
      const nodes = [
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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
        ...getNodes(testbed.context, {
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

  describe('getNodeDescendants', () => {
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
            containers: resolveContainers(
              schema,
              new Map([
                [
                  '$..accordion',
                  makeContainerConfig(schema, {
                    scope: '$..accordion',
                    field: 'value',
                  }),
                ],
              ]),
            ),
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
