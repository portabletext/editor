import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, it} from 'vitest'
import {resolveKeyPath} from './resolve-key-path'

const schema = compileSchema(defineSchema({inlineObjects: [{name: 'stock-ticker'}]}))

const tree = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: 's1', text: 'hello', marks: []},
      {_key: 'obj1', _type: 'stock-ticker', symbol: 'AAPL'},
      {_type: 'span', _key: 's2', text: ' world', marks: []},
    ],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's3', text: 'second block', marks: []}],
  },
  {
    _key: 'img1',
    _type: 'image',
    url: 'https://example.com/image.png',
  },
]

describe('resolveKeyPath', () => {
  it('resolves a block path', () => {
    expect(resolveKeyPath(schema, tree, [0])).toEqual([{_key: 'b1'}])
  })

  it('resolves a second block path', () => {
    expect(resolveKeyPath(schema, tree, [1])).toEqual([{_key: 'b2'}])
  })

  it('resolves a block object path', () => {
    expect(resolveKeyPath(schema, tree, [2])).toEqual([{_key: 'img1'}])
  })

  it('resolves a child span path', () => {
    expect(resolveKeyPath(schema, tree, [0, 0])).toEqual([
      {_key: 'b1'},
      'children',
      {_key: 's1'},
    ])
  })

  it('resolves a second child span path', () => {
    expect(resolveKeyPath(schema, tree, [0, 2])).toEqual([
      {_key: 'b1'},
      'children',
      {_key: 's2'},
    ])
  })

  it('resolves a child in the second block', () => {
    expect(resolveKeyPath(schema, tree, [1, 0])).toEqual([
      {_key: 'b2'},
      'children',
      {_key: 's3'},
    ])
  })

  it('returns undefined for empty path', () => {
    expect(resolveKeyPath(schema, tree, [])).toBeUndefined()
  })

  it('returns undefined for out-of-bounds block index', () => {
    expect(resolveKeyPath(schema, tree, [99])).toBeUndefined()
  })

  it('returns undefined for out-of-bounds child index', () => {
    expect(resolveKeyPath(schema, tree, [0, 99])).toBeUndefined()
  })

  it('returns undefined for child path on block object', () => {
    expect(resolveKeyPath(schema, tree, [2, 0])).toBeUndefined()
  })

  it('resolves inline object child path', () => {
    expect(resolveKeyPath(schema, tree, [0, 1])).toEqual([
      {_key: 'b1'},
      'children',
      {_key: 'obj1'},
    ])
  })
})
