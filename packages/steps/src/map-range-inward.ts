import type {PortableTextBlock} from '@portabletext/schema'
import {pathEquals} from './lib/path-equals'
import {
  mapPoint,
  mapRange,
  type Point,
  type Range,
  type Step,
} from './step-mapper'

/**
 * Map a range that is a statement about the characters it covers (a
 * comment anchor, a suggestion), rather than a pair of carets.
 *
 * Two rules on top of {@link mapRange}:
 *
 * 1. An edge whose character is removed shrinks inward to the nearest
 *    character of the range that survives, instead of losing the whole
 *    range. `mapRange` returns `null` as soon as either edge's node is
 *    removed, even when most of the range's text is still there.
 * 2. An edge sitting on a block break is read as the inward side of that
 *    break: a start at the end of a block is the start of the next block,
 *    and an end at the start of a block is the end of the previous one. The
 *    two are the same text position, but only the inward one moves with the
 *    range's own text when a block moves or splits.
 *
 * Returns `null` only when no character of the range survives.
 *
 * Pass `options.after` (the value after `steps`) to apply a third rule: if a
 * move puts the last surviving character before the first (an edge swap,
 * for example the range's end block moved above its start block), the range
 * spans every surviving character instead of the inverted pair. Without the
 * value the order of points on different blocks isn't known, so the edges
 * are returned as mapped.
 *
 * @public
 */
export function mapRangeInward(
  base: ReadonlyArray<PortableTextBlock>,
  steps: ReadonlyArray<Step>,
  range: Range,
  options?: {after?: ReadonlyArray<PortableTextBlock>},
): Range | null {
  const textPoints = collectTextPoints(base)
  const ordered = orderRange(textPoints, range)
  if (ordered === undefined) {
    return mapRange(steps, range)
  }
  const {startIndex, endIndex} = ordered
  let {start, end} = ordered

  if (startIndex === endIndex && start.offset === end.offset) {
    return mapRange(steps, range)
  }

  // Walk the range's characters forward for the first survivor and
  // backward for the last; their positions after `steps` are the new edges.
  const characters: Array<Point> = []
  for (let index = startIndex; index <= endIndex; index++) {
    const textPoint = textPoints[index]!
    const from = index === startIndex ? start.offset : 0
    const to = index === endIndex ? end.offset : textPoint.length
    for (let offset = from; offset < to; offset++) {
      characters.push({path: textPoint.path, offset})
    }
  }

  const first = characters.find((character) =>
    characterSurvives(steps, character),
  )
  if (first === undefined) {
    return null
  }
  let last: Point = first
  for (let index = characters.length - 1; index >= 0; index--) {
    if (characterSurvives(steps, characters[index]!)) {
      last = characters[index]!
      break
    }
  }

  start = first
  end = {path: last.path, offset: last.offset + 1}

  let mappedStart = mapPoint(steps, start, {affinity: 'forward'})
  let mappedEnd = mapPoint(steps, end, {affinity: 'backward'})
  if (mappedStart === null || mappedEnd === null) {
    return null
  }

  if (options?.after) {
    const swapped = spanSurvivorsOnEdgeSwap(
      options.after,
      steps,
      characters,
      mappedStart,
      mappedEnd,
    )
    if (swapped) {
      mappedStart = swapped.start
      mappedEnd = swapped.end
    }
  }

  const isBackward =
    range.anchor !== ordered.start && !pointEquals(range.anchor, ordered.start)
  return isBackward
    ? {anchor: mappedEnd, focus: mappedStart}
    : {anchor: mappedStart, focus: mappedEnd}
}

/**
 * When the mapped start lands after the mapped end, return the edges of
 * every surviving character in `after`'s document order.
 */
