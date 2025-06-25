import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {sliceBlocks} from './util.slice-blocks'

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

const schema = compileSchemaDefinition(defineSchema({}))
const blocks: Array<PortableTextBlock> = [b1, b2, b3, b4]

describe(sliceBlocks.name, () => {
  test('sensible defaults', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: null,
        },
        blocks: [],
      }),
    ).toEqual([])
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: null,
        },
        blocks,
      }),
    ).toEqual([])
  })

  test('slicing a single block', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
              offset: 3,
            },
          },
        },
        blocks,
      }),
    ).toEqual([
      {
        ...b1,
        children: [b1.children[0]],
      },
    ])
  })

  test('slicing a single span', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
              offset: 1,
            },
            focus: {
              path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
              offset: 2,
            },
          },
        },
        blocks,
      }),
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
      sliceBlocks({
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
        },
        blocks,
      }),
    ).toEqual([b2])
  })

  test('starting selection on a block object', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b2._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
              offset: 3,
            },
          },
        },
        blocks,
      }),
    ).toEqual([b2, b3])
  })

  test('ending selection on a block object', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b1._key}, 'children', {_key: b1.children[0]._key}],
              offset: 3,
            },
            focus: {
              path: [{_key: b2._key}],
              offset: 0,
            },
          },
        },
        blocks,
      }),
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
      sliceBlocks({
        context: {
          schema,
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
        },
        blocks,
      }),
    ).toEqual([b1, b2, b3])
  })

  test('starting and ending mid-span', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
              offset: 2,
            },
            focus: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
              offset: 1,
            },
          },
        },
        blocks,
      }),
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
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b3._key}, 'children', {_key: b3.children[0]._key}],
              offset: 2,
            },
            focus: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
              offset: 4,
            },
          },
        },
        blocks,
      }),
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
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[1]._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[2]._key}],
              offset: 4,
            },
          },
        },
        blocks,
      }),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1], b4.children[2]],
      },
    ])
  })

  test('ending on inline object', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[0]._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[1]._key}],
              offset: 0,
            },
          },
        },
        blocks,
      }),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[0], b4.children[1]],
      },
    ])
  })

  test('starting and ending on inline object', () => {
    expect(
      sliceBlocks({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[1]._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: b4._key}, 'children', {_key: b4.children[1]._key}],
              offset: 0,
            },
          },
        },
        blocks,
      }),
    ).toEqual([
      {
        ...b4,
        children: [b4.children[1]],
      },
    ])
  })

  test('slicing text block with custom props', () => {
    expect(
      sliceBlocks({
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
        },
        blocks: [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'Hello, world!'}],
            _map: {},
          },
        ],
      }),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'world'}],
        _map: {},
      },
    ])
  })

  test('slicing span with custom props', () => {
    expect(
      sliceBlocks({
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
        },
        blocks: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'Hello, world!', _map: {}},
            ],
          },
        ],
      }),
    ).toEqual([
      {
        _key: 'b0',
        _type: 'block',
        children: [{_key: 's0', _type: 'span', text: 'world', _map: {}}],
      },
    ])
  })
})
