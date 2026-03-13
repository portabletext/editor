import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import type {Point} from '../interfaces/point'
import {pointEquals} from '../point/point-equals'
import {end} from './end'

export function isEnd(editor: Editor, point: Point, at: Location): boolean {
  const editorEnd = end(editor, at)
  return pointEquals(point, editorEnd)
}
