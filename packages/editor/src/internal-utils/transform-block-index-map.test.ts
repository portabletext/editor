import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers-batch'
import {BlockIndexMap} from './block-index-map'
import {buildIndexMaps} from './build-index-maps'
import {transformBlockIndexMap} from './transform-block-index-map'

/**
 * Oracle equivalence: applying `op` to `beforeValue` to produce `afterValue`,
 * then calling `transformBlockIndexMap` on a map built from `beforeValue`,
 * must produce a map identical to one built fresh from `afterValue`.
 */
function assertEquivalent({
  schema,
  containers,
  beforeValue,
  afterValue,
  op,
}: {
  schema: ReturnType<typeof compileSchema>
  containers: ReturnType<typeof resolveContainers>
  beforeValue: ReadonlyArray<PortableTextBlock>
  afterValue: ReadonlyArray<PortableTextBlock>
  op: EngineOperation
}) {
  const incrementalMap = new BlockIndexMap()
  buildIndexMaps(
    {schema, value: beforeValue as PortableTextBlock[], containers},
    {blockIndexMap: incrementalMap, listIndexMap: new Map()},
  )
  transformBlockIndexMap(incrementalMap, op, beforeValue, afterValue, {
    schema,
    containers,
  })

  const oracleMap = new BlockIndexMap()
  buildIndexMaps(
    {schema, value: afterValue as PortableTextBlock[], containers},
    {blockIndexMap: oracleMap, listIndexMap: new Map()},
  )

  expect(Object.fromEntries([...incrementalMap].sort())).toEqual(
    Object.fromEntries([...oracleMap].sort()),
  )
}

const tableSchema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
)
const tableContainers = resolveContainers(tableSchema, [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    of: [
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        of: [defineContainer({type: 'cell', arrayField: 'content'})],
      }),
    ],
  }),
])

