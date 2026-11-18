import {pathEquals} from './lib/path-equals'
import {
  mapPoint,
  mapPointThroughStep,
  type Step,
  type Range,
} from './step-mapper'

/**
 * Map the range's first point with forward affinity and its last point with
 * backward affinity, so text typed at either edge stays outside.
 * `range.backward` says which end comes first and is returned unchanged. Once
 * the ends meet, the rest of the change maps them as one point with backward
 * affinity.
 * Returns `null` when either mapped point is `null` or the steps are `undefined`.
 * @public
 */
export function mapRange(
  steps: ReadonlyArray<Step> | undefined,
  range: Range,
): Range | null {
  if (steps === undefined) {
    return null
  }
  if (
    range.anchor.offset === range.focus.offset &&
    pathEquals(range.anchor.path, range.focus.path)
  ) {
    const point = mapPoint(steps, range.anchor, {affinity: 'backward'})
    return point === null ? null : {...range, anchor: point, focus: point}
  }
  const backward = range.backward
  let current = range
  for (const [index, step] of steps.entries()) {
    const anchor = mapPointThroughStep(step, current.anchor, {
      affinity: backward ? 'backward' : 'forward',
    })
    const focus = mapPointThroughStep(step, current.focus, {
      affinity: backward ? 'forward' : 'backward',
    })
    if (anchor === null || focus === null) {
      return null
    }
    if (anchor.offset === focus.offset && pathEquals(anchor.path, focus.path)) {
      const point = mapPoint(steps.slice(index + 1), anchor, {
        affinity: 'backward',
      })
      return point === null ? null : {...range, anchor: point, focus: point}
    }
    current = {...range, anchor, focus}
  }
  return current
}
