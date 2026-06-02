import type {Node} from '../interfaces/node'
import type {Operation} from '../interfaces/operation'
import type {RangeRef} from '../interfaces/range-ref'
import {transformRange} from '../range/transform-range'

export function transformRangeRef(
  ref: RangeRef,
  op: Operation,
  root: {value: Array<Node>},
): void {
  const {current, affinity} = ref

  if (current == null) {
    return
  }

  const path = transformRange(current, op, root, {affinity})
  ref.current = path

  if (path == null) {
    ref.unref()
  }
}
