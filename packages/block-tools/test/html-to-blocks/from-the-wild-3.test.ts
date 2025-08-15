import fs from 'node:fs'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import {isElement} from '../../src/HtmlDeserializer/helpers'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const blockContentType = defaultSchema
  .get('blogPost')
  .fields.find((field: any) => field.name === 'body').type

const html = fs
  .readFileSync(path.resolve(__dirname, 'from-the-wild-3.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'from-the-wild-3.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
      rules: [
        {
          // Special case for pictures
          deserialize(el, _next, block) {
            if (!isElement(el) || el.tagName.toLowerCase() !== 'picture') {
              return undefined
            }
            return block({
              _type: 'image',
              _sanityAsset: 'image@<url>',
            })
          },
        },
      ],
    }),
  ).toEqual(json)
})
