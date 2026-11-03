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
  if (op.type !== 'unset') {
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

  if (op.path.length === 1) {
    const candidates = root.value.flatMap((block) => {
      if (
        block._key === pointBlockSegment._key ||
        !('children' in block) ||
        !Array.isArray(block.children)
      ) {
        return []
      }
      return block.children.some(
        (child) => child._key === pointChildSegment._key,
      )
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

  const sourceBlock = root.value.find(
    (block) => block._key === pointBlockSegment._key,
  )
  const removedNode =
    sourceBlock &&
    'children' in sourceBlock &&
    Array.isArray(sourceBlock.children)
      ? sourceBlock.children.find(
          (child) => child._key === pointChildSegment._key,
        )
      : undefined
  if (
    op.path[1] !== 'children' ||
    !removedNode ||
    !('text' in removedNode) ||
    typeof removedNode.text !== 'string' ||
    removedNode.text.length === 0
  ) {
    return null
  }
  const candidates = root.value.flatMap((block) => {
    if (!('children' in block) || !Array.isArray(block.children)) {
      return []
    }
    return block.children.flatMap((child) =>
      child._key !== pointChildSegment._key &&
      'text' in child &&
      typeof child.text === 'string' &&
      child.text.endsWith(removedNode.text)
        ? [{block, child}]
        : [],
    )
  })
  if (candidates.length !== 1) {
    return null
  }
  const candidate = candidates[0]!
  return {
    path: [
      {_key: candidate.block._key},
      'children',
      {_key: candidate.child._key},
    ],
    offset:
      candidate.child.text.length - removedNode.text.length + point.offset,
  }
}
