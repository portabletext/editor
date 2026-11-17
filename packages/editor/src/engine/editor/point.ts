import {isSpan, isTextBlockNode} from '@portabletext/schema'
import {getLeaf} from '../../traversal/get-leaf'
import {isBlock} from '../../traversal/is-block'
import {isInline} from '../../traversal/is-inline'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
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
    const deepest = getLeaf(editor.snapshot, at, {
      edge: edge === 'end' ? 'end' : 'start',
    })
    if (!deepest) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    const {node, path: nodePath} = deepest
    const path: Path = nodePath

    if (
      !isEditor(node) &&
      (!isSpan(editor.snapshot.context, node) ||
        !isInline(editor.snapshot, path)) &&
      !(
        isBlock(editor.snapshot, path) &&
        isTextBlockNode(editor.snapshot.context, node)
      )
    ) {
      return {path, offset: 0}
    }

    if (!isSpan(editor.snapshot.context, node)) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    return {path, offset: edge === 'end' ? node.text.length : 0}
  }

  if (isRange(at)) {
    const [start, end] = rangeEdges(at, editor.snapshot.context)
    return edge === 'start' ? start : end
  }

  return at
}
