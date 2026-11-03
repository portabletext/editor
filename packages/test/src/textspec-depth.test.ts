import {compileSchema, defineSchema} from '@portabletext/schema'
import type {
  FieldDefinition,
  OfDefinition,
  PortableTextBlock,
  Schema,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  fromTextspec,
  selectionFromTextspec,
  type TextspecContainerRegistration,
  type TextspecContainers,
} from './from-textspec'
import {createTestKeyGenerator} from './test-key-generator'
import {toTextspec} from './to-textspec'

const innerBlockMember = {
  type: 'block',
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
  inlineObjects: [{name: 'stock-ticker'}],
} as const

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'em'}],
    annotations: [{name: 'comment'}],
    blockObjects: [
      {name: 'image'},
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [innerBlockMember, {type: 'image'}],
          },
        ],
      },
      {
        name: 'aside',
        fields: [
          {name: 'content', type: 'array', of: [{type: 'block'}]},
          {name: 'body', type: 'array', of: [innerBlockMember]},
        ],
      },
      {
        name: 'list',
        fields: [
          {
            name: 'items',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'list-item',
                fields: [
                  {
                    name: 'content',
                    type: 'array',
                    of: [{type: 'block'}, {type: 'callout'}],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'tableRow',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'tableCell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [innerBlockMember, {type: 'image'}],
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

const listField = arrayField(blockObjectFields(schema, 'list'), 'items')
const listItemField = arrayField(
  ofMemberFields(listField, 'list-item'),
  'content',
)
const calloutField = arrayField(blockObjectFields(schema, 'callout'), 'content')
const asideBodyField = arrayField(blockObjectFields(schema, 'aside'), 'body')
const rowsField = arrayField(blockObjectFields(schema, 'table'), 'rows')
const cellsField = arrayField(ofMemberFields(rowsField, 'tableRow'), 'cells')
const cellContentField = arrayField(
  ofMemberFields(cellsField, 'tableCell'),
  'content',
)

const containers: TextspecContainers = new Map([
  ['list', {kind: 'container', type: 'list', field: listField}],
  ['list-item', {kind: 'container', type: 'list-item', field: listItemField}],
  ['callout', {kind: 'container', type: 'callout', field: calloutField}],
  ['aside', {kind: 'container', type: 'aside', field: asideBodyField}],
])

const tableContainers: TextspecContainers = new Map<
  string,
  TextspecContainerRegistration
>([
  [
    'table',
    {
      kind: 'container',
      type: 'table',
      field: rowsField,
      of: [
        {
          kind: 'container',
          type: 'tableRow',
          field: cellsField,
          of: [{kind: 'container', type: 'tableCell', field: cellContentField}],
        },
      ],
    },
  ],
])

const leafCalloutContainers: TextspecContainers = new Map<
  string,
  TextspecContainerRegistration
>([
  [
    'list',
    {
      kind: 'container',
      type: 'list',
      field: listField,
      of: [
        {
          kind: 'container',
          type: 'list-item',
          field: listItemField,
          of: [{kind: 'blockObject', type: 'callout'}],
        },
      ],
    },
  ],
  ['callout', {kind: 'container', type: 'callout', field: calloutField}],
])

const namedSchema = compileSchema(
  defineSchema({
    decorators: [{name: 'em'}],
    annotations: [{name: 'comment'}],
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{...innerBlockMember, name: 'note'}],
          },
        ],
      },
    ],
  }),
)

const namedContainers: TextspecContainers = new Map([
  [
    'callout',
    {
      kind: 'container',
      type: 'callout',
      field: arrayField(blockObjectFields(namedSchema, 'callout'), 'content'),
    },
  ],
])

