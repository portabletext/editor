import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import {
  compileSchemaDefinition,
  defineSchema,
  type SchemaDefinition,
} from '../editor/define-schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelection} from '../utils'
import {converterTextPlain} from './converter.text-plain'
import {coreConverters} from './converters.core'

const b1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [
    {
      _type: 'span',
      _key: 'b1c1',
      text: 'foo',
    },
    {
      _type: 'span',
      _key: 'b1c2',
      text: 'bar',
    },
  ],
}
const b2: PortableTextBlock = {
  _type: 'image',
  _key: 'b2',
  src: 'https://example.com/image.jpg',
  alt: 'Example',
}
const b3: PortableTextTextBlock = {
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
const b4: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b4',
  children: [
    {
      _type: 'span',
      _key: 'b4c1',
      text: 'fizz',
    },
    {
      _type: 'stock-ticker',
      _key: 'b4c2',
      symbol: 'AAPL',
    },
    {
      _type: 'span',
      _key: 'b4c3',
      text: 'buzz',
    },
  ],
}

function createContext({
  schema,
  selection,
}: {
  schema: SchemaDefinition
  selection: EditorSelection
}): EditorContext {
  return {
    converters: coreConverters,
    activeDecorators: [],
    keyGenerator: () => '',
    schema: compileSchemaDefinition(schema),
    selection,
    value: [b1, b2, b3, b4],
  }
}

test(converterTextPlain.serialize.name, () => {
  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({}),
        selection: {
          anchor: {
            path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
            offset: 4,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: 'baz\n\nfizz',
  })

  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({}),
        selection: {
          anchor: {
            path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
            offset: 3,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: 'foobar\n\n[Object]\n\nbaz',
  })

  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({}),
        selection: {
          anchor: {
            path: [{_key: b2._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b2._key}],
            offset: 0,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: '[Object]',
  })

  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({
          blockObjects: [
            {
              name: 'image',
            },
          ],
        }),
        selection: {
          anchor: {
            path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
            offset: 3,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: 'foobar\n\n[Image]\n\nbaz',
  })

  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({}),
        selection: {
          anchor: {
            path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b4._key}, 'children', {_key: b4.children[2]._key}],
            offset: 4,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: 'fizz[Object]buzz',
  })

  expect(
    converterTextPlain.serialize({
      context: createContext({
        schema: defineSchema({
          inlineObjects: [
            {
              name: 'stock-ticker',
            },
          ],
        }),
        selection: {
          anchor: {
            path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: b4._key}, 'children', {_key: b4.children[2]._key}],
            offset: 4,
          },
        },
      }),
      event: {
        type: 'serialize',
        originEvent: 'unknown',
      },
    }),
  ).toMatchObject({
    data: 'fizz[Stock Ticker]buzz',
  })
})
