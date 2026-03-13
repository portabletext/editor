import type {Location, Point} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import {getFirst} from '../node/get-first'
import {getLast} from '../node/get-last'
import {getNode} from '../node/get-node'
import type {LeafEdge} from '../types/types'
import {isEditor} from './is-editor'

export function point(
  editor: Editor,
  at: Location,
  options: {edge?: LeafEdge} = {},
): Point {
  const {edge = 'start'} = options

  if (Path.isPath(at)) {
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
      !Text.isText(node, editor.schema) &&
      !Element.isElement(node, editor.schema) &&
      !isEditor(node)
    ) {
      return {path, offset: 0}
    }

    if (!Text.isText(node, editor.schema)) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    return {path, offset: edge === 'end' ? node.text.length : 0}
  }

  if (Range.isRange(at)) {
    const [start, end] = Range.edges(at)
    return edge === 'start' ? start : end
  }

  return at
}
