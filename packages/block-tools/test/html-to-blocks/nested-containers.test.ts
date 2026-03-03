import fs from 'node:fs'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const html = fs
  .readFileSync(path.resolve(__dirname, 'nested-containers.html'))
  .toString()

const json = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'nested-containers.json'), 'utf-8'),
)

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, defaultSchema, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual(json)
})
