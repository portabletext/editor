import type {Operation, Point} from '..'
import {transformPoint} from '../point/transform-point'
import type {TextDirection} from '../types/types'

/**
 * `PointRef` objects keep a specific point in a document synced over time as new
 * operations are applied to the editor. You can access their `current` property
 * at any time for the up-to-date point value.
 */

export interface PointRef {
  current: Point | null
  affinity: TextDirection | null
  unref(): Point | null
}

export interface PointRefInterface {
  transform: (ref: PointRef, op: Operation) => void
}

// eslint-disable-next-line no-redeclare
export const PointRef: PointRefInterface = {
  transform(ref: PointRef, op: Operation): void {
    const {current, affinity} = ref

    if (current == null) {
      return
    }

    const point = transformPoint(current, op, {affinity})
    ref.current = point

    if (point == null) {
      ref.unref()
    }
  },
}
