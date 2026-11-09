import type {PortableTextBlock} from '@portabletext/schema'
import {textBlock} from './load-depths'

export type AnchorUpdate = 'edit' | 'split' | 'merge'

type Point = {spanKey: string; offset: number}

export type AnchorCase = {
  update: AnchorUpdate
  position: 'first' | 'middle' | 'last'
  before: Array<PortableTextBlock>
  after: Array<PortableTextBlock>
  /** The span a range or caret starts on, and the range's offsets there. */
  range: {spanKey: string; from: number; to: number}
  /**
   * Where the range ends up, `null` when it is lost, or `'unchanged'` when
   * it sits in text the change left alone and `onMoved` is not called.
   */
  rangeAfter: {anchor: Point; focus: Point} | null | 'unchanged'
  /** Where a caret at the start of the range ends up. */
  caretAfter: Point
}

const ranges = {
  first: [0, 2],
  middle: [2, 4],
  last: [4, 6],
} as const

/**
 * What a keyed resync does to a range and a caret across an edit, a split and
 * a merge. A split and a merge lose what moved to another block, but never
 * leave a point past the end of its text or on a span that is gone.
 */
export const anchorCases: Array<AnchorCase> = [
  ...(['first', 'middle', 'last'] as const).map((position) => {
    const [from, to] = ranges[position]
    const shift = position === 'first' ? 0 : position === 'middle' ? 0 : 2
    return {
      update: 'edit' as const,
      position,
      before: [textBlock('b', 's', 'foobar')],
      after: [textBlock('b', 's', 'fooXYbar')],
      range: {spanKey: 's', from, to},
      rangeAfter:
        position === 'first'
          ? ('unchanged' as const)
          : {
              anchor: {spanKey: 's', offset: from + shift},
              focus: {
                spanKey: 's',
                offset: to + shift + (position === 'middle' ? 2 : 0),
              },
            },
      caretAfter: {spanKey: 's', offset: from + shift},
    }
  }),
  ...(
    [
      ['first', 0, 2, {from: 0, to: 2}, 0] as const,
      ['middle', 2, 4, {from: 2, to: 3}, 2] as const,
      ['last', 4, 6, {from: 3, to: 3}, 3] as const,
    ] as const
  ).map(([position, from, to, after, caretOffset]) => ({
    update: 'split' as const,
    position,
    before: [textBlock('b', 's', 'foobar')],
    after: [textBlock('b', 's', 'foo'), textBlock('u', 'us', 'bar')],
    range: {spanKey: 's', from, to},
    rangeAfter:
      position === 'first'
        ? ('unchanged' as const)
        : {
            anchor: {spanKey: 's', offset: after.from},
            focus: {spanKey: 's', offset: after.to},
          },
    caretAfter: {spanKey: 's', offset: caretOffset},
  })),
  ...(
    [
      ['first', 0, 1] as const,
      ['middle', 1, 2] as const,
      ['last', 2, 3] as const,
    ] as const
  ).map(([position, from, to]) => ({
    update: 'merge' as const,
    position,
    before: [textBlock('b', 's', 'foo'), textBlock('u', 'us', 'bar')],
    after: [textBlock('b', 's', 'foobar')],
    range: {spanKey: 'us', from, to},
    rangeAfter: null,
    caretAfter: {spanKey: 's', offset: 6},
  })),
]
