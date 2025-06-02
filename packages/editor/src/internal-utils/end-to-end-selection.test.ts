import {expect, test} from 'vitest'
import {getEndToEndSelection} from './end-to-end-selection'

test(getEndToEndSelection.name, () => {
  const image = {
    _type: 'image',
    _key: 'i1',
  }
  const splitBlock = {
    _type: 'block',
    _key: 'b1',
    children: [
      {_type: 'span', _key: 's1', text: 'foo '},
      {_type: 'span', _key: 's2', text: 'bar'},
      {_type: 'span', _key: 's3', text: ' baz'},
    ],
  }
  const blockWithStockTicker = {
    _type: 'block',
    _key: 'b2',
    children: [
      {_type: 'span', _key: 's1', text: ''},
      {_type: 'stock-ticker', _key: 'st1'},
      {_type: 'span', _key: 's2', text: ''},
    ],
  }

  expect(getEndToEndSelection([image, splitBlock])).toEqual({
    anchor: {path: [0], offset: 0},
    focus: {path: [1, 2], offset: 4},
  })
  expect(getEndToEndSelection([splitBlock, image])).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [1], offset: 0},
  })
  expect(getEndToEndSelection([blockWithStockTicker, splitBlock])).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [1, 2], offset: 4},
  })
})
