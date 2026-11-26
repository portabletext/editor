import {diffMatchPatch, set} from '@portabletext/patches'
import {interpretChange, mapPoint, mapRange} from '@portabletext/steps'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'

function buildDoc(depth: string, text: string) {
  const key = createTestKeyGenerator('v')
  const blocks = [text].map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))
  let value: any[] = blocks
  let prefix: any[] = []
  const wrap = (type: string, field: string) => {
    const k = key()
    value = [{_type: type, _key: k, [field]: value}]
    prefix = [{_key: k}, field, ...prefix]
  }
  if (depth === 'callout' || depth === 'nested callout')
    wrap('callout', 'content')
  if (depth === 'nested callout') wrap('callout', 'content')
  if (depth === 'table cell') {
    wrap('cell', 'content')
    wrap('row', 'cells')
    wrap('table', 'rows')
  }
  if (depth === 'object PT field') wrap('article', 'content')
  return {value, prefix, blocks}
}

test('Scenario: steps operation and replacement coverage', () => {
  const {value, blocks} = buildDoc('root', 'foobar')
  const block = blocks[0]!
  const span = block.children[0]!
  const blockPath = [{_key: block._key}]
  const path = [...blockPath, 'children', {_key: span._key}]
  const point = {path, offset: 3}
  for (const [shape, patch] of [
    ['block', set({...block, children: [{...span, text: 'baz'}]}, blockPath)],
    ['span', set({...span, text: 'baz'}, path)],
    ['children', set([{...span, text: 'baz'}], [...blockPath, 'children'])],
    ['text', set('baz', [...path, 'text'])],
    ['style', set('h2', [...blockPath, 'style'])],
    ['marks', set(['strong'], [...path, 'marks'])],
    ['unset block', {type: 'unset', path: blockPath}],
    ['inside', diffMatchPatch('foobar', 'foobxar', [...path, 'text'])],
  ] as const) {
    const steps = interpretChange({value}, [patch as any])
    console.warn(
      'MAPPING ' +
        JSON.stringify({
          shape,
          patch,
          steps: steps ?? 'undefined',
          forward: mapPoint(steps, point),
          backward: mapPoint(steps, point, {affinity: 'backward'}),
          range: mapRange(steps, {anchor: point, focus: {path, offset: 6}}),
        }),
    )
  }
  const nested = buildDoc('callout', 'foobar')
  const containerPatch = set(buildDoc('root', 'baz').value, [...nested.prefix])
  console.warn(
    'MAPPING ' +
      JSON.stringify({
        shape: 'container content',
        patch: containerPatch,
        steps:
          interpretChange({value: nested.value}, [containerPatch]) ??
          'undefined',
      }),
  )
  const insertion = interpretChange({value}, [
    diffMatchPatch('foobar', 'foobxar', [...path, 'text']),
  ])!
  console.warn(
    'INTERIOR ' +
      JSON.stringify({
        steps: insertion,
        range: mapRange(insertion, {anchor: point, focus: {path, offset: 6}}),
        split: [
          {from: 3, to: 4},
          {from: 5, to: 7},
        ],
      }),
  )
  const equal = interpretChange(
    {value: [{...block, children: [{...span, text: 'fooh1'}]}]},
    [diffMatchPatch('fooh1', 'fooh2h1', [...path, 'text'])],
  )!
  console.warn(
    'AFFINITY ' +
      JSON.stringify({
        steps: equal,
        forward: mapPoint(equal, point),
        backward: mapPoint(equal, point, {affinity: 'backward'}),
        range: mapRange(equal, {anchor: point, focus: {path, offset: 5}}),
      }),
  )
  for (const affinity of ['forward', 'backward'] as const) {
    const mapped = mapPoint(equal, point, {affinity})!
    const afterRemote = 'fooh2h1'
    console.warn(
      'AFFINITY_UNDO ' +
        JSON.stringify({
          affinity,
          before: 'foo',
          local: 'fooh1',
          remote: afterRemote,
          mapped,
          undo:
            afterRemote.slice(0, mapped.offset) +
            afterRemote.slice(mapped.offset + 2),
        }),
    )
  }
  const keys = createTestKeyGenerator('other')
  const other = {
    ...block,
    _key: keys(),
    children: [{...span, _key: keys(), text: 'baz'}],
  }
  const deletion = interpretChange({value: [...value, other]}, [
    {type: 'unset', path: blockPath},
  ])
  const stored = [
    {type: 'insert.text', path, offset: 3, text: 'bar'},
    {type: 'remove.text', path, offset: 3, text: 'bar'},
    {
      type: 'set.selection',
      properties: {anchor: point, focus: point},
      newProperties: {anchor: point, focus: point},
    },
    {
      type: 'set',
      path: [...blockPath, 'style'],
      value: 'h1',
      inverse: {type: 'set', path: [...blockPath, 'style'], value: 'normal'},
    },
    {
      type: 'unset',
      path: [{_key: keys()}],
      inverse: {
        type: 'insert',
        path: blockPath,
        position: 'before',
        node: other,
      },
    },
    {
      type: 'insert',
      path: blockPath,
      position: 'after',
      node: other,
      inverse: {type: 'unset', path: [{_key: other._key}]},
    },
  ]
  for (const operation of stored) {
    console.warn(
      'OPERATION ' +
        JSON.stringify({
          operation,
          remote: {type: 'unset', path: blockPath},
          steps: deletion,
          mappedPath:
            'path' in operation && operation.path
              ? mapPoint(deletion, {path: operation.path, offset: 0})
              : null,
          mappedInverse:
            'inverse' in operation && operation.inverse
              ? mapPoint(deletion, {path: operation.inverse.path, offset: 0})
              : null,
        }),
    )
  }
  expect(
    mapRange(insertion, {anchor: point, focus: {path, offset: 6}}),
  ).toEqual({anchor: point, focus: {path, offset: 7}})
})