describe(toTextspec.name, () => {
  test('renders a decorator declared only by the enclosing container at depth 1', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo ', marks: []},
              {
                _type: 'span',
                _key: keyGenerator(),
                text: 'bar',
                marks: ['strong'],
              },
            ],
            style: 'normal',
          },
        ],
      },
    ]

    expect(toTextspec({schema, value, selection: null, containers})).toEqual(
      ['CALLOUT:', '  B: foo [strong:bar]'].join('\n'),
    )
  })

  test('renders a decorator declared only by the enclosing container at depth 3', () => {
    expect(
      toTextspec({
        schema,
        value: depthThreeValue(createTestKeyGenerator()),
        selection: null,
        containers,
      }),
    ).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    CALLOUT:',
        '      B: foo [strong:bar] [@link href="https://example.com":baz]',
      ].join('\n'),
    )
  })

  test('renders a text block of a named block member as a text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'note',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo ', marks: []},
              {
                _type: 'span',
                _key: keyGenerator(),
                text: 'bar',
                marks: ['strong'],
              },
            ],
            style: 'normal',
          },
        ],
      },
    ]

    expect(
      toTextspec({
        schema: namedSchema,
        value,
        selection: null,
        containers: namedContainers,
      }),
    ).toEqual(['CALLOUT:', '  B: foo [strong:bar]'].join('\n'))
  })

  test('renders a caret inside a marked span at depth 3', () => {
    const point = {
      path: [
        {_key: 'k1'},
        'items',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
        'content',
        {_key: 'k4'},
        'children',
        {_key: 'k6'},
      ],
      offset: 1,
    }

    expect(
      toTextspec({
        schema,
        value: depthThreeValue(createTestKeyGenerator()),
        selection: {anchor: point, focus: point},
        containers,
      }),
    ).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    CALLOUT:',
        '      B: foo [strong:b|ar] [@link href="https://example.com":baz]',
      ].join('\n'),
    )
  })

  test('renders an expanded selection across marked spans at depth 3', () => {
    expect(
      toTextspec({
        schema,
        value: depthThreeValue(createTestKeyGenerator()),
        selection: {
          anchor: {
            path: [
              {_key: 'k1'},
              'items',
              {_key: 'k2'},
              'content',
              {_key: 'k3'},
              'content',
              {_key: 'k4'},
              'children',
              {_key: 'k6'},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: 'k1'},
              'items',
              {_key: 'k2'},
              'content',
              {_key: 'k3'},
              'content',
              {_key: 'k4'},
              'children',
              {_key: 'k8'},
            ],
            offset: 2,
          },
        },
        containers,
      }),
    ).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    CALLOUT:',
        '      B: foo [strong:b^ar] [@link href="https://example.com":ba|z]',
      ].join('\n'),
    )
  })

  test('renders a caret inside an annotation at depth 3', () => {
    const point = {
      path: [
        {_key: 'k1'},
        'items',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
        'content',
        {_key: 'k4'},
        'children',
        {_key: 'k8'},
      ],
      offset: 1,
    }

    expect(
      toTextspec({
        schema,
        value: depthThreeValue(createTestKeyGenerator()),
        selection: {anchor: point, focus: point},
        containers,
      }),
    ).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    CALLOUT:',
        '      B: foo [strong:bar] [@link href="https://example.com":b|az]',
      ].join('\n'),
    )
  })

  test('renders a caret before an inline object inside a named block member', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'note',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo ', marks: []},
              {_type: 'stock-ticker', _key: keyGenerator()},
            ],
            style: 'normal',
          },
        ],
      },
    ]
    const point = {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k3'}],
      offset: 0,
    }

    expect(
      toTextspec({
        schema: namedSchema,
        value,
        selection: {anchor: point, focus: point},
        containers: namedContainers,
      }),
    ).toEqual(['CALLOUT:', '  B: foo |{stock-ticker}'].join('\n'))
  })

  test('renders a caret at the start of a span inside a named block member', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'note',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            style: 'normal',
          },
        ],
      },
    ]
    const point = {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 0,
    }

    expect(
      toTextspec({
        schema: namedSchema,
        value,
        selection: {anchor: point, focus: point},
        containers: namedContainers,
      }),
    ).toEqual(['CALLOUT:', '  B: |foo'].join('\n'))
  })

  test('renders positionally registered nested containers with marks and a caret', () => {
    const point = {
      path: [
        {_key: 'k0'},
        'rows',
        {_key: 'k1'},
        'cells',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
        'children',
        {_key: 'k4'},
      ],
      offset: 2,
    }

    expect(
      toTextspec({
        schema,
        value: tableValue(createTestKeyGenerator()),
        selection: {anchor: point, focus: point},
        containers: tableContainers,
      }),
    ).toEqual(
      [
        'TABLE:',
        '  TABLEROW:',
        '    TABLECELL:',
        '      B: [strong:fo|o]',
      ].join('\n'),
    )
  })

  test('renders a positional block object registration as a block object over a top-level container', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'list',
        _key: keyGenerator(),
        items: [
          {
            _type: 'list-item',
            _key: keyGenerator(),
            content: [
              {
                _type: 'callout',
                _key: keyGenerator(),
                content: [
                  {
                    _type: 'block',
                    _key: keyGenerator(),
                    children: [
                      {
                        _type: 'span',
                        _key: keyGenerator(),
                        text: 'foo',
                        marks: [],
                      },
                    ],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    expect(
      toTextspec({
        schema,
        value,
        selection: null,
        containers: leafCalloutContainers,
      }),
    ).toEqual(['LIST:', '  LIST-ITEM:', '    {CALLOUT}'].join('\n'))
  })

  test('emits `_key` on nested containers and text blocks', () => {
    expect(
      toTextspec(
        {
          schema,
          value: depthThreeValue(createTestKeyGenerator()),
          selection: null,
          containers,
        },
        {keys: true},
      ),
    ).toEqual(
      [
        'LIST _key="k1":',
        '  LIST-ITEM _key="k2":',
        '    CALLOUT _key="k3":',
        '      B _key="k4": foo [strong:bar] [@link href="https://example.com":baz]',
      ].join('\n'),
    )
  })

  test('emits `_key` only for nested blocks in the key set', () => {
    expect(
      toTextspec(
        {
          schema,
          value: depthThreeValue(createTestKeyGenerator()),
          selection: null,
          containers,
        },
        {keys: new Set(['k2', 'k4'])},
      ),
    ).toEqual(
      [
        'LIST:',
        '  LIST-ITEM _key="k2":',
        '    CALLOUT:',
        '      B _key="k4": foo [strong:bar] [@link href="https://example.com":baz]',
      ].join('\n'),
    )
  })

  test('renders a block object selected inside a container', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            style: 'normal',
          },
          {_type: 'image', _key: keyGenerator()},
        ],
      },
    ]
    const point = {path: [{_key: 'k0'}, 'content', {_key: 'k3'}], offset: 0}

    expect(
      toTextspec({
        schema,
        value,
        selection: {anchor: point, focus: point},
        containers,
      }),
    ).toEqual(['CALLOUT:', '  B: foo', '  ^{IMAGE}|'].join('\n'))
  })

  test('renders a caret in a span whose only mark has no decorator or markDef', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'foo',
            marks: ['unknown'],
          },
        ],
        style: 'normal',
      },
    ]
    const point = {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1}

    expect(
      toTextspec({schema, value, selection: {anchor: point, focus: point}}),
    ).toEqual('B: f|oo')
  })

  test('renders a caret at an indexed root path', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: keyGenerator(),
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
        ],
        style: 'normal',
      },
    ]
    const point = {path: [0, 'children', 0], offset: 1}

    expect(
      toTextspec({schema, value, selection: {anchor: point, focus: point}}),
    ).toEqual('B: f|oo')
  })
})

