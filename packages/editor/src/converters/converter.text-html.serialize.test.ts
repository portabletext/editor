import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {
  compileSchemaDefinition,
  defineSchema,
  type SchemaDefinition,
} from '../editor/define-schema'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import type {EditorSelection} from '../utils'
import {converterTextHtml} from './converter.text-html'
import {coreConverters} from './converters.core'

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

function createContext(schema: SchemaDefinition, selection: EditorSelection) {
  return {
    converters: coreConverters,
    activeDecorators: [],
    keyGenerator: createTestKeyGenerator(),
    schema: compileSchemaDefinition(schema),
    selection,
    value: [decoratedParagraph, image, b2, paragraphWithInlineBlock],
  }
}

describe(converterTextHtml.serialize.name, () => {
  test('paragraph with decorators', () => {
    expect(
      converterTextHtml.serialize({
        context: createContext(defineSchema({}), {
          anchor: {
            path: [
              {_key: decoratedParagraph._key},
              'children',
              {_key: decoratedParagraph.children[0]._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: decoratedParagraph._key},
              'children',
              {_key: decoratedParagraph.children[2]._key},
            ],
            offset: 4,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'unknown',
        },
      }),
    ).toMatchObject({
      data: '<p><em>foo <code><strong>bar</strong> baz</code></em></p>',
    })
  })

  test('image', () => {
    expect(
      converterTextHtml.serialize({
        context: createContext(defineSchema({}), {
          anchor: {
            path: [{_key: image._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: image._key}],
            offset: 0,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'unknown',
        },
      }),
    ).toMatchObject({
      type: 'serialization.failure',
    })
  })

  test('inline object', () => {
    expect(
      converterTextHtml.serialize({
        context: createContext(defineSchema({}), {
          anchor: {
            path: [
              {_key: paragraphWithInlineBlock._key},
              'children',
              {_key: paragraphWithInlineBlock.children[0]._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: paragraphWithInlineBlock._key},
              'children',
              {_key: paragraphWithInlineBlock.children[2]._key},
            ],
            offset: 4,
          },
        }),
        event: {
          type: 'serialize',
          originEvent: 'unknown',
        },
      }),
    ).toMatchObject({
      data: '<p>fizz  buzz</p>',
    })
  })

  test('lists', () => {
    expect(
      converterTextHtml.serialize({
        context: {
          converters: coreConverters,
          activeDecorators: [],
          keyGenerator: createTestKeyGenerator(),
          schema: compileSchemaDefinition(defineSchema({})),
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
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
              offset: 3,
            },
          },
        },
        event: {
          type: 'serialize',
          originEvent: 'unknown',
        },
      }),
    ).toMatchObject({
      data: '<ol><li>foo<ul><li>bar</li></ul></li></ol>',
    })
  })
})
