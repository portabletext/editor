import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Point} from '../interfaces/point'
import {end} from './end'

export function isEnd(editor: Editor, point: Point, at: Location): boolean {
  const editorEnd = end(editor, at)
  return Point.equals(point, editorEnd)
}
