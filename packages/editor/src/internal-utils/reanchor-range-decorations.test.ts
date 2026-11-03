import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  matchBlocks,
  reanchorRange,
  shiftPointForDelete,
  shiftPointForInsert,
  shiftPointForReplace,
} from './reanchor-range-decorations'

describe(reanchorRange.name, () => {
  test('moves a range suffix into a split block', () => {
    expect(
      reanchorRange(
        [block('b1', 's1', 'hello dolly')],
        [block('b1', 's1', 'hello '), block('b2', 's2', 'dolly')],
        range('b1', 's1', 0, 'b1', 's1', 11),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 5,
      },
    })
  })

  test('moves a range from a merged block into its predecessor', () => {
    expect(
      reanchorRange(
        [block('b1', 's1', 'foo'), block('b2', 's2', 'bar')],
        [block('b1', 's1', 'foobar')],
        range('b2', 's2', 0, 'b2', 's2', 3),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      },
      focus: {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 6,
      },
    })
  })

  test('leaves a point on an inline object to operation mapping', () => {
    const before = block('b1', 's1', 'foo')
    if (Array.isArray(before.children)) {
      before.children.push({_key: 'i1', _type: 'emoji'})
    }

    expect(
      reanchorRange([before], [before], range('b1', 'i1', 0, 'b1', 'i1', 0)),
    ).toEqual(undefined)
  })

  test('guesses the first repeated suffix is a split', () => {
    expect(
      matchBlocks(
        [block('b1', 's1', 'foofoo')],
        [block('b1', 's1', 'foo'), block('b2', 's2', 'foo')],
      ),
    ).toEqual([
      {
        type: 'split',
        key: 'b1',
        before: block('b1', 's1', 'foofoo'),
        after: block('b1', 's1', 'foo'),
        splitIntoKey: 'b2',
        splitOffset: 3,
        splitIntoOffset: 0,
      },
    ])
  })

  test('moves an old tail past inserted blocks in a mid-block paste', () => {
    expect(
      reanchorRange(
        [block('b1', 's1', 'Hello world')],
        [block('b1', 's1', 'HelloAAA'), block('p2', 'ps2', 'BBB world')],
        range('b1', 's1', 6, 'b1', 's1', 11),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'p2'}, 'children', {_key: 'ps2'}],
        offset: 4,
      },
      focus: {
        path: [{_key: 'p2'}, 'children', {_key: 'ps2'}],
        offset: 9,
      },
    })
  })

  test('treats a rekeyed block as removed and added', () => {
    expect(
      matchBlocks([block('b1', 's1', 'foo')], [block('b2', 's2', 'foo')]),
    ).toEqual([
      {type: 'removed', key: 'b1', before: block('b1', 's1', 'foo')},
      {type: 'added', key: 'b2', after: block('b2', 's2', 'foo')},
    ])
  })
})

describe('point shifting', () => {
  test('uses anchor and focus insertion affinity at a boundary', () => {
    expect(
      shiftPointForInsert({blockKey: 'b1', offset: 3}, 3, 2, 'anchor'),
    ).toEqual({point: {blockKey: 'b1', offset: 5}, invalidated: false})
    expect(
      shiftPointForInsert({blockKey: 'b1', offset: 3}, 3, 2, 'focus'),
    ).toEqual({point: {blockKey: 'b1', offset: 3}, invalidated: false})
  })

  test('collapses deletion points and invalidates points inside replacements', () => {
    expect(shiftPointForDelete({blockKey: 'b1', offset: 4}, 2, 4)).toEqual({
      point: {blockKey: 'b1', offset: 2},
      invalidated: false,
    })
    expect(shiftPointForReplace({blockKey: 'b1', offset: 4}, 2, 4, 1)).toEqual({
      point: {blockKey: 'b1', offset: 2},
      invalidated: true,
    })
  })
})

function block(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
  }
}

function range(
  anchorBlockKey: string,
  anchorChildKey: string,
  anchorOffset: number,
  focusBlockKey: string,
  focusChildKey: string,
  focusOffset: number,
) {
  return {
    anchor: {
      path: [
        {_key: anchorBlockKey},
        'children' as const,
        {_key: anchorChildKey},
      ],
      offset: anchorOffset,
    },
    focus: {
      path: [{_key: focusBlockKey}, 'children' as const, {_key: focusChildKey}],
      offset: focusOffset,
    },
  }
}
