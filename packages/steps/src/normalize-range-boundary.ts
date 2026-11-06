import type {Path} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import {pathEquals} from './lib/path-equals'
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
  options?: {representation?: 'previous' | 'next'},
): Range {
  const orderedSpanPaths = getOrderedSpanPaths(value)
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
  if (isCollapsed) {
    return range
  }

  const anchorIsStart =
    anchorIndex < focusIndex ||
    (anchorIndex === focusIndex && range.anchor.offset < range.focus.offset)
  const start = anchorIsStart ? range.anchor : range.focus
  const normalizedStart = normalizeStartPoint(
    value,
    start,
    options?.representation ?? 'previous',
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
): Point {
  const siblings = resolveParentArray(value, point.path)
  const segment = point.path.at(-1)
  if (!siblings || typeof segment !== 'object' || !('_key' in segment)) {
    return point
  }

  const index = siblings.findIndex(
    (sibling) => isKeyedObject(sibling) && sibling._key === segment._key,
  )
  const currentSibling = siblings.at(index)
  const previousSibling = siblings.at(index - 1)
  const nextSibling = siblings.at(index + 1)

  if (
    representation === 'next' &&
    isPortableTextSpan(currentSibling) &&
    point.offset === currentSibling.text.length &&
    isPortableTextSpan(nextSibling)
  ) {
    return {
      path: [...point.path.slice(0, -1), {_key: nextSibling._key}],
      offset: 0,
    }
  }

  if (
    representation === 'next' ||
    point.offset !== 0 ||
    index <= 0 ||
    !isPortableTextSpan(previousSibling)
  ) {
    return point
  }

  return {
    path: [...point.path.slice(0, -1), {_key: previousSibling._key}],
    offset: previousSibling.text.length,
  }
}

function resolveParentArray(
  value: ReadonlyArray<PortableTextBlock>,
  path: Path,
): ReadonlyArray<unknown> | undefined {
  let current: unknown = value

  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current)) {
      current =
        typeof segment === 'number'
          ? current.at(segment)
          : typeof segment === 'object' && '_key' in segment
            ? current.find(
                (item) => isKeyedObject(item) && item._key === segment._key,
              )
            : undefined
    } else if (
      typeof segment === 'string' &&
      current !== null &&
      typeof current === 'object'
    ) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return Array.isArray(current) ? current : undefined
}

function getOrderedSpanPaths(
  value: ReadonlyArray<PortableTextBlock>,
): Array<Path> {
  const paths: Array<Path> = []

  visit(value, [], paths)

  return paths
}

function visit(value: unknown, path: Path, paths: Array<Path>): void {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const item = value[index]
      const segment = isKeyedObject(item) ? {_key: item._key} : index
      visit(item, [...path, segment], paths)
    }
    return
  }

  if (isPortableTextSpan(value)) {
    paths.push(path)
    return
  }

  if (value === null || typeof value !== 'object') {
    return
  }

  for (const [field, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      visit(child, [...path, field], paths)
    }
  }
}

function isKeyedObject(value: unknown): value is {_key: string} {
  return (
    value !== null &&
    typeof value === 'object' &&
    '_key' in value &&
    typeof value._key === 'string'
  )
}

function isPortableTextSpan(value: unknown): value is PortableTextSpan {
  return (
    isKeyedObject(value) &&
    '_type' in value &&
    value._type === 'span' &&
    'text' in value &&
    typeof value.text === 'string'
  )
}
