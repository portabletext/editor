import type {Operation} from '../interfaces'
import type {RangeRef} from '../interfaces/range-ref'
import {transformRange} from '../range/transform-range'

export function transformRangeRef(ref: RangeRef, op: Operation): void {
  const {current, affinity} = ref

  if (current == null) {
    return
  }

  const path = transformRange(current, op, {affinity})
  ref.current = path

  if (path == null) {
    ref.unref()
  }
}
