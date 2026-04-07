import {
  compileSchema,
  defineSchema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {assert, describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {safeStringify} from '../internal-utils/safe-json'
import {converterPortableText} from './converter.portable-text'

function createSnapshot(schema: SchemaDefinition) {
  return createTestSnapshot({
    context: {
      converters: [],
      schema: compileSchema(schema),
    },
  })
}

describe(converterPortableText.deserialize, () => {
  test('non-array', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify(''),
        },
      }),
    ).toEqual({
      mimeType: 'application/x-portable-text',
      reason: 'Data is not an array',
      type: 'deserialization.failure',
    })
  })

  test('empty array', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([]),
        },
      }),
    ).toEqual({
      data: [],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('no known array entries', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([{foo: 'bar'}]),
        },
      }),
    ).toEqual({
      mimeType: 'application/x-portable-text',
      reason: 'No blocks were parsed',
      type: 'deserialization.failure',
    })
  })

  test('some known array entries', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([{_type: 'block', children: []}, {foo: 'bar'}]),
        },
      }),
    ).toEqual({
      data: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('no marks or markDefs', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'foo',
                },
              ],
            },
          ]),
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
              text: 'foo',
              marks: [],
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('unknown block object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([{_type: 'foo'}]),
        },
      }),
    ).toEqual({
      mimeType: 'application/x-portable-text',
      reason: 'No blocks were parsed',
      type: 'deserialization.failure',
    })
  })

  test('known block object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            blockObjects: [
              {name: 'image', fields: [{name: 'src', type: 'string'}]},
            ],
          }),
        ),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _key: 'b2',
              _type: 'image',
              src: 'https://example.com/image.jpg',
            },
          ]),
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'b2',
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('unknown inline object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
            },
          ]),
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
              text: '',
              marks: [],
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('known inline object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            inlineObjects: [
              {
                name: 'stock-ticker',
                fields: [{name: 'symbol', type: 'string'}],
              },
            ],
          }),
        ),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
            },
          ]),
        },
      }),
    ).toEqual({
      data: [
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'stock-ticker', symbol: 'AAPL'}],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('no style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
      },
    ])
  })

  test('default style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({styles: [{name: 'h1'}]})),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
      },
    ])
  })

  test('unknown style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
            style: 'h1',
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
      },
    ])
  })

  test('known style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(
        defineSchema({
          styles: [{name: 'h1'}],
        }),
      ),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
            style: 'h1',
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        style: 'h1',
      },
    ])
  })

  test('unknown listItem', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
            listItem: 'bullet',
            level: 1,
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        level: 1,
      },
    ])
  })

  test('known listItem', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(
        defineSchema({
          lists: [{name: 'bullet'}],
        }),
      ),
      event: {
        type: 'deserialize',
        data: safeStringify([
          {
            _type: 'block',
            children: [],
            listItem: 'bullet',
            level: 1,
          },
        ]),
      },
    })

    if (deserializedEvent.type !== 'deserialization.success') {
      assert.fail()
    }

    expect(deserializedEvent.data).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('unknown annotations', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  marks: ['b0m0'],
                  text: 'foo',
                },
                {
                  _type: 'span',
                  marks: ['b0m1'],
                  text: 'bar',
                },
              ],
              markDefs: [
                {
                  _key: 'b0m0',
                  _type: 'link',
                  href: 'https://example.com',
                },
                {
                  _key: 'b0m1',
                  _type: 'color',
                  color: 'red',
                },
              ],
            },
          ]),
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
              text: 'foo',
              marks: [],
            },
            {
              _key: 'k2',
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('known annotations', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
          }),
        ),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  marks: ['b0m0'],
                  text: 'foo',
                },
                {
                  _type: 'span',
                  marks: ['b0m1'],
                  text: 'bar',
                },
              ],
              markDefs: [
                {
                  _key: 'b0m0',
                  _type: 'link',
                  href: 'https://example.com',
                },
                {
                  _key: 'b0m1',
                  _type: 'color',
                  color: 'red',
                },
              ],
            },
          ]),
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
              text: 'foo',
              marks: ['b0m0'],
            },
            {
              _key: 'k2',
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [
            {
              _key: 'b0m0',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('unknown decorators', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
                {
                  _type: 'span',
                  text: 'bar',
                  marks: ['em'],
                },
              ],
            },
          ]),
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
              text: 'foo',
              marks: [],
            },
            {
              _key: 'k2',
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })

  test('known decorators', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(
          defineSchema({
            decorators: [{name: 'strong'}],
          }),
        ),
        event: {
          type: 'deserialize',
          data: safeStringify([
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'foo',
                  marks: ['strong'],
                },
                {
                  _type: 'span',
                  text: 'bar',
                  marks: ['em'],
                },
              ],
            },
          ]),
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
              text: 'foo',
              marks: ['strong'],
            },
            {
              _key: 'k2',
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
        },
      ],
      mimeType: 'application/x-portable-text',
      type: 'deserialization.success',
    })
  })
})
