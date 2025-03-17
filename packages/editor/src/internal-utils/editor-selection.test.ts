import {expect, test} from 'vitest'
import {getEditorSelection} from './editor-selection'

test(getEditorSelection.name, () => {
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

  expect(getEditorSelection([image, splitBlock])).toEqual({
    anchor: {path: [{_key: 'i1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
  expect(getEditorSelection([splitBlock, image])).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'i1'}], offset: 0},
  })
  expect(getEditorSelection([blockWithStockTicker, splitBlock])).toEqual({
    anchor: {path: [{_key: 'b2'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
})
