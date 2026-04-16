import {compileSchema, defineSchema} from '@portabletext/schema'
import type {
  PortableTextBlock,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Containers} from '../src/schema/resolve-containers'
import {toTextspec} from './to-textspec'

const schemaDefinition = defineSchema({
  annotations: [{name: 'comment'}, {name: 'link'}],
  decorators: [{name: 'em'}, {name: 'strong'}],
  blockObjects: [
    {name: 'image'},
    {name: 'break'},
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'tableRow',
              name: 'tableRow',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'tableCell',
                      name: 'tableCell',
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
  inlineObjects: [{name: 'stock-ticker'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
})

const schema = compileSchema(schemaDefinition)

const tableContainers: Containers = new Map([
  [
    'table',
    {name: 'rows', type: 'array', of: [{type: 'tableRow', name: 'tableRow'}]},
  ],
  [
    'table.tableRow',
    {
      name: 'cells',
      type: 'array',
      of: [{type: 'tableCell', name: 'tableCell'}],
    },
  ],
  [
    'table.tableRow.tableCell',
    {name: 'content', type: 'array', of: [{type: 'block'}]},
  ],
])

function block(
  props: Partial<PortableTextTextBlock> & {
    children: PortableTextTextBlock['children']
  },
): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: 'b0',
    style: 'normal',
    markDefs: [],
    ...props,
  }
}

function span(text: string, marks: Array<string> = []) {
  return {_type: 'span' as const, _key: 's0', text, marks}
}

describe(toTextspec.name, () => {
  test('simple paragraph', () => {
    const value: Array<PortableTextBlock> = [block({children: [span('Hello')]})]
    expect(toTextspec({schema, value, selection: null})).toBe('B: Hello')
  })

  test('heading h1', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', style: 'h1', children: [span('Hello')]}),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B style="h1": Hello',
    )
  })

  test('blockquote', () => {
    const value: Array<PortableTextBlock> = [
      block({style: 'blockquote', children: [span('Quote')]}),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B style="blockquote": Quote',
    )
  })

  test('bold text (decorator)', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello', ['strong'])]}),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: [strong:Hello]',
    )
  })

  test('multiple decorators', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello', ['strong', 'em'])]}),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: [strong:[em:Hello]]',
    )
  })

  test('link annotation', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [span('Hello', ['abc'])],
        markDefs: [{_type: 'link', _key: 'abc', href: 'https://example.com'}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: [@link href="https://example.com":Hello]',
    )
  })

  test('decorator + annotation combined', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [span('Hello', ['strong', 'abc'])],
        markDefs: [{_type: 'link', _key: 'abc', href: 'https://example.com'}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: [strong:[@link href="https://example.com":Hello]]',
    )
  })

  test('mixed plain and marked text', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [
          {_type: 'span', _key: 's0', text: 'Hello ', marks: []},
          {_type: 'span', _key: 's1', text: 'world', marks: ['strong']},
        ],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: Hello [strong:world]',
    )
  })

  test('block object', () => {
    const value: Array<PortableTextBlock> = [{_type: 'image', _key: 'b0'}]
    expect(toTextspec({schema, value, selection: null})).toBe('{IMAGE}')
  })

  test('inline object', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [
          {_type: 'span', _key: 's0', text: 'text ', marks: []},
          {_type: 'stock-ticker', _key: 'i0'},
          {_type: 'span', _key: 's1', text: ' more', marks: []},
        ],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: text {stock-ticker} more',
    )
  })

  test('simple bullet list', () => {
    const value: Array<PortableTextBlock> = [
      block({
        _key: 'b0',
        listItem: 'bullet',
        level: 1,
        children: [span('first')],
      }),
      block({
        _key: 'b1',
        listItem: 'bullet',
        level: 1,
        children: [{_type: 'span', _key: 's1', text: 'second', marks: []}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B listItem="bullet": first\nB listItem="bullet": second',
    )
  })

  test('numbered list', () => {
    const value: Array<PortableTextBlock> = [
      block({
        _key: 'b0',
        listItem: 'number',
        level: 1,
        children: [span('one')],
      }),
      block({
        _key: 'b1',
        listItem: 'number',
        level: 1,
        children: [{_type: 'span', _key: 's1', text: 'two', marks: []}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B listItem="number": one\nB listItem="number": two',
    )
  })

  test('nested list', () => {
    const value: Array<PortableTextBlock> = [
      block({
        _key: 'b0',
        listItem: 'bullet',
        level: 1,
        children: [span('parent')],
      }),
      block({
        _key: 'b1',
        listItem: 'bullet',
        level: 2,
        children: [{_type: 'span', _key: 's1', text: 'child', marks: []}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B listItem="bullet": parent\nB level=2 listItem="bullet": child',
    )
  })

  test('multiple blocks', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', children: [span('first')]}),
      block({
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'second', marks: []}],
      }),
    ]
    expect(toTextspec({schema, value, selection: null})).toBe(
      'B: first\nB: second',
    )
  })

  test('selection - collapsed cursor', () => {
    const value: Array<PortableTextBlock> = [block({children: [span('Hello')]})]
    const selection = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
    }
    expect(toTextspec({schema, value, selection})).toBe('B: Hello|')
  })

  test('selection - range', () => {
    const value: Array<PortableTextBlock> = [block({children: [span('Hello')]})]
    const selection = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
    }
    expect(toTextspec({schema, value, selection})).toBe('B: ^Hello|')
  })

  test('empty span text', () => {
    const value: Array<PortableTextBlock> = [block({children: [span('')]})]
    expect(toTextspec({schema, value, selection: null})).toBe('B: ')
  })

  test('table without containers is void', () => {
    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'tableRow',
            _key: 'r0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'c0',
                content: [
                  {
                    _type: 'block',
                    _key: 'b0',
                    children: [
                      {_type: 'span', _key: 's0', text: 'hello', marks: []},
                    ],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    expect(toTextspec({schema, value, selection: null})).toBe('{TABLE}')
  })

  test('table with one cell', () => {
    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'tableRow',
            _key: 'r0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'c0',
                content: [
                  {
                    _type: 'block',
                    _key: 'b0',
                    children: [
                      {
                        _type: 'span',
                        _key: 's0',
                        text: 'hello',
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
    ] as Array<PortableTextBlock>
    expect(
      toTextspec({schema, value, selection: null, containers: tableContainers}),
    ).toBe('TABLE:\n  TABLEROW:\n    TABLECELL:\n      B: hello')
  })

  test('table with multiple cells', () => {
    const value = [
      {
        _type: 'table',
        _key: 't0',
        rows: [
          {
            _type: 'tableRow',
            _key: 'r0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'c0',
                content: [
                  {
                    _type: 'block',
                    _key: 'b0',
                    children: [
                      {_type: 'span', _key: 's0', text: 'a', marks: []},
                    ],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'tableCell',
                _key: 'c1',
                content: [
                  {
                    _type: 'block',
                    _key: 'b1',
                    children: [
                      {_type: 'span', _key: 's1', text: 'b', marks: []},
                    ],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
          {
            _type: 'tableRow',
            _key: 'r1',
            cells: [
              {
                _type: 'tableCell',
                _key: 'c2',
                content: [
                  {
                    _type: 'block',
                    _key: 'b2',
                    children: [
                      {_type: 'span', _key: 's2', text: 'c', marks: []},
                    ],
                    style: 'normal',
                  },
                ],
              },
              {
                _type: 'tableCell',
                _key: 'c3',
                content: [
                  {
                    _type: 'block',
                    _key: 'b3',
                    children: [
                      {_type: 'span', _key: 's3', text: 'd', marks: []},
                    ],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    expect(
      toTextspec({schema, value, selection: null, containers: tableContainers}),
    ).toBe(
      [
        'TABLE:',
        '  TABLEROW:',
        '    TABLECELL:',
        '      B: a',
        '    TABLECELL:',
        '      B: b',
        '  TABLEROW:',
        '    TABLECELL:',
        '      B: c',
        '    TABLECELL:',
        '      B: d',
      ].join('\n'),
    )
  })
})
