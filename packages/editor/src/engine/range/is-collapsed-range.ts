import type {Range} from '../interfaces/range'
import {pointEquals} from '../point/point-equals'

export function isCollapsedRange(range: Range): boolean {
  const {anchor, focus} = range
  return pointEquals(anchor, focus)
}
