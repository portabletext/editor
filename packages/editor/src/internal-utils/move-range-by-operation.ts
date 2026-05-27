import type {Operation} from '../engine/interfaces/operation'
import type {Range} from '../engine/interfaces/range'
import {pointEquals} from '../engine/point/point-equals'
import {transformPoint} from '../engine/point/transform-point'

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
