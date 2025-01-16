import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {sliceBlocks} from './util.slice-blocks'

const textBlock1: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b1',
  children: [
    {
      _type: 'span',
      _key: 's1',
      text: 'foo',
      marks: ['strong'],
    },
    {
      _type: 'span',
      _key: 's2',
      text: 'bar',
    },
  ],
}
const textBlock2: PortableTextTextBlock = {
  _type: 'block',
  _key: 'b3',
  children: [
    {
      _type: 'span',
      _key: 's3',
      text: 'baz',
    },
  ],
}

const blocks: Array<PortableTextBlock> = [
  textBlock1,
  {
    _type: 'image',
    _key: 'b2',
  },
  textBlock2,
]

describe(sliceBlocks.name, () => {
  test('sensible defaults', () => {
    expect(sliceBlocks({blocks: [], selection: null})).toEqual([])
    expect(sliceBlocks({blocks, selection: null})).toEqual([])
  })

  test('slicing a single block', () => {
    expect(
      sliceBlocks({
        blocks,
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3,
          },
        },
      }),
    ).toEqual([
      {
        ...textBlock1,
        children: [textBlock1.children[0]],
      },
    ])
  })

  test('slicing a single span', () => {
    expect(
      sliceBlocks({
        blocks,
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 1,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 2,
          },
        },
      }),
    ).toEqual([
      {
        ...textBlock1,
        children: [
          {
            ...textBlock1.children[0],
            text: 'o',
          },
        ],
      },
    ])
  })

  test('ending selection on a block object', () => {
    expect(
      sliceBlocks({
        blocks,
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3,
          },
          focus: {
            path: [{_key: 'b2'}],
            offset: 0,
          },
        },
      }),
    ).toEqual([
      {
        ...textBlock1,
        children: [
          {
            ...textBlock1.children[0],
            text: '',
          },
        ],
      },
      blocks[1],
    ])
  })

  test('starting and ending mid-span', () => {
    expect(
      sliceBlocks({
        blocks,
        selection: {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 2,
          },
          focus: {path: [{_key: 'b3'}, 'children', {_key: 's3'}], offset: 1},
        },
      }),
    ).toEqual([
      {
        ...textBlock1,
        children: [
          {
            ...textBlock1.children[0],
            text: 'o',
          },
        ],
      },
      blocks[1],
      {
        ...textBlock2,
        children: [
          {
            ...textBlock2.children[0],
            text: 'az',
          },
        ],
      },
    ])
  })
})
