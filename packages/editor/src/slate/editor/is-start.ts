import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Point} from '../interfaces/point'
import {start} from './start'

export function isStart(editor: Editor, point: Point, at: Location): boolean {
  // PERF: If the offset isn't `0` we know it's not the start.
  if (point.offset !== 0) {
    return false
  }

  const editorStart = start(editor, at)
  return Point.equals(point, editorStart)
}
