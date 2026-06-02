import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEditableContainer} from '../../schema/is-editable-container'
import {getNodes} from '../../traversal/get-nodes'
import {getParent} from '../../traversal/get-parent'
import {getSibling} from '../../traversal/get-sibling'
import {isLeafObject} from '../../traversal/is-leaf-object'
import type {TraversalSnapshot} from '../../traversal/traversal-snapshot'
import type {Path} from '../interfaces/path'
import type {Range} from '../interfaces/range'
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
export function unhangRange(snapshot: TraversalSnapshot, range: Range): Range {
  const {context} = snapshot
  let [start, end] = rangeEdges(range, {value: context.value})

  // PERF: exit early if we can guarantee that the range isn't hanging.
  // A range can only hang when end is at offset 0 of the first child in a block.
  if (
    start.offset !== 0 ||
    end.offset !== 0 ||
    isCollapsedRange(range) ||
    getSibling(snapshot, end.path, {direction: 'previous'}) !== undefined
  ) {
    return range
  }

  const endBlock = getParent(snapshot, end.path, {
    match: (node) => isTextBlock({schema: snapshot.context.schema}, node),
  })
  const blockPath: Path = endBlock ? endBlock.path : []

  // If a void block or editable container sits strictly between the
  // endpoints, the range explicitly covers it. Unhanging would walk back
  // through spans and silently change the deletion target, so we leave the
  // range alone.
  for (const {path} of getNodes(snapshot, {
    from: start.path,
    to: end.path,
    match: (candidate, candidatePath) =>
      isLeafObject(snapshot, candidate, candidatePath) ||
      isEditableContainer(snapshot, candidate, candidatePath),
  })) {
    if (!isAncestorPath(path, start.path) && !isAncestorPath(path, end.path)) {
      return range
    }
  }

  let skip = true

  for (const {node, path: nodePath} of getNodes(snapshot, {
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
      isBeforePath(nodePath, blockPath, {value: context.value})
    ) {
      end = {path: nodePath, offset: node.text.length}
      break
    }
  }

  return {anchor: start, focus: end}
}
