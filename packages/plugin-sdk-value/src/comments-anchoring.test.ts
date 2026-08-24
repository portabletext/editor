import {describe, expect, test} from 'vitest'
import {
  COMMENT_INDICATORS,
  relativeCommentPath,
  resolveCommentSelections,
  type StoredTextSelection,
} from './comments-anchoring'

/**
 * The scenarios are ported from the Studio's
 * `buildRangeDecorationSelectionsFromComments` suite, fixtures included, so the
 * two implementations can be diffed against the same cases. One known gap the
 * Studio's suite also carries is pinned with `test.fails` below.
 */

function span(_key: string, text: string) {
  return {_type: 'span', _key, marks: [], text}
}

function block(_key: string, children: ReturnType<typeof span>[]) {
  return {_key, _type: 'block', style: 'normal', markDefs: [], children}
}

function stored(text: string, _key = '6222e4072b6e'): StoredTextSelection {
  return {type: 'text', value: [{_key, text}]}
}

const MARKED = `Hello ${COMMENT_INDICATORS[0]}there${COMMENT_INDICATORS[1]} world`

function resolve(value: unknown[], selection: StoredTextSelection) {
  return resolveCommentSelections({
    value,
    comments: [{commentId: 'c1', relativePath: [], selection}],
  }).map((anchored) => anchored.selection)
}

describe('resolveCommentSelections', () => {
  test('exact match between the stored text and the block', () => {
    const value = [
      block('6222e4072b6e', [span('9d9c95878a6e0', 'Hello there world')]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 6,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
        focus: {
          offset: 11,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
      },
    ])
  })

  test('text before the range was bolded, splitting the span', () => {
    const value = [
      block('6222e4072b6e', [
        span('9d9c95878a6e0', 'Hello'),
        span('5d176cf77466', ' there world'),
      ]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 1,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '5d176cf77466'}],
        },
        focus: {
          offset: 6,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '5d176cf77466'}],
        },
      },
    ])
  })

  test('text inside the range was bolded, splitting it across three spans', () => {
    const value = [
      block('6222e4072b6e', [
        span('9d9c95878a6e0', 'Hello th'),
        span('ea97036ed5c4', 'e'),
        span('8daa33e86194', 're world'),
      ]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 6,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
        focus: {
          offset: 2,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '8daa33e86194'}],
        },
      },
    ])
  })

  test('bolding spans both inside and outside the range', () => {
    const value = [
      block('6222e4072b6e', [
        span('9d9c95878a6e0', 'Hel'),
        span('897d8881c889', 'lo th'),
        span('3b404dd88fc1', 'ere world'),
      ]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 3,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '897d8881c889'}],
        },
        focus: {
          offset: 3,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '3b404dd88fc1'}],
        },
      },
    ])
  })

  test('an edit inside the commented word grows the range to cover it', () => {
    const value = [
      block('6222e4072b6e', [span('9d9c95878a6e0', 'Hello the123re world')]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 6,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
        focus: {
          offset: 14,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
      },
    ])
  })

  test('a similar word added before the range does not steal the anchor', () => {
    const value = [
      block('6222e4072b6e', [span('9d9c95878a6e0', 'Hello where there world')]),
    ]

    expect(resolve(value, stored(MARKED))).toEqual([
      {
        anchor: {
          offset: 12,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
        focus: {
          offset: 17,
          path: [{_key: '6222e4072b6e'}, 'children', {_key: '9d9c95878a6e0'}],
        },
      },
    ])
  })

  test('a comment whose block is gone resolves to nothing', () => {
    const value = [block('another-block', [span('s1', 'Hello there world')])]

    expect(resolve(value, stored(MARKED))).toEqual([])
  })

  // A known gap, carried by the Studio's own suite too: text typed
  // immediately after the range is absorbed into it. Pinned with `fails` so
  // this flips loudly if the algorithm ever gains the behaviour.
  test.fails('an edit immediately after the range does not expand it', () => {
    const value = [
      block('6222e4072b6e', [span('9d9c95878a6e0', 'Hello there123 world')]),
    ]
    expect(resolve(value, stored(MARKED))).toEqual([])
  })

  test('a dramatically changed block drops the anchor', () => {
    const value = [
      block('6222e4072b6e', [span('9d9c95878a6e0', 'Something else entirely')]),
    ]
    expect(resolve(value, stored(MARKED))).toEqual([])
  })

  test('a nested block resolves through its container path', () => {
    const value = [
      {
        _key: 'callout',
        _type: 'callout',
        content: [block('b1', [span('s1', 'Hello there world')])],
      },
    ]

    const anchored = resolveCommentSelections({
      value,
      comments: [
        {
          commentId: 'c1',
          relativePath: [{_key: 'callout'}, 'content'],
          selection: stored(MARKED, 'b1'),
        },
      ],
    })

    expect(anchored.map((a) => a.selection)).toEqual([
      {
        anchor: {
          offset: 6,
          path: [
            {_key: 'callout'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
        },
        focus: {
          offset: 11,
          path: [
            {_key: 'callout'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
        },
      },
    ])
  })
})

describe('relativeCommentPath', () => {
  test('reduces a stored field path to a path inside the editor', () => {
    expect(
      relativeCommentPath(['body'], 'body[_key=="callout"].content'),
    ).toEqual([{_key: 'callout'}, 'content'])
  })

  test('an exact match reduces to the empty path', () => {
    expect(relativeCommentPath(['body'], 'body')).toEqual([])
  })

  test("a sibling editor's comment does not match", () => {
    expect(relativeCommentPath(['body'], 'summary')).toBe(undefined)
  })

  test('an unparseable stored path is skipped rather than thrown on', () => {
    expect(relativeCommentPath(['body'], '[[[')).toBe(undefined)
  })

  test('an empty stored path is skipped', () => {
    expect(relativeCommentPath(['body'], '')).toBe(undefined)
  })
})
