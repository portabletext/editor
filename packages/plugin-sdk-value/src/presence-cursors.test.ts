import type {EditorSelection} from '@portabletext/editor'
import {createElement, type PropsWithChildren, type ReactElement} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  collapseToCaret,
  recordCursorMove,
  resolveCursorSelection,
  toRangeDecorations,
  type CursorOverride,
  type RemoteCursor,
} from './presence-cursors'

function span(
  anchorOffset: number,
  focusOffset: number,
  key = 'span-1',
): NonNullable<EditorSelection> {
  const path = [{_key: 'block-1'}, 'children', {_key: key}]
  return {
    anchor: {path, offset: anchorOffset},
    focus: {path, offset: focusOffset},
  }
}

function renderCursor(): (props: PropsWithChildren) => ReactElement {
  return (props) => createElement('span', null, props.children)
}

function overridesOf(
  ...entries: Array<[string, CursorOverride]>
): ReadonlyMap<string, CursorOverride> {
  return new Map(entries)
}

describe('collapseToCaret', () => {
  it('leaves an absent selection absent', () => {
    expect(collapseToCaret(null)).toBeNull()
  })

  it('puts both points at the focus, so no text reads as selected', () => {
    expect(collapseToCaret(span(2, 7))).toEqual({
      anchor: span(2, 7).focus,
      focus: span(2, 7).focus,
    })
  })

  it('leaves an already collapsed selection where it is', () => {
    expect(collapseToCaret(span(4, 4))).toEqual(span(4, 4))
  })
})

describe('resolveCursorSelection', () => {
  it('collapses a fresh report when nothing has moved it', () => {
    const cursor: RemoteCursor = {sessionId: 'a', selection: span(2, 6)}

    expect(resolveCursorSelection(cursor, undefined)).toEqual(
      collapseToCaret(span(2, 6)),
    )
  })

  it('keeps a locally moved caret while the participant reports the same selection', () => {
    const cursor: RemoteCursor = {sessionId: 'a', selection: span(1, 1)}
    // A fresh object with identical values, which is what every heartbeat sends.
    const override: CursorOverride = {reported: span(1, 1), current: span(9, 9)}

    expect(resolveCursorSelection(cursor, override)).toEqual(span(9, 9))
  })

  it('drops a locally moved caret once the participant actually moves', () => {
    const cursor: RemoteCursor = {sessionId: 'a', selection: span(3, 3)}
    const override: CursorOverride = {reported: span(1, 1), current: span(9, 9)}

    expect(resolveCursorSelection(cursor, override)).toEqual(span(3, 3))
  })

  it('treats a move to a different span as a move, comparing keys not identity', () => {
    // Paths carry `{_key}` objects, so a value comparison is what makes a report
    // from a different span read as a move rather than as the same position.
    const override: CursorOverride = {
      reported: span(1, 1, 'span-1'),
      current: span(9, 9),
    }
    const cursor: RemoteCursor = {
      sessionId: 'a',
      selection: span(1, 1, 'span-2'),
    }

    expect(resolveCursorSelection(cursor, override)).toEqual(
      span(1, 1, 'span-2'),
    )
  })

  it('has nothing to draw for a participant who cleared their selection', () => {
    expect(
      resolveCursorSelection({sessionId: 'a', selection: null}, undefined),
    ).toBeNull()
  })
})

describe('recordCursorMove', () => {
  const cursor: RemoteCursor = {sessionId: 'a', selection: span(1, 1)}
  const cursors = [cursor]

  it('records the move against the selection it moved from', () => {
    const next = recordCursorMove(new Map(), cursors, cursor, span(5, 5))

    expect(next.get('a')).toEqual({reported: span(1, 1), current: span(5, 5)})
  })

  it('collapses a range the editor reports', () => {
    const next = recordCursorMove(new Map(), cursors, cursor, span(5, 9))

    expect(next.get('a')?.current).toEqual(collapseToCaret(span(5, 9)))
  })

  it('returns the same map when the caret did not actually move', () => {
    const overrides = overridesOf([
      'a',
      {reported: span(1, 1), current: span(5, 5)},
    ])

    expect(recordCursorMove(overrides, cursors, cursor, span(5, 5))).toBe(
      overrides,
    )
  })

  it('re-records when the participant has reported a new selection since', () => {
    const overrides = overridesOf([
      'a',
      {reported: span(1, 1), current: span(5, 5)},
    ])
    const moved: RemoteCursor = {sessionId: 'a', selection: span(3, 3)}

    const next = recordCursorMove(overrides, [moved], moved, span(5, 5))

    expect(next.get('a')).toEqual({reported: span(3, 3), current: span(5, 5)})
  })

  it('forgets participants who have left, so overrides stay bounded', () => {
    const overrides = overridesOf(
      ['a', {reported: span(1, 1), current: span(5, 5)}],
      ['gone', {reported: span(2, 2), current: span(7, 7)}],
    )

    const next = recordCursorMove(overrides, cursors, cursor, span(6, 6))

    expect([...next.keys()]).toEqual(['a'])
  })
})

describe('toRangeDecorations', () => {
  const cursors: RemoteCursor[] = [
    {sessionId: 'a', selection: span(1, 1)},
    {sessionId: 'b', selection: span(2, 2)},
  ]

  it('draws one decoration per participant, tagged with the session', () => {
    const decorations = toRangeDecorations({
      cursors,
      overrides: new Map(),
      renderCursor,
    })

    expect(decorations).toHaveLength(2)
    expect(decorations.map((decoration) => decoration.payload)).toEqual([
      {sessionId: 'a'},
      {sessionId: 'b'},
    ])
    expect(decorations[0].selection).toEqual(span(1, 1))
  })

  it('draws a moved caret where it was moved to', () => {
    const overrides = overridesOf([
      'a',
      {reported: span(1, 1), current: span(9, 9)},
    ])

    const [decoration] = toRangeDecorations({
      cursors,
      overrides,
      renderCursor,
    })

    expect(decoration.selection).toEqual(span(9, 9))
  })

  it('skips a participant with no caret to draw', () => {
    const decorations = toRangeDecorations({
      cursors: [{sessionId: 'a', selection: null}, cursors[1]],
      overrides: new Map(),
      renderCursor,
    })

    expect(decorations.map((decoration) => decoration.payload)).toEqual([
      {sessionId: 'b'},
    ])
  })

  it('reports moves against the right participant', () => {
    const onCursorMoved = vi.fn()

    const decorations = toRangeDecorations({
      cursors,
      overrides: new Map(),
      renderCursor,
      onCursorMoved,
    })
    decorations[1].onMoved?.({
      rangeDecoration: decorations[1],
      newSelection: span(4, 4),
      origin: 'local',
    })

    expect(onCursorMoved).toHaveBeenCalledWith(cursors[1], span(4, 4))
  })

  it('leaves onMoved unset when the caller does not want moves', () => {
    const [decoration] = toRangeDecorations({
      cursors: [cursors[0]],
      overrides: new Map(),
      renderCursor,
    })

    expect(decoration.onMoved).toBeUndefined()
  })

  it('takes the component from renderCursor, once per participant', () => {
    const render = vi.fn(renderCursor)

    toRangeDecorations({cursors, overrides: new Map(), renderCursor: render})

    expect(render).toHaveBeenCalledTimes(2)
    expect(render).toHaveBeenCalledWith(cursors[0])
  })
})
