import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {fitBlocksToDestination} from './fit-blocks-to-destination'

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
      {
        name: 'image',
        fields: [{name: 'src', type: 'string'}],
      },
    ],
  }),
)

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
        }),
      ],
    }),
  ],
})

function createSnapshot(args: {
  value: Array<PortableTextBlock>
  selectionPath: Parameters<typeof createTestSnapshot>[0]['context'] extends
    | {selection?: infer S}
    | undefined
    ? NonNullable<S> extends {anchor: {path: infer P}}
      ? P
      : never
    : never
  containerDefs?: ReadonlyArray<Container>
}) {
  const containers = resolveContainers(
    tableSchema,
    args.containerDefs ?? [tableContainer],
  )
  return createTestSnapshot({
    context: {
      schema: tableSchema,
      value: args.value,
      selection: {
        anchor: {path: args.selectionPath, offset: 0},
        focus: {path: args.selectionPath, offset: 0},
      },
      containers,
    },
  })
}

const textBlock1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [{_type: 'span', _key: 'b1c1', text: 'one', marks: []}],
  markDefs: [],
  style: 'normal',
}
const textBlock2: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b2',
  children: [{_type: 'span', _key: 'b2c1', text: 'two', marks: []}],
  markDefs: [],
  style: 'normal',
}
const image: PortableTextBlock = {
  _type: 'image',
  _key: 'img1',
  src: 'a.png',
} as unknown as PortableTextBlock

const table: PortableTextBlock = {
  _type: 'table',
  _key: 't1',
  rows: [
    {
      _type: 'row',
      _key: 'r1',
      cells: [{_type: 'cell', _key: 'c1', content: [textBlock1, textBlock2]}],
    },
  ],
} as unknown as PortableTextBlock

describe(fitBlocksToDestination.name, () => {
  test('returns empty when input is empty', () => {
    const snapshot = createSnapshot({
      value: [textBlock1],
      selectionPath: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
    })
    expect(fitBlocksToDestination(snapshot, [])).toEqual([])
  })

  test('returns input unchanged when no selection', () => {
    const containers = resolveContainers(tableSchema, [tableContainer])
    const snapshot = createTestSnapshot({
      context: {
        schema: tableSchema,
        value: [textBlock1],
        selection: null,
        containers,
      },
    })
    expect(fitBlocksToDestination(snapshot, [textBlock1])).toEqual([textBlock1])
  })

  test('keeps a block whose type is accepted at the destination', () => {
    const snapshot = createSnapshot({
      value: [textBlock1],
      selectionPath: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
    })
    expect(fitBlocksToDestination(snapshot, [textBlock2])).toEqual([textBlock2])
  })

  test('keeps a block-object whose type is accepted at the destination', () => {
    const snapshot = createSnapshot({
      value: [textBlock1],
      selectionPath: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
    })
    expect(fitBlocksToDestination(snapshot, [table])).toEqual([table])
  })

  test('descends a table into a cell whose content accepts only blocks', () => {
    // Selection inside a cell of an existing table - destination accepts
    // blocks only (cell.content.of = [block]). Pasting a whole table
    // should yield the inner text blocks.
    const existingTable: PortableTextBlock = {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [{_type: 'cell', _key: 'c0', content: [textBlock1]}],
        },
      ],
    } as unknown as PortableTextBlock

    const snapshot = createSnapshot({
      value: [existingTable],
      selectionPath: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 'b1c1'},
      ],
    })
    expect(fitBlocksToDestination(snapshot, [table])).toEqual([
      textBlock1,
      textBlock2,
    ])
  })

  test('drops a block-object that is not accepted and has no accepted descendants', () => {
    // Selection inside cell - destination accepts blocks only. Image
    // has no descendant blocks, so it is dropped.
    const existingTable: PortableTextBlock = {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [{_type: 'cell', _key: 'c0', content: [textBlock1]}],
        },
      ],
    } as unknown as PortableTextBlock

    const snapshot = createSnapshot({
      value: [existingTable],
      selectionPath: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 'b1c1'},
      ],
    })
    expect(fitBlocksToDestination(snapshot, [image])).toEqual([])
  })

  test('filters a mixed payload to only blocks accepted at the destination', () => {
    // Selection inside cell - destination accepts blocks only. Mixed
    // payload [textBlock, image]: keep block, drop image.
    const existingTable: PortableTextBlock = {
      _type: 'table',
      _key: 't0',
      rows: [
        {
          _type: 'row',
          _key: 'r0',
          cells: [{_type: 'cell', _key: 'c0', content: [textBlock1]}],
        },
      ],
    } as unknown as PortableTextBlock

    const snapshot = createSnapshot({
      value: [existingTable],
      selectionPath: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: 'c0'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 'b1c1'},
      ],
    })
    expect(fitBlocksToDestination(snapshot, [textBlock2, image])).toEqual([
      textBlock2,
    ])
  })
})
