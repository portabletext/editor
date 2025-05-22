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
  .readFileSync(path.resolve(__dirname, 'office-online-ordered-list.html'))
  .toString()

const keyGenerator = createTestKeyGenerator()

test(htmlToBlocks.name, () => {
  expect(
    htmlToBlocks(html, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator,
    }),
  ).toEqual([
    {
      _type: 'block',
      _key: 'randomKey1',
      children: [
        {
          _type: 'span',
          _key: 'randomKey2',
          marks: [],
          text: 'foo',
        },
      ],
      level: 1,
      listItem: 'number',
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'randomKey3',
      children: [
        {
          _type: 'span',
          _key: 'randomKey4',
          marks: ['strong'],
          text: 'bar',
        },
      ],
      level: 2,
      listItem: 'number',
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'randomKey5',
      children: [
        {
          _type: 'span',
          _key: 'randomKey6',
          marks: ['em'],
          text: 'baz',
        },
      ],
      level: 2,
      listItem: 'number',
      markDefs: [],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'randomKey7',
      children: [
        {
          _type: 'span',
          _key: 'randomKey8',
          marks: ['randomKey0'],
          text: 'fizz',
        },
      ],
      level: 1,
      listItem: 'number',
      markDefs: [
        {
          _key: 'randomKey0',
          _type: 'link',
          href: 'https://example.com/',
        },
      ],
      style: 'normal',
    },
    {
      _type: 'block',
      _key: 'randomKey9',
      children: [
        {
          _type: 'span',
          _key: 'randomKey10',
          marks: [],
          text: 'buzz',
        },
      ],
      level: 1,
      listItem: 'number',
      markDefs: [],
      style: 'normal',
    },
  ])
})
