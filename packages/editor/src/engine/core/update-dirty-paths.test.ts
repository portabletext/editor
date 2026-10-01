import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createEditor} from '../create-editor'
import {normalize} from '../editor/normalize'
import {setNormalizing} from '../editor/set-normalizing'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {DirtyPathEntry} from '../interfaces/dirty-path-entry'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {pathEquals} from '../path/path-equals'
import {updateDirtyPaths} from './update-dirty-paths'

const schema = compileSchema(defineSchema({}))

describe(updateDirtyPaths.name, () => {
  test('a path dirtied again with the same origin keeps its position and upgrades its kind by rank', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const editor = createEditor()

    updateDirtyPaths(
      editor,
      [
        {path: [{_key: fooKey}], kind: 'ancestor'},
        {path: [{_key: barKey}], kind: 'ancestor'},
        {path: [{_key: bazKey}], kind: 'node'},
      ],
      'local',
    )
    updateDirtyPaths(
      editor,
      [{path: [{_key: fooKey}], kind: 'neighbour'}],
      'local',
    )
    updateDirtyPaths(
      editor,
      [{path: [{_key: barKey}], kind: 'descendant'}],
      'local',
    )
    updateDirtyPaths(
      editor,
      [
        {path: [{_key: fooKey}], kind: 'descendant'},
        {path: [{_key: bazKey}], kind: 'ancestor'},
      ],
      'local',
    )
    updateDirtyPaths(editor, [{path: [{_key: barKey}], kind: 'node'}], 'local')
    updateDirtyPaths(
      editor,
      [{path: [{_key: bazKey}], kind: 'neighbour'}],
      'local',
    )

    expect(editor.dirtyPaths).toEqual([
      {path: [{_key: 'k0'}], kind: 'descendant', origin: 'local'},
      {path: [{_key: 'k1'}], kind: 'node', origin: 'local'},
      {path: [{_key: 'k2'}], kind: 'node', origin: 'local'},
    ])
    expect([...editor.dirtyPathKeys.values()]).toEqual(editor.dirtyPaths)
  })

  test('a path dirtied again takes the origin ranked `force`, `local`, `remote`, `normalization`, never down', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const quxKey = keyGenerator()
    const editor = createEditor()

    updateDirtyPaths(
      editor,
      [
        {path: [{_key: fooKey}], kind: 'node'},
        {path: [{_key: barKey}], kind: 'node'},
      ],
      'remote',
    )
    updateDirtyPaths(
      editor,
      [
        {path: [{_key: bazKey}], kind: 'node'},
        {path: [{_key: quxKey}], kind: 'node'},
      ],
      'normalization',
    )
    updateDirtyPaths(
      editor,
      [{path: [{_key: fooKey}], kind: 'node'}],
      'normalization',
    )
    updateDirtyPaths(editor, [{path: [{_key: bazKey}], kind: 'node'}], 'remote')
    updateDirtyPaths(
      editor,
      [
        {path: [{_key: barKey}], kind: 'node'},
        {path: [{_key: quxKey}], kind: 'node'},
      ],
      'local',
    )
    updateDirtyPaths(editor, [{path: [{_key: barKey}], kind: 'node'}], 'force')
    updateDirtyPaths(
      editor,
      [
        {path: [{_key: barKey}], kind: 'node'},
        {path: [{_key: quxKey}], kind: 'node'},
      ],
      'remote',
    )

    expect(editor.dirtyPaths).toEqual([
      {path: [{_key: 'k0'}], kind: 'node', origin: 'remote'},
      {path: [{_key: 'k1'}], kind: 'node', origin: 'force'},
      {path: [{_key: 'k2'}], kind: 'node', origin: 'remote'},
      {path: [{_key: 'k3'}], kind: 'node', origin: 'local'},
    ])
  })

  test('a path dirtied again takes kind and origin together from the higher-ranked contribution', () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const editor = createEditor()

    updateDirtyPaths(editor, [{path: [{_key: fooKey}], kind: 'node'}], 'remote')
    updateDirtyPaths(
      editor,
      [{path: [{_key: fooKey}], kind: 'neighbour'}],
      'local',
    )
    updateDirtyPaths(editor, [{path: [{_key: barKey}], kind: 'node'}], 'local')
    updateDirtyPaths(
      editor,
      [{path: [{_key: barKey}], kind: 'ancestor'}],
      'normalization',
    )
    updateDirtyPaths(
      editor,
      [{path: [{_key: bazKey}], kind: 'ancestor'}],
      'local',
    )
    updateDirtyPaths(editor, [{path: [{_key: bazKey}], kind: 'node'}], 'remote')

    expect(editor.dirtyPaths).toEqual([
      {path: [{_key: 'k0'}], kind: 'neighbour', origin: 'local'},
      {path: [{_key: 'k1'}], kind: 'node', origin: 'local'},
      {path: [{_key: 'k2'}], kind: 'ancestor', origin: 'local'},
    ])
  })

  test('an adjacency entry never merges with its parent path or other adjacencies', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const editor = createEditor()

    updateDirtyPaths(
      editor,
      [
        {path: [{_key: blockKey}], kind: 'ancestor'},
        {
          path: [{_key: blockKey}],
          kind: 'adjacency',
          adjacency: {
            previous: [{_key: blockKey}, 'children', {_key: fooKey}],
            next: [{_key: blockKey}, 'children', {_key: barKey}],
          },
        },
      ],
      'remote',
    )
    updateDirtyPaths(
      editor,
      [
        {path: [{_key: blockKey}], kind: 'ancestor'},
        {
          path: [{_key: blockKey}],
          kind: 'adjacency',
          adjacency: {
            previous: [{_key: blockKey}, 'children', {_key: fooKey}],
            next: [{_key: blockKey}, 'children', {_key: bazKey}],
          },
        },
        {
          path: [{_key: blockKey}],
          kind: 'adjacency',
          adjacency: {
            previous: [{_key: blockKey}, 'children', {_key: fooKey}],
            next: [{_key: blockKey}, 'children', {_key: barKey}],
          },
        },
      ],
      'local',
    )

    expect(editor.dirtyPaths).toEqual([
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        },
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        },
        origin: 'local',
      },
    ])
  })
})

