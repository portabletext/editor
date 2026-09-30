import {compileSchema, defineSchema} from '@portabletext/schema'
import type {PortableTextSpan} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {withRemoteChanges} from '../../engine-plugins/engine-plugin.remote-changes'
import {createEditor} from '../create-editor'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {
  buildTouchedPaths,
  carryTouchThroughRekey,
  inheritRightEdge,
  isPairTouched,
} from './touched-paths'

describe(buildTouchedPaths.name, () => {
  test('only local node and descendant entries touch, and local adjacency becomes a boundary', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, keyGenerator(), [
      span(keyGenerator(), 'foo'),
      span(keyGenerator(), 'bar'),
      span(keyGenerator(), 'baz'),
      span(keyGenerator(), 'foo'),
      span(keyGenerator(), 'bar'),
      span(keyGenerator(), 'baz'),
      span(keyGenerator(), 'foo'),
      span(keyGenerator(), 'bar'),
      span(keyGenerator(), 'baz'),
      span(undefined, 'foo'),
      span(undefined, 'bar'),
    ])

    const touched = buildTouchedPaths(editor, [
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        kind: 'descendant',
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        kind: 'neighbour',
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
        kind: 'ancestor',
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
        kind: 'node',
        origin: 'remote',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
        kind: 'node',
        origin: 'normalization',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k7'}],
        kind: 'node',
        origin: 'force',
      },
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        origin: 'local',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k8'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k9'}],
        },
      },
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        origin: 'remote',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k6'}],
        },
      },
      {
        path: [
          {_key: 'k0'},
          'children',
          {_key: undefined as unknown as string},
        ],
        kind: 'node',
        origin: 'local',
      },
    ])

    expect(touched).toEqual({
      touched: false,
      rightEdge: false,
      children: new Map([
        [
          '[_key=="k0"]',
          {
            touched: false,
            rightEdge: false,
            children: new Map([
              [
                '.children',
                {
                  touched: false,
                  rightEdge: false,
                  children: new Map([
                    ['[_key=="k1"]', {touched: true, rightEdge: true}],
                    ['[_key=="k2"]', {touched: true, rightEdge: true}],
                    ['[9]', {touched: true, rightEdge: true}],
                    ['[10]', {touched: true, rightEdge: true}],
                  ]),
                  boundaries: new Map([['[_key=="k8"]', '[_key=="k9"]']]),
                },
              ],
            ]),
          },
        ],
      ]),
    })
  })
})

describe(carryTouchThroughRekey.name, () => {
  test('5,000 re-keys each carry their touch to the new key', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const editor = createBareEditor(
      keyGenerator,
      blockKey,
      Array.from({length: 5_000}, () => span(undefined, 'foo')),
    )
    const touched = buildTouchedPaths(editor, [
      {
        path: [
          {_key: blockKey},
          'children',
          {_key: undefined as unknown as string},
        ],
        kind: 'node',
        origin: 'local',
      },
    ])
    const untouchedPath: Path = [
      {_key: blockKey},
      'children',
      {_key: keyGenerator()},
    ]
    const newKeys = Array.from({length: 5_000}, () => keyGenerator())

    for (let index = 0; index < 5_000; index++) {
      carryTouchThroughRekey(
        touched,
        [{_key: blockKey}, 'children'],
        {key: undefined, index},
        newKeys[index]!,
      )
    }

    expect(
      newKeys.map((newKey) =>
        isPairTouched(touched, untouchedPath, [
          {_key: blockKey},
          'children',
          {_key: newKey},
        ]),
      ),
    ).toEqual(Array.from({length: 5_000}, () => true))
  })

  test('a re-key copies the touch, so the same-key siblings keep theirs when the copy changes', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, blockKey, [
      span(duplicateKey, 'foo'),
      span(duplicateKey, 'bar'),
    ])
    const touched = buildTouchedPaths(editor, [
      {
        path: [{_key: blockKey}, 'children', {_key: duplicateKey}],
        kind: 'node',
        origin: 'local',
      },
    ])
    const newKey = keyGenerator()
    const untouchedKey = keyGenerator()

    carryTouchThroughRekey(
      touched,
      [{_key: blockKey}, 'children'],
      {key: duplicateKey, index: 1},
      newKey,
    )
    inheritRightEdge(
      touched,
      [{_key: blockKey}, 'children', {_key: newKey}],
      [{_key: blockKey}, 'children', {_key: untouchedKey}],
    )

    expect(touched).toEqual({
      touched: false,
      rightEdge: false,
      children: new Map([
        [
          '[_key=="k0"]',
          {
            touched: false,
            rightEdge: false,
            children: new Map([
              [
                '.children',
                {
                  touched: false,
                  rightEdge: false,
                  children: new Map([
                    ['[_key=="k1"]', {touched: true, rightEdge: true}],
                    ['[_key=="k2"]', {touched: true, rightEdge: false}],
                  ]),
                },
              ],
            ]),
          },
        ],
      ]),
    })
  })

  test('a re-key moves a removal boundary to the new key', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, blockKey, [
      span(fooKey, 'foo'),
      span(keyGenerator(), 'bar'),
      span(undefined, 'baz'),
    ])
    const touched = buildTouchedPaths(editor, [
      {
        path: [{_key: blockKey}],
        kind: 'adjacency',
        origin: 'local',
        adjacency: {
          previous: [{_key: blockKey}, 'children', {_key: fooKey}],
          next: [{_key: blockKey}, 'children', 2],
        },
      },
    ])
    const newKey = keyGenerator()

    carryTouchThroughRekey(
      touched,
      [{_key: blockKey}, 'children'],
      {key: undefined, index: 2},
      newKey,
    )

    expect([
      isPairTouched(
        touched,
        [{_key: blockKey}, 'children', {_key: fooKey}],
        [{_key: blockKey}, 'children', 2],
      ),
      isPairTouched(
        touched,
        [{_key: blockKey}, 'children', {_key: fooKey}],
        [{_key: blockKey}, 'children', {_key: newKey}],
      ),
    ]).toEqual([false, true])
  })
})

describe('touches read from the dirty entries', () => {
  test('a remote operation inside a local batch does not count as touched', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, blockKey, [
      span(fooKey, 'foo'),
      span(barKey, 'bar'),
      span(bazKey, 'baz'),
    ])

    withoutNormalizing(editor, () => {
      withRemoteChanges(editor, 'patches', () => {
        editor.apply({
          type: 'insert.text',
          path: [{_key: blockKey}, 'children', {_key: barKey}],
          offset: 3,
          text: '!',
        })
      })
      editor.apply({
        type: 'set',
        path: [{_key: blockKey}, 'style'],
        value: 'h1',
      })
    })

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'h1',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {_type: 'span', _key: 'k2', text: 'bar!', marks: []},
          {_type: 'span', _key: 'k3', text: 'baz', marks: []},
        ],
      },
    ])
  })
})

function span(key: string | undefined, text: string): PortableTextSpan {
  return {_type: 'span', _key: key as string, text, marks: []}
}

function createBareEditor(
  keyGenerator: () => string,
  blockKey: string,
  children: Array<PortableTextSpan>,
): Editor {
  const editor = createEditor()

  editor.containers = new Map()
  editor.blockIndexMap = new Map()
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap: editor.blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema: compileSchema(
        defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
      ),
      selection: null,
      value: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children,
        },
      ],
    },
    decoratorState: {},
    // The bare engine editor lacks the fields that `withDOM` and
    // `createEditorEngine` assign. Only the snapshot fields used by
    // `apply` are needed here.
  } as Editor['snapshot']

  return editor
}
