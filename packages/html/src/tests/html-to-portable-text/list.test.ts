import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import {createTestKeyGenerator} from '../test-key-generator'

const schema = compileSchema(
  defineSchema({
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
    decorators: [
      {name: 'strong'},
      {name: 'em'},
      {name: 'underline'},
      {name: 'strike-through'},
      {name: 'code'},
    ],
    annotations: [{name: 'link'}],
    lists: [{name: 'bullet'}, {name: 'number'}],
  }),
)

describe('htmlToPortableText', () => {
  test('list items without parent', () => {
    expect(
      htmlToPortableText(`<li>foo bar</li><li>baz</li>`, {
        schema,
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator(),
      }),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar',
          },
        ],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
      {
        _key: 'randomKey2',
        _type: 'block',
        children: [
          {
            _key: 'randomKey3',
            _type: 'span',
            marks: [],
            text: 'baz',
          },
        ],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ])
  })
})
