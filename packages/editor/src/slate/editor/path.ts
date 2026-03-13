import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Path as PathUtils} from '../interfaces/path'
import {Point} from '../interfaces/point'
import {Range} from '../interfaces/range'
import {getFirst} from '../node/get-first'
import {getLast} from '../node/get-last'
import type {LeafEdge} from '../types/types'

export function path(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): PathUtils {
  const {depth, edge} = options

  if (PathUtils.isPath(at)) {
    if (edge === 'start') {
      const [, firstPath] = getFirst(editor, at, editor.schema)
      at = firstPath
    } else if (edge === 'end') {
      const [, lastPath] = getLast(editor, at, editor.schema)
      at = lastPath
    }
  }

  if (Range.isRange(at)) {
    if (edge === 'start') {
      at = Range.start(at)
    } else if (edge === 'end') {
      at = Range.end(at)
    } else {
      at = PathUtils.common(at.anchor.path, at.focus.path)
    }
  }

  if (Point.isPoint(at)) {
    at = at.path
  }

  if (depth != null) {
    at = at.slice(0, depth)
  }

  return at
}
