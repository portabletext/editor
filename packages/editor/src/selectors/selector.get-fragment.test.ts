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
import {getFragment} from './selector.get-fragment'

const calloutSchema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
    ],
  }),
)

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
})

function createCalloutSnapshot(
  value: Array<PortableTextBlock>,
  selection: NonNullable<
    Parameters<typeof createTestSnapshot>[0]['context']
  >['selection'],
  schema = calloutSchema,
  containerDefs: ReadonlyArray<Container> = [calloutContainer],
) {
  const containers = resolveContainers(schema, containerDefs)
  return createTestSnapshot({
    context: {schema, value, selection, containers},
  })
}

const rootBlock1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [{_type: 'span', _key: 'b1c1', text: 'foo', marks: []}],
  markDefs: [],
  style: 'normal',
}
const innerBlock: PortableTextTextBlock = {
  _type: 'block',
  _key: 'ib1',
  children: [{_type: 'span', _key: 'ib1c1', text: 'bar', marks: []}],
  markDefs: [],
  style: 'normal',
}
const callout = {
  _type: 'callout',
  _key: 'cal1',
  content: [innerBlock],
}
const rootBlock3: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b3',
  children: [{_type: 'span', _key: 'b3c1', text: 'baz', marks: []}],
  markDefs: [],
  style: 'normal',
}

describe(getFragment.name, () => {
  test('returns empty when there is no selection', () => {
    expect(
      getFragment(
        createTestSnapshot({
          context: {schema: calloutSchema, value: [rootBlock1]},
        }),
      ),
    ).toEqual([])
  })

  test('passes the envelope through unchanged when selection spans root siblings', () => {
    const value: Array<PortableTextBlock> = [rootBlock1, callout, rootBlock3]
    const selection = {
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'b3'}, 'children', {_key: 'b3c1'}],
        offset: 3,
      },
    }

    expect(
      getFragment(createCalloutSnapshot(value, selection)).map(
        (entry) => entry.node,
      ),
    ).toEqual([rootBlock1, callout, rootBlock3])
  })

  test('unwraps a callout envelope when the selection is wholly inside it', () => {
    const value: Array<PortableTextBlock> = [callout]
    const selection = {
      anchor: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 3,
      },
    }

    expect(
      getFragment(createCalloutSnapshot(value, selection)).map(
        (entry) => entry.node,
      ),
    ).toEqual([innerBlock])
  })

  test('unwraps a table cell envelope when the selection covers two text blocks inside one cell', () => {
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

    const defs = [
      defineContainer({type: 'table', arrayField: 'rows'}),
      defineContainer({type: 'row', arrayField: 'cells'}),
      defineContainer({type: 'cell', arrayField: 'content'}),
    ]

    const block1: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b1',
      children: [{_type: 'span', _key: 'b1c1', text: 'first', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const block2: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b2',
      children: [{_type: 'span', _key: 'b2c1', text: 'second', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const cell = {
      _type: 'cell',
      _key: 'cell1',
      content: [block1, block2],
    }
    const row = {_type: 'row', _key: 'row1', cells: [cell]}
    const table = {_type: 'table', _key: 'table1', rows: [row]}

    const selection = {
      anchor: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 'b1c1'},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'b2'},
          'children',
          {_key: 'b2c1'},
        ],
        offset: 3,
      },
    }

    expect(
      getFragment(
        createCalloutSnapshot([table], selection, tableSchema, defs),
      ).map((entry) => entry.node),
    ).toEqual([
      {
        ...block1,
        children: [{_type: 'span', _key: 'b1c1', text: 'irst', marks: []}],
      },
      {
        ...block2,
        children: [{_type: 'span', _key: 'b2c1', text: 'sec', marks: []}],
      },
    ])
  })

  test('keeps the table envelope when the selection spans two cells in one row', () => {
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

    const defs = [
      defineContainer({type: 'table', arrayField: 'rows'}),
      defineContainer({type: 'row', arrayField: 'cells'}),
      defineContainer({type: 'cell', arrayField: 'content'}),
    ]

    const blockInCell1: PortableTextTextBlock = {
      _type: 'block',
      _key: 'bc1',
      children: [{_type: 'span', _key: 'bc1c1', text: 'left', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const blockInCell2: PortableTextTextBlock = {
      _type: 'block',
      _key: 'bc2',
      children: [{_type: 'span', _key: 'bc2c1', text: 'right', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const cell1 = {_type: 'cell', _key: 'cell1', content: [blockInCell1]}
    const cell2 = {_type: 'cell', _key: 'cell2', content: [blockInCell2]}
    const row = {_type: 'row', _key: 'row1', cells: [cell1, cell2]}
    const table = {_type: 'table', _key: 'table1', rows: [row]}

    const selection = {
      anchor: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'bc1'},
          'children',
          {_key: 'bc1c1'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell2'},
          'content',
          {_key: 'bc2'},
          'children',
          {_key: 'bc2c1'},
        ],
        offset: 5,
      },
    }

    // The selection's LCA is the row. The row's children-field (`cells`)
    // accepts `cell`, which is NOT top-level - so the unwrap walk stops
    // at the table, which is the smallest top-level-valid wrapper.
    expect(
      getFragment(
        createCalloutSnapshot([table], selection, tableSchema, defs),
      ).map((entry) => entry.node),
    ).toEqual([
      {
        _type: 'table',
        _key: 'table1',
        rows: [
          {
            _type: 'row',
            _key: 'row1',
            cells: [cell1, cell2],
          },
        ],
      },
    ])
  })

  test('unwraps to the block containing an inline object when selection is collapsed on an inline inside a table cell', () => {
    const tableSchema = compileSchema(
      defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
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

    const defs = [
      defineContainer({type: 'table', arrayField: 'rows'}),
      defineContainer({type: 'row', arrayField: 'cells'}),
      defineContainer({type: 'cell', arrayField: 'content'}),
    ]

    const stockTicker = {
      _type: 'stock-ticker',
      _key: 'st1',
    }
    const block: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b1',
      children: [
        {_type: 'span', _key: 'b1c1', text: 'foo', marks: []},
        stockTicker,
        {_type: 'span', _key: 'b1c2', text: 'bar', marks: []},
      ],
      markDefs: [],
      style: 'normal',
    }
    const cell = {_type: 'cell', _key: 'cell1', content: [block]}
    const row = {_type: 'row', _key: 'row1', cells: [cell]}
    const table = {_type: 'table', _key: 'table1', rows: [row]}

    const selection = {
      anchor: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 'st1'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'b1'},
          'children',
          {_key: 'st1'},
        ],
        offset: 0,
      },
    }

    expect(
      getFragment(
        createCalloutSnapshot([table], selection, tableSchema, defs),
      ).map((entry) => entry.node),
    ).toEqual([
      {
        ...block,
        children: [stockTicker],
      },
    ])
  })
})
