import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Point} from '../interfaces/point'
import type {TextUnitAdjustment} from '../types/types'
import {point} from './point'
import {positions} from './positions'
import {start} from './start'

export function before(
  editor: Editor,
  at: Location,
  options: {
    distance?: number
    unit?: TextUnitAdjustment
  } = {},
): Point | undefined {
  const anchor = start(editor, [])
  const focus = point(editor, at, {edge: 'start'})
  const range = {anchor, focus}
  const {distance = 1} = options
  let d = 0
  let target: Point | undefined

  for (const p of positions(editor, {
    ...options,
    at: range,
    reverse: true,
  })) {
    if (d > distance) {
      break
    }

    if (d !== 0) {
      target = p
    }

    d++
  }

  return target
}
