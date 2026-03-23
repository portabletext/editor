import type {Range} from '../interfaces/range'
import {isAfterPoint} from '../point/is-after-point'

export function isBackwardRange(range: Range): boolean {
  const {anchor, focus} = range
  return isAfterPoint(anchor, focus)
}
