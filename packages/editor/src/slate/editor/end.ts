import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Point} from '../interfaces/point'
import {point} from './point'

export function end(editor: Editor, at: Location): Point {
  return point(editor, at, {edge: 'end'})
}
