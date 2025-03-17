import {expect, test} from 'vitest'
import {getTextMarks} from './text-marks'

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
