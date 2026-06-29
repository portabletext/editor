import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEditableContainer} from '../../schema/is-editable-container'
import {getNodes} from '../../traversal/get-nodes'
import {getParent} from '../../traversal/get-parent'
import {getSibling} from '../../traversal/get-sibling'
import {isLeafObject} from '../../traversal/is-leaf-object'
import type {TraversalSnapshot} from '../../traversal/traversal-snapshot'
import type {Range} from '../interfaces/range'
import {isAncestorPath} from '../path/is-ancestor-path'
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
 * - no non-empty span sits between the endpoints, or any empty span sits
 *   between the endpoints and a non-empty one (the empty blocks were part
 *   of the user's selection and must remain in the deletion range)
 */
export function unhangRange(snapshot: TraversalSnapshot, range: Range): Range {
  const {context} = snapshot
  const [start, end] = rangeEdges(range, {value: context.value})

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
  if (!endBlock) {
    return range
  }

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
  let sawEmpty = false

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

    if (node.text === '') {
      sawEmpty = true
      continue
    }

    // If we passed an empty span on the way here, the user's selection
    // covered the empty block(s) between the endpoints. Anchoring at this
    // non-empty span would silently drop those empty blocks from the
    // range, so leave the range alone and let the cross-block delete run
    // at the user's boundary.
    if (sawEmpty) {
      return range
    }

    return {
      anchor: start,
      focus: {path: nodePath, offset: node.text.length},
    }
  }

  return range
}
