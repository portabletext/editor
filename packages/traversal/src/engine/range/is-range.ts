import type {Range} from '../interfaces/range'
import {isPoint} from '../point/is-point'
import {isObject} from '../utils/is-object'

export function isRange(value: any): value is Range {
  return isObject(value) && isPoint(value.anchor) && isPoint(value.focus)
}
