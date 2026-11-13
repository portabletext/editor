import type {PortableTextBlock, Schema} from '@portabletext/schema'
import type {ArrayKeyCache} from './lib/array-index'
import {arrayIndex, arraySegments, collectTextPoints} from './lib/document'
import {getValue} from './lib/get-value'
import {pathEquals} from './lib/path-equals'
import {isTextSpan} from './lib/span'
import type {Point, Range} from './step-mapper'

/**
 * Represent the start of an expanded range at the end of the preceding span
 * when it otherwise lands at offset zero of the next sibling span. Pass the
 * `next` representation to recover the equivalent next-sibling start before
 * mapping another change.
 *
 * @public
 */
export function normalizeRangeBoundary(
  value: ReadonlyArray<PortableTextBlock>,
  range: Range,
  options?: {
    representation?: 'previous' | 'next'
    schema?: Schema
    normalizeCollapsed?: boolean
  },
): Range {
  const cache: ArrayKeyCache = new WeakMap()
  const orderedSpanPaths = collectTextPoints(value, options?.schema, cache).map(
    (point) => point.path,
  )
  const anchorIndex = orderedSpanPaths.findIndex((path) =>
    pathEquals(path, range.anchor.path),
  )
  const focusIndex = orderedSpanPaths.findIndex((path) =>
    pathEquals(path, range.focus.path),
  )

  if (anchorIndex < 0 || focusIndex < 0) {
    return range
  }

  const isCollapsed =
    anchorIndex === focusIndex && range.anchor.offset === range.focus.offset
  if (isCollapsed && !options?.normalizeCollapsed) {
    return range
  }

  if (isCollapsed) {
    const point = normalizeStartPoint(
      value,
      range.anchor,
      options?.representation ?? 'previous',
      options?.schema,
      cache,
    )
    return point === range.anchor ? range : {anchor: point, focus: point}
  }

  const anchorIsStart =
    anchorIndex < focusIndex ||
    (anchorIndex === focusIndex && range.anchor.offset < range.focus.offset)
  const start = anchorIsStart ? range.anchor : range.focus
  const normalizedStart = normalizeStartPoint(
    value,
    start,
    options?.representation ?? 'previous',
    options?.schema,
    cache,
  )

  if (normalizedStart === start) {
    return range
  }

  return anchorIsStart
    ? {anchor: normalizedStart, focus: range.focus}
    : {anchor: range.anchor, focus: normalizedStart}
}

function normalizeStartPoint(
  value: ReadonlyArray<PortableTextBlock>,
  point: Point,
  representation: 'previous' | 'next',
  schema: Schema | undefined,
  cache: ArrayKeyCache,
): Point {
  const siblings = getValue(value, point.path.slice(0, -1), cache)
  const segment = point.path.at(-1)
  if (!Array.isArray(siblings)) {
    return point
  }
  const index = arrayIndex(siblings, segment, cache)
  if (index < 0) {
    return point
  }
  const currentSibling = siblings.at(index)
  const previousSibling = siblings.at(index - 1)
  const nextSibling = siblings.at(index + 1)

  if (
    representation === 'next' &&
    isTextSpan(currentSibling, value, point.path, schema, cache) &&
    point.offset === currentSibling.text.length &&
    isTextSpan(
      nextSibling,
      value,
      [...point.path.slice(0, -1), arraySegments(siblings, cache)[index + 1]!],
      schema,
      cache,
    )
  ) {
    return {
      path: [
        ...point.path.slice(0, -1),
        arraySegments(siblings, cache)[index + 1]!,
      ],
      offset: 0,
    }
  }

  if (
    representation === 'next' ||
    point.offset !== 0 ||
    index <= 0 ||
    !isTextSpan(
      previousSibling,
      value,
      [...point.path.slice(0, -1), arraySegments(siblings, cache)[index - 1]!],
      schema,
      cache,
    )
  ) {
    return point
  }

  return {
    path: [
      ...point.path.slice(0, -1),
      arraySegments(siblings, cache)[index - 1]!,
    ],
    offset: previousSibling.text.length,
  }
}
