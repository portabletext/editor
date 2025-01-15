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
  .readFileSync(path.resolve(__dirname, 'from-the-wild-5.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'from-the-wild-5.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

const findElement = (nodes: any, target: string) =>
  nodes.find((i: ChildNode) => i.nodeName.toLowerCase() === target)

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
      rules: [
        {
          deserialize(el, _next, block) {
            if (isElement(el) && el.tagName.toLowerCase() === 'cta') {
              const items = Array.from(el.childNodes)
              const title = findElement(items, 'h2')
              const intro = findElement(items, 'div')?.childNodes[0]!
              const anchor = findElement(items, 'a')

              return block({
                _type: 'promo',
                title: title.textContent,
                intro: htmlToBlocks(intro.innerHTML, blockContentType, {
                  parseHtml: (html) => new JSDOM(html).window.document,
                  keyGenerator,
                }),
                link: {
                  _type: 'link',
                  url: anchor.href,
                },
              })
            }
            return undefined
          },
        },
      ],
    }),
  ).toEqual(json)
})