describe('dirty path origin', () => {
  test('an operation outside any frame dirties paths as `local`', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'local',
      },
    ])
  })

  test('an operation inside a `remote` frame dirties paths as `remote`', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.applyContext.push({kind: 'remote', source: 'patches'})
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })
    editor.applyContext.pop()

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'remote'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'remote'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'remote',
      },
    ])
  })

  test('an operation inside a `normalization` frame dirties paths as `normalization`', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.applyContext.push({kind: 'normalization'})
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })
    editor.applyContext.pop()

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'normalization'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'normalization'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'normalization',
      },
    ])
  })

  test('a normalization fix nested in a `remote` frame dirties paths as `remote`', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.applyContext.push({kind: 'remote', source: 'patches'})
    editor.applyContext.push({kind: 'normalization'})
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })
    editor.applyContext.pop()
    editor.applyContext.pop()

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'remote'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'remote'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'remote',
      },
    ])
  })

  test('a local operation on remotely dirtied paths upgrades them in place', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.applyContext.push({kind: 'remote', source: 'patches'})
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })
    editor.applyContext.pop()
    editor.apply({
      type: 'set',
      path: [{_key: 'k0'}, 'style'],
      value: 'h1',
    })

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'node', origin: 'local'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'remote',
      },
    ])
  })

  test('a local insert beside a remotely edited span marks the span a `local` neighbour', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])

    editor.applyContext.push({kind: 'remote', source: 'patches'})
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
      text: 'bar',
    })
    editor.applyContext.pop()
    editor.apply({
      type: 'insert',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      node: {_type: 'span', _key: keyGenerator(), text: 'baz', marks: []},
      position: 'after',
    })

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'neighbour',
        origin: 'local',
      },
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        kind: 'node',
        origin: 'local',
      },
    ])
  })

  test('a node removal records the adjacency read before the node is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo', 'bar', 'baz']),
    ])

    editor.apply({
      type: 'unset',
      path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
    })

    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [
          {_type: 'span', _key: 'k1', text: 'foo', marks: []},
          {_type: 'span', _key: 'k3', text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        },
        origin: 'local',
      },
    ])
  })
})

