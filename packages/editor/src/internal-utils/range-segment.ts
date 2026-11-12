/**
 * An index range in a patch path, such as the `[1, '']` in a path ending in a range. A bound is
 * `undefined` when the range is open on that side.
 */
export type RangeBounds = [start: number | undefined, end: number | undefined]

/**
 * Parse a path segment as an index range. Accepts only the tuple form
 * (`[1, '']`), where an empty string means open. Anything else, including a
 * string such as `1:`, is not a range.
 */
export function parseRangeSegment(segment: unknown): RangeBounds | undefined {
  if (!Array.isArray(segment) || segment.length !== 2) {
    return undefined
  }

  const [start, end] = segment.map((bound) =>
    bound === '' ? undefined : bound,
  )

  if (!isRangeBound(start) || !isRangeBound(end)) {
    return undefined
  }

  return [start, end]
}

function isRangeBound(bound: unknown): bound is number | undefined {
  return bound === undefined || Number.isInteger(bound)
}

/**
 * Resolve a range to the indices it covers the way Content Lake does:
 * negative bounds count from the end, bounds clamp to the array, and an empty
 * or reversed range covers nothing.
 */
export function resolveRange(
  [start = 0, end = Infinity]: RangeBounds,
  length: number,
): Array<number> {
  const first = Math.max(0, start < 0 ? length + start : start)
  const last = Math.min(length, end < 0 ? length + end : end)

  return Array.from(
    {length: Math.max(0, last - first)},
    (_, index) => first + index,
  )
}
