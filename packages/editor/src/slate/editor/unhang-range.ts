import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {getAncestorTextBlock} from '../../node-traversal/get-ancestor-text-block'
import {getNodes} from '../../node-traversal/get-nodes'
import {getSibling} from '../../node-traversal/get-sibling'
import {isEditableContainer} from '../../schema/is-editable-container'
import type {Containers} from '../../schema/resolve-containers'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import type {Range} from '../interfaces/range'
import {isVoidNode} from '../node/is-void-node'
import {isAncestorPath} from '../path/is-ancestor-path'
import {isBeforePath} from '../path/is-before-path'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {rangeEdges} from '../range/range-edges'

/**
 * Pull a hanging range's focus back from the start of the next block to the
 * end of the previous block's content, so that an offset-0 focus doesn't
 * include the trailing block in the range.
 *
 * Returns the input unchanged when:
 * - the range is collapsed
 * - the start or end is not at offset 0
 * - the end already has a previous sibling at the same level
 * - a void block or editable container sits strictly between the start and
 *   end (the user's range explicitly covers it, and unhanging would silently
 *   change the deletion target)
 */
export function unhangRange(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
    blockIndexMap: Map<string, number>
  },
  range: Range,
): Range {
  let [start, end] = rangeEdges(range, {}, {children: context.value})

  // PERF: exit early if we can guarantee that the range isn't hanging.
  // A range can only hang when end is at offset 0 of the first child in a block.
  if (
    start.offset !== 0 ||
    end.offset !== 0 ||
    isCollapsedRange(range) ||
    getSibling(context, end.path, 'previous') !== undefined
  ) {
    return range
  }

  const endBlock = getAncestorTextBlock(context, end.path)
  const blockPath: Path = endBlock ? endBlock.path : []

  // If a void block or editable container sits strictly between the
  // endpoints, the range explicitly covers it. Unhanging would walk back
  // through spans and silently change the deletion target, so we leave the
  // range alone.
  for (const {path} of getNodes(context, {
    from: start.path,
    to: end.path,
    match: (candidate, candidatePath) =>
      isVoidNode(context, candidate, candidatePath) ||
      isEditableContainer(context, candidate, candidatePath),
  })) {
    if (!isAncestorPath(path, start.path) && !isAncestorPath(path, end.path)) {
      return range
    }
  }

  let skip = true

  for (const {node, path: nodePath} of getNodes(context, {
    from: start.path,
    to: end.path,
    match: (n) => isSpan({schema: context.schema}, n),
    reverse: true,
  })) {
    if (skip) {
      skip = false
      continue
    }

    if (!isSpan({schema: context.schema}, node)) {
      continue
    }

    if (
      node.text !== '' ||
      isBeforePath(nodePath, blockPath, {children: context.value})
    ) {
      end = {path: nodePath, offset: node.text.length}
      break
    }
  }

  return {anchor: start, focus: end}
}