describe(fromTextspec.name, () => {
  test('gives a text block inside a container the named block member type', () => {
    expect(
      fromTextspec(
        {
          schema: namedSchema,
          keyGenerator: createTestKeyGenerator(),
          containers: namedContainers,
        },
        ['CALLOUT:', '  B: foo [strong:ba|r]'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'note',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foo ', marks: []},
                {_type: 'span', _key: 'k2', text: 'bar', marks: ['strong']},
              ],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 2,
        },
      },
    })
  })

  test('resolves positionally registered nested containers', () => {
    expect(
      fromTextspec(
        {
          schema,
          keyGenerator: createTestKeyGenerator(),
          containers: tableContainers,
        },
        [
          'TABLE:',
          '  TABLEROW:',
          '    TABLECELL:',
          '      B: [strong:fo|o]',
        ].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'table',
          _key: 'k4',
          rows: [
            {
              _type: 'tableRow',
              _key: 'k3',
              cells: [
                {
                  _type: 'tableCell',
                  _key: 'k2',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k0',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k1',
                          text: 'foo',
                          marks: ['strong'],
                        },
                      ],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k4'},
            'rows',
            {_key: 'k3'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k4'},
            'rows',
            {_key: 'k3'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 2,
        },
      },
    })
  })

  test('honours `_key` on nested containers', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        [
          'LIST _key="l0":',
          '  LIST-ITEM _key="li0":',
          '    CALLOUT _key="c0":',
          '      B _key="b0": foo|',
        ].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'list',
          _key: 'l0',
          items: [
            {
              _type: 'list-item',
              _key: 'li0',
              content: [
                {
                  _type: 'callout',
                  _key: 'c0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'b0',
                      children: [
                        {_type: 'span', _key: 'k0', text: 'foo', marks: []},
                      ],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'l0'},
            'items',
            {_key: 'li0'},
            'content',
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 'k0'},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: 'l0'},
            'items',
            {_key: 'li0'},
            'content',
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 'k0'},
          ],
          offset: 3,
        },
      },
    })
  })

  test('collapses a block object selected inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  B: foo', '  ^{IMAGE}|'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              style: 'normal',
            },
            {_type: 'image', _key: 'k2'},
          ],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k3'}, 'content', {_key: 'k2'}], offset: 0},
        focus: {path: [{_key: 'k3'}, 'content', {_key: 'k2'}], offset: 0},
      },
    })
  })

  test('keeps a range over the first character of a root text block', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'B: ^f|oo',
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      },
    })
  })

  test('keeps a range over the first character of a later root span', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'B: [em:foo]^b|ar',
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['em']},
            {_type: 'span', _key: 'k2', text: 'bar', marks: []},
          ],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 1},
      },
    })
  })

  test('keeps a range over the first character of a text block inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  B: ^f|oo'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k2',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 1,
        },
      },
    })
  })

  test('keeps a range over the first character of a later span inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  B: [strong:foo]^b|ar'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: ['strong']},
                {_type: 'span', _key: 'k2', text: 'bar', marks: []},
              ],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 1,
        },
      },
    })
  })

  test('places a caret in the later child of a mark at the root', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'B: [em:foo[strong:ba|r]]',
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['em']},
            {_type: 'span', _key: 'k2', text: 'bar', marks: ['em', 'strong']},
          ],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 2},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 2},
      },
    })
  })

  test('places a caret in the later child of a mark inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  B: [strong:foo[em:ba|r]]'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k3',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {_type: 'span', _key: 'k1', text: 'foo', marks: ['strong']},
                {
                  _type: 'span',
                  _key: 'k2',
                  text: 'bar',
                  marks: ['strong', 'em'],
                },
              ],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k3'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k2'},
          ],
          offset: 2,
        },
      },
    })
  })

  test('does not resolve container notation for a positional block object registration', () => {
    expect(
      fromTextspec(
        {
          schema,
          keyGenerator: createTestKeyGenerator(),
          containers: leafCalloutContainers,
        },
        [
          'LIST:',
          '  LIST-ITEM:',
          '    CALLOUT:',
          '      B: foo',
          'B: ba|r',
        ].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'list',
          _key: 'k2',
          items: [
            {
              _type: 'list-item',
              _key: 'k1',
              content: [{_type: 'callout', _key: 'k0'}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: 'bar', marks: []}],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 2},
        focus: {path: [{_key: 'k3'}, 'children', {_key: 'k4'}], offset: 2},
      },
    })
  })

  test('types spans and placeholder spans with the schema span name inside a container', () => {
    expect(
      fromTextspec(
        {
          schema: {...namedSchema, span: {name: 'text'}},
          keyGenerator: createTestKeyGenerator(),
          containers: namedContainers,
        },
        ['CALLOUT:', '  B: foo', '  B: |'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'note',
              _key: 'k0',
              children: [{_type: 'text', _key: 'k1', text: 'foo', marks: []}],
              style: 'normal',
            },
            {
              _type: 'note',
              _key: 'k2',
              children: [{_type: 'text', _key: 'k3', text: '', marks: []}],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
      },
    })
  })

  test('types root spans with the schema span name', () => {
    expect(
      fromTextspec(
        {
          schema: {...schema, span: {name: 'text'}},
          keyGenerator: createTestKeyGenerator(),
        },
        'B: foo|',
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'text', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
    })
  })

  test('places a caret in the second item of a root list', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        ['UL:', '  LI: foo', '  LI: ba|r'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
        focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 2},
      },
    })
  })

  test('places a caret in a root block after a list', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        ['UL:', '  LI: foo', '  LI: bar', 'B: ba|z'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
          listItem: 'bullet',
          level: 1,
        },
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 2},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 2},
      },
    })
  })

  test('places a caret in the second item of a list inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  UL:', '    LI: foo', '    LI: ba|r'].join('\n'),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k4',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k4'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 2,
        },
      },
    })
  })

  test('places a caret in a block after a list inside a container', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator(), containers},
        ['CALLOUT:', '  UL:', '    LI: foo', '    LI: bar', '  B: ba|z'].join(
          '\n',
        ),
      ),
    ).toEqual({
      blocks: [
        {
          _type: 'callout',
          _key: 'k6',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
              style: 'normal',
              listItem: 'bullet',
              level: 1,
            },
            {
              _type: 'block',
              _key: 'k4',
              children: [{_type: 'span', _key: 'k5', text: 'baz', marks: []}],
              style: 'normal',
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k4'},
            'children',
            {_key: 'k5'},
          ],
          offset: 2,
        },
        focus: {
          path: [
            {_key: 'k6'},
            'content',
            {_key: 'k4'},
            'children',
            {_key: 'k5'},
          ],
          offset: 2,
        },
      },
    })
  })
})

