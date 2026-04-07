import type {Node} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import {isAfterPoint} from '../point/is-after-point'

export function isBackwardRange(
  range: Range,
  root?: {children: Array<Node>},
): boolean {
  const {anchor, focus} = range
  return isAfterPoint(anchor, focus, root)
}
