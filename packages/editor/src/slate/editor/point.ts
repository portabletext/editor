import {isElement} from '../element/is-element'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
import {getFirst} from '../node/get-first'
import {getLast} from '../node/get-last'
import {getNode} from '../node/get-node'
import {isPath} from '../path/is-path'
import {isRange} from '../range/is-range'
import {rangeEdges} from '../range/range-edges'
import {isText} from '../text/is-text'
import type {LeafEdge} from '../types/types'
import {isEditor} from './is-editor'

export function point(
  editor: Editor,
  at: Location,
  options: {edge?: LeafEdge} = {},
): Point {
  const {edge = 'start'} = options

  if (isPath(at)) {
    let path: Path

    if (edge === 'end') {
      const [, lastPath] = getLast(editor, at, editor.schema)
      path = lastPath
    } else {
      const [, firstPath] = getFirst(editor, at, editor.schema)
      path = firstPath
    }

    const node = getNode(editor, path, editor.schema)

    if (
      !isText(node, editor.schema) &&
      !isElement(node, editor.schema) &&
      !isEditor(node)
    ) {
      return {path, offset: 0}
    }

    if (!isText(node, editor.schema)) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    return {path, offset: edge === 'end' ? node.text.length : 0}
  }

  if (isRange(at)) {
    const [start, end] = rangeEdges(at)
    return edge === 'start' ? start : end
  }

  return at
}
