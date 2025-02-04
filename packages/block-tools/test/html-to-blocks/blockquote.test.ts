import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToBlocks} from '../../src'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const blockContentType = defaultSchema
  .get('blogPost')
  .fields.find((field: any) => field.name === 'body').type

describe(htmlToBlocks.name, () => {
  test('blockquote of paragraphs', () => {
    expect(
      htmlToBlocks(
        `<blockquote><p>foo bar baz</p><p>fizz buzz</p></blockquote>`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz\nfizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of paragraphs and whitespace', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  <p>foo bar baz</p>
  <p>fizz buzz</p>
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz\nfizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of paragraph and text node', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  <p>foo bar baz</p>
  fizz buzz
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz\nfizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of text node and paragraph', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  foo bar baz
  <p>fizz buzz</p>
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz\nfizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of headings', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  <h1>foo bar baz</h1>
  <h2>fizz buzz</h2>
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz\nfizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of spans', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  <span>foo bar baz</span>
  <span>fizz buzz</span>
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz fizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })

  test('blockquote of text nodes', () => {
    expect(
      htmlToBlocks(
        `
<blockquote>
  foo bar baz
  fizz buzz
</blockquote>
`,
        blockContentType,
        {
          parseHtml: (html) => new JSDOM(html).window.document,
          keyGenerator: createTestKeyGenerator(),
        },
      ),
    ).toEqual([
      {
        _key: 'randomKey0',
        _type: 'block',
        children: [
          {
            _key: 'randomKey1',
            _type: 'span',
            marks: [],
            text: 'foo bar baz fizz buzz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })
})
