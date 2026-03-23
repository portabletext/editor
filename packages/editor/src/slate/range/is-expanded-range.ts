import type {Range} from '../interfaces/range'
import {isCollapsedRange} from './is-collapsed-range'

export function isExpandedRange(range: Range): boolean {
  return !isCollapsedRange(range)
}
