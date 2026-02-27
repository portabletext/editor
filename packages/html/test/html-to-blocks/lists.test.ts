import fs from 'node:fs'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToPortableText} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'
import {testSchema} from './test-utils'

const html = fs.readFileSync(path.resolve(__dirname, 'lists.html')).toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'lists.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

test('htmlToPortableText', () => {
  expect(
    htmlToPortableText(html, {
      schema: testSchema,
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual(json)
})
