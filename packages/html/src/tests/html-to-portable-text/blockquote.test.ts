import {JSDOM} from 'jsdom'
import {describe, expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import defaultSchema from '../fixtures/defaultSchema'
import {createTestKeyGenerator} from '../test-key-generator'

const schema = defaultSchema

describe('htmlToPortableText', () => {
  test('blockquote of paragraphs', () => {
    expect(
      htmlToPortableText(
        `<blockquote><p>foo bar baz</p><p>fizz buzz</p></blockquote>`,
        {
          schema,
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
      htmlToPortableText(
        `
<blockquote>
  <p>foo bar baz</p>
  <p>fizz buzz</p>
</blockquote>
`,
        {
          schema,
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
      htmlToPortableText(
        `
<blockquote>
  <p>foo bar baz</p>
  fizz buzz
</blockquote>
`,
        {
          schema,
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
      htmlToPortableText(
        `
<blockquote>
  foo bar baz
  <p>fizz buzz</p>
</blockquote>
`,
        {
          schema,
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
      htmlToPortableText(
        `
<blockquote>
  <h1>foo bar baz</h1>
  <h2>fizz buzz</h2>
</blockquote>
`,
        {
          schema,
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
      htmlToPortableText(
        `
<blockquote>
  <span>foo bar baz</span>
  <span>fizz buzz</span>
</blockquote>
`,
        {
          schema,
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

  test('nested blockquotes', () => {
    expect(
      htmlToPortableText(
        `
<blockquote>
  <blockquote>
    <p>foo bar baz</p>
  </blockquote>
</blockquote>
`,
        {
          schema,
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
            text: 'foo bar baz',
          },
        ],
        markDefs: [],
        style: 'blockquote',
      },
    ])
  })
})
