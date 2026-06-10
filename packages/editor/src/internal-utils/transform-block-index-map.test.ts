import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Operation} from '../engine/interfaces/operation'
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
  op: Operation
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

  test('set_selection is a no-op for the map', () => {
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
        type: 'set_selection',
        properties: null,
        newProperties: {
          anchor: {path: [0], offset: 0},
          focus: {path: [0], offset: 0},
        },
      },
    })
  })

  test('insert_text is a no-op for the map', () => {
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
        type: 'insert_text',
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
})