describe(selectionFromTextspec.name, () => {
  test('maps pattern marks onto differently split spans at depth 3', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'list',
        _key: keyGenerator(),
        items: [
          {
            _type: 'list-item',
            _key: keyGenerator(),
            content: [
              {
                _type: 'callout',
                _key: keyGenerator(),
                content: [
                  {
                    _type: 'block',
                    _key: keyGenerator(),
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
                        text: 'bar baz',
                        marks: ['strong'],
                      },
                    ],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    expect(
      selectionFromTextspec(
        {schema, containers},
        [
          'LIST:',
          '  LIST-ITEM:',
          '    CALLOUT:',
          '      B: foo b[strong:a^r b]a|z',
        ].join('\n'),
        value,
      ),
    ).toEqual({
      anchor: {
        path: [
          {_key: 'k0'},
          'items',
          {_key: 'k1'},
          'content',
          {_key: 'k2'},
          'content',
          {_key: 'k3'},
          'children',
          {_key: 'k5'},
        ],
        offset: 2,
      },
      focus: {
        path: [
          {_key: 'k0'},
          'items',
          {_key: 'k1'},
          'content',
          {_key: 'k2'},
          'content',
          {_key: 'k3'},
          'children',
          {_key: 'k5'},
        ],
        offset: 6,
      },
    })
  })

  test('resolves a caret through positionally registered nested containers', () => {
    expect(
      selectionFromTextspec(
        {schema, containers: tableContainers},
        ['TABLE:', '  TABLEROW:', '    TABLECELL:', '      B: f|oo'].join('\n'),
        tableValue(createTestKeyGenerator()),
      ),
    ).toEqual({
      anchor: {
        path: [
          {_key: 'k0'},
          'rows',
          {_key: 'k1'},
          'cells',
          {_key: 'k2'},
          'content',
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: 'k0'},
          'rows',
          {_key: 'k1'},
          'cells',
          {_key: 'k2'},
          'content',
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
        ],
        offset: 1,
      },
    })
  })

  test('resolves a caret through the registered field of a container with several array fields', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'aside',
        _key: keyGenerator(),
        content: [],
        body: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            style: 'normal',
          },
        ],
      },
    ]

    expect(
      selectionFromTextspec(
        {schema, containers},
        ['ASIDE:', '  B: f|oo'].join('\n'),
        value,
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'body', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 1,
      },
      focus: {
        path: [{_key: 'k0'}, 'body', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 1,
      },
    })
  })

  test('resolves a caret inside a named block member', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'note',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            style: 'normal',
          },
        ],
      },
    ]

    expect(
      selectionFromTextspec(
        {schema: namedSchema, containers: namedContainers},
        ['CALLOUT:', '  B: [strong:fo|o]'].join('\n'),
        value,
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 2,
      },
      focus: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 2,
      },
    })
  })

  test('resolves a caret in the second item of a list inside a container', () => {
    const keyGenerator = createTestKeyGenerator()
    const value: Array<PortableTextBlock> = [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
            ],
            style: 'normal',
            listItem: 'bullet',
            level: 1,
          },
        ],
      },
    ]

    expect(
      selectionFromTextspec(
        {schema, containers},
        ['CALLOUT:', '  UL:', '    LI: foo', '    LI: ba|r'].join('\n'),
        value,
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
        offset: 2,
      },
      focus: {
        path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
        offset: 2,
      },
    })
  })
})

