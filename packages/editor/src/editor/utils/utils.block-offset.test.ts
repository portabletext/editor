import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import {blockOffsetToSpanSelectionPoint} from './utils.block-offset'

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
      value,
      blockOffset: {
        path: [{_key: 'b1'}],
        offset: 0,
      },
    }),
  ).toBeUndefined()
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b2'}],
        offset: 9,
      },
    }),
  ).toEqual({
    path: [{_key: 'b2'}, 'children', {_key: 's2'}],
    offset: 2,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 9,
      },
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's3'}],
    offset: 9,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 10,
      },
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's3'}],
    offset: 10,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b3'}],
        offset: 11,
      },
    }),
  ).toEqual({
    path: [{_key: 'b3'}, 'children', {_key: 's5'}],
    offset: 1,
  })
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b4'}],
        offset: 0,
      },
    }),
  ).toBeUndefined()
  expect(
    blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: {
        path: [{_key: 'b4'}],
        offset: 1,
      },
    }),
  ).toBeUndefined()
})
