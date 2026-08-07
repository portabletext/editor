import type {Patch} from '@portabletext/patches'
import {describe, expect, test} from 'vitest'
import {cancelNetZeroPatches} from './cancel-net-zero-patches'

describe('cancelNetZeroPatches', () => {
  test('cancels an inserted-then-unset span, leaving the net change', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'ALPHA', marks: []}],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,3 +1,8 @@\n A: \n+ALPHA\n',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual([
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,3 +1,8 @@\n A: \n+ALPHA\n',
        origin: 'local',
      },
    ])
  })

  test('cancels the full paste emission shape, both transient spans', () => {
    // The eight patches a merged `insert.blocks` emits: `k4` is the empty
    // split-remainder span, `k3` the pasted span, both merged away by
    // normalization within the same flush.
    const patches: Array<Patch> = [
      {
        type: 'set',
        path: [{_key: 'b1'}, 'markDefs'],
        value: [],
        origin: 'local',
      },
      {
        type: 'setIfMissing',
        path: [{_key: 'b1'}, 'children'],
        value: [],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'k4', marks: [], text: ''}],
        origin: 'local',
      },
      {
        type: 'setIfMissing',
        path: [{_key: 'b1'}, 'children'],
        value: [],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'k3', text: 'ALPHA', marks: []}],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,3 +1,8 @@\n A: \n+ALPHA\n',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'k3'}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'k4'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual([
      {
        type: 'set',
        path: [{_key: 'b1'}, 'markDefs'],
        value: [],
        origin: 'local',
      },
      {
        type: 'setIfMissing',
        path: [{_key: 'b1'}, 'children'],
        value: [],
        origin: 'local',
      },
      {
        type: 'setIfMissing',
        path: [{_key: 'b1'}, 'children'],
        value: [],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,3 +1,8 @@\n A: \n+ALPHA\n',
        origin: 'local',
      },
    ])
  })

  test('drops patches scoped inside the cancelled item', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: '', marks: []}],
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}, 'text'],
        value: 'scratch',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual([])
  })

  test('removes only the cancelled item from a multi-item insert', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [
          {_type: 'span', _key: 'x1', text: 'keep', marks: []},
          {_type: 'span', _key: 'x2', text: 'scratch', marks: []},
        ],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x2'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual([
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'keep', marks: []}],
        origin: 'local',
      },
    ])
  })

  test('bails when the key anchors another insert', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'scratch', marks: []}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'y1', text: 'anchored', marks: []}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual(patches)
  })

  test('bails when the key is referenced outside the insert/unset window', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'scratch', marks: []}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}, 'text'],
        value: 'after the window',
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual(patches)
  })

  test('keeps an unset of a key the flush never inserted', () => {
    // A plain local deletion: the unset targets pre-existing content and
    // must pass through untouched.
    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual(patches)
  })

  test('does not pair an unset that precedes the insert', () => {
    // Remove-then-recreate with the same key nets to a replacement, not
    // to nothing.
    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'recreated', marks: []}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual(patches)
  })

  test('cancels the first pair and keeps a re-insert of the same key', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'scratch', marks: []}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'final', marks: []}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual([
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'final', marks: []}],
        origin: 'local',
      },
    ])
  })

  test('treats same key under different parents as different items', () => {
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 'x1', text: 'scratch', marks: []}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b2'}, 'children', {_key: 'x1'}],
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toEqual(patches)
  })

  test('returns the input untouched when nothing cancels', () => {
    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,3 +1,4 @@\n foo\n+b\n',
        origin: 'local',
      },
    ]

    expect(cancelNetZeroPatches(patches)).toBe(patches)
  })
})
