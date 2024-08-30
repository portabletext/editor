import {expect, test} from '@jest/globals'

import {
  getBlockKey,
  getText,
  getTextMarks,
  getTextSelection,
  stringOverlap,
} from './gherkin-step-helpers'

test(getBlockKey.name, () => {
  const emptyBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: ''}],
  }
  const fooBlock = {
    _key: 'b2',
    _type: 'block',
    children: [{_key: 's2', _type: 'span', text: 'foo'}],
  }

  expect(getBlockKey([emptyBlock, fooBlock], '')).toBe('b1')
  expect(getBlockKey([emptyBlock, fooBlock], 'foo')).toBe('b2')
})

test(getText.name, () => {
  const fooBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo'}],
  }
  const emptyBlock = {
    _key: 'b2',
    _type: 'block',
    children: [{_key: 's2', _type: 'span', text: ''}],
  }
  const barBlock = {
    _key: 'b3',
    _type: 'block',
    children: [{_key: 's3', _type: 'span', text: 'bar'}],
  }

  expect(getText([fooBlock, barBlock])).toEqual(['foo', '\n', 'bar'])
  expect(getText([emptyBlock, barBlock])).toEqual(['', '\n', 'bar'])
  expect(getText([fooBlock, emptyBlock, barBlock])).toEqual(['foo', '\n', '', '\n', 'bar'])
})

test(getTextMarks.name, () => {
  const fooBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo'}],
  }
  const splitBarBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'ba', marks: ['strong']},
      {_key: 's2', _type: 'span', text: 'r'},
    ],
  }
  const splitFooBarBazBlock = {
    _key: 'b1',
    _type: 'block',
    children: [
      {_key: 's1', _type: 'span', text: 'foo '},
      {_key: 's2', _type: 'span', text: 'bar', marks: ['strong']},
      {_key: 's3', _type: 'span', text: ' '},
      {_key: 's4', _type: 'span', text: 'baz', marks: ['l1']},
    ],
  }

  expect(getTextMarks([fooBlock, splitBarBlock], 'ba')).toEqual(['strong'])
  expect(getTextMarks([splitFooBarBazBlock], 'bar')).toEqual(['strong'])
  expect(getTextMarks([splitFooBarBazBlock], ' ')).toEqual([])
  expect(getTextMarks([splitFooBarBazBlock], 'baz')).toEqual(['l1'])
})

test(getTextSelection.name, () => {
  const joinedBlock = {
    _key: 'b1',
    _type: 'block',
    children: [{_key: 's1', _type: 'span', text: 'foo bar baz'}],
  }

  expect(getTextSelection([joinedBlock], 'foo ')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
  })
  expect(getTextSelection([joinedBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
  })
  expect(getTextSelection([joinedBlock], ' baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 7},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 11},
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
  })
  expect(getTextSelection([splitBlock], 'baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 1},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'foo bar baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
  })
  expect(getTextSelection([splitBlock], 'o bar b')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 2},
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
    focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 2},
  })
})

test(stringOverlap.name, () => {
  expect(stringOverlap('foo ', 'o bar b')).toBe('o ')
  expect(stringOverlap('bar', 'o bar b')).toBe('bar')
  expect(stringOverlap(' baz', 'o bar b')).toBe(' b')
})
