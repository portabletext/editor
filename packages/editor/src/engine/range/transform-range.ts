import type {Node} from '../interfaces/node'
import type {Operation} from '../interfaces/operation'
import type {Range, RangeTransformOptions} from '../interfaces/range'
import {transformPoint} from '../point/transform-point'
import {resolveRangeAffinities} from './resolve-range-affinities'

/**
 * Transform a range by an operation. Returns the same `range` reference when
 * neither endpoint moved, so callers can use referential equality to detect
 * "nothing changed."
 */
export function transformRange(
  range: Range | null,
  op: Operation,
  root: {value: Array<Node>},
  options: RangeTransformOptions = {},
): Range | null {
  if (range === null) {
    return null
  }

  const {affinity = 'inward'} = options
  const [affinityAnchor, affinityFocus] = resolveRangeAffinities(
    range,
    root,
    affinity,
  )

  const anchor = transformPoint(range.anchor, op, {
    affinity: affinityAnchor,
  })
  const focus = transformPoint(range.focus, op, {affinity: affinityFocus})

  if (!anchor || !focus) {
    return null
  }

  if (anchor === range.anchor && focus === range.focus) {
    return range
  }

  return {anchor, focus}
}
