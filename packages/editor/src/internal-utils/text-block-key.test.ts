import {expect, test} from 'vitest'
import {getTextBlockKey} from './text-block-key'

test(getTextBlockKey.name, () => {
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

  expect(getTextBlockKey([emptyBlock, fooBlock, softReturnBlock], '')).toBe(
    'b1',
  )
  expect(getTextBlockKey([emptyBlock, fooBlock, softReturnBlock], 'foo')).toBe(
    'b2',
  )
  expect(
    getTextBlockKey([emptyBlock, fooBlock, softReturnBlock], 'foo\nbar'),
  ).toBe('b3')
})
