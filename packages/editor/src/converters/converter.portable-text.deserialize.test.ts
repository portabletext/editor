import {assert, describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import type {SchemaDefinition} from '../editor/editor-schema-definition'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {converterPortableText} from './converter.portable-text'

function createSnapshot(schema: SchemaDefinition) {
  return createTestSnapshot({
    context: {
      converters: [],
      schema: compileSchemaDefinition(schema),
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
          data: JSON.stringify(''),
        },
      }),
    ).toMatchObject({
      type: 'deserialization.failure',
    })
  })

  test('empty array', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([]),
        },
      }),
    ).toMatchObject({
      data: [],
    })
  })

  test('no known array entries', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([{foo: 'bar'}]),
        },
      }),
    ).toMatchObject({
      type: 'deserialization.failure',
    })
  })

  test('some known array entries', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([{_type: 'block', children: []}, {foo: 'bar'}]),
        },
      }),
    ).toMatchObject({
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
          markDefs: [],
        },
      ],
    })
  })

  test('no marks or markDefs', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([
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
    ).toMatchObject({
      data: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    })
  })

  test('unknown block object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([{_type: 'foo'}]),
        },
      }),
    ).toMatchObject({
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
          data: JSON.stringify([
            {
              _key: 'b2',
              _type: 'image',
              src: 'https://example.com/image.jpg',
            },
          ]),
        },
      }),
    ).toMatchObject({
      data: [
        {
          _key: 'k0',
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })
  })

  test('unknown inline object', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([
            {
              _type: 'block',
              children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
            },
          ]),
        },
      }),
    ).toMatchObject({
      data: [
        {
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
          data: JSON.stringify([
            {
              _type: 'block',
              children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
            },
          ]),
        },
      }),
    ).toMatchObject({
      data: [
        {
          _type: 'block',
          children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
        },
      ],
    })
  })

  test('no style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: JSON.stringify([
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
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('default style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({styles: [{name: 'h1'}]})),
      event: {
        type: 'deserialize',
        data: JSON.stringify([
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
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('unknown style', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: JSON.stringify([
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
        markDefs: [],
        style: 'normal',
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
        data: JSON.stringify([
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
        markDefs: [],
        style: 'h1',
      },
    ])
  })

  test('unknown listItem', () => {
    const deserializedEvent = converterPortableText.deserialize({
      snapshot: createSnapshot(defineSchema({})),
      event: {
        type: 'deserialize',
        data: JSON.stringify([
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
        markDefs: [],
        level: 1,
        style: 'normal',
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
        data: JSON.stringify([
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
        markDefs: [],
        listItem: 'bullet',
        level: 1,
        style: 'normal',
      },
    ])
  })

  test('unknown annotations', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([
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
    ).toMatchObject({
      data: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
        },
      ],
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
          data: JSON.stringify([
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
    ).toMatchObject({
      data: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
              marks: ['k1'],
            },
            {
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [
            {
              _key: 'k1',
              _type: 'link',
              href: 'https://example.com',
            },
          ],
        },
      ],
    })
  })

  test('unknown decorators', () => {
    expect(
      converterPortableText.deserialize({
        snapshot: createSnapshot(defineSchema({})),
        event: {
          type: 'deserialize',
          data: JSON.stringify([
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
    ).toMatchObject({
      data: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
        },
      ],
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
          data: JSON.stringify([
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
    ).toMatchObject({
      data: [
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
              marks: [],
            },
          ],
        },
      ],
    })
  })
})
