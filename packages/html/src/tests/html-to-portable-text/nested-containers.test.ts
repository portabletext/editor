import fs from 'node:fs'
import path from 'node:path'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
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
  .readFileSync(path.resolve(__dirname, 'nested-containers.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'nested-containers.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

test('htmlToPortableText', () => {
  expect(
    htmlToPortableText(html, {
      schema,
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual(json)
})
