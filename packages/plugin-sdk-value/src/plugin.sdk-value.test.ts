import type {PortableTextBlock} from '@portabletext/editor'
import {describe, expect, test} from 'vitest'
import {
  arrayifyPath,
  convertPatches,
  convertPatchesToSanity,
  findSidecarArrayPath,
  scopeRemotePatches,
  stringifyPatchPath,
  toEngineSafePatches,
} from './plugin.sdk-value'

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

describe(stringifyPatchPath.name, () => {
  test('property paths', () => {
    expect(stringifyPatchPath(['foo'])).toEqual('foo')
    expect(stringifyPatchPath(['foo', 'bar'])).toEqual('foo.bar')
  })

  test('array index paths', () => {
    expect(stringifyPatchPath(['items', 0])).toEqual('items[0]')
    expect(stringifyPatchPath(['items', 0, 'text'])).toEqual('items[0].text')
  })

  test('key-based paths', () => {
    expect(
      stringifyPatchPath([{_key: 'abc'}, 'children', {_key: 'def'}, 'text']),
    ).toEqual('[_key=="abc"].children[_key=="def"].text')
  })

  test('empty path', () => {
    expect(stringifyPatchPath([])).toEqual('')
  })

  test('round-trips through arrayifyPath', () => {
    const path = [{_key: 'abc'}, 'children', {_key: 'def'}, 'marks', 0]
    expect(arrayifyPath(stringifyPatchPath(path))).toEqual(path)
  })
})

describe(convertPatchesToSanity.name, () => {
  test('set patches', () => {
    expect(
      convertPatchesToSanity(
        [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'Hello',
          },
        ],
        {prefix: 'blocks'},
      ),
    ).toEqual([
      {set: {'blocks[_key=="k0"].children[_key=="k1"].text': 'Hello'}},
    ])
  })

  test('unset patches', () => {
    expect(
      convertPatchesToSanity([{type: 'unset', path: [{_key: 'k0'}]}], {
        prefix: 'blocks',
      }),
    ).toEqual([{unset: ['blocks[_key=="k0"]']}])
  })

  test('insert patches', () => {
    expect(
      convertPatchesToSanity(
        [
          {
            type: 'insert',
            position: 'after',
            path: [{_key: 'k0'}],
            items: [{_type: 'block', _key: 'k1', children: []}],
          },
        ],
        {prefix: 'blocks'},
      ),
    ).toEqual([
      {
        insert: {
          after: 'blocks[_key=="k0"]',
          items: [{_type: 'block', _key: 'k1', children: []}],
        },
      },
    ])
  })

  test('diffMatchPatch patches', () => {
    expect(
      convertPatchesToSanity(
        [
          {
            type: 'diffMatchPatch',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
          },
        ],
        {prefix: 'blocks'},
      ),
    ).toEqual([
      {
        diffMatchPatch: {
          'blocks[_key=="k0"].children[_key=="k1"].text':
            '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
      },
    ])
  })

  test('empty path targets the field itself', () => {
    expect(
      convertPatchesToSanity([{type: 'set', path: [], value: []}], {
        prefix: 'blocks',
      }),
    ).toEqual([{set: {blocks: []}}])
  })

  test('nested field prefix', () => {
    expect(
      convertPatchesToSanity([{type: 'unset', path: [{_key: 'k0'}]}], {
        prefix: 'content.body',
      }),
    ).toEqual([{unset: ['content.body[_key=="k0"]']}])
  })
})

