import type {PortableTextBlock} from '@portabletext/schema'
import {collectTextPoints} from './lib/document'
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