describe('round trip', () => {
  test('marks and an expanded selection at depth 3', () => {
    const input = [
      'LIST:',
      '  LIST-ITEM:',
      '    CALLOUT:',
      '      B: foo [strong:b^ar] [@link href="https://example.com":ba|z]',
    ].join('\n')
    const {blocks, selection} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator(), containers},
      input,
    )

    expect(toTextspec({schema, value: blocks, selection, containers})).toEqual(
      input,
    )
  })

  test('keys, marks and a caret through positionally registered containers', () => {
    const input = [
      'TABLE _key="t0":',
      '  TABLEROW _key="r0":',
      '    TABLECELL _key="c0":',
      '      B _key="b0": foo [strong:ba|r]',
    ].join('\n')
    const {blocks, selection} = fromTextspec(
      {
        schema,
        keyGenerator: createTestKeyGenerator(),
        containers: tableContainers,
      },
      input,
    )

    expect(
      toTextspec(
        {schema, value: blocks, selection, containers: tableContainers},
        {keys: true},
      ),
    ).toEqual(input)
  })

  test('a block object selected at depth 3', () => {
    const input = [
      'LIST:',
      '  LIST-ITEM:',
      '    CALLOUT:',
      '      B: [strong:foo]',
      '      ^{IMAGE}|',
    ].join('\n')
    const {blocks, selection} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator(), containers},
      input,
    )

    expect(toTextspec({schema, value: blocks, selection, containers})).toEqual(
      input,
    )
  })

  test('a range over the first character of a text block at depth 3', () => {
    const input = [
      'LIST:',
      '  LIST-ITEM:',
      '    CALLOUT:',
      '      B: ^f|oo',
    ].join('\n')
    const {blocks, selection} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator(), containers},
      input,
    )

    expect(toTextspec({schema, value: blocks, selection, containers})).toEqual(
      input,
    )
  })

  test('marks and a caret inside a named block member', () => {
    const input = ['CALLOUT:', '  B: foo [strong:ba|r]'].join('\n')
    const {blocks, selection} = fromTextspec(
      {
        schema: namedSchema,
        keyGenerator: createTestKeyGenerator(),
        containers: namedContainers,
      },
      input,
    )

    expect(
      toTextspec({
        schema: namedSchema,
        value: blocks,
        selection,
        containers: namedContainers,
      }),
    ).toEqual(input)
  })

  test('a caret inside a named block member with a named span', () => {
    const textSpanSchema = {...namedSchema, span: {name: 'text'}}
    const input = ['CALLOUT:', '  B: foo', '  B: ba|r'].join('\n')
    const {blocks, selection} = fromTextspec(
      {
        schema: textSpanSchema,
        keyGenerator: createTestKeyGenerator(),
        containers: namedContainers,
      },
      input,
    )

    expect(
      toTextspec({
        schema: textSpanSchema,
        value: blocks,
        selection,
        containers: namedContainers,
      }),
    ).toEqual(input)
  })
})

