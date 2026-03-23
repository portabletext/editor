import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const schema = defaultSchema

describe('htmlToPortableText', () => {
  test('span with space', () => {
    expect(
      htmlToPortableText(`a<span> </span>b`, {
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
            text: 'a b',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
