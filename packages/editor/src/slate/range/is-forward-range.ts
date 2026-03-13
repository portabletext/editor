import type {Range} from '../interfaces/range'
import {isBackwardRange} from './is-backward-range'

export function isForwardRange(range: Range): boolean {
  return !isBackwardRange(range)
}
