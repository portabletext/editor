import {expect, test} from 'vitest'
import {
  getBlockKey,
  getEditorSelection,
  getSelectionAfterText,
  getSelectionBeforeText,
  getSelectionText,
  getTextMarks,
  getTextSelection,
  getValueText,
  parseGherkinTextParameter,
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
  const softReturnBlock = {
    _key: 'b3',
    _type: 'block',
    children: [{_key: 's3', _type: 'span', text: 'foo\nbar'}],
  }

  expect(getBlockKey([emptyBlock, fooBlock, softReturnBlock], '')).toBe('b1')
  expect(getBlockKey([emptyBlock, fooBlock, softReturnBlock], 'foo')).toBe('b2')
  expect(getBlockKey([emptyBlock, fooBlock, softReturnBlock], 'foo\nbar')).toBe(
    'b3',
  )
})

test(getValueText.name, () => {
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
  const softReturnBlock = {
    _key: 'b4',
    _type: 'block',
    children: [{_key: 's4', _type: 'span', text: 'foo\nbar'}],
  }

  expect(getValueText([fooBlock, barBlock])).toEqual(['foo', '|', 'bar'])
  expect(getValueText([emptyBlock, barBlock])).toEqual(['', '|', 'bar'])
  expect(getValueText([fooBlock, emptyBlock, barBlock])).toEqual([
    'foo',
    '|',
    '',
    '|',
    'bar',
  ])
  expect(getValueText([fooBlock, softReturnBlock])).toEqual([
    'foo',
    '|',
    'foo\nbar',
  ])
})

test(parseGherkinTextParameter.name, () => {
  expect(parseGherkinTextParameter('foo')).toEqual(['foo'])
  expect(parseGherkinTextParameter('foo,bar')).toEqual(['foo', 'bar'])
  expect(parseGherkinTextParameter('foo,bar|baz')).toEqual([
    'foo',
    'bar',
    '|',
    'baz',
  ])
  expect(parseGherkinTextParameter('|foo')).toEqual(['', '|', 'foo'])
  expect(parseGherkinTextParameter('foo|')).toEqual(['foo', '|', ''])
  expect(parseGherkinTextParameter('foo|bar\nbaz')).toEqual([
    'foo',
    '|',
    'bar\nbaz',
  ])
  expect(parseGherkinTextParameter('f,oo||ba,r')).toEqual([
    'f',
    'oo',
    '|',
    '',
    '|',
    'ba',
    'r',
  ])
  expect(parseGherkinTextParameter('|')).toEqual(['', '|', ''])
  expect(parseGherkinTextParameter('||')).toEqual(['', '|', '', '|', ''])
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

test(getSelectionText.name, () => {
  const splitBlock = {
    _type: 'block',
    _key: 'A-4',
    style: 'normal',
    markDefs: [{_type: 'link', _key: 'A-5', href: 'https://example.com'}],
    children: [
      {_type: 'span', _key: 'A-3', text: 'foo ', marks: []},
      {_type: 'span', _key: 'A-7', marks: ['A-5'], text: 'bar'},
      {_type: 'span', _key: 'A-6', marks: [], text: ' baz'},
    ],
  }

  expect(
    getSelectionText([splitBlock], {
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-7'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-7'}], offset: 3},
    }),
  ).toEqual(['bar'])
})

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
  expect(getTextSelection([joinedBlock], 'o')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 3},
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    backward: false,
  })
  expect(getSelectionBeforeText([splitBlock], 'f')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
    backward: false,
  })
  expect(getSelectionBeforeText([splitBlock], 'o')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
    backward: false,
  })
  expect(getSelectionBeforeText([splitBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 0},
    backward: false,
  })
  expect(getSelectionBeforeText([splitBlock], ' baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 0},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 0},
    backward: false,
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
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 4},
    backward: false,
  })
  expect(getSelectionAfterText([splitBlock], 'bar')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's2'}], offset: 3},
    backward: false,
  })
  expect(getSelectionAfterText([splitBlock], ' baz')).toEqual({
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's3'}], offset: 4},
    backward: false,
  })
})

test(stringOverlap.name, () => {
  expect(stringOverlap('', 'foobar')).toBe('')
  expect(stringOverlap('foo ', 'o bar b')).toBe('o ')
  expect(stringOverlap('foo', 'o')).toBe('o')
  expect(stringOverlap('foo bar baz', 'o')).toBe('o')
  expect(stringOverlap('bar', 'o bar b')).toBe('bar')
  expect(stringOverlap(' baz', 'o bar b')).toBe(' b')
  expect(stringOverlap('fofofo', 'fo')).toBe('fo')
  expect(stringOverlap('fofofo', 'fof')).toBe('fof')
  expect(stringOverlap('fofofo', 'fofofof')).toBe('fofofo')
})
