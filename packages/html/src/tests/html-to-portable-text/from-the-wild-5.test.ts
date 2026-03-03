import fs from 'node:fs'
import path from 'node:path'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {isElement} from '../../deserializer/helpers'
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
      schema,
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
                  schema,
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
