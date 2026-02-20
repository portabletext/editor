import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'
import {testSchema} from './test-utils'

describe('htmlToPortableText', () => {
  test('list items without parent', () => {
    expect(
      htmlToPortableText(`<li>foo bar</li><li>baz</li>`, {
        schema: testSchema,
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
