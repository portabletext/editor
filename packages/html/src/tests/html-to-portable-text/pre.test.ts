import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import {createTestKeyGenerator} from '../test-key-generator'

const schemaWithCodeBlockObject = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}],
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
    blockObjects: [
      {
        name: 'code',
        fields: [
          {name: 'code', type: 'string'},
          {name: 'language', type: 'string'},
        ],
      },
    ],
  }),
)

const schemaWithCodeDecorator = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}],
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
  }),
)

const schemaWithoutCode = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}],
    decorators: [{name: 'strong'}, {name: 'em'}],
  }),
)

function parse(html: string, schema: typeof schemaWithCodeBlockObject) {
  return htmlToPortableText(html, {
    schema,
    keyGenerator: createTestKeyGenerator(),
    parseHtml: (h) => new JSDOM(h).window.document,
  })
}

const html = '<html><body><pre>const a = 1\n  const b = 2</pre></body></html>'

test('becomes a code block object when the schema defines one', () => {
  expect(parse(html, schemaWithCodeBlockObject)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1\n  const b = 2',
    },
  ])
})

test('trims whitespace-only leading and trailing artifacts of the HTML source markup while preserving inner indentation', () => {
  const html =
    '<html><body><pre>\n  const a = 1\n  const b = 2\n</pre></body></html>'

  expect(parse(html, schemaWithCodeBlockObject)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1\n  const b = 2',
    },
  ])
})

test('falls back to a `code`-decorated text block when the schema only has the decorator', () => {
  expect(parse(html, schemaWithCodeDecorator)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 'randomKey1',
          marks: ['code'],
          text: 'const a = 1\n  const b = 2',
        },
      ],
    },
  ])
})

test('a custom code block matcher in `types.code` overrides the default code block emission', () => {
  const schemaWithCustomCode = compileSchema(
    defineSchema({
      styles: [{name: 'normal'}],
      decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
      blockObjects: [
        {
          name: 'codeSnippet',
          fields: [
            {name: 'source', type: 'string'},
            {name: 'lang', type: 'string'},
          ],
        },
      ],
    }),
  )

  const result = htmlToPortableText(html, {
    schema: schemaWithCustomCode,
    keyGenerator: createTestKeyGenerator(),
    parseHtml: (h) => new JSDOM(h).window.document,
    types: {
      code: ({context, value}) => ({
        _key: context.keyGenerator(),
        _type: 'codeSnippet',
        source: value.code,
        lang: value.language,
      }),
    },
  })

  expect(result).toEqual([
    {
      _key: 'randomKey0',
      _type: 'codeSnippet',
      source: 'const a = 1\n  const b = 2',
      lang: undefined,
    },
  ])
})

test('falls back to plain text when the schema has neither', () => {
  expect(parse(html, schemaWithoutCode)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 'randomKey1',
          marks: [],
          text: 'const a = 1\n  const b = 2',
        },
      ],
    },
  ])
})