describe('transformBlockIndexMap', () => {
  test('insert root block at end', () => {
    const before: ReadonlyArray<PortableTextBlock> = []
    const after = [
      {_key: 'b0', _type: 'block', children: []} as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'insert',
        path: [0],
        node: after[0] as never,
        position: 'before',
      },
    })
  })

  test('insert root block in middle (shifts siblings)', () => {
    const b0 = {_key: 'b0', _type: 'block', children: []} as PortableTextBlock
    const b1 = {_key: 'b1', _type: 'block', children: []} as PortableTextBlock
    const newBlock = {
      _key: 'b2',
      _type: 'block',
      children: [],
    } as PortableTextBlock
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: [b0, b1],
      afterValue: [b0, newBlock, b1],
      op: {
        type: 'insert',
        path: [1],
        node: newBlock as never,
        position: 'before',
      },
    })
  })

  test('insert with unkeyed node is a no-op for the map', () => {
    const before: ReadonlyArray<PortableTextBlock> = []
    const after = [{_type: 'table'} as unknown as PortableTextBlock]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'insert',
        path: [0],
        node: after[0] as never,
        position: 'before',
      },
    })
  })

  test('remove root block shifts siblings down', () => {
    const b0 = {_key: 'b0', _type: 'block', children: []} as PortableTextBlock
    const b1 = {_key: 'b1', _type: 'block', children: []} as PortableTextBlock
    const b2 = {_key: 'b2', _type: 'block', children: []} as PortableTextBlock
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: [b0, b1, b2],
      afterValue: [b0, b2],
      op: {
        type: 'unset',
        path: [1],
      },
    })
  })

  test('insert keyed table with empty subtree', () => {
    const before: ReadonlyArray<PortableTextBlock> = []
    const after = [{_key: 't0', _type: 'table'} as PortableTextBlock]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'insert',
        path: [0],
        node: after[0] as never,
        position: 'before',
      },
    })
  })

  test('set rows on freshly-inserted table walks the new subtree', () => {
    const before = [{_key: 't0', _type: 'table'} as PortableTextBlock]
    const rows = [{_key: 'r0', _type: 'row', cells: []}]
    const after = [
      {_key: 't0', _type: 'table', rows} as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [{_key: 't0'}, 'rows'],
        value: rows,
      },
    })
  })

  test('set rows replacement prunes old descendants', () => {
    const before = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {_key: 'r0', _type: 'row', cells: [{_key: 'c0', _type: 'cell'}]},
        ],
      } as unknown as PortableTextBlock,
    ]
    const newRows = [{_key: 'r1', _type: 'row', cells: []}]
    const after = [
      {
        _key: 't0',
        _type: 'table',
        rows: newRows,
      } as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [{_key: 't0'}, 'rows'],
        value: newRows,
      },
    })
  })

  test('rename _key on a root block', () => {
    const before = [
      {_key: 'old', _type: 'block', children: []} as PortableTextBlock,
    ]
    const after = [
      {_key: 'new', _type: 'block', children: []} as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [{_key: 'old'}, '_key'],
        value: 'new',
        inverse: {type: 'set', path: [{_key: 'old'}, '_key'], value: 'old'},
      },
    })
  })

  test('mint _key on previously-unkeyed root node', () => {
    const before = [{_type: 'table'} as unknown as PortableTextBlock]
    const after = [{_type: 'table', _key: 'k0'} as unknown as PortableTextBlock]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [0, '_key'],
        value: 'k0',
        inverse: {type: 'unset', path: [0, '_key']},
      },
    })
  })

  test('text content set on span is a no-op for the map', () => {
    const before = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'hello'}],
      } as PortableTextBlock,
    ]
    const after = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'world'}],
      } as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: 'world',
      },
    })
  })

  test('set.selection is a no-op for the map', () => {
    const before = [
      {_key: 'b0', _type: 'block', children: []} as PortableTextBlock,
    ]
    const after = before
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set.selection',
        properties: null,
        newProperties: {
          anchor: {path: [0], offset: 0},
          focus: {path: [0], offset: 0},
        },
      },
    })
  })

  test('insert.text is a no-op for the map', () => {
    const before = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'hello'}],
      } as PortableTextBlock,
    ]
    const after = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'helloX'}],
      } as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'insert.text',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        offset: 5,
        text: 'X',
      },
    })
  })

  test('root-level set replaces entire value', () => {
    const before = [
      {_key: 'b0', _type: 'block', children: []} as PortableTextBlock,
    ]
    const after = [
      {_key: 'b1', _type: 'block', children: []},
      {_key: 'b2', _type: 'block', children: []},
    ] as ReadonlyArray<PortableTextBlock>
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [],
        value: after,
      },
    })
  })

  test('insert root block with keyed anchor and position "after"', () => {
    const b0 = {_key: 'b0', _type: 'block', children: []} as PortableTextBlock
    const b1 = {_key: 'b1', _type: 'block', children: []} as PortableTextBlock
    const b2 = {_key: 'b2', _type: 'block', children: []} as PortableTextBlock
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: [b0, b1],
      afterValue: [b0, b2, b1],
      op: {
        type: 'insert',
        path: [{_key: 'b0'}],
        node: b2 as never,
        position: 'after',
      },
    })
  })

  test('insert nested cell with keyed anchor shifts only following cells', () => {
    const cellContent = [
      {
        _key: 'cb0',
        _type: 'block',
        children: [{_key: 'cs0', _type: 'span', text: 'x'}],
      },
    ]
    const c0 = {_key: 'c0', _type: 'cell', content: []}
    const c1 = {_key: 'c1', _type: 'cell', content: cellContent}
    const c2 = {
      _key: 'c2',
      _type: 'cell',
      content: [
        {
          _key: 'cb1',
          _type: 'block',
          children: [{_key: 'cs1', _type: 'span', text: 'y'}],
        },
      ],
    }
    const makeValue = (cells: Array<unknown>) => [
      {
        _key: 't0',
        _type: 'table',
        rows: [{_key: 'r0', _type: 'row', cells}],
      } as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([c0, c1]),
      afterValue: makeValue([c0, c2, c1]),
      op: {
        type: 'insert',
        path: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
        node: c2 as never,
        position: 'after',
      },
    })
  })

  test('remove nested cell by keyed path shifts remaining cells', () => {
    const c0 = {_key: 'c0', _type: 'cell', content: []}
    const c1 = {
      _key: 'c1',
      _type: 'cell',
      content: [
        {
          _key: 'cb0',
          _type: 'block',
          children: [{_key: 'cs0', _type: 'span', text: 'x'}],
        },
      ],
    }
    const makeValue = (cells: Array<unknown>) => [
      {
        _key: 't0',
        _type: 'table',
        rows: [{_key: 'r0', _type: 'row', cells}],
      } as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([c0, c1]),
      afterValue: makeValue([c1]),
      op: {
        type: 'unset',
        path: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
      },
    })
  })

  test('remove nested row by numeric path', () => {
    const r0 = {_key: 'r0', _type: 'row', cells: [{_key: 'c0', _type: 'cell'}]}
    const r1 = {_key: 'r1', _type: 'row', cells: [{_key: 'c1', _type: 'cell'}]}
    const makeValue = (rows: Array<unknown>) => [
      {_key: 't0', _type: 'table', rows} as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([r0, r1]),
      afterValue: makeValue([r1]),
      op: {
        type: 'unset',
        path: [{_key: 't0'}, 'rows', 0],
      },
    })
  })

  test('full-node set with a different _key drops the stale entry', () => {
    const before = [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'x'}],
      } as PortableTextBlock,
    ]
    const replacement = {
      _key: 'b9',
      _type: 'block',
      children: [{_key: 's9', _type: 'span', text: 'y'}],
    }
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: [replacement as PortableTextBlock],
      op: {
        type: 'set',
        path: [{_key: 'b0'}],
        value: replacement,
      },
    })
  })

  test('nested full-node set with a different _key', () => {
    const makeValue = (cells: Array<unknown>) => [
      {
        _key: 't0',
        _type: 'table',
        rows: [{_key: 'r0', _type: 'row', cells}],
      } as unknown as PortableTextBlock,
    ]
    const c0 = {_key: 'c0', _type: 'cell', content: []}
    const replacement = {
      _key: 'c9',
      _type: 'cell',
      content: [
        {
          _key: 'cb0',
          _type: 'block',
          children: [{_key: 'cs0', _type: 'span', text: 'x'}],
        },
      ],
    }
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([c0]),
      afterValue: makeValue([replacement]),
      op: {
        type: 'set',
        path: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells', {_key: 'c0'}],
        value: replacement,
      },
    })
  })

  test('rename _key on a nested cell', () => {
    const makeValue = (cellKey: string) => [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {
            _key: 'r0',
            _type: 'row',
            cells: [{_key: cellKey, _type: 'cell', content: []}],
          },
        ],
      } as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue('c0'),
      afterValue: makeValue('c9'),
      op: {
        type: 'set',
        path: [
          {_key: 't0'},
          'rows',
          {_key: 'r0'},
          'cells',
          {_key: 'c0'},
          '_key',
        ],
        value: 'c9',
      },
    })
  })

  test('unset of a container property prunes its descendants', () => {
    const before = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {_key: 'r0', _type: 'row', cells: [{_key: 'c0', _type: 'cell'}]},
        ],
      } as unknown as PortableTextBlock,
    ]
    const after = [{_key: 't0', _type: 'table'} as PortableTextBlock]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'unset',
        path: [{_key: 't0'}, 'rows'],
      },
    })
  })

  test('set of a container property to a primitive prunes its descendants', () => {
    const before = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {_key: 'r0', _type: 'row', cells: [{_key: 'c0', _type: 'cell'}]},
        ],
      } as unknown as PortableTextBlock,
    ]
    const after = [
      {_key: 't0', _type: 'table', rows: 5} as unknown as PortableTextBlock,
    ]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: before,
      afterValue: after,
      op: {
        type: 'set',
        path: [{_key: 't0'}, 'rows'],
        value: 5,
      },
    })
  })

  test('set of the whole markDefs array leaves span indices intact', () => {
    const makeValue = (markDefs: Array<unknown>) => [
      {
        _key: 'b0',
        _type: 'block',
        children: [
          {_key: 's0', _type: 'span', text: 'x'},
          {_key: 's1', _type: 'span', text: 'y'},
        ],
        markDefs,
      } as unknown as PortableTextBlock,
    ]
    const newMarkDefs = [{_key: 'm0', _type: 'link', href: '#'}]
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([]),
      afterValue: makeValue(newMarkDefs),
      op: {
        type: 'set',
        path: [{_key: 'b0'}, 'markDefs'],
        value: newMarkDefs,
      },
    })
  })

  test('unset of a markDef node does not shift span siblings', () => {
    const makeValue = (markDefs: Array<unknown>) => [
      {
        _key: 'b0',
        _type: 'block',
        children: [
          {_key: 's0', _type: 'span', text: 'x'},
          {_key: 's1', _type: 'span', text: 'y'},
        ],
        markDefs,
      } as unknown as PortableTextBlock,
    ]
    const m0 = {_key: 'm0', _type: 'link', href: '#'}
    const m1 = {_key: 'm1', _type: 'link', href: '#'}
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([m0, m1]),
      afterValue: makeValue([m1]),
      op: {
        type: 'unset',
        path: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}],
      },
    })
  })

  test('insert of a markDef node neither shifts spans nor gains an entry', () => {
    const makeValue = (markDefs: Array<unknown>) => [
      {
        _key: 'b0',
        _type: 'block',
        children: [
          {_key: 's0', _type: 'span', text: 'x'},
          {_key: 's1', _type: 'span', text: 'y'},
        ],
        markDefs,
      } as unknown as PortableTextBlock,
    ]
    const m0 = {_key: 'm0', _type: 'link', href: '#'}
    const m1 = {_key: 'm1', _type: 'link', href: '#'}
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([m0]),
      afterValue: makeValue([m0, m1]),
      op: {
        type: 'insert',
        path: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}],
        node: m1 as never,
        position: 'after',
      },
    })
  })

  test('full-node set of a markDef does not gain an entry', () => {
    const makeValue = (markDefs: Array<unknown>) => [
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'x'}],
        markDefs,
      } as unknown as PortableTextBlock,
    ]
    const m0 = {_key: 'm0', _type: 'link', href: '#a'}
    const replacement = {_key: 'm9', _type: 'link', href: '#b'}
    assertEquivalent({
      schema: tableSchema,
      containers: tableContainers,
      beforeValue: makeValue([m0]),
      afterValue: makeValue([replacement]),
      op: {
        type: 'set',
        path: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}],
        value: replacement,
      },
    })
  })
})
