import type {Node} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import {isBackwardRange} from './is-backward-range'

export function isForwardRange(
  range: Range,
  root: {value: Array<Node>},
): boolean {
  return !isBackwardRange(range, root)
}
