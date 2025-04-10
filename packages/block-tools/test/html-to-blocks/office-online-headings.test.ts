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
  .readFileSync(path.resolve(__dirname, 'office-online-headings.html'))
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
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'Heading 1',
        },
      ],
      style: 'h1',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'Heading 2',
        },
      ],
      style: 'h2',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'Heading 3',
        },
      ],
      style: 'h3',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'Heading 4',
        },
      ],
      style: 'h4',
    },
  ])
})
