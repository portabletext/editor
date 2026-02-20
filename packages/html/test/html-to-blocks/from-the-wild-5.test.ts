import fs from 'node:fs'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToPortableText} from '../../src'
import {isElement} from '../../src/HtmlDeserializer/helpers'
import {createTestKeyGenerator} from '../test-key-generator'
import {testSchema} from './test-utils'

const html = fs
  .readFileSync(path.resolve(__dirname, 'from-the-wild-5.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'from-the-wild-5.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

const findElement = (nodes: any, target: string) =>
  nodes.find((i: ChildNode) => i.nodeName.toLowerCase() === target)

test('htmlToPortableText', () => {
  expect(
    htmlToPortableText(html, {
      schema: testSchema,
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
      rules: [
        {
          deserialize(el, _next, block) {
            if (isElement(el) && el.tagName.toLowerCase() === 'cta') {
              const items = Array.from(el.childNodes)
              const title = findElement(items, 'h2')
              const intro = findElement(items, 'div')?.childNodes[0]
              const anchor = findElement(items, 'a')

              return block({
                _type: 'promo',
                title: title.textContent,
                intro: htmlToPortableText(intro.innerHTML, {
                  schema: testSchema,
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
