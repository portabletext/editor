import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {Containers} from '../src/schema/resolve-containers'
import {fromTextspec} from './from-textspec'
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

describe(fromTextspec.name, () => {
  test('simple paragraph', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: Hello|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'Hello', marks: []}],
        style: 'normal',
      },
    ])
  })

  test('heading', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'H1: Hello|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'Hello', marks: []}],
        style: 'h1',
      },
    ])
  })

  test('bold text (decorator)', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: [strong:bold]|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_key: 'k1', _type: 'span', text: 'bold', marks: ['strong']},
        ],
        style: 'normal',
      },
    ])
  })

  test('annotation (link)', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: [@link href="https://example.com":click here]|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_key: 'k2', _type: 'span', text: 'click here', marks: ['k1']},
        ],
        markDefs: [{_type: 'link', _key: 'k1', href: 'https://example.com'}],
        style: 'normal',
      },
    ])
  })

  test('mixed plain and marked text', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: Hello [strong:world]|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_key: 'k1', _type: 'span', text: 'Hello ', marks: []},
          {_key: 'k2', _type: 'span', text: 'world', marks: ['strong']},
        ],
        style: 'normal',
      },
    ])
  })

  test('block object', () => {
    expect(
      fromTextspec({schema, keyGenerator: createTestKeyGenerator()}, '{IMAGE}|')
        .blocks,
    ).toEqual([{_type: 'image', _key: 'k0'}])
  })

  test('simple bullet list', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'UL:\n  LI: first\n  LI: second|',
      ).blocks,
    ).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_key: 'k1', _type: 'span', text: 'first', marks: []}],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
      {
        _type: 'block',
        _key: 'k2',
        children: [{_key: 'k3', _type: 'span', text: 'second', marks: []}],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('collapsed selection', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: Hello|',
      ).selection,
    ).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
    })
  })

  test('range selection', () => {
    expect(
      fromTextspec(
        {schema, keyGenerator: createTestKeyGenerator()},
        'P: ^Hello|',
      ).selection,
    ).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
    })
  })

  test('table with one cell', () => {
    expect(
      fromTextspec(
        {
          schema,
          keyGenerator: createTestKeyGenerator(),
          containers: tableContainers,
        },
        'TABLE:\n  TABLEROW:\n    TABLECELL:\n      B: hello',
      ).blocks,
    ).toEqual([
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
                        _key: 'k1',
                        _type: 'span',
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
    ])
  })
})

describe('round-trip', () => {
  test('simple paragraph', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: Hello|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: Hello',
    )
  })

  test('heading', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'H1: Hello|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B style="h1": Hello',
    )
  })

  test('bold text', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: [strong:bold]|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: [strong:bold]',
    )
  })

  test('mixed text', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: Hello [strong:world]|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: Hello [strong:world]',
    )
  })

  test('multiple blocks', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: first|\nP: second',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: first\nB: second',
    )
  })

  test('bullet list', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'UL:\n  LI: first\n  LI: second|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B listItem="bullet": first\nB listItem="bullet": second',
    )
  })

  test('block object', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      '{IMAGE}|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe('{IMAGE}')
  })

  test('annotation', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: [@link href="https://example.com":click here]|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: [@link href="https://example.com":click here]',
    )
  })

  test('inline object', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'P: text {stock-ticker} more|',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: text {stock-ticker} more',
    )
  })

  test('table with one cell', () => {
    const {blocks} = fromTextspec(
      {
        schema,
        keyGenerator: createTestKeyGenerator(),
        containers: tableContainers,
      },
      'TABLE:\n  TABLEROW:\n    TABLECELL:\n      B: hello',
    )
    expect(
      toTextspec({
        schema,
        value: blocks,
        selection: null,
        containers: tableContainers,
      }),
    ).toBe('TABLE:\n  TABLEROW:\n    TABLECELL:\n      B: hello')
  })

  test('explicit block key via B attrs', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B _key="b1": Hello',
    )
    expect(blocks).toEqual([
      {
        _type: 'block',
        _key: 'b1',
        children: [{_key: 'k0', _type: 'span', text: 'Hello', marks: []}],
        style: 'normal',
      },
    ])
  })

  test('heading via B attrs', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B style="h1": Hello',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B style="h1": Hello',
    )
  })

  test('list item via B attrs', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B listItem="bullet": item',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B listItem="bullet": item',
    )
  })

  test('nested list item via B attrs', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B level=2 listItem="bullet": child',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B level=2 listItem="bullet": child',
    )
  })

  test('decorator', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B: [strong:Hello]',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B: [strong:Hello]',
    )
  })

  test('style with decorator', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createTestKeyGenerator()},
      'B style="h1": [strong:Hello] world',
    )
    expect(toTextspec({schema, value: blocks, selection: null})).toBe(
      'B style="h1": [strong:Hello] world',
    )
  })

  test('table with multiple cells', () => {
    const input = [
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
    ].join('\n')
    const {blocks} = fromTextspec(
      {
        schema,
        keyGenerator: createTestKeyGenerator(),
        containers: tableContainers,
      },
      input,
    )
    expect(
      toTextspec({
        schema,
        value: blocks,
        selection: null,
        containers: tableContainers,
      }),
    ).toBe(input)
  })
})
