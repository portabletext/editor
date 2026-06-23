import {compileSchema, defineSchema} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {expect, test} from 'vitest'
import {htmlToPortableText} from '../../index'
import {createTestKeyGenerator} from '../test-key-generator'

const schemaWithCodeBlockObject = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}, {name: 'h1'}, {name: 'blockquote'}],
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
    annotations: [{name: 'link'}],
    lists: [{name: 'bullet'}, {name: 'number'}],
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

function gdocsHtml(body: string): string {
  return `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-cea9abab-7fff-f1a6-530d-825e90dd61d7">${body}</b><br class="Apple-interchange-newline">`
}

const gdocsParagraphStyle = 'line-height:1.38;margin-top:0pt;margin-bottom:0pt;'
const gdocsTextSpanStyle =
  'font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;'
const gdocsCodeSpanStyle =
  "font-size:9pt;font-family:'Roboto Mono',monospace;color:#37474f;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"

function paragraph(text: string): string {
  return `<p dir="ltr" style="${gdocsParagraphStyle}"><span style="${gdocsTextSpanStyle}">${text}</span></p>`
}

function codeParagraph(text: string): string {
  return `<p dir="ltr" style="${gdocsParagraphStyle}"><span style="${gdocsCodeSpanStyle}">${text}</span></p>`
}

// A blank line inside a Google Docs code block: the monospace span contains
// only a `<br>`
function blankCodeParagraph(): string {
  return `<p dir="ltr" style="${gdocsParagraphStyle}"><span style="${gdocsCodeSpanStyle}"><br /></span></p>`
}

function parse(html: string, schema = schemaWithCodeBlockObject) {
  return htmlToPortableText(html, {
    schema,
    keyGenerator: createTestKeyGenerator(),
    parseHtml: (h) => new JSDOM(h).window.document,
  })
}

test('a monospace paragraph between regular paragraphs becomes a code block object', () => {
  const html = gdocsHtml(
    `${paragraph('foo')}${codeParagraph('bar')}${paragraph('baz')}`,
  )

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey1',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey2', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'bar',
    },
    {
      _key: 'randomKey3',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey4', marks: [], text: 'baz'}],
    },
  ])
})

test('consecutive monospace paragraphs merge into a single multi-line code block object', () => {
  const html = gdocsHtml(
    `${paragraph('foo')}${codeParagraph('const a = 1')}${codeParagraph('const b = 2')}${paragraph('baz')}`,
  )

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey1',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey2', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1\nconst b = 2',
    },
    {
      _key: 'randomKey3',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey4', marks: [], text: 'baz'}],
    },
  ])
})

test('a single monospace paragraph becomes a single-line code block object', () => {
  const html = gdocsHtml(codeParagraph('const a = 1'))

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1',
    },
  ])
})

test('indentation inside code lines is preserved', () => {
  const html = gdocsHtml(
    `${codeParagraph('def foo():')}${codeParagraph('    return x')}`,
  )

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'def foo():\n    return x',
    },
  ])
})

test('blank lines inside a run of monospace paragraphs stay inside the code block', () => {
  const html = gdocsHtml(
    `${paragraph('foo')}${codeParagraph('const a = 1')}${blankCodeParagraph()}${codeParagraph('const b = 2')}${paragraph('baz')}`,
  )

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey1',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey2', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1\n\nconst b = 2',
    },
    {
      _key: 'randomKey3',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey4', marks: [], text: 'baz'}],
    },
  ])
})

test('a monospace span inside a mixed paragraph becomes a `code` decorator', () => {
  const html = gdocsHtml(
    `<p dir="ltr" style="${gdocsParagraphStyle}"><span style="${gdocsTextSpanStyle}">use </span><span style="${gdocsCodeSpanStyle}">foo()</span><span style="${gdocsTextSpanStyle}"> here</span></p>`,
  )

  expect(parse(html)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'randomKey1', marks: [], text: 'use '},
        {_type: 'span', _key: 'randomKey2', marks: ['code'], text: 'foo()'},
        {_type: 'span', _key: 'randomKey3', marks: [], text: ' here'},
      ],
    },
  ])
})

test('falls back to a `code`-decorated text block when the schema has no code block object', () => {
  const html = gdocsHtml(`${paragraph('foo')}${codeParagraph('bar')}`)

  expect(parse(html, schemaWithCodeDecorator)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey1', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey2',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 'randomKey3', marks: ['code'], text: 'bar'},
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

  const html = gdocsHtml(`${paragraph('foo')}${codeParagraph('bar')}`)

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
      _key: 'randomKey1',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey2', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey0',
      _type: 'codeSnippet',
      source: 'bar',
      lang: undefined,
    },
  ])
})

test('falls back to plain text when the schema has neither a code block object nor a `code` decorator', () => {
  const html = gdocsHtml(`${paragraph('foo')}${codeParagraph('bar')}`)

  expect(parse(html, schemaWithoutCode)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey1', marks: [], text: 'foo'}],
    },
    {
      _key: 'randomKey2',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'randomKey3', marks: [], text: 'bar'}],
    },
  ])
})