describe('dirty path resolution', () => {
  test('resolving a wide insert reads each sibling list once', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])
    const blockKey = keyGenerator()
    const spanCount = 4000
    const children = Array.from({length: spanCount}, (_, index) => ({
      _type: 'span',
      _key: keyGenerator(),
      text: `${index}`,
      marks: [],
    }))
    let siblingScans = 0
    const countedChildren = new Proxy(children, {
      get(target, property, receiver) {
        if (
          property === 'find' ||
          property === 'findIndex' ||
          property === 'indexOf' ||
          property === Symbol.iterator
        ) {
          siblingScans++
        }
        return Reflect.get(target, property, receiver)
      },
    })

    editor.apply({
      type: 'insert',
      path: [{_key: 'k0'}],
      node: {
        _type: 'block',
        _key: blockKey,
        children: countedChildren,
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    const entries = editor.dirtyPaths.filter(
      (entry) => entry.kind === 'descendant',
    )
    expect(entries).toHaveLength(spanCount)
    expect(
      entries.every((entry) => typeof entry.path.at(-1) !== 'number'),
    ).toBe(true)
    expect(siblingScans).toBeLessThanOrEqual(2)
  })

  test('an index-addressed operation dirties keyed paths, and index paths only for keyless nodes', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const barKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', text: 'foo', marks: []},
          {_type: 'span', _key: barKey, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.apply({
      type: 'insert.text',
      path: [0, 'children', 1],
      offset: 3,
      text: 'baz',
    })
    editor.apply({
      type: 'insert.text',
      path: [0, 'children', 0],
      offset: 3,
      text: 'qux',
    })

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        kind: 'node',
        origin: 'local',
      },
      {path: [{_key: 'k0'}, 'children', 0], kind: 'node', origin: 'local'},
    ])
  })

  test('an inserted block whose spans share a `_key` keeps one entry per span', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    editor.apply({
      type: 'insert',
      path: [{_key: 'k0'}],
      node: {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'bar', marks: []},
          {_type: 'span', _key: spanKey, text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'neighbour', origin: 'local'},
      {path: [{_key: 'k2'}], kind: 'node', origin: 'local'},
      {
        path: [{_key: 'k2'}, 'children', 0],
        kind: 'descendant',
        origin: 'local',
      },
      {
        path: [{_key: 'k2'}, 'children', 1],
        kind: 'descendant',
        origin: 'local',
      },
    ])
  })

  test('an index-addressed node removal records the adjacency by key', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo', 'bar', 'baz']),
    ])

    editor.apply({type: 'unset', path: [0, 'children', 1]})

    expect(editor.dirtyPaths).toEqual([
      {path: [], kind: 'ancestor', origin: 'local'},
      {path: [{_key: 'k0'}], kind: 'ancestor', origin: 'local'},
      {
        path: [{_key: 'k0'}],
        kind: 'adjacency',
        adjacency: {
          previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        },
        origin: 'local',
      },
    ])
  })
})

