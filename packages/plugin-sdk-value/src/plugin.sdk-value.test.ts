import {describe, expect, test} from 'vitest'
import {arrayifyPath, convertPatches} from './plugin.sdk-value'

describe(arrayifyPath.name, () => {
  test('property paths', () => {
    expect(arrayifyPath('foo')).toEqual(['foo'])
    expect(arrayifyPath('foo.bar')).toEqual(['foo', 'bar'])
  })

  test('array index paths', () => {
    expect(arrayifyPath('items[0]')).toEqual(['items', 0])
    expect(arrayifyPath('items[0].text')).toEqual(['items', 0, 'text'])
  })

  test('key-based paths', () => {
    expect(arrayifyPath('[_key=="abc"]')).toEqual([{_key: 'abc'}])
    expect(arrayifyPath('[_key=="abc"].children')).toEqual([
      {_key: 'abc'},
      'children',
    ])
    expect(arrayifyPath('[_key=="abc"].children[_key=="def"]')).toEqual([
      {_key: 'abc'},
      'children',
      {_key: 'def'},
    ])
  })

  test('throws on empty path', () => {
    expect(() => arrayifyPath('')).toThrow()
  })
})

describe(convertPatches.name, () => {
  test('set patches', () => {
    expect(
      convertPatches([
        {set: {'[_key=="k0"].children[_key=="k1"].text': 'Hello'}},
      ]),
    ).toEqual([
      {
        type: 'set',
        origin: 'remote',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'Hello',
      },
    ])
  })

  test('unset patches', () => {
    expect(convertPatches([{unset: ['[_key=="k0"]']}])).toEqual([
      {
        type: 'unset',
        origin: 'remote',
        path: [{_key: 'k0'}],
      },
    ])
  })

  test('insert patches', () => {
    expect(
      convertPatches([
        {
          insert: {
            after: '[_key=="k0"]',
            items: [{_type: 'block', _key: 'k1', children: []}],
          },
        },
      ]),
    ).toEqual([
      {
        type: 'insert',
        origin: 'remote',
        position: 'after',
        path: [{_key: 'k0'}],
        items: [{_type: 'block', _key: 'k1', children: []}],
      },
    ])
  })

  test('diffMatchPatch patches', () => {
    expect(
      convertPatches([
        {
          diffMatchPatch: {
            '[_key=="k0"].children[_key=="k1"].text':
              '@@ -1,3 +1,6 @@\n foo\n+bar\n',
          },
        },
      ]),
    ).toEqual([
      {
        type: 'diffMatchPatch',
        origin: 'remote',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
    ])
  })
})
