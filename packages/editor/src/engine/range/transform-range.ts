import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Node} from '../interfaces/node'
import type {EngineOperation} from '../interfaces/operation'
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
  op: EngineOperation,
  root: {value: Array<Node>},
  options: RangeTransformOptions = {},
): Range | null {
  if (range === null) {
    return null
  }

  const {affinity = 'inward', relocateUnset = false} = options
  const [affinityAnchor, affinityFocus] = resolveRangeAffinities(
    range,
    root,
    affinity,
  )

  const anchor =
    transformPoint(range.anchor, op, {affinity: affinityAnchor}) ??
    (relocateUnset ? relocateUnsetPoint(range.anchor, op, root) : null)
  const focus =
    transformPoint(range.focus, op, {affinity: affinityFocus}) ??
    (relocateUnset ? relocateUnsetPoint(range.focus, op, root) : null)

  if (!anchor || !focus) {
    return null
  }

  if (anchor === range.anchor && focus === range.focus) {
    return range
  }

  return {anchor, focus}
}

function relocateUnsetPoint(
  point: Range['anchor'],
  op: EngineOperation,
  root: {value: Array<Node>},
): Range['anchor'] | null {
  if (op.type !== 'unset' || op.path.length !== 1) {
    return null
  }
  const pointBlockSegment = point.path[0]
  const pointChildSegment = point.path[2]
  if (
    !isKeyedSegment(pointBlockSegment) ||
    !isKeyedSegment(pointChildSegment)
  ) {
    return null
  }

  const candidates = root.value.flatMap((block) => {
    if (
      block._key === pointBlockSegment._key ||
      !('children' in block) ||
      !Array.isArray(block.children)
    ) {
      return []
    }
    return block.children.some((child) => child._key === pointChildSegment._key)
      ? [block]
      : []
  })
  return candidates.length === 1
    ? {
        path: [
          {_key: candidates[0]!._key},
          'children',
          {_key: pointChildSegment._key},
        ],
        offset: point.offset,
      }
    : null
}
