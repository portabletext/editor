import fs from 'node:fs'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const blockContentType = defaultSchema
  .get('blogPost')
  .fields.find((field: any) => field.name === 'body').type

const html = fs
  .readFileSync(path.resolve(__dirname, 'word-table.html'))
  .toString()

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual([
    {
      _type: 'block',
      _key: 'randomKey0',
      children: [
        {
          _type: 'span',
          _key: 'randomKey1',
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'randomKey2',
      children: [
        {
          _type: 'span',
          _key: 'randomKey3',
          text: 'bar',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ])
})
