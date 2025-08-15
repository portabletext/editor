import {compileSchema, defineSchema} from '@portabletext/schema'
import {expect, test} from 'vitest'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import {getTersePt, parseTersePt, parseTersePtString} from './terse-pt'

const keyGenerator = createTestKeyGenerator()

test(getTersePt.name, () => {
  const schema = compileSchema(defineSchema({}))
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

  expect(getTersePt({schema, value: [fooBlock, barBlock]})).toEqual([
    'foo',
    'bar',
  ])
  expect(getTersePt({schema, value: [emptyBlock, barBlock]})).toEqual([
    '',
    'bar',
  ])
  expect(getTersePt({schema, value: [fooBlock, emptyBlock, barBlock]})).toEqual(
    ['foo', '', 'bar'],
  )
  expect(getTersePt({schema, value: [fooBlock, softReturnBlock]})).toEqual([
    'foo',
    'foo\nbar',
  ])

  expect(
    getTersePt({
      schema,
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
        },
      ],
    }),
  ).toEqual(['foo'])
  expect(
    getTersePt({
      schema,
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
          listItem: 'number',
        },
      ],
    }),
  ).toEqual(['#:foo'])
  expect(
    getTersePt({
      schema,
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
          listItem: 'number',
          style: 'h3',
        },
      ],
    }),
  ).toEqual(['#h3:foo'])
  expect(
    getTersePt({
      schema,
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
          level: 2,
          listItem: 'number',
          style: 'h3',
        },
      ],
    }),
  ).toEqual(['>>#h3:foo'])
  expect(
    getTersePt({
      schema,
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
          style: 'h3',
        },
      ],
    }),
  ).toEqual(['h3:foo'])
})

test(parseTersePtString.name, () => {
  expect(parseTersePtString('foo')).toEqual(['foo'])
  expect(parseTersePtString('foo,bar')).toEqual(['foo,bar'])
  expect(parseTersePtString('foo,bar|baz')).toEqual(['foo,bar', 'baz'])
  expect(parseTersePtString('|foo')).toEqual(['', 'foo'])
  expect(parseTersePtString('foo|')).toEqual(['foo', ''])
  expect(parseTersePtString('foo|bar\nbaz')).toEqual(['foo', 'bar\nbaz'])
  expect(parseTersePtString('f,oo||ba,r')).toEqual(['f,oo', '', 'ba,r'])
  expect(parseTersePtString('|')).toEqual(['', ''])
  expect(parseTersePtString('||')).toEqual(['', '', ''])
  expect(parseTersePtString('>>#h3:foo')).toEqual(['>>#h3:foo'])
})

test(parseTersePt.name, () => {
  expect(
    parseTersePt(
      {
        schema: compileSchema(defineSchema({})),
        keyGenerator: createTestKeyGenerator(),
      },
      parseTersePtString('{image}|foo|>>#h4:bar|-:baz,fizz|,{stock-ticker},'),
    ),
  ).toEqual([
    {
      _key: 'k0',
      _type: 'image',
    },
    {
      _key: 'k1',
      _type: 'block',
      children: [{_key: 'k2', _type: 'span', text: 'foo'}],
    },
    {
      _key: 'k3',
      _type: 'block',
      children: [{_key: 'k4', _type: 'span', text: 'bar'}],
      level: 2,
      listItem: 'number',
      style: 'h4',
    },
    {
      _key: 'k5',
      _type: 'block',
      children: [
        {_key: 'k6', _type: 'span', text: 'baz'},
        {_key: 'k7', _type: 'span', text: 'fizz'},
      ],
      listItem: 'bullet',
    },
    {
      _key: 'k8',
      _type: 'block',
      children: [
        {_key: 'k9', _type: 'span', text: ''},
        {_key: 'k10', _type: 'stock-ticker'},
        {_key: 'k11', _type: 'span', text: ''},
      ],
    },
  ])
})
