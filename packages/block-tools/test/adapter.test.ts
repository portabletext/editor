import {compileSchema, defineSchema} from '@portabletext/schema'
import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToBlocks} from '../src'

function createKeyGenerator(prefix = 'key') {
  let index = 0
  return () => `${prefix}${index++}`
}

describe('htmlToBlocks adapter', () => {
  test('accepts Schema from @portabletext/schema', () => {
    const schema = compileSchema(defineSchema({}))
    const blocks = htmlToBlocks('<p>Hello</p>', schema, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator: createKeyGenerator(),
    })
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      _type: 'block',
      children: [{_type: 'span', text: 'Hello'}],
    })
  })

  test('accepts ArraySchemaType from @sanity/schema', () => {
    const sanitySchema = Schema.compile({
      types: [
        {
          title: 'Body',
          name: 'body',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    }).get('body')

    const blocks = htmlToBlocks('<p>Hello</p>', sanitySchema, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator: createKeyGenerator(),
    })
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      _type: 'block',
      children: [{_type: 'span', text: 'Hello'}],
    })
  })

  test('passes unstable_whitespaceOnPasteMode as whitespace', () => {
    const schema = compileSchema(defineSchema({}))
    const blocks = htmlToBlocks('<p>Hello</p>', schema, {
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator: createKeyGenerator(),
      unstable_whitespaceOnPasteMode: 'normalize',
    })
    expect(blocks).toHaveLength(1)
  })
})
