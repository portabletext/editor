import {expect, test} from 'vitest'
import {getTersePt, parseTersePt} from './terse-pt'

test(getTersePt.name, () => {
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

  expect(getTersePt([fooBlock, barBlock])).toEqual(['foo', '|', 'bar'])
  expect(getTersePt([emptyBlock, barBlock])).toEqual(['', '|', 'bar'])
  expect(getTersePt([fooBlock, emptyBlock, barBlock])).toEqual([
    'foo',
    '|',
    '',
    '|',
    'bar',
  ])
  expect(getTersePt([fooBlock, softReturnBlock])).toEqual([
    'foo',
    '|',
    'foo\nbar',
  ])
})

test(parseTersePt.name, () => {
  expect(parseTersePt('foo')).toEqual(['foo'])
  expect(parseTersePt('foo,bar')).toEqual(['foo', 'bar'])
  expect(parseTersePt('foo,bar|baz')).toEqual(['foo', 'bar', '|', 'baz'])
  expect(parseTersePt('|foo')).toEqual(['', '|', 'foo'])
  expect(parseTersePt('foo|')).toEqual(['foo', '|', ''])
  expect(parseTersePt('foo|bar\nbaz')).toEqual(['foo', '|', 'bar\nbaz'])
  expect(parseTersePt('f,oo||ba,r')).toEqual([
    'f',
    'oo',
    '|',
    '',
    '|',
    'ba',
    'r',
  ])
  expect(parseTersePt('|')).toEqual(['', '|', ''])
  expect(parseTersePt('||')).toEqual(['', '|', '', '|', ''])
})
