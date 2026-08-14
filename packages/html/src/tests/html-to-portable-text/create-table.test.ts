import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../html-to-portable-text'
import {
  createTableRule,
  type TableRuleContainers,
} from '../../rules/_exports/index'
import {createTestKeyGenerator} from '../test-key-generator'

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link'}],
    blockObjects: [{name: 'table'}],
  }),
)

function transform(
  html: string,
  ruleOptions: {containers?: TableRuleContainers} = {},
) {
  const keyGenerator = createTestKeyGenerator('k')
  return htmlToPortableText(html, {
    schema,
    keyGenerator,
    parseHtml: (h) => new JSDOM(h).window.document,
    rules: [createTableRule({schema, keyGenerator, ...ruleOptions})],
  })
}

describe(createTableRule.name, () => {
  test('table with tbody only', () => {
    const html = [
      '<table>',
      '<tbody>',
      '<tr><td>foo</td><td>bar</td></tr>',
      '</tbody>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k7',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: 'bar', marks: []},
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

  test('thead row plus body rows sets headerRows', () => {
    const html = [
      '<table>',
      '<thead><tr><th>Name</th><th>Age</th></tr></thead>',
      '<tbody><tr><td>foo</td><td>1</td></tr></tbody>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k14',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'Name', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: 'Age', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                value: [
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k10', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k11',
                value: [
                  {
                    _type: 'block',
                    _key: 'k12',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k13', text: '1', marks: []},
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

  test('all-th first row without a thead also sets headerRows', () => {
    const html = [
      '<table>',
      '<tr><th>Name</th><th>Age</th></tr>',
      '<tr><td>foo</td><td>1</td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k14',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'Name', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: 'Age', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                value: [
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k10', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k11',
                value: [
                  {
                    _type: 'block',
                    _key: 'k12',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k13', text: '1', marks: []},
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

  test('a header-shaped row after a body row does not set headerRows', () => {
    const html = [
      '<table>',
      '<tr><td>foo</td><td>1</td></tr>',
      '<tr><th>Name</th><th>Age</th></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k14',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: '1', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                value: [
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k10', text: 'Name', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k11',
                value: [
                  {
                    _type: 'block',
                    _key: 'k12',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k13', text: 'Age', marks: []},
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

  test('ragged rows are padded to the widest row', () => {
    const html = [
      '<table>',
      '<tr><td>foo</td><td>bar</td></tr>',
      '<tr><td>baz</td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k14',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                value: [
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k10', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k11',
                value: [
                  {
                    _type: 'block',
                    _key: 'k12',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k13', text: '', marks: []},
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

  test('an empty cell heals to one empty text block', () => {
    const html = ['<table>', '<tr><td>a</td><td></td></tr>', '</table>'].join(
      '',
    )

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k7',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'a', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: '', marks: []},
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

  test('a whitespace-only cell heals to one empty text block', () => {
    const html = ['<table>', '<tr><td> \n </td></tr>', '</table>'].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: '', marks: []},
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

  test('a table nested inside a cell stays scoped to its own rows and cells', () => {
    const html = [
      '<table>',
      '<tr><td>foo</td><td><table><tr><td>bar</td></tr></table></td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k10',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'table',
                    _key: 'k9',
                    rows: [
                      {
                        _type: 'row',
                        _key: 'k5',
                        cells: [
                          {
                            _type: 'cell',
                            _key: 'k6',
                            value: [
                              {
                                _type: 'block',
                                _key: 'k7',
                                style: 'normal',
                                markDefs: [],
                                children: [
                                  {
                                    _type: 'span',
                                    _key: 'k8',
                                    text: 'bar',
                                    marks: [],
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
    ])
  })

  test('inline formatting inside a cell', () => {
    const html = [
      '<table>',
      '<tr><td>visit <a href="https://sanity.io">Sanity</a> and <strong>bold</strong></td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k8',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k3',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k4', text: 'visit ', marks: []},
                      {
                        _type: 'span',
                        _key: 'k5',
                        text: 'Sanity',
                        marks: ['k2'],
                      },
                      {_type: 'span', _key: 'k6', text: ' and ', marks: []},
                      {
                        _type: 'span',
                        _key: 'k7',
                        text: 'bold',
                        marks: ['strong'],
                      },
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

  test('custom container names', () => {
    const richTableSchema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'richTable',
            fields: [
              {name: 'headerRows', type: 'number'},
              {
                name: 'tableRows',
                type: 'array',
                of: [
                  {
                    type: 'object',
                    name: 'tableRow',
                    fields: [
                      {
                        name: 'rowCells',
                        type: 'array',
                        of: [
                          {
                            type: 'object',
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
      }),
    )

    const keyGenerator = createTestKeyGenerator('k')
    const html = '<table><tr><td>foo</td></tr></table>'

    expect(
      htmlToPortableText(html, {
        schema: richTableSchema,
        keyGenerator,
        parseHtml: (h) => new JSDOM(h).window.document,
        rules: [
          createTableRule({
            schema: richTableSchema,
            keyGenerator,
            containers: {
              table: {type: 'richTable', arrayField: 'tableRows'},
              row: {type: 'tableRow', arrayField: 'rowCells'},
              cell: {type: 'tableCell', arrayField: 'content'},
            },
          }),
        ],
      }),
    ).toEqual([
      {
        _type: 'richTable',
        _key: 'k4',
        tableRows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            rowCells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
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

  test('an omitted container role keeps the canonical names', () => {
    const html = '<table><tr><td>foo</td></tr></table>'

    expect(
      transform(html, {containers: {cell: {arrayField: 'content'}}}),
    ).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
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

  test('a container definition carrying a render is read for its names alone', () => {
    const cellContainer = {
      kind: 'container',
      type: 'cell',
      arrayField: 'value',
      render: () => null,
      of: [{type: 'block'}],
    }
    const html = '<table><tr><td>foo</td></tr></table>'

    expect(transform(html, {containers: {cell: cellContainer}})).toEqual([
      {
        _type: 'table',
        _key: 'k4',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
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

  test('colspan is ignored: a spanning cell contributes one cell, padding fills the rest', () => {
    const html = [
      '<table>',
      '<tr><td colspan="2">foo</td></tr>',
      '<tr><td>bar</td><td>baz</td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k14',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: '', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
          {
            _type: 'row',
            _key: 'k7',
            cells: [
              {
                _type: 'cell',
                _key: 'k8',
                value: [
                  {
                    _type: 'block',
                    _key: 'k9',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k10', text: 'bar', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k11',
                value: [
                  {
                    _type: 'block',
                    _key: 'k12',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k13', text: 'baz', marks: []},
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

  test('Google Docs table fixture', () => {
    const html = [
      '<b style="font-weight:normal;" id="docs-internal-guid-e0aa048e-7fff-f3cb">',
      '<div dir="ltr" style="margin-left:0pt;" align="left">',
      '<table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt">',
      '<colgroup><col /><col /></colgroup>',
      '<tbody>',
      '<tr style="height:0pt">',
      '<td style="border:solid #000000 1pt;vertical-align:top;padding:5pt;">',
      '<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;">',
      '<span style="font-size:12pt;font-family:Arial,sans-serif;">foo</span>',
      '</p>',
      '</td>',
      '<td style="border:solid #000000 1pt;vertical-align:top;padding:5pt;">',
      '<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;">',
      '<span style="font-size:12pt;font-family:Arial,sans-serif;">bar</span>',
      '</p>',
      '</td>',
      '</tr>',
      '</tbody>',
      '</table>',
      '</div>',
      '</b>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k7',
        rows: [
          {
            _type: 'row',
            _key: 'k0',
            cells: [
              {
                _type: 'cell',
                _key: 'k1',
                value: [
                  {
                    _type: 'block',
                    _key: 'k2',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                    ],
                  },
                ],
              },
              {
                _type: 'cell',
                _key: 'k4',
                value: [
                  {
                    _type: 'block',
                    _key: 'k5',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_type: 'span', _key: 'k6', text: 'bar', marks: []},
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

  test('non-table HTML falls through to the standard rules', () => {
    expect(transform('<p>foo</p>')).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
      },
    ])
  })
})
