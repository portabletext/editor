import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {
  compileSchemaDefinition,
  compileSchemaDefinitionToLegacySchema,
  defineSchema,
  type SchemaDefinition,
} from '../editor/editor-schema'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import type {EditorSelection} from '../types/editor'
import {createConverterTextHtml} from './converter.text-html'

const decoratedParagraph: PortableTextTextBlock = {
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
}
const image: PortableTextBlock = {
  _type: 'image',
  _key: 'b2',
  src: 'https://example.com/image.jpg',
  alt: 'Example',
}
const b2: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b3',
  children: [
    {
      _type: 'span',
      _key: 'b3c1',
      text: 'baz',
    },
  ],
}
const paragraphWithInlineBlock: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b4',
  children: [
    {
      _type: 'span',
      _key: 'b4c1',
      text: 'fizz ',
    },
    {
      _type: 'stock-ticker',
      _key: 'b4c2',
      symbol: 'AAPL',
    },
    {
      _type: 'span',
      _key: 'b4c3',
      text: ' buzz',
    },
  ],
}

function createSnapshot(schema: SchemaDefinition, selection: EditorSelection) {
  return createTestSnapshot({
    context: {
      converters: [],
      schema: compileSchemaDefinition(schema),
      selection,
      value: [decoratedParagraph, image, b2, paragraphWithInlineBlock],
    },
  })
}

const converterTextHtml = createConverterTextHtml(
  compileSchemaDefinitionToLegacySchema(defineSchema({})),
)

describe(converterTextHtml.serialize.name, () => {
  test('paragraph with decorators', () => {
    expect(
      converterTextHtml.serialize({
        snapshot: createSnapshot(defineSchema({}), {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 2],
            offset: 4,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'clipboard.copy',
        },
      }),
    ).toMatchObject({
      data: '<p><em>foo <code><strong>bar</strong> baz</code></em></p>',
    })
  })

  test('image', () => {
    expect(
      converterTextHtml.serialize({
        snapshot: createSnapshot(defineSchema({}), {
          anchor: {
            path: [1],
            offset: 0,
          },
          focus: {
            path: [1],
            offset: 0,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'clipboard.copy',
        },
      }),
    ).toMatchObject({
      type: 'serialization.failure',
    })
  })

  test('inline object', () => {
    expect(
      converterTextHtml.serialize({
        snapshot: createSnapshot(defineSchema({}), {
          anchor: {
            path: [3, 0],
            offset: 0,
          },
          focus: {
            path: [3, 2],
            offset: 4,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'clipboard.copy',
        },
      }),
    ).toMatchObject({
      data: '<p>fizz  buz</p>',
    })
  })

  test('lists', () => {
    expect(
      converterTextHtml.serialize({
        snapshot: createTestSnapshot({
          context: {
            converters: [],
            value: [
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
              },
            ],
            selection: {
              anchor: {
                path: [0, 0],
                offset: 0,
              },
              focus: {
                path: [1, 0],
                offset: 3,
              },
            },
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'clipboard.copy',
        },
      }),
    ).toMatchObject({
      data: '<ol><li>foo<ul><li>bar</li></ul></li></ol>',
    })
  })
})
