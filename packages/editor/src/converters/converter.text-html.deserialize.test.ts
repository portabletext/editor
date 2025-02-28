import {describe, expect, test} from 'vitest'
import {
  compileSchemaDefinition,
  defineSchema,
  type SchemaDefinition,
} from '../editor/define-schema'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {converterTextHtml} from './converter.text-html'
import {coreConverters} from './converters.core'

function createSnapshot(schema: SchemaDefinition) {
  return createTestSnapshot({
    context: {
      converters: coreConverters,
      schema: compileSchemaDefinition(schema),
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

describe(converterTextHtml.deserialize.name, () => {
  test('paragraph with unknown decorators', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: decoratedParagraph,
        },
      }),
    ).toMatchObject({
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
    ).toMatchObject({
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
    ).toMatchObject({
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
    ).toMatchObject({
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
    })
  })

  test('paragraph with known link', () => {
    expect(
      converterTextHtml.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            annotations: [{name: 'link'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: paragraphWithLink,
        },
      }),
    ).toMatchObject({
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
    ).toMatchObject({
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
    ).toMatchObject({
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
    ).toMatchObject({
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
    })
  })
})
