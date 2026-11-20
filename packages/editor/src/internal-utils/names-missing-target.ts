import {isTextBlock} from '@portabletext/schema'
import {getNode} from '../traversal/get-node'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

export function namesMissingTarget(
  snapshot: TraversalSnapshot,
  at: NonNullable<EditorSelection>,
): boolean {
  return [at.anchor, at.focus].some((point) =>
    pointNamesMissingTarget(snapshot, point),
  )
}

export function pointNamesMissingTarget(
  snapshot: TraversalSnapshot,
  point: EditorSelectionPoint,
): boolean {
  if (!isKeyedSegment(point.path.at(-1))) {
    return false
  }
  if (point.path.at(-2) === 'markDefs') {
    return true
  }
  const childrenIndex = point.path.lastIndexOf('children')
  if (childrenIndex < 0) {
    return getNode(snapshot, point.path) === undefined
  }
  if (childrenIndex === 0 || childrenIndex === point.path.length - 1) {
    return false
  }
  const block = getNode(snapshot, point.path.slice(0, childrenIndex))
  return block
    ? isTextBlock(snapshot.context, block.node) &&
        getNode(snapshot, point.path) === undefined
    : true
}
