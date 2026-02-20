import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'
import {testSchema} from './test-utils'

describe('htmlToPortableText', () => {
  test('span with space', () => {
    expect(
      htmlToPortableText(`a<span> </span>b`, {
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
            text: 'a b',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
