import {isSpan} from '@portabletext/schema'
import {getLeaf} from '../../node-traversal/get-leaf'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
import {isTextBlockNode} from '../node/is-text-block-node'
import {isPath} from '../path/is-path'
import {isRange} from '../range/is-range'
import {rangeEdges} from '../range/range-edges'
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

    const deepest = getLeaf(editor, at, {
      edge: edge === 'end' ? 'end' : 'start',
    })
    if (!deepest) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    const {node, path: nodePath} = deepest
    path = nodePath

    if (
      !isSpan({schema: editor.schema}, node) &&
      !isTextBlockNode({schema: editor.schema}, node) &&
      !isEditor(node)
    ) {
      return {path, offset: 0}
    }

    if (!isSpan({schema: editor.schema}, node)) {
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
