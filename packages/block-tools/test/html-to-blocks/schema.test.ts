import {compileSchema, defineSchema} from '@portabletext/schema'
import {Schema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'

describe('Portable Text Schema', () => {
  test('empty schema', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(defineSchema({}))

    expect(
      htmlToBlocks('<p>Hello, World!</p>', schema, {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator,
      }),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello, World!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('schema with image', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
    )

    expect(
      htmlToBlocks('<p>Hello, World!</p>', schema, {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator,
      }),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello, World!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

describe('Sanity Schema', () => {
  test('empty schema', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = Schema.compile({
      types: [
        {
          title: 'Body',
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
            },
          ],
        },
      ],
    }).get('body')

    expect(
      htmlToBlocks('<p>Hello, World!</p>', schema, {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator,
      }),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello, World!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('schema with image', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = Schema.compile({
      types: [
        {
          title: 'Body',
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
            },
            {
              type: 'image',
            },
          ],
        },
        ...builtinTypes,
      ],
    }).get('body')

    expect(
      htmlToBlocks('<p>Hello, World!</p>', schema, {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator,
      }),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            text: 'Hello, World!',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})
