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

  test('returns null instead of throwing on an empty path', () => {
    expect(() => arrayifyPath('')).not.toThrow()
    expect(arrayifyPath('')).toBeNull()
  })

  test('returns null instead of throwing on an array slice path', () => {
    // `diffValue` emits a slice like this when several non-keyed items (e.g.
    // span `marks`) are removed at once. It used to throw and crash `applySync`.
    const slicePath = '[_key=="b1"].children[_key=="s1"].marks[1:]'
    expect(() => arrayifyPath(slicePath)).not.toThrow()
    expect(arrayifyPath(slicePath)).toBeNull()
  })
})

describe(convertPatches.name, () => {
  test('set patches', () => {
    expect(
      convertPatches([
        {set: {'[_key=="k0"].children[_key=="k1"].text': 'Hello'}},
      ]),
    ).toEqual({
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'Hello',
        },
      ],
      incomplete: false,
    })
  })

  test('unset patches', () => {
    expect(convertPatches([{unset: ['[_key=="k0"]']}])).toEqual({
      patches: [
        {
          type: 'unset',
          origin: 'remote',
          path: [{_key: 'k0'}],
        },
      ],
      incomplete: false,
    })
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
    ).toEqual({
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          position: 'after',
          path: [{_key: 'k0'}],
          items: [{_type: 'block', _key: 'k1', children: []}],
        },
      ],
      incomplete: false,
    })
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
    ).toEqual({
      patches: [
        {
          type: 'diffMatchPatch',
          origin: 'remote',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
      ],
      incomplete: false,
    })
  })

  test('drops unconvertible patches and flags the batch as incomplete', () => {
    const result = convertPatches([
      {
        unset: [
          '[_key=="b1"].markDefs[_key=="l1"]',
          // Array slice that `arrayifyPath` can't convert.
          '[_key=="b1"].children[_key=="s1"].marks[1:]',
        ],
      },
    ])

    expect(result.incomplete).toBe(true)
    expect(result.patches).toEqual([
      {
        type: 'unset',
        origin: 'remote',
        path: [{_key: 'b1'}, 'markDefs', {_key: 'l1'}],
      },
    ])
  })
})
