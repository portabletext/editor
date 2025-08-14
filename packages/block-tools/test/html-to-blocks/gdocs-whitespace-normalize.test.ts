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
  .readFileSync(path.resolve(__dirname, 'gdocs-whitespace-normalize.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'gdocs-whitespace-normalize.json'),
    'utf-8',
  ),
)

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual(json)
})
