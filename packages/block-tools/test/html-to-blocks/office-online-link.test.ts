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
  .readFileSync(path.resolve(__dirname, 'office-online-link.html'))
  .toString()

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toMatchObject([
    {
      _key: 'randomKey1',
      _type: 'block',
      children: [
        {
          _key: 'randomKey2',
          _type: 'span',
          text: 'a link',
          marks: ['randomKey0'],
        },
      ],
      markDefs: [
        {
          _key: 'randomKey0',
          _type: 'link',
          href: 'https://example.com/',
        },
      ],
    },
  ])
})
