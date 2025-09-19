import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'

describe('custom image schema', () => {
  test('Schema with array of block and customImage', () => {
    const customSchema = Schema.compile({
      name: 'withCustomImage',
      types: [
        {
          type: 'object',
          name: 'document',
          fields: [
            {
              title: 'Content',
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                },
                {
                  type: 'image',
                  name: 'customImage',
                },
              ],
            },
          ],
        },
      ],
    })

    const blockContentType = customSchema
      .get('document')
      .fields.find((field: any) => field.name === 'content').type

    const result = htmlToBlocks(
      `<p>This is a text block</p><img src="example.jpg" alt="An example image" />`,
      blockContentType,
      {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator(),
      },
    )

    expect(result).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'This is a text block',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Mixed content with text and customImage', () => {
    const customSchema = Schema.compile({
      name: 'withCustomImage',
      types: [
        {
          type: 'object',
          name: 'article',
          fields: [
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
                  name: 'customImage',
                },
              ],
            },
          ],
        },
      ],
    })

    const blockContentType = customSchema
      .get('article')
      .fields.find((field: any) => field.name === 'body').type

    const result = htmlToBlocks(
      `<p>First paragraph</p><img src="photo.jpg" alt="A photo" /><p>Second paragraph</p>`,
      blockContentType,
      {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator(),
      },
    )

    expect(result).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'First paragraph',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'randomKey2',
        _type: 'block',
        children: [
          {
            _key: 'randomKey3',
            _type: 'span',
            marks: [],
            text: 'Second paragraph',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Multiple paragraphs with customImage type in schema', () => {
    const customSchema = Schema.compile({
      name: 'withCustomImage',
      types: [
        {
          type: 'object',
          name: 'post',
          fields: [
            {
              title: 'Content',
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                },
                {
                  type: 'image',
                  name: 'customImage',
                },
              ],
            },
          ],
        },
      ],
    })

    const blockContentType = customSchema
      .get('post')
      .fields.find((field: any) => field.name === 'content').type

    const result = htmlToBlocks(
      `<p>First paragraph with <strong>bold text</strong></p><p>Second paragraph with <em>italic text</em></p>`,
      blockContentType,
      {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator(),
      },
    )

    expect(result).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'First paragraph with ',
          },
          {
            _key: 'randomKey2',
            _type: 'span',
            marks: ['strong'],
            text: 'bold text',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'randomKey3',
        _type: 'block',
        children: [
          {
            _key: 'randomKey4',
            _type: 'span',
            marks: [],
            text: 'Second paragraph with ',
          },
          {
            _key: 'randomKey5',
            _type: 'span',
            marks: ['em'],
            text: 'italic text',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Nested content with customImage in schema', () => {
    const customSchema = Schema.compile({
      name: 'withCustomImage',
      types: [
        {
          type: 'object',
          name: 'page',
          fields: [
            {
              title: 'Main Content',
              name: 'mainContent',
              type: 'array',
              of: [
                {
                  type: 'block',
                },
                {
                  type: 'image',
                  name: 'customImage',
                },
              ],
            },
          ],
        },
      ],
    })

    const blockContentType = customSchema
      .get('page')
      .fields.find((field: any) => field.name === 'mainContent').type

    const result = htmlToBlocks(
      `<blockquote><p>A quote within the content</p></blockquote>`,
      blockContentType,
      {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator(),
      },
    )

    expect(result).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'A quote within the content',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })
})
