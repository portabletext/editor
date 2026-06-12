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

const html = '<html><body><pre>const a = 1\n  const b = 2</pre></body></html>'

function parse(schema: typeof schemaWithCodeBlockObject) {
  return htmlToPortableText(html, {
    schema,
    keyGenerator: createTestKeyGenerator(),
    parseHtml: (h) => new JSDOM(h).window.document,
  })
}

test('becomes a code block object when the schema defines one', () => {
  expect(parse(schemaWithCodeBlockObject)).toEqual([
    {
      _key: 'randomKey0',
      _type: 'code',
      code: 'const a = 1\n  const b = 2',
    },
  ])
})

test('falls back to a `code`-decorated text block when the schema only has the decorator', () => {
  expect(parse(schemaWithCodeDecorator)).toEqual([
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

test('falls back to plain text when the schema has neither', () => {
  expect(parse(schemaWithoutCode)).toEqual([
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
