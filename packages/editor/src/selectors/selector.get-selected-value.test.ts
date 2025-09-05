import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {getSelectedValue} from '.'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'

const b1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [
    {
      _type: 'span',
      _key: 'b1c1',
      text: 'foo',
      marks: [],
    },
    {
      _type: 'span',
      _key: 'b1c2',
      text: 'bar',
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
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
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
}
const b4: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b4',
  children: [
    {
      _type: 'span',
      _key: 'b4c1',
      text: 'fizz',
      marks: [],
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
      marks: [],
    },
  ],
  markDefs: [],
  style: 'normal',
}

const schema = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image'}],
    inlineObjects: [{name: 'stock-ticker'}],
  }),
)
const blocks: Array<PortableTextBlock> = [b1, b2, b3, b4]

describe(getSelectedValue.name, () => {
  test('sensible defaults', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: null,
            value: [],
          },
        }),
      ),
    ).toEqual([])
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: null,
            value: [],
          },
        }),
      ),
    ).toEqual([])
  })

  test('slicing a single block', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [b1.children[0]],
      },
    ])
  })

  test('slicing a single span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 1,
              },
              focus: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 2,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [
          {
            ...b1.children[0],
            text: 'o',
          },
        ],
      },
    ])
  })

  test('starting and ending selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
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
            value: blocks,
          },
        }),
      ),
    ).toEqual([b2])
  })

  test('starting selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: b2._key}],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([b2, b3])
  })

  test('ending selection on a block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 3,
              },
              focus: {
                path: [{_key: b2._key}],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b1,
        children: [
          {
            ...b1.children[0],
            text: '',
          },
          ...b1.children.slice(1),
        ],
      },
      blocks[1],
    ])
  })

  test('slicing across block object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b1._key},
                  'children',
                  {_key: b1.children[0]._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]._key},
                ],
                offset: 3,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([b1, b2, b3])
  })

  test('starting and ending mid-span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]._key},
                ],
                offset: 2,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]._key},
                ],
                offset: 1,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b3,
        children: [
          {
            ...b3.children[0],
            text: 'z',
          },
        ],
      },
      {
        ...b4,
        children: [
          {
            ...b4.children[0],
            text: 'f',
          },
        ],
      },
    ])
  })

  test('starting mid-span and ending end-span', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b3._key},
                  'children',
                  {_key: b3.children[0]._key},
                ],
                offset: 2,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]._key},
                ],
                offset: 4,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b3,
        children: [
          {
            ...b3.children[0],
            text: 'z',
          },
        ],
      },
      {
        ...b4,
        children: [
          {
            ...b4.children[0],
          },
        ],
      },
    ])
  })

  test('starting on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[2]._key},
                ],
                offset: 4,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1], b4.children[2]],
      },
    ])
  })

  test('ending on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[0]._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]._key},
                ],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[0], b4.children[1]],
      },
    ])
  })

  test('starting and ending on inline object', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]._key},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: b4._key},
                  'children',
                  {_key: b4.children[1]._key},
                ],
                offset: 0,
              },
            },
            value: blocks,
          },
        }),
      ),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1]],
      },
    ])
  })

  test('slicing text block with custom props', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 7,
              },
              focus: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 12,
              },
            },
            value: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: 'Hello, world!', marks: []},
                ],
                markDefs: [],
                style: 'normal',
                _map: {},
              },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'world', marks: []}],
        markDefs: [],
        style: 'normal',
        _map: {},
      },
    ])
  })

  test('slicing span with custom props', () => {
    expect(
      getSelectedValue(
        createTestSnapshot({
          context: {
            schema,
            selection: {
              anchor: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 7,
              },
              focus: {
                path: [{_key: 'b0'}, 'children', {_key: 's0'}],
                offset: 12,
              },
            },
            value: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'Hello, world!',
                    _map: {},
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [
          {_key: 's0', _type: 'span', text: 'world', _map: {}, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('filters out unused markDefs', () => {
    const keyGenerator = createTestKeyGenerator()
    const linkAKey = keyGenerator()
    const linkBKey = keyGenerator()
    const block0Key = keyGenerator()
    const bazKey = keyGenerator()
    const block4Key = keyGenerator()
    const oneMoreLineKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: block0Key,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'foo ',
            marks: [],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'bar',
            marks: [linkAKey],
          },
          {
            _type: 'span',
            _key: bazKey,
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [
          {
            _type: 'link',
            _key: linkAKey,
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
      {
        _key: keyGenerator(),
        _type: 'image',
      },
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'fizz',
            marks: ['strong'],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: ' buzz',
            marks: [linkBKey],
          },
        ],
        markDefs: [
          {
            _type: 'link',
            _key: linkBKey,
            href: 'https://example.com',
          },
        ],
        style: 'normal',
      },
      {
        _key: keyGenerator(),
        _type: 'break',
      },
      {
        _key: block4Key,
        _type: 'block',
        children: [
          {
            _type: 'span',
            _key: oneMoreLineKey,
            text: 'one more line',
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const snapshot = createTestSnapshot({
      context: {
        value,
        keyGenerator,
        schema: compileSchema(
          defineSchema({
            annotations: [
              {name: 'link', fields: [{name: 'href', type: 'string'}]},
            ],
            decorators: [{name: 'strong'}],
          }),
        ),
        selection: {
          anchor: {
            path: [{_key: block0Key}, 'children', {_key: bazKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: block4Key}, 'children', {_key: oneMoreLineKey}],
            offset: 3,
          },
        },
      },
    })

    expect(getSelectedValue(snapshot)).toEqual([
      {
        ...value[0],
        children: [
          {
            _type: 'span',
            _key: bazKey,
            text: ' baz',
            marks: [],
          },
        ],
        markDefs: [],
      },
      value[1],
      value[2],
      value[3],
      {
        ...value[4],
        children: [
          {
            _type: 'span',
            _key: oneMoreLineKey,
            text: 'one',
            marks: [],
          },
        ],
      },
    ])
  })
})
