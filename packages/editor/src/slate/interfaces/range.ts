import {
  isObject,
  Path,
  Point,
  type Editor,
  type ExtendedType,
  type Operation,
  type PointEntry,
} from '..'
import type {RangeDirection} from '../types/types'

/**
 * `Range` objects are a set of points that refer to a specific span of a Slate
 * document. They can define a span inside a single node or a can span across
 * multiple nodes.
 */

export interface BaseRange {
  anchor: Point
  focus: Point
}

export type Range = ExtendedType<'Range', BaseRange>

export interface RangeEdgesOptions {
  reverse?: boolean
}

export interface RangeTransformOptions {
  affinity?: RangeDirection | null
}

export interface RangeInterface {
  /**
   * Get the start and end points of a range, in the order in which they appear
   * in the document. Requires the editor for document-order comparison.
   */
  edges: (editor: Editor, range: Range, options?: RangeEdgesOptions) => [Point, Point]

  /**
   * Get the end point of a range.
   */
  end: (editor: Editor, range: Range) => Point

  /**
   * Check if a range is exactly equal to another.
   */
  equals: (range: Range, another: Range) => boolean

  /**
   * Check if a range includes a path, a point or part of another range.
   */
  includes: (editor: Editor, range: Range, target: Path | Point | Range) => boolean

  /**
   * Get the intersection of a range with another.
   */
  intersection: (editor: Editor, range: Range, another: Range) => Range | null

  /**
   * Check if a range is backward, meaning that its anchor point appears in the
   * document _after_ its focus point.
   */
  isBackward: (editor: Editor, range: Range) => boolean

  /**
   * Check if a range is collapsed, meaning that both its anchor and focus
   * points refer to the exact same position in the document.
   */
  isCollapsed: (range: Range) => boolean

  /**
   * Check if a range is expanded.
   *
   * This is the opposite of [[Range.isCollapsed]] and is provided for legibility.
   */
  isExpanded: (range: Range) => boolean

  /**
   * Check if a range is forward.
   *
   * This is the opposite of [[Range.isBackward]] and is provided for legibility.
   */
  isForward: (editor: Editor, range: Range) => boolean

  /**
   * Check if a value implements the [[Range]] interface.
   */
  isRange: (value: any) => value is Range

  /**
   * Iterate through all of the point entries in a range.
   */
  points: (range: Range) => Generator<PointEntry, void, undefined>

  /**
   * Get the start point of a range.
   */
  start: (editor: Editor, range: Range) => Point

  /**
   * Transform a range by an operation.
   */
  transform: (
    range: Range,
    op: Operation,
    options?: RangeTransformOptions,
  ) => Range | null
}

// eslint-disable-next-line no-redeclare
export const Range: RangeInterface = {
  edges(editor: Editor, range: Range, options: RangeEdgesOptions = {}): [Point, Point] {
    const {reverse = false} = options
    const {anchor, focus} = range
    return Range.isBackward(editor, range) === reverse
      ? [anchor, focus]
      : [focus, anchor]
  },

  end(editor: Editor, range: Range): Point {
    const [, end] = Range.edges(editor, range)
    return end
  },

  equals(range: Range, another: Range): boolean {
    return (
      Point.equals(range.anchor, another.anchor) &&
      Point.equals(range.focus, another.focus)
    )
  },

  includes(editor: Editor, range: Range, target: Path | Point | Range): boolean {
    if (Range.isRange(target)) {
      if (
        Range.includes(editor, range, target.anchor) ||
        Range.includes(editor, range, target.focus)
      ) {
        return true
      }

      const [rs, re] = Range.edges(editor, range)
      const [ts, te] = Range.edges(editor, target)
      return Point.isBefore(editor, rs, ts) && Point.isAfter(editor, re, te)
    }

    const [start, end] = Range.edges(editor, range)
    let isAfterStart = false
    let isBeforeEnd = false

    if (Point.isPoint(target)) {
      isAfterStart = Point.compare(editor, target, start) >= 0
      isBeforeEnd = Point.compare(editor, target, end) <= 0
    } else {
      isAfterStart = Path.compare(target, start.path) >= 0
      isBeforeEnd = Path.compare(target, end.path) <= 0
    }

    return isAfterStart && isBeforeEnd
  },

  intersection(editor: Editor, range: Range, another: Range): Range | null {
    const {anchor: _anchor, focus: _focus, ...rest} = range
    const [s1, e1] = Range.edges(editor, range)
    const [s2, e2] = Range.edges(editor, another)
    const start = Point.isBefore(editor, s1, s2) ? s2 : s1
    const end = Point.isBefore(editor, e1, e2) ? e1 : e2

    if (Point.isBefore(editor, end, start)) {
      return null
    } else {
      return {anchor: start, focus: end, ...rest}
    }
  },

  isBackward(editor: Editor, range: Range): boolean {
    const {anchor, focus} = range
    return Point.isAfter(editor, anchor, focus)
  },

  isCollapsed(range: Range): boolean {
    const {anchor, focus} = range
    return Point.equals(anchor, focus)
  },

  isExpanded(range: Range): boolean {
    return !Range.isCollapsed(range)
  },

  isForward(editor: Editor, range: Range): boolean {
    return !Range.isBackward(editor, range)
  },

  isRange(value: any): value is Range {
    return (
      isObject(value) &&
      Point.isPoint(value.anchor) &&
      Point.isPoint(value.focus)
    )
  },

  *points(range: Range): Generator<PointEntry, void, undefined> {
    yield [range.anchor, 'anchor']
    yield [range.focus, 'focus']
  },

  start(editor: Editor, range: Range): Point {
    const [start] = Range.edges(editor, range)
    return start
  },

  transform(
    range: Range | null,
    op: Operation,
    options: RangeTransformOptions = {},
  ): Range | null {
    if (range === null) {
      return null
    }

    const {affinity = 'inward'} = options
    let affinityAnchor: 'forward' | 'backward' | null
    let affinityFocus: 'forward' | 'backward' | null

    if (affinity === 'inward') {
      const isCollapsed = Range.isCollapsed(range)
      // Assume forward range (anchor before focus) when we can't determine
      // order. This is safe because Range.transform is about adjusting
      // points by operations, not about document order.
      affinityAnchor = 'forward'
      affinityFocus = isCollapsed ? affinityAnchor : 'backward'
    } else if (affinity === 'outward') {
      affinityAnchor = 'backward'
      affinityFocus = 'forward'
    } else {
      affinityAnchor = affinity
      affinityFocus = affinity
    }
    const anchor = Point.transform(range.anchor, op, {
      affinity: affinityAnchor,
    })
    const focus = Point.transform(range.focus, op, {affinity: affinityFocus})

    if (!anchor || !focus) {
      return null
    }

    return {...range, anchor, focus}
  },
}
