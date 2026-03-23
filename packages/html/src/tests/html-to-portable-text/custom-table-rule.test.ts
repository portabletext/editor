import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import type {ObjectMatcher} from '../../matchers'
import type {DeserializerRule} from '../../types'
import {createTestKeyGenerator} from '../test-key-generator'

const imageMatcher: ObjectMatcher<{src?: string; alt?: string}> = ({
  context,
  value,
  isInline,
}) => {
  const schemaCollection = isInline
    ? context.schema.inlineObjects
    : context.schema.blockObjects

  if (!schemaCollection.some((obj) => obj.name === 'image')) {
    return undefined
  }

  return {
    _key: context.keyGenerator(),
    _type: 'image',
    ...(value.src ? {src: value.src} : {}),
  }
}

const schema = compileSchema(
  defineSchema({
    decorators: [{name: 'strong'}, {name: 'em'}],
    annotations: [{name: 'link'}],
    blockObjects: [
      {name: 'table'},
      {name: 'image', fields: [{name: 'src', type: 'string'}]},
    ],
    inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
  }),
)

function createTableRule(keyGenerator: () => string): DeserializerRule {
  return {
    deserialize(el, next, createBlock) {
      if (el.nodeType !== 1) {
        return undefined
      }

      const element = el as Element

      if (element.tagName.toLowerCase() !== 'table') {
        return undefined
      }

      const rows = []

      for (const tr of element.querySelectorAll('tr')) {
        const tds = tr.querySelectorAll('td, th')

        rows.push({
          _type: 'tableRow',
          _key: keyGenerator(),
          cells: Array.from(tds).map((td) => ({
            _type: 'tableCell',
            _key: keyGenerator(),
            content: next(td.childNodes),
          })),
        })
      }

      if (rows.length === 0) {
        return undefined
      }

      return createBlock({
        _type: 'table',
        _key: keyGenerator(),
        rows,
      }).block
    },
  }
}

function transform(html: string) {
  const keyGenerator = createTestKeyGenerator('k')
  return htmlToPortableText(html, {
    schema,
    parseHtml: (html) => new JSDOM(html).window.document,
    keyGenerator,
    rules: [createTableRule(keyGenerator)],
    types: {
      image: imageMatcher,
    },
  })
}

describe('custom table rule', () => {
  test('simple table', () => {
    const html = [
      '<table>',
      '<tr><td>foo</td><td>bar</td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [{_type: 'span', marks: [], text: 'foo'}],
              },
              {
                _type: 'tableCell',
                _key: 'k2',
                content: [{_type: 'span', marks: [], text: 'bar'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('cell formatting is preserved', () => {
    const html = [
      '<table>',
      '<tr><td><strong>bold</strong> and <em>italic</em></td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k2',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [
                  {_type: 'span', marks: ['strong'], text: 'bold'},
                  {_type: 'span', marks: [], text: ' and '},
                  {_type: 'span', marks: ['em'], text: 'italic'},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('cell with link', () => {
    const html = [
      '<table>',
      '<tr><td>visit <a href="https://sanity.io">Sanity</a></td></tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [
                  {_type: 'span', marks: [], text: 'visit '},
                  {_type: 'span', marks: ['k2'], text: 'Sanity'},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('cell with inline image', () => {
    const html = [
      '<table>',
      '<tr>',
      '<td>text <img src="https://example.com/photo.jpg" /> more</td>',
      '</tr>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k3',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [
                  {_type: 'span', marks: [], text: 'text '},
                  {
                    _key: 'k2',
                    _type: 'image',
                    src: 'https://example.com/photo.jpg',
                  },
                  {_type: 'span', marks: [], text: ' more'},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('mixed content: text before and after table', () => {
    const html = [
      '<p>before</p>',
      '<table><tr><td>cell</td></tr></table>',
      '<p>after</p>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'block',
        _key: 'k3',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k4', marks: [], text: 'before'}],
      },
      {
        _type: 'table',
        _key: 'k2',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [{_type: 'span', marks: [], text: 'cell'}],
              },
            ],
          },
        ],
      },
      {
        _type: 'block',
        _key: 'k5',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k6', marks: [], text: 'after'}],
      },
    ])
  })

  test('table with thead and tbody', () => {
    const html = [
      '<table>',
      '<thead><tr><th>Name</th><th>Age</th></tr></thead>',
      '<tbody><tr><td>Alice</td><td>30</td></tr></tbody>',
      '</table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [{_type: 'span', marks: [], text: 'Name'}],
              },
              {
                _type: 'tableCell',
                _key: 'k2',
                content: [{_type: 'span', marks: [], text: 'Age'}],
              },
            ],
          },
          {
            _type: 'tableRow',
            _key: 'k3',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k4',
                content: [{_type: 'span', marks: [], text: 'Alice'}],
              },
              {
                _type: 'tableCell',
                _key: 'k5',
                content: [{_type: 'span', marks: [], text: '30'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Google Sheets style table with wrapped content', () => {
    /**
     * Google Sheets wraps cell content in <p><span>...</span></p>
     *
     * | foo | bar  |
     * | baz | fizz |
     */
    const html = [
      '<table><tbody>',
      '<tr>',
      '<td><p><span>foo</span></p></td>',
      '<td><p><span>bar</span></p></td>',
      '</tr>',
      '<tr>',
      '<td><p><span>baz</span></p></td>',
      '<td><p><span>fizz</span></p></td>',
      '</tr>',
      '</tbody></table>',
    ].join('')

    expect(transform(html)).toEqual([
      {
        _type: 'table',
        _key: 'k6',
        rows: [
          {
            _type: 'tableRow',
            _key: 'k0',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k1',
                content: [
                  {
                    _type: 'block',
                    markDefs: [],
                    style: 'normal',
                    children: [{_type: 'span', marks: [], text: 'foo'}],
                  },
                ],
              },
              {
                _type: 'tableCell',
                _key: 'k2',
                content: [
                  {
                    _type: 'block',
                    markDefs: [],
                    style: 'normal',
                    children: [{_type: 'span', marks: [], text: 'bar'}],
                  },
                ],
              },
            ],
          },
          {
            _type: 'tableRow',
            _key: 'k3',
            cells: [
              {
                _type: 'tableCell',
                _key: 'k4',
                content: [
                  {
                    _type: 'block',
                    markDefs: [],
                    style: 'normal',
                    children: [{_type: 'span', marks: [], text: 'baz'}],
                  },
                ],
              },
              {
                _type: 'tableCell',
                _key: 'k5',
                content: [
                  {
                    _type: 'block',
                    markDefs: [],
                    style: 'normal',
                    children: [{_type: 'span', marks: [], text: 'fizz'}],
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