function spanSurvivorsOnEdgeSwap(
  after: ReadonlyArray<PortableTextBlock>,
  steps: ReadonlyArray<Step>,
  characters: ReadonlyArray<Point>,
  mappedStart: Point,
  mappedEnd: Point,
): {start: Point; end: Point} | undefined {
  const afterPoints = collectTextPoints(after)
  const position = (point: Point): number | undefined => {
    const index = afterPoints.findIndex((textPoint) =>
      pathEquals(textPoint.path, point.path),
    )
    return index === -1 ? undefined : index * 1e9 + point.offset
  }
  const startPosition = position(mappedStart)
  const endPosition = position(mappedEnd)
  if (
    startPosition === undefined ||
    endPosition === undefined ||
    startPosition <= endPosition
  ) {
    return undefined
  }

  let first: {point: Point; position: number} | undefined
  let last: {point: Point; position: number} | undefined
  for (const character of characters) {
    if (!characterSurvives(steps, character)) {
      continue
    }
    const point = mapPoint(steps, character, {affinity: 'forward'})
    const at = point === null ? undefined : position(point)
    if (point === null || at === undefined) {
      continue
    }
    if (first === undefined || at < first.position) {
      first = {point, position: at}
    }
    if (last === undefined || at > last.position) {
      last = {point, position: at}
    }
  }
  if (first === undefined || last === undefined) {
    return undefined
  }
  return {
    start: first.point,
    end: {path: last.point.path, offset: last.point.offset + 1},
  }
}

type TextPoint = Point & {length: number}

function orderRange(
  textPoints: ReadonlyArray<TextPoint>,
  range: Range,
):
  | {start: Point; end: Point; startIndex: number; endIndex: number}
  | undefined {
  const anchorIndex = textPoints.findIndex((point) =>
    pathEquals(point.path, range.anchor.path),
  )
  const focusIndex = textPoints.findIndex((point) =>
    pathEquals(point.path, range.focus.path),
  )
  if (anchorIndex === -1 || focusIndex === -1) {
    return undefined
  }
  const isForward =
    anchorIndex < focusIndex ||
    (anchorIndex === focusIndex && range.anchor.offset <= range.focus.offset)
  return isForward
    ? {
        start: range.anchor,
        end: range.focus,
        startIndex: anchorIndex,
        endIndex: focusIndex,
      }
    : {
        start: range.focus,
        end: range.anchor,
        startIndex: focusIndex,
        endIndex: anchorIndex,
      }
}

function pointEquals(left: Point, right: Point): boolean {
  return left.offset === right.offset && pathEquals(left.path, right.path)
}

/** Same survival rule as `rangeSurvives`: the character is never removed. */
function characterSurvives(
  steps: ReadonlyArray<Step>,
  original: Point,
): boolean {
  let point: Point | null = original
  for (const step of steps) {
    if (point === null) {
      return false
    }
    if (
      step.type === 'remove.text' &&
      pathEquals(step.path, point.path) &&
      point.offset >= step.offset &&
      point.offset < step.offset + step.length
    ) {
      return false
    }
    if (
      step.type === 'set.text' &&
      pathEquals(step.path, point.path) &&
      point.offset >= step.length
    ) {
      return false
    }
    point = mapPoint([step], point, {affinity: 'forward'})
  }
  return point !== null
}

function collectTextPoints(
  value: ReadonlyArray<PortableTextBlock>,
): Array<TextPoint> {
  const textPoints: Array<TextPoint> = []
  for (const block of value) {
    collectNodeTextPoints(block, [{_key: block._key}], textPoints)
  }
  return textPoints
}

function collectNodeTextPoints(
  node: unknown,
  path: Point['path'],
  textPoints: Array<TextPoint>,
): void {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return
  }
  const record = node as Record<string, unknown>
  if (typeof record['text'] === 'string') {
    textPoints.push({path, offset: 0, length: record['text'].length})
  }
  for (const [field, value] of Object.entries(record)) {
    if (!Array.isArray(value)) {
      continue
    }
    for (const child of value) {
      if (
        typeof child === 'object' &&
        child !== null &&
        typeof (child as {_key?: unknown})._key === 'string'
      ) {
        collectNodeTextPoints(
          child,
          [...path, field, {_key: (child as {_key: string})._key}],
          textPoints,
        )
      }
    }
  }
}
