import type {PortableTextBlock} from '@portabletext/schema'
import {pathEquals} from './lib/path-equals'
import {mapPoint, type Point, type Range, type Step} from './step-mapper'

/**
 * Return whether at least one UTF-16 code unit originally inside `range`
 * survives `steps`. Inserted text does not count as survival.
 *
 * @public
 */
export function rangeSurvives(
  base: ReadonlyArray<PortableTextBlock>,
  steps: ReadonlyArray<Step>,
  range: Range,
): boolean {
  const textPoints = collectTextPoints(base)
  const anchorIndex = textPoints.findIndex((point) =>
    pathEquals(point.path, range.anchor.path),
  )
  const focusIndex = textPoints.findIndex((point) =>
    pathEquals(point.path, range.focus.path),
  )

  if (anchorIndex === -1 || focusIndex === -1) {
    return false
  }

  const isForward =
    anchorIndex < focusIndex ||
    (anchorIndex === focusIndex && range.anchor.offset <= range.focus.offset)
  const start = isForward ? range.anchor : range.focus
  const end = isForward ? range.focus : range.anchor
  const startIndex = isForward ? anchorIndex : focusIndex
  const endIndex = isForward ? focusIndex : anchorIndex

  for (let index = startIndex; index <= endIndex; index++) {
    const textPoint = textPoints[index]!
    const from = index === startIndex ? start.offset : 0
    const to = index === endIndex ? end.offset : textPoint.length

    for (let offset = from; offset < to; offset++) {
      if (characterSurvives(steps, {path: textPoint.path, offset})) {
        return true
      }
    }
  }

  return false
}

function characterSurvives(
  steps: ReadonlyArray<Step>,
  originalPoint: Point,
): boolean {
  let point: Point | null = originalPoint

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
): Array<Point & {length: number}> {
  const textPoints: Array<Point & {length: number}> = []

  for (const block of value) {
    collectNodeTextPoints(block, [{_key: block._key}], textPoints)
  }

  return textPoints
}

function collectNodeTextPoints(
  node: unknown,
  path: Point['path'],
  textPoints: Array<Point & {length: number}>,
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
