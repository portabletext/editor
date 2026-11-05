import type {Schema} from '@portabletext/schema'
import type {Node} from '../interfaces/node'
import type {EngineOperation} from '../interfaces/operation'
import type {RangeRef} from '../interfaces/range-ref'
import {transformRange} from '../range/transform-range'

export function transformRangeRef(
  ref: RangeRef,
  op: EngineOperation,
  root: {schema: Schema; value: Array<Node>},
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
