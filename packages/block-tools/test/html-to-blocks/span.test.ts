import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

describe(htmlToBlocks.name, () => {
  test('span with space', () => {
    expect(
      htmlToBlocks(`a<span> </span>b`, defaultSchema, {
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
