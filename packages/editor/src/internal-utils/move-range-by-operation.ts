import type {Operation, Range} from '../slate'
import {pointEquals} from '../slate/point/point-equals'
import {transformPoint} from '../slate/point/transform-point'

export function moveRangeByOperation(
  range: Range,
  operation: Operation,
): Range | null {
  const anchor = transformPoint(range.anchor, operation)
  const focus = transformPoint(range.focus, operation)

  if (anchor === null || focus === null) {
    return null
  }

  if (pointEquals(anchor, range.anchor) && pointEquals(focus, range.focus)) {
    return range
  }

  return {anchor, focus}
}
