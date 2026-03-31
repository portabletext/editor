import {getLeaf} from '../../node-traversal/get-leaf'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
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
    if (edge === 'start' || edge === 'end') {
      const leaf = getLeaf(editor, at, {edge})
      if (leaf) {
        at = leaf.path
      }
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
