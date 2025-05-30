import {expect, test} from 'vitest'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from './text-selection'

test(getTextSelection.name, () => {
  const simpleBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo'}],
  }

  expect(getTextSelection([simpleBlock], 'foo')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 0], offset: 3},
  })

  const joinedBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo bar baz'}],
  }

  expect(getTextSelection([joinedBlock], 'foo ')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 0], offset: 4},
  })
  expect(getTextSelection([joinedBlock], 'o')).toEqual({
    anchor: {path: [0, 0], offset: 1},
    focus: {path: [0, 0], offset: 2},
  })
  expect(getTextSelection([joinedBlock], 'bar')).toEqual({
    anchor: {path: [0, 0], offset: 4},
    focus: {path: [0, 0], offset: 7},
  })
  expect(getTextSelection([joinedBlock], ' baz')).toEqual({
    anchor: {path: [0, 0], offset: 7},
    focus: {path: [0, 0], offset: 11},
  })

  const noSpaceBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo'},
      {_key: 's2', _type: 'span', text: 'bar'},
    ],
  }

  expect(getTextSelection([noSpaceBlock], 'obar')).toEqual({
    anchor: {path: [0, 0], offset: 2},
    focus: {path: [0, 1], offset: 3},
  })

  const emptyLineBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo'},
      {_key: 's2', _type: 'span', text: ''},
      {_key: 's3', _type: 'span', text: 'bar'},
    ],
  }

  expect(getTextSelection([emptyLineBlock], 'foobar')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 2], offset: 3},
  })

  const splitBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo '},
      {_key: 's2', _type: 'span', text: 'bar'},
      {_key: 's3', _type: 'span', text: ' baz'},
    ],
  }

  expect(getTextSelection([splitBlock], 'foo')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 0], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'bar')).toEqual({
    anchor: {path: [0, 1], offset: 0},
    focus: {path: [0, 1], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'baz')).toEqual({
    anchor: {path: [0, 2], offset: 1},
    focus: {path: [0, 2], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'foo bar baz')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 2], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'o bar b')).toEqual({
    anchor: {path: [0, 0], offset: 2},
    focus: {path: [0, 2], offset: 2},
  })

  const twoBlocks = [
    {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'foo'}],
    },
    {
      _key: 'b2',
      _type: 'block',
      children: [{_key: 's2', _type: 'span', text: 'bar'}],
    },
  ]

  expect(getTextSelection(twoBlocks, 'ooba')).toEqual({
    anchor: {path: [0, 0], offset: 1},
    focus: {path: [1, 0], offset: 2},
  })
})

test(getSelectionBeforeText.name, () => {
  const splitBlock = {
    _type: 'block',
    _key: 'b1',
    children: [
      {_type: 'span', _key: 's1', text: 'foo '},
      {_type: 'span', _key: 's2', text: 'bar'},
      {_type: 'span', _key: 's3', text: ' baz'},
    ],
  }

  expect(getSelectionBeforeText([splitBlock], 'foo ')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 0], offset: 0},
  })
  expect(getSelectionBeforeText([splitBlock], 'f')).toEqual({
    anchor: {path: [0, 0], offset: 0},
    focus: {path: [0, 0], offset: 0},
  })
  expect(getSelectionBeforeText([splitBlock], 'o')).toEqual({
    anchor: {path: [0, 0], offset: 1},
    focus: {path: [0, 0], offset: 1},
  })
  expect(getSelectionBeforeText([splitBlock], 'bar')).toEqual({
    anchor: {path: [0, 1], offset: 0},
    focus: {path: [0, 1], offset: 0},
  })
  expect(getSelectionBeforeText([splitBlock], ' baz')).toEqual({
    anchor: {path: [0, 2], offset: 0},
    focus: {path: [0, 2], offset: 0},
  })
})

test(getSelectionAfterText.name, () => {
  const splitBlock = {
    _type: 'block',
    _key: 'b1',
    children: [
      {_type: 'span', _key: 's1', text: 'foo '},
      {_type: 'span', _key: 's2', text: 'bar'},
      {_type: 'span', _key: 's3', text: ' baz'},
    ],
  }

  expect(getSelectionAfterText([splitBlock], 'foo ')).toEqual({
    anchor: {path: [0, 0], offset: 4},
    focus: {path: [0, 0], offset: 4},
  })
  expect(getSelectionAfterText([splitBlock], 'bar')).toEqual({
    anchor: {path: [0, 1], offset: 3},
    focus: {path: [0, 1], offset: 3},
  })
  expect(getSelectionAfterText([splitBlock], ' baz')).toEqual({
    anchor: {path: [0, 2], offset: 4},
    focus: {path: [0, 2], offset: 4},
  })
})
