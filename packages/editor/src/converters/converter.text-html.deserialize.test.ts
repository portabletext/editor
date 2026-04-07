import {
  compileSchema,
  defineSchema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {converterTextHtml} from './converter.text-html'

function createSnapshot(schemaDefinition: SchemaDefinition) {
  const schema = compileSchema(schemaDefinition)
  return createTestSnapshot({
    context: {
      converters: [],
      schema,
    },
  })
}

const decoratedParagraph =
  '<p><em>foo <code><strong>bar</strong> baz</code></em></p>'
const image = '<img src="https://exampe.com/image.jpg" alt="Example image">'
const paragraphWithLink = '<p>fizz <a href="https://example.com">buzz</a></p>'
const unorderedList = '<ul><li>foo</li><li>bar</li></ul>'
const orderedList = '<ol><li>foo</li><li>bar</li></ol>'
const nestedList = '<ol><li>foo<ul><li>bar</li></ul></li></ol>'

describe(converterTextHtml.mimeType, () => {
  test('paragraph with unknown decorators', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: decoratedParagraph,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: 'foo bar baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('paragraph with known decorators', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            decorators: [{name: 'strong'}, {name: 'em'}, {name: 'code'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: decoratedParagraph,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: ['em'],
              text: 'foo ',
            },
            {
              _key: 'k2',
              _type: 'span',
              marks: ['em', 'code', 'strong'],
              text: 'bar',
            },
            {
              _key: 'k3',
              _type: 'span',
              marks: ['em', 'code'],
              text: ' baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('image', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            blockObjects: [{name: 'image'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: image,
        },
      }),
    ).toEqual({
      mimeType: 'text/html',
      reason: 'No blocks deserialized',
      type: 'deserialization.failure',
    })
  })

  test('paragraph with unknown link', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: paragraphWithLink,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: 'fizz buzz (https://example.com)',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('paragraph with known link', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
          }),
        ),
        event: {
          type: 'deserialize',
          data: paragraphWithLink,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k1',
          _type: 'block',
          children: [
            {
              _key: 'k2',
              _type: 'span',
              marks: [],
              text: 'fizz ',
            },
            {
              _key: 'k3',
              _type: 'span',
              marks: ['k0'],
              text: 'buzz',
            },
          ],
          markDefs: [
            {
              _key: 'k0',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('unordered list', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            lists: [{name: 'bullet'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: unorderedList,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: 'foo',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          level: 1,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('ordered list', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            lists: [{name: 'number'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: orderedList,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
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
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          level: 1,
          listItem: 'number',
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })

  test('nested list', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            lists: [{name: 'bullet'}, {name: 'number'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: nestedList,
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
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
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          level: 2,
          listItem: 'bullet',
          markDefs: [],
          style: 'normal',
        },
      ],
      mimeType: 'text/html',
      type: 'deserialization.success',
    })
  })
})