function depthThreeValue(keyGenerator: () => string): Array<PortableTextBlock> {
  const linkKey = keyGenerator()

  return [
    {
      _type: 'list',
      _key: keyGenerator(),
      items: [
        {
          _type: 'list-item',
          _key: keyGenerator(),
          content: [
            {
              _type: 'callout',
              _key: keyGenerator(),
              content: [
                {
                  _type: 'block',
                  _key: keyGenerator(),
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
                      marks: ['strong'],
                    },
                    {_type: 'span', _key: keyGenerator(), text: ' ', marks: []},
                    {
                      _type: 'span',
                      _key: keyGenerator(),
                      text: 'baz',
                      marks: [linkKey],
                    },
                  ],
                  markDefs: [
                    {_type: 'link', _key: linkKey, href: 'https://example.com'},
                  ],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function tableValue(keyGenerator: () => string): Array<PortableTextBlock> {
  return [
    {
      _type: 'table',
      _key: keyGenerator(),
      rows: [
        {
          _type: 'tableRow',
          _key: keyGenerator(),
          cells: [
            {
              _type: 'tableCell',
              _key: keyGenerator(),
              content: [
                {
                  _type: 'block',
                  _key: keyGenerator(),
                  children: [
                    {
                      _type: 'span',
                      _key: keyGenerator(),
                      text: 'foo',
                      marks: ['strong'],
                    },
                  ],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function blockObjectFields(
  schema: Schema,
  name: string,
): ReadonlyArray<FieldDefinition> {
  return (
    schema.blockObjects.find((blockObject) => blockObject.name === name)
      ?.fields ?? []
  )
}

function ofMemberFields(
  field: TextspecContainerRegistration['field'],
  name: string,
): ReadonlyArray<FieldDefinition> {
  const member = field.of.find((ofMember) => ofMember.name === name)
  return member && 'fields' in member ? member.fields : []
}

function arrayField(
  fields: ReadonlyArray<FieldDefinition>,
  name: string,
): TextspecContainerRegistration['field'] {
  const field = fields.find((candidate) => candidate.name === name)
  if (field?.type !== 'array' || !field.of) {
    throw new Error(`No array field \`${name}\``)
  }
  return {...field, of: field.of as ReadonlyArray<OfDefinition>}
}
