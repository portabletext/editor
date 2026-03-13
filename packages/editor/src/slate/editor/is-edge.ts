import type {Location, Point} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {isEnd} from './is-end'
import {isStart} from './is-start'

export function isEdge(editor: Editor, point: Point, at: Location): boolean {
  return isStart(editor, point, at) || isEnd(editor, point, at)
}
