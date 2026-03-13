import type {Location} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Node} from '../interfaces/node'
import {Path as PathUtils} from '../interfaces/path'
import {Point} from '../interfaces/point'
import {Range} from '../interfaces/range'
import type {LeafEdge} from '../types/types'

export function path(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): PathUtils {
  const {depth, edge} = options

  if (PathUtils.isPath(at)) {
    if (edge === 'start') {
      const [, firstPath] = Node.first(editor, at, editor.schema)
      at = firstPath
    } else if (edge === 'end') {
      const [, lastPath] = Node.last(editor, at, editor.schema)
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