describe(scopeRemotePatches.name, () => {
  test('re-roots patches under the field path', () => {
    expect(
      scopeRemotePatches(
        [
          {set: {'blocks[_key=="k0"].children[_key=="k1"].text': 'Hello'}},
          {unset: ['blocks[_key=="k0"].markDefs[_key=="m0"]']},
        ],
        'blocks',
      ),
    ).toEqual([
      {
        type: 'set',
        origin: 'remote',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
        value: 'Hello',
      },
      {
        type: 'unset',
        origin: 'remote',
        path: [{_key: 'k0'}, 'markDefs', {_key: 'm0'}],
      },
    ])
  })

  test('drops patches outside the field', () => {
    expect(
      scopeRemotePatches(
        [{set: {'title': 'New title', 'blocks[_key=="k0"].style': 'h1'}}],
        'blocks',
      ),
    ).toEqual([
      {
        type: 'set',
        origin: 'remote',
        path: [{_key: 'k0'}, 'style'],
        value: 'h1',
      },
    ])
  })

  test('returns null when the whole field is replaced', () => {
    expect(scopeRemotePatches([{set: {blocks: []}}], 'blocks')).toBeNull()
    expect(scopeRemotePatches([{unset: ['blocks']}], 'blocks')).toBeNull()
  })

  test('returns null when an ancestor of the field is replaced', () => {
    expect(
      scopeRemotePatches([{set: {content: {}}}], 'content.body'),
    ).toBeNull()
  })

  test('handles insert patches anchored inside the field', () => {
    expect(
      scopeRemotePatches(
        [
          {
            insert: {
              after: 'blocks[_key=="k0"]',
              items: [{_type: 'block', _key: 'k1', children: []}],
            },
          },
        ],
        'blocks',
      ),
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
})

describe(findSidecarArrayPath.name, () => {
  test('passes through paths the engine can resolve', () => {
    expect(findSidecarArrayPath([{_key: 'b1'}])).toBeNull()
    expect(findSidecarArrayPath([{_key: 'b1'}, 'style'])).toBeNull()
    expect(
      findSidecarArrayPath([{_key: 'b1'}, 'children', {_key: 's1'}, 'text']),
    ).toBeNull()
    expect(findSidecarArrayPath([{_key: 'b1'}, 'markDefs'])).toBeNull()
    expect(
      findSidecarArrayPath([{_key: 'b1'}, 'children', {_key: 's1'}, 'marks']),
    ).toBeNull()
  })

  test('detects items addressed inside sidecar arrays', () => {
    expect(
      findSidecarArrayPath([{_key: 'b1'}, 'markDefs', {_key: 'm1'}]),
    ).toEqual([{_key: 'b1'}, 'markDefs'])
    expect(
      findSidecarArrayPath([{_key: 'b1'}, 'markDefs', {_key: 'm1'}, 'href']),
    ).toEqual([{_key: 'b1'}, 'markDefs'])
    expect(
      findSidecarArrayPath([
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'marks',
        2,
      ]),
    ).toEqual([{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'])
  })
})

describe(toEngineSafePatches.name, () => {
  const targetValue = [
    {
      _type: 'block',
      _key: 'b1',
      children: [{_type: 'span', _key: 's1', text: 'Hello', marks: ['m1']}],
      markDefs: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
      style: 'normal',
    },
  ] as unknown as PortableTextBlock[]

  test('passes resolvable patches through unchanged', () => {
    const patches = convertPatches([
      {set: {'[_key=="b1"].children[_key=="s1"].text': 'Hello'}},
    ])
    expect(toEngineSafePatches(patches, targetValue)).toEqual(patches)
  })

  test('coalesces sidecar item patches into whole-property sets', () => {
    const patches = convertPatches([
      {
        unset: ['[_key=="b1"].markDefs[_key=="m0"]'],
        insert: {
          after: '[_key=="b1"].markDefs[_key=="m0"]',
          items: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
        },
      },
    ])
    expect(toEngineSafePatches(patches, targetValue)).toEqual([
      {
        type: 'set',
        origin: 'remote',
        path: [{_key: 'b1'}, 'markDefs'],
        value: [{_type: 'link', _key: 'm1', href: 'https://example.com'}],
      },
    ])
  })

  test('unsets the property when absent from the target value', () => {
    const patches = convertPatches([
      {unset: ['[_key=="b2"].markDefs[_key=="m0"]']},
    ])
    expect(toEngineSafePatches(patches, targetValue)).toEqual([
      {
        type: 'unset',
        origin: 'remote',
        path: [{_key: 'b2'}, 'markDefs'],
      },
    ])
  })

  test('coalesces indexed marks patches into a whole-array set', () => {
    const patches = convertPatches([
      {unset: ['[_key=="b1"].children[_key=="s1"].marks[2]']},
    ])
    expect(toEngineSafePatches(patches, targetValue)).toEqual([
      {
        type: 'set',
        origin: 'remote',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
        value: ['m1'],
      },
    ])
  })
})
