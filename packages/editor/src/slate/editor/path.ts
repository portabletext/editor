import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
import {getFirst} from '../node/get-first'
import {getLast} from '../node/get-last'
import {commonPath} from '../path/common-path'
import {isPath} from '../path/is-path'
import {isPoint} from '../point/is-point'
import {isRange} from '../range/is-range'
import {rangeEnd} from '../range/range-end'
import {rangeStart} from '../range/range-start'
import type {LeafEdge} from '../types/types'

export function path(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): Path {
  const {depth, edge} = options

  if (isPath(at)) {
    if (edge === 'start') {
      const [, firstPath] = getFirst(editor, at, editor.schema)
      at = firstPath
    } else if (edge === 'end') {
      const [, lastPath] = getLast(editor, at, editor.schema)
      at = lastPath
    }
  }

  if (isRange(at)) {
    if (edge === 'start') {
      at = rangeStart(at)
    } else if (edge === 'end') {
      at = rangeEnd(at)
    } else {
      at = commonPath(at.anchor.path, at.focus.path)
    }
  }

  if (isPoint(at)) {
    at = at.path
  }

  if (depth != null) {
    at = at.slice(0, depth)
  }

  return at
}
