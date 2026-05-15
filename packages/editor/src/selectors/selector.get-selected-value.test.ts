import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {getSelectedValue} from './selector.get-selected-value'

const b1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [
    {
      _type: 'span',
      _key: 'b1c1',
      text: 'foo',
      marks: [],
    },
    {
      _type: 'span',
      _key: 'b1c2',
      text: 'bar',
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
}
const b2: PortableTextBlock = {
  _type: 'image',
  _key: 'b2',
  src: 'https://example.com/image.jpg',
  alt: 'Example',
}
const b3: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b3',
  children: [
    {
      _type: 'span',
      _key: 'b3c1',
      text: 'baz',
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
}
const b4: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b4',
  children: [
    {
      _type: 'span',
      _key: 'b4c1',
      text: 'fizz',
      marks: [],
    },
    {
      _type: 'stock-ticker',
      _key: 'b4c2',
      symbol: 'AAPL',
    },
    {
      _type: 'span',
      _key: 'b4c3',
      text: 'buzz',
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
}

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'strong'}],
    blockObjects: [{name: 'image'}],
    inlineObjects: [{name: 'stock-ticker'}],
  }),
)
const blocks: Array<PortableTextBlock> = [b1, b2, b3, b4]

describe(getSelectedValue.name, () => {
  test('sensible defaults', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: null,
            value: [],
          },
        }),
      ),
    ).toEqual([])
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: null,
            value: [],
          },
        }),
      ),
    ).toEqual([])
  })

  test('slicing a single block', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [b1.children[0]],
      },
    ])
  })

  test('slicing a single span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 1,
              },
              focus: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 2,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [
          {
            ...b1.children[0],
            text: 'o',
          },
        ],
      },
    ])
  })

  test('starting and ending selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: b2._key}],
                offset: 0,
              },
              focus: {
                path: [{_key: b2._key}],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([b2])
  })

  test('starting selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: b2._key}],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]!._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([b2, b3])
  })

  test('ending selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 3,
              },
              focus: {
                path: [{_key: b2._key}],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [
          {
            ...b1.children[0],
            text: '',
          },
          ...b1.children.slice(1),
        ],
      },
      blocks[1],
    ])
  })

  test('slicing across block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]!._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]!._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([b1, b2, b3])
  })

  test('starting and ending mid-span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]!._key},
                ],
                offset: 2,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]!._key},
                ],
                offset: 1,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b3,
        children: [
          {
            ...b3.children[0],
            text: 'z',
          },
        ],
      },
      {
        ...b4,
        children: [
          {
            ...b4.children[0],
            text: 'f',
          },
        ],
      },
    ])
  })

  test('starting mid-span and ending end-span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]!._key},
                ],
                offset: 2,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]!._key},
                ],
                offset: 4,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b3,
        children: [
          {
            ...b3.children[0],
            text: 'z',
          },
        ],
      },
      {
        ...b4,
        children: [
          {
            ...b4.children[0],
          },
        ],
      },
    ])
  })

  test('starting on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]!._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[2]!._key},
                ],
                offset: 4,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1], b4.children[2]],
      },
    ])
  })

  test('ending on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]!._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]!._key},
                ],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[0], b4.children[1]],
      },
    ])
  })

  test('starting and ending on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]!._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]!._key},
                ],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1]],
      },
    ])
  })

  test('slicing text block with custom props', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 7,
              },
              focus: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 12,
              },
            },
            value: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: 'Hello, world!', marks: []},
                ],
                markDefs: [],
                style: 'normal',
                _map: {},
              },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
        _map: {},
      },
    ])
  })

  test('slicing span with custom props', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 7,
              },
              focus: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 12,
              },
            },
            value: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'Hello, world!',
                    _map: {},
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [
          {_key: 's0', _type: 'span', text: 'world', _map: {}, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('filters out unused markDefs', () => {
    const keyGenerator = createTestKeyGenerator()
    const linkAKey = keyGenerator()
    const linkBKey = keyGenerator()
    const block0Key = keyGenerator()
    const bazKey = keyGenerator()
    const block4Key = keyGenerator()
    const oneMoreLineKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: block0Key,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'bar',
            marks: [linkAKey],
          },
          {
            _type: 'span',
            _key: bazKey,
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [
          {
            _type: 'link',
            _key: linkAKey,
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
      {
        _key: keyGenerator(),
        _type: 'image',
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'fizz',
            marks: ['strong'],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: ' buzz',
            marks: [linkBKey],
          },
        ],
        markDefs: [
          {
            _type: 'link',
            _key: linkBKey,
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
      {
        _key: keyGenerator(),
        _type: 'break',
      },
      {
        _key: block4Key,
        _type: 'block',
        children: [
          {
            _type: 'span',
            _key: oneMoreLineKey,
            text: 'one more line',
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const snapshot = createTestSnapshot({
      context: {
        value,
        keyGenerator,
        schema: compileSchema(
          defineSchema({
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
            decorators: [{name: 'strong'}],
          }),
        ),
        selection: {
          anchor: {
            path: [{_key: block0Key}, 'children', {_key: bazKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: block4Key}, 'children', {_key: oneMoreLineKey}],
            offset: 3,
          },
        },
      },
    })

    expect(getSelectedValue(snapshot)).toEqual([
      {
        ...value[0],
        children: [
          {
            _type: 'span',
            _key: bazKey,
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [],
      },
      value[1],
      value[2],
      value[3],
      {
        ...value[4],
        children: [
          {
            _type: 'span',
            _key: oneMoreLineKey,
            text: 'one',
            marks: [],
          },
        ],
      },
    ])
  })

  test('starts and ends in different blocks with same span _key', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()
    const blockBKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanAKey,
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: spanBKey,
            text: 'bar',
            marks: ['strong'],
          },
          {
            _type: 'span',
            _key: spanCKey,
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'fizz buzz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const selection = {
      anchor: {
        path: [
          {
            _key: blockBKey,
          },
          'children',
          {
            _key: spanAKey,
          },
        ],
        offset: 9,
      },
      focus: {
        path: [
          {
            _key: blockKey,
          },
          'children',
          {
            _key: spanAKey,
          },
        ],
        offset: 0,
      },
      backward: true,
    }

    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            value,
            selection,
          },
        }),
      ),
    ).toEqual(value)
  })
})

describe(`${getSelectedValue.name} with containers`, () => {
  const calloutSchema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}],
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
    childField: 'content',
  })

  function createSnapshot(
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

  test('select-all across [text, callout{text}, text] preserves the callout whole', () => {
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

    expect(getSelectedValue(createSnapshot(value, selection))).toEqual([
      rootBlock1,
      callout,
      rootBlock3,
    ])
  })

  test('selection starts inside callout, ends in trailing text block', () => {
    const value: Array<PortableTextBlock> = [rootBlock1, callout, rootBlock3]
    const selection = {
      anchor: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 1,
      },
      focus: {
        path: [{_key: 'b3'}, 'children', {_key: 'b3c1'}],
        offset: 3,
      },
    }

    expect(getSelectedValue(createSnapshot(value, selection))).toEqual([
      {
        _type: 'callout',
        _key: 'cal1',
        content: [
          {
            ...innerBlock,
            children: [{_type: 'span', _key: 'ib1c1', text: 'ar', marks: []}],
          },
        ],
      },
      rootBlock3,
    ])
  })

  test('selection starts in leading text block, ends inside callout', () => {
    const value: Array<PortableTextBlock> = [rootBlock1, callout, rootBlock3]
    const selection = {
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 2,
      },
    }

    expect(getSelectedValue(createSnapshot(value, selection))).toEqual([
      {
        ...rootBlock1,
        children: [{_type: 'span', _key: 'b1c1', text: 'oo', marks: []}],
      },
      {
        _type: 'callout',
        _key: 'cal1',
        content: [
          {
            ...innerBlock,
            children: [{_type: 'span', _key: 'ib1c1', text: 'ba', marks: []}],
          },
        ],
      },
    ])
  })

  test('selection wholly inside a callout slices inner blocks only', () => {
    const value: Array<PortableTextBlock> = [rootBlock1, callout, rootBlock3]
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

    expect(getSelectedValue(createSnapshot(value, selection))).toEqual([
      innerBlock,
    ])
  })

  test('infinite nesting: callout inside table cell', () => {
    const nestedSchema = compileSchema(
      defineSchema({
        decorators: [{name: 'strong'}],
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
                                of: [
                                  {type: 'block'},
                                  {
                                    type: 'object',
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
      defineContainer({type: 'table', childField: 'rows'}),
      defineContainer({type: 'row', childField: 'cells'}),
      defineContainer({type: 'cell', childField: 'content'}),
      defineContainer({
        type: 'callout',
        childField: 'content',
      }),
    ]

    const deepInnerBlock: PortableTextTextBlock = {
      _type: 'block',
      _key: 'dib1',
      children: [{_type: 'span', _key: 'dib1c1', text: 'deep', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const deepCallout = {
      _type: 'callout',
      _key: 'dcal1',
      content: [deepInnerBlock],
    }
    const deepCell = {
      _type: 'cell',
      _key: 'dcell1',
      content: [deepCallout],
    }
    const deepRow = {_type: 'row', _key: 'drow1', cells: [deepCell]}
    const deepTable = {_type: 'table', _key: 'dtable1', rows: [deepRow]}

    const selection = {
      anchor: {
        path: [
          {_key: 'dtable1'},
          'rows',
          {_key: 'drow1'},
          'cells',
          {_key: 'dcell1'},
          'content',
          {_key: 'dcal1'},
          'content',
          {_key: 'dib1'},
          'children',
          {_key: 'dib1c1'},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'dtable1'},
          'rows',
          {_key: 'drow1'},
          'cells',
          {_key: 'dcell1'},
          'content',
          {_key: 'dcal1'},
          'content',
          {_key: 'dib1'},
          'children',
          {_key: 'dib1c1'},
        ],
        offset: 3,
      },
    }

    expect(
      getSelectedValue(
        createSnapshot([deepTable], selection, nestedSchema, defs),
      ),
    ).toEqual([
      {
        ...deepInnerBlock,
        children: [
          {
            _type: 'span',
            _key: 'dib1c1',
            text: 'ee',
            marks: [],
          },
        ],
      },
    ])
  })

  test('deep selection ending mid-annotation preserves the link and its markDefs', () => {
    const nestedSchema = compileSchema(
      defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
      defineContainer({type: 'table', childField: 'rows'}),
      defineContainer({type: 'row', childField: 'cells'}),
      defineContainer({type: 'cell', childField: 'content'}),
    ]

    const linkKey = 'link1'
    const unusedLinkKey = 'link2'

    const innerBlock: PortableTextTextBlock = {
      _type: 'block',
      _key: 'ib1',
      children: [
        {_type: 'span', _key: 'ib1c1', text: 'foo ', marks: []},
        {_type: 'span', _key: 'ib1c2', text: 'linked text', marks: [linkKey]},
        {_type: 'span', _key: 'ib1c3', text: ' baz', marks: []},
      ],
      markDefs: [
        {_type: 'link', _key: linkKey, href: 'https://example.com'},
        {_type: 'link', _key: unusedLinkKey, href: 'https://unused.com'},
      ],
      style: 'normal',
    }
    const cell = {
      _type: 'cell',
      _key: 'cell1',
      content: [innerBlock],
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
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
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
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c2'},
        ],
        offset: 6,
      },
    }

    expect(
      getSelectedValue(createSnapshot([table], selection, nestedSchema, defs)),
    ).toEqual([
      {
        _type: 'block',
        _key: 'ib1',
        children: [
          {
            _type: 'span',
            _key: 'ib1c1',
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: 'ib1c2',
            text: 'linked',
            marks: [linkKey],
          },
        ],
        markDefs: [
          {
            _type: 'link',
            _key: linkKey,
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
    ])
  })

  test('selection inside one cell across two text blocks unwraps the cell envelope', () => {
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
      defineContainer({type: 'table', childField: 'rows'}),
      defineContainer({type: 'row', childField: 'cells'}),
      defineContainer({type: 'cell', childField: 'content'}),
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
      getSelectedValue(createSnapshot([table], selection, tableSchema, defs)),
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

  test('selection across two cells in one row wraps up to the table', () => {
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
      defineContainer({type: 'table', childField: 'rows'}),
      defineContainer({type: 'row', childField: 'cells'}),
      defineContainer({type: 'cell', childField: 'content'}),
    ]

    const c1Block: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b1',
      children: [{_type: 'span', _key: 'b1c1', text: 'one', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const c2Block: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b2',
      children: [{_type: 'span', _key: 'b2c1', text: 'two', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const cell1 = {_type: 'cell', _key: 'cell1', content: [c1Block]}
    const cell2 = {_type: 'cell', _key: 'cell2', content: [c2Block]}
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
          {_key: 'cell2'},
          'content',
          {_key: 'b2'},
          'children',
          {_key: 'b2c1'},
        ],
        offset: 2,
      },
    }

    expect(
      getSelectedValue(createSnapshot([table], selection, tableSchema, defs)),
    ).toEqual([
      {
        _type: 'table',
        _key: 'table1',
        rows: [
          {
            _type: 'row',
            _key: 'row1',
            cells: [
              {
                _type: 'cell',
                _key: 'cell1',
                content: [
                  {
                    ...c1Block,
                    children: [
                      {_type: 'span', _key: 'b1c1', text: 'ne', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'cell2',
                content: [
                  {
                    ...c2Block,
                    children: [
                      {_type: 'span', _key: 'b2c1', text: 'tw', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('selection across two rows in one table emits only the table envelope', () => {
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
      defineContainer({type: 'table', childField: 'rows'}),
      defineContainer({type: 'row', childField: 'cells'}),
      defineContainer({type: 'cell', childField: 'content'}),
    ]

    const r1Block: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b1',
      children: [{_type: 'span', _key: 'b1c1', text: 'one', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const r2Block: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b2',
      children: [{_type: 'span', _key: 'b2c1', text: 'two', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const row1 = {
      _type: 'row',
      _key: 'row1',
      cells: [{_type: 'cell', _key: 'cell1', content: [r1Block]}],
    }
    const row2 = {
      _type: 'row',
      _key: 'row2',
      cells: [{_type: 'cell', _key: 'cell2', content: [r2Block]}],
    }
    const table = {_type: 'table', _key: 'table1', rows: [row1, row2]}

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
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row2'},
          'cells',
          {_key: 'cell2'},
          'content',
          {_key: 'b2'},
          'children',
          {_key: 'b2c1'},
        ],
        offset: 3,
      },
    }

    expect(
      getSelectedValue(createSnapshot([table], selection, tableSchema, defs)),
    ).toEqual([
      {
        _type: 'table',
        _key: 'table1',
        rows: [
          {
            _type: 'row',
            _key: 'row1',
            cells: [
              {
                _type: 'cell',
                _key: 'cell1',
                content: [r1Block],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'row2',
            cells: [
              {
                _type: 'cell',
                _key: 'cell2',
                content: [r2Block],
              },
            ],
          },
        ],
      },
    ])
  })
})
