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
  .readFileSync(path.resolve(__dirname, 'office-online-nested-mixed-list.html'))
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
          text: 'foo',
        },
      ],
      level: 1,
      listItem: 'number',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'bar',
        },
      ],
      level: 2,
      listItem: 'bullet',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'baz',
        },
      ],
      level: 3,
      listItem: 'number',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'fizz',
        },
      ],
      level: 1,
      listItem: 'number',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'buzz',
        },
      ],
      level: 2,
      listItem: 'bullet',
    },
  ])
})
