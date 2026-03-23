import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Point} from '../interfaces/point'
import {isEnd} from './is-end'
import {isStart} from './is-start'

export function isEdge(editor: Editor, point: Point, at: Location): boolean {
  return isStart(editor, point, at) || isEnd(editor, point, at)
}