describe(normalize.name, () => {
  test('a node an index-addressed operation dirtied is visited after a later operation shifts its index', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const xKey = keyGenerator()
    const editor = createBareEditor(keyGenerator, [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: barKey, text: 'bar', marks: []},
          {_type: 'span', _key: bazKey, text: 'baz', marks: []},
          {_type: 'span', _key: xKey, text: 'X', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    const visits: Array<Path> = []

    editor.normalizeNode = ([, path]) => {
      visits.push(path)
    }
    setNormalizing(editor, true)

    withoutNormalizing(editor, () => {
      editor.apply({
        type: 'insert.text',
        path: [{_key: blockKey}, 'children', 3],
        offset: 1,
        text: '!',
      })
      editor.apply({
        type: 'insert',
        path: [{_key: blockKey}, 'children', 0],
        node: {_type: 'span', _key: keyGenerator(), text: 'Y', marks: ['em']},
        position: 'before',
      })
    })

    expect(visits).toEqual([
      [{_key: 'k0'}, 'children', {_key: 'k5'}],
      [{_key: 'k0'}, 'children', {_key: 'k4'}],
      [{_key: 'k0'}],
      [],
    ])
  })

  test('an operation applied inside `shouldNormalize` is visited in the same order as before', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])
    const visits: Array<Path> = []
    let inserted = false

    updateDirtyPaths(editor, [{path: [], kind: 'node'}], 'local')
    editor.shouldNormalize = () => {
      if (!inserted) {
        inserted = true
        editor.apply({
          type: 'insert.text',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
          text: 'bar',
        })
      }
      return true
    }
    editor.normalizeNode = ([, path]) => {
      visits.push(path)
    }
    setNormalizing(editor, true)

    normalize(editor)

    expect(visits).toEqual([
      [{_key: 'k0'}, 'children', {_key: 'k1'}],
      [{_key: 'k0'}],
      [],
    ])
    expect(editor.dirtyPaths).toEqual([])
  })

  test('adjacency entries below the top of the stack stay invisible to `shouldNormalize` and uncounted', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo', 'bar', 'baz']),
      textBlock(keyGenerator, ['qux']),
    ])
    const shouldNormalizeCalls: Array<{
      iteration: number
      initialDirtyPathsLength: number
      dirtyPaths: Array<Path>
    }> = []
    const visits: Array<Path> = []

    editor.shouldNormalize = ({
      iteration,
      initialDirtyPathsLength,
      dirtyPaths,
    }) => {
      shouldNormalizeCalls.push({
        iteration,
        initialDirtyPathsLength,
        dirtyPaths: [...dirtyPaths],
      })
      return true
    }
    editor.normalizeNode = ([, path]) => {
      visits.push(path)
    }
    setNormalizing(editor, true)

    withoutNormalizing(editor, () => {
      editor.apply({
        type: 'unset',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
      })
      editor.apply({
        type: 'insert.text',
        path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
        offset: 3,
        text: 'foo',
      })
    })

    expect(shouldNormalizeCalls).toEqual([
      {
        iteration: 0,
        initialDirtyPathsLength: 4,
        dirtyPaths: [
          [],
          [{_key: 'k0'}],
          [{_key: 'k4'}],
          [{_key: 'k4'}, 'children', {_key: 'k5'}],
        ],
      },
      {
        iteration: 1,
        initialDirtyPathsLength: 4,
        dirtyPaths: [[], [{_key: 'k0'}], [{_key: 'k4'}]],
      },
      {
        iteration: 2,
        initialDirtyPathsLength: 4,
        dirtyPaths: [[], [{_key: 'k0'}]],
      },
      {
        iteration: 3,
        initialDirtyPathsLength: 4,
        dirtyPaths: [[]],
      },
    ])
    expect(visits).toEqual([
      [{_key: 'k4'}, 'children', {_key: 'k5'}],
      [{_key: 'k4'}],
      [{_key: 'k0'}],
      [],
    ])
    expect(editor.dirtyPaths).toEqual([])
    expect([...editor.dirtyPathKeys.keys()]).toEqual([])
  })

  test('an adjacency entry on top of the stack is dropped without a visit', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
      textBlock(keyGenerator, ['bar']),
      textBlock(keyGenerator, ['baz']),
    ])
    const shouldNormalizeCalls: Array<{
      iteration: number
      initialDirtyPathsLength: number
      dirtyPaths: Array<Path>
    }> = []
    const visits: Array<Path> = []

    editor.shouldNormalize = ({
      iteration,
      initialDirtyPathsLength,
      dirtyPaths,
    }) => {
      shouldNormalizeCalls.push({
        iteration,
        initialDirtyPathsLength,
        dirtyPaths: [...dirtyPaths],
      })
      return true
    }
    editor.normalizeNode = ([, path]) => {
      visits.push(path)
    }
    setNormalizing(editor, true)
    editor.apply({type: 'unset', path: [{_key: 'k2'}]})

    expect(shouldNormalizeCalls).toEqual([
      {iteration: 0, initialDirtyPathsLength: 1, dirtyPaths: [[]]},
    ])
    expect(visits).toEqual([[]])
    expect(editor.dirtyPaths).toEqual([])
    expect([...editor.dirtyPathKeys.keys()]).toEqual([])
  })

  test('a fix that re-dirties a visited path and records an adjacency is visited again until fixpoint', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo', 'bar', 'baz']),
    ])
    const shouldNormalizeCalls: Array<{
      iteration: number
      initialDirtyPathsLength: number
      dirtyPaths: Array<Path>
    }> = []
    const visits: Array<Path> = []
    let fixed = false

    editor.shouldNormalize = ({
      iteration,
      initialDirtyPathsLength,
      dirtyPaths,
    }) => {
      shouldNormalizeCalls.push({
        iteration,
        initialDirtyPathsLength,
        dirtyPaths: [...dirtyPaths],
      })
      return true
    }
    editor.normalizeNode = ([, path]) => {
      visits.push(path)

      if (!fixed && pathEquals(path, [{_key: 'k0'}])) {
        fixed = true
        editor.apply({
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        })
      }
    }
    setNormalizing(editor, true)
    editor.apply({
      type: 'insert.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 3,
      text: 'foo',
    })

    expect(shouldNormalizeCalls).toEqual([
      {
        iteration: 0,
        initialDirtyPathsLength: 3,
        dirtyPaths: [
          [],
          [{_key: 'k0'}],
          [{_key: 'k0'}, 'children', {_key: 'k1'}],
        ],
      },
      {
        iteration: 1,
        initialDirtyPathsLength: 3,
        dirtyPaths: [[], [{_key: 'k0'}]],
      },
      {
        iteration: 2,
        initialDirtyPathsLength: 3,
        dirtyPaths: [[], [{_key: 'k0'}]],
      },
      {
        iteration: 3,
        initialDirtyPathsLength: 3,
        dirtyPaths: [[]],
      },
    ])
    expect(visits).toEqual([
      [{_key: 'k0'}, 'children', {_key: 'k1'}],
      [{_key: 'k0'}],
      [{_key: 'k0'}],
      [],
    ])
    expect(editor.dirtyPaths).toEqual([])
    expect([...editor.dirtyPathKeys.keys()]).toEqual([])
  })

  test('an empty text block is visited before the loop and its fix counts toward the initial length', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])
    const shouldNormalizeCalls: Array<{
      iteration: number
      initialDirtyPathsLength: number
      dirtyPaths: Array<Path>
    }> = []
    const visits: Array<Path> = []

    editor.shouldNormalize = ({
      iteration,
      initialDirtyPathsLength,
      dirtyPaths,
    }) => {
      shouldNormalizeCalls.push({
        iteration,
        initialDirtyPathsLength,
        dirtyPaths: [...dirtyPaths],
      })
      return true
    }
    editor.normalizeNode = ([node, path]) => {
      visits.push(path)

      if (isTextBlock({schema}, node) && node.children.length === 0) {
        editor.apply({
          type: 'insert',
          path: [...path, 'children', 0],
          node: {_type: 'span', _key: keyGenerator(), text: '', marks: []},
          position: 'before',
        })
      }
    }
    setNormalizing(editor, true)
    editor.apply({
      type: 'unset',
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
    })

    expect(shouldNormalizeCalls).toEqual([
      {
        iteration: 0,
        initialDirtyPathsLength: 3,
        dirtyPaths: [
          [],
          [{_key: 'k0'}],
          [{_key: 'k0'}, 'children', {_key: 'k2'}],
        ],
      },
      {
        iteration: 1,
        initialDirtyPathsLength: 3,
        dirtyPaths: [[], [{_key: 'k0'}]],
      },
      {
        iteration: 2,
        initialDirtyPathsLength: 3,
        dirtyPaths: [[]],
      },
    ])
    expect(visits).toEqual([
      [{_key: 'k0'}],
      [{_key: 'k0'}, 'children', {_key: 'k2'}],
      [{_key: 'k0'}],
      [],
    ])
    expect(editor.snapshot.context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        children: [{_type: 'span', _key: 'k2', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('the default `shouldNormalize` throws on iteration 43 for one initial path', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo', 'bar', 'baz']),
    ])
    const visits: Array<Path> = []

    updateDirtyPaths(
      editor,
      [
        {
          path: [{_key: 'k0'}],
          kind: 'adjacency',
          adjacency: {
            previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          },
        },
        {path: [{_key: 'k0'}], kind: 'node'},
      ],
      'local',
    )
    editor.normalizeNode = ([, path]) => {
      visits.push(path)
      updateDirtyPaths(
        editor,
        [
          {
            path: [{_key: 'k0'}],
            kind: 'adjacency',
            adjacency: {
              previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              next: [{_key: 'k0'}, 'children', {_key: 'k2'}],
            },
          },
          {path: [{_key: 'k0'}], kind: 'node'},
        ],
        'normalization',
      )
    }
    setNormalizing(editor, true)

    expect(() => normalize(editor)).toThrow(
      'Could not completely normalize the editor after 42 iterations!',
    )
    expect(visits).toEqual(Array.from({length: 43}, (): Path => [{_key: 'k0'}]))
  })

  test('a forced normalization dirties every node as a `force` node', () => {
    const keyGenerator = createTestKeyGenerator()
    const editor = createBareEditor(keyGenerator, [
      textBlock(keyGenerator, ['foo']),
    ])
    const observedLedgers: Array<Array<DirtyPathEntry>> = []

    editor.shouldNormalize = () => {
      observedLedgers.push([...editor.dirtyPaths])
      return true
    }
    setNormalizing(editor, true)
    normalize(editor, {force: true})

    expect(observedLedgers).toEqual([
      [
        {path: [{_key: 'k0'}], kind: 'node', origin: 'force'},
        {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          kind: 'node',
          origin: 'force',
        },
      ],
      [{path: [{_key: 'k0'}], kind: 'node', origin: 'force'}],
    ])
  })
})

function createBareEditor(
  keyGenerator: () => string,
  value: Array<PortableTextBlock>,
): Editor {
  const editor = createEditor()
  const blockIndexMap = new Map<string, number>()

  editor.containers = new Map()
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers: new Map(),
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  }
  setNormalizing(editor, false)

  return editor
}

function textBlock(
  keyGenerator: () => string,
  texts: Array<string>,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: texts.map((text) => ({
      _type: 'span',
      _key: keyGenerator(),
      text,
      marks: [],
    })),
    markDefs: [],
    style: 'normal',
  }
}
