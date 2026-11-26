import {isSpan} from '@portabletext/schema'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {comparePoints} from './compare-points'
import {getChildren} from './get-children'
import {getEnclosingBlock} from './get-enclosing-block'
import {getSpan} from './get-span'
import type {TraversalSnapshot} from './traversal-snapshot'

export function getCollapsedSpanBoundary(
  snapshot: TraversalSnapshot,
  selection: NonNullable<EditorSelection>,
): EditorSelectionPoint | undefined {
  const anchor = getSpan(snapshot, selection.anchor.path)
  const focus = getSpan(snapshot, selection.focus.path)
  if (!anchor || !focus || anchor.node === focus.node) return undefined
  const anchorBlock = getEnclosingBlock(snapshot, anchor.path)
  const focusBlock = getEnclosingBlock(snapshot, focus.path)
  if (!anchorBlock || anchorBlock.node !== focusBlock?.node) return undefined
  const forward =
    comparePoints(snapshot, selection.anchor, selection.focus) <= 0
  const start = forward ? anchor : focus
  const end = forward ? focus : anchor
  const startPoint = forward ? selection.anchor : selection.focus
  const endPoint = forward ? selection.focus : selection.anchor
  if (startPoint.offset !== start.node.text.length || endPoint.offset !== 0)
    return undefined
  const children = getChildren(snapshot, anchorBlock.path)
  const startIndex = children.findIndex(({node}) => node === start.node)
  const endIndex = children.findIndex(({node}) => node === end.node)
  if (startIndex < 0 || endIndex <= startIndex) return undefined
  if (
    children
      .slice(startIndex + 1, endIndex)
      .some(({node}) => !isSpan(snapshot.context, node) || node.text.length > 0)
  )
    return undefined
  return {path: start.path, offset: start.node.text.length}
}