test('Scenario: numeric positions through unreadable replacement and insertion', () => {
  const key = createTestKeyGenerator()
  const value = ['foo', 'bar'].map((text) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }))
  const inside = {path: [0, 'children', 0], offset: 1}
  const outside = {path: [1, 'children', 0], offset: 1}
  const patch = set(
    {...value[0], children: [{...value[0]!.children[0], text: 'baz'}]},
    [0],
  )
  const steps = interpretChange({value}, [patch])
  console.warn(
    'NUMERIC ' +
      JSON.stringify({
        patch,
        steps: steps ?? 'undefined',
        inside: mapPoint(steps, inside),
        outside: mapPoint(steps, outside),
      }),
  )
  const insert: any = {
    type: 'insert',
    path: [{_key: value[0]!._key}],
    position: 'before',
    items: [
      {
        ...value[0],
        _key: key(),
        children: [{...value[0]!.children[0], _key: key(), text: 'baz'}],
      },
    ],
  }
  const inserted = interpretChange({value}, [insert])
  console.warn(
    'NUMERIC_INSERT ' +
      JSON.stringify({
        patch: insert,
        steps: inserted ?? 'undefined',
        storedNodeGap: {path: [0], offset: 0},
        mapped: mapPoint(inserted, {path: [0], offset: 0}),
      }),
  )
  expect(mapPoint(steps, inside)).toEqual(null)
})

test('Scenario: unreadable object metadata leaves content points outside its path', () => {
  const {value, prefix, blocks} = buildDoc('callout', 'foo')
  value[0].text = 'foo'
  const point = {path: [...prefix, {_key: blocks[0]!._key}, 'children', {_key: blocks[0]!.children[0]!._key}], offset: 1}
  const patch = set('bar', [{_key: value[0]._key}, 'text'])
  const steps = interpretChange({value}, [patch])
  console.warn('OUTSIDE_METADATA ' + JSON.stringify({patch, steps: steps ?? 'undefined', point, mapped: mapPoint(steps, point)}))
  expect(mapPoint(steps, point)).toEqual({path: [{_key: 'vk2'}, 'content', {_key: 'vk0'}, 'children', {_key: 'vk1'}], offset: 1})
})

test('Scenario: exact-offset affinity with an explicit diff boundary', () => {
  const key = createTestKeyGenerator()
  const blockKey = key()
  const spanKey = key()
  const path = [{_key: blockKey}, 'children', {_key: spanKey}]
  const value = [{_type: 'block', _key: blockKey, style: 'normal', markDefs: [], children: [{_type: 'span', _key: spanKey, text: 'fooh1', marks: []}]}]
  const patch = {type: 'diffMatchPatch' as const, path: [...path, 'text'], value: '@@ -1,5 +1,7 @@\n foo\n+h2\n h1\n'}
  const steps = interpretChange({value}, [patch])
  expect(steps).toEqual([{type: 'insert.text', path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3, length: 2}])
  const point = {path, offset: 3}
  expect(mapPoint(steps, point, {affinity: 'forward'})).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5})
  expect(mapPoint(steps, point, {affinity: 'backward'})).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
  for (const affinity of ['forward', 'backward'] as const) {
    const mapped = mapPoint(steps, point, {affinity})!
    const remote = 'fooh2h1'
    console.warn('EXACT_AFFINITY ' + JSON.stringify({affinity, patch, steps, before: 'foo', local: 'fooh1', remote, mapped, undo: remote.slice(0, mapped.offset) + remote.slice(mapped.offset + 2)}))
  }
})
