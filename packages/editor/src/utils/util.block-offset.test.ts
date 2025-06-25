import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'

const schema = compileSchemaDefinition(defineSchema({}))

test(blockOffsetToSpanSelectionPoint.name, () => {
  const value: Array<PortableTextBlock> = [
    {
      _key: 'b1',
      _type: 'image',
    },
    {
      _key: 'b2',
      _type: 'block',
      children: [
        {
          _key: 's1',
          _type: 'span',
          text: 'Hello, ',
        },
        {
          _key: 's2',
          _type: 'span',
          text: 'world!',
          marks: ['strong'],
        },
      ],
    },
    {
      _key: 'b3',
      _type: 'block',
      children: [
        {
          _key: 's3',
          _type: 'span',
          text: 'Here is a ',
        },
        {
          _key: 's4',
          _type: 'stock-ticker',
        },
        {
          _key: 's5',
          _type: 'span',
          text: '.',
        },
      ],
    },
    {
      _key: 'b4',
      _type: 'block',
      children: [
        {
          _key: 's6',
          _type: 'stock-ticker',
        },
        {
          _key: 's7',
          _type: 'stock-ticker',
        },
        {
          _key: 's8',
          _type: 'stock-ticker',
        },
      ],
    },
  ]

  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'b'},
              {_key: 's1', _type: 'span', text: 'a'},
              {_key: 's2', _type: 'span', text: 'r'},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 3,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'b'},
              {_key: 's1', _type: 'span', text: 'a'},
              {_key: 's2', _type: 'span', text: 'r'},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 0,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's0'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'b'},
              {_key: 's1', _type: 'span', text: 'a'},
              {_key: 's2', _type: 'span', text: 'r'},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 0,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's0'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'b'},
              {_key: 's1', _type: 'span', text: 'a'},
              {_key: 's2', _type: 'span', text: 'r'},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 3,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b1'}],
        offset: 0,
      },
      direction: 'forward',
    }),
  ).toBeUndefined()
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b2'}],
        offset: 9,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b2'}, 'children', {_key: 's2'}],
    offset: 2,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 9,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's3'}],
    offset: 9,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 10,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's3'}],
    offset: 10,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 0,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's0'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 1,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 0,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 1,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 3,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 3,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 2,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 2,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 3,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's4'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: ''},
              {_key: 's1', _type: 'stock-ticker'},
              {_key: 's2', _type: 'span', text: 'foo'},
              {_key: 's3', _type: 'stock-ticker'},
              {_key: 's4', _type: 'span', text: ''},
            ],
          },
        ],
      },
      blockOffset: {
        path: [{_key: 'b0'}],
        offset: 2,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b0'}, 'children', {_key: 's2'}],
    offset: 2,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 10,
      },
      direction: 'backward',
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's5'}],
    offset: 0,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 11,
      },
      direction: 'forward',
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's5'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b4'}],
        offset: 0,
      },
      direction: 'forward',
    }),
  ).toBeUndefined()
  expect(
    blockOffsetToSpanSelectionPoint({
      context: {
        schema,
        value,
      },
      blockOffset: {
        path: [{_key: 'b4'}],
        offset: 1,
      },
      direction: 'forward',
    }),
  ).toBeUndefined()
})
