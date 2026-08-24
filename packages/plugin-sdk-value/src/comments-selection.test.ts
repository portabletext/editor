import {describe, expect, test} from 'vitest'
import {
  COMMENT_INDICATORS,
  resolveCommentSelections,
} from './comments-anchoring'
import {buildStoredSelection} from './comments-selection'

const [START, END] = COMMENT_INDICATORS

function span(_key: string, text: string) {
  return {_type: 'span', _key, marks: [], text}
}

function block(_key: string, children: ReturnType<typeof span>[]) {
  return {_key, _type: 'block', style: 'normal', markDefs: [], children}
}

function point(blockKey: string, spanKey: string, offset: number) {
  return {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset}
}

describe('buildStoredSelection', () => {
  test('marks the selected run inside a single span', () => {
    const foo = block('b1', [span('s1', 'foo bar baz')])

    expect(
      buildStoredSelection({
        selection: {anchor: point('b1', 's1', 4), focus: point('b1', 's1', 7)},
        selectedBlocks: [{node: foo, path: [{_key: 'b1'}]}],
      }),
    ).toEqual({
      containerPath: [],
      selection: {
        type: 'text',
        value: [{_key: 'b1', text: `foo ${START}bar${END} baz`}],
      },
    })
  })

  test('a backward selection marks the same run', () => {
    const foo = block('b1', [span('s1', 'foo bar baz')])

    expect(
      buildStoredSelection({
        selection: {
          anchor: point('b1', 's1', 7),
          focus: point('b1', 's1', 4),
          backward: true,
        },
        selectedBlocks: [{node: foo, path: [{_key: 'b1'}]}],
      }),
    ).toEqual({
      containerPath: [],
      selection: {
        type: 'text',
        value: [{_key: 'b1', text: `foo ${START}bar${END} baz`}],
      },
    })
  })

  test('offsets count across earlier spans in the block', () => {
    const foo = block('b1', [span('s1', 'foo '), span('s2', 'bar baz')])

    expect(
      buildStoredSelection({
        selection: {anchor: point('b1', 's2', 0), focus: point('b1', 's2', 3)},
        selectedBlocks: [{node: foo, path: [{_key: 'b1'}]}],
      })?.selection.value,
    ).toEqual([{_key: 'b1', text: `foo ${START}bar${END} baz`}])
  })

  test('a selection spanning blocks marks each block, middle blocks whole', () => {
    const first = block('b1', [span('s1', 'foo bar')])
    const middle = block('b2', [span('s2', 'baz')])
    const last = block('b3', [span('s3', 'qux quux')])

    expect(
      buildStoredSelection({
        selection: {anchor: point('b1', 's1', 4), focus: point('b3', 's3', 3)},
        selectedBlocks: [
          {node: first, path: [{_key: 'b1'}]},
          {node: middle, path: [{_key: 'b2'}]},
          {node: last, path: [{_key: 'b3'}]},
        ],
      })?.selection.value,
    ).toEqual([
      {_key: 'b1', text: `foo ${START}bar${END}`},
      {_key: 'b2', text: `${START}baz${END}`},
      {_key: 'b3', text: `${START}qux${END} quux`},
    ])
  })

  test('nested blocks report their containing array', () => {
    const nested = block('b1', [span('s1', 'foo bar')])
    const path = [{_key: 'callout'}, 'content', {_key: 'b1'}]

    expect(
      buildStoredSelection({
        selection: {
          anchor: {
            path: [...path.slice(0, 2), {_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [...path.slice(0, 2), {_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3,
          },
        },
        selectedBlocks: [{node: nested, path}],
      })?.containerPath,
    ).toEqual([{_key: 'callout'}, 'content'])
  })

  test('blocks from different containers refuse to build', () => {
    const topLevel = block('b1', [span('s1', 'foo')])
    const nested = block('b2', [span('s2', 'bar')])

    expect(
      buildStoredSelection({
        selection: {anchor: point('b1', 's1', 0), focus: point('b2', 's2', 3)},
        selectedBlocks: [
          {node: topLevel, path: [{_key: 'b1'}]},
          {node: nested, path: [{_key: 'callout'}, 'content', {_key: 'b2'}]},
        ],
      }),
    ).toBe(null)
  })

  test('a collapsed selection refuses to build', () => {
    const foo = block('b1', [span('s1', 'foo bar')])

    expect(
      buildStoredSelection({
        selection: {anchor: point('b1', 's1', 4), focus: point('b1', 's1', 4)},
        selectedBlocks: [{node: foo, path: [{_key: 'b1'}]}],
      }),
    ).toBe(null)
  })

  test('a null selection refuses to build', () => {
    expect(buildStoredSelection({selection: null, selectedBlocks: []})).toBe(
      null,
    )
  })

  test('what it writes, the reader finds again', () => {
    // The round trip is the point of matching the Studio's format: written
    // here, resolved by the same code path that resolves Studio comments.
    const foo = block('b1', [span('s1', 'foo bar baz')])
    const built = buildStoredSelection({
      selection: {anchor: point('b1', 's1', 4), focus: point('b1', 's1', 7)},
      selectedBlocks: [{node: foo, path: [{_key: 'b1'}]}],
    })

    const anchored = resolveCommentSelections({
      value: [foo],
      comments: [
        {
          commentId: 'c1',
          relativePath: built!.containerPath,
          selection: built!.selection,
        },
      ],
    })

    expect(anchored.map((a) => a.selection)).toEqual([
      {
        anchor: {offset: 4, path: [{_key: 'b1'}, 'children', {_key: 's1'}]},
        focus: {offset: 7, path: [{_key: 'b1'}, 'children', {_key: 's1'}]},
      },
    ])
  })
})
