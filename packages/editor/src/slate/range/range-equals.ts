import type {Range} from '../interfaces/range'
import {pointEquals} from '../point/point-equals'

export function rangeEquals(range: Range, another: Range): boolean {
  return (
    pointEquals(range.anchor, another.anchor) &&
    pointEquals(range.focus, another.focus)
  )
}
