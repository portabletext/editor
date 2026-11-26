import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {comparePoints} from '../traversal/compare-points'
import {getChildren} from '../traversal/get-children'
import {getSpan} from '../traversal/get-span'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {raise, type BehaviorAction} from './behavior.types.action'

export function moveTailActions(
  snapshot: EditorSnapshot,
  point: EditorSelectionPoint,
): Array<BehaviorAction> {
  const span = getSpan(snapshot, point.path)
  const block = getEnclosingBlock(snapshot, point.path)
  if (!span || !block) return []
  const actions: Array<BehaviorAction> = []
  for (const child of getChildren(snapshot, block.path).reverse()) {
    const order = comparePoints(
      snapshot,
      {path: child.path, offset: 0},
      {path: span.path, offset: 0},
    )
    if (order > 0) actions.push(raise({type: 'unset', at: child.path}))
  }
  const text = span.node.text.slice(point.offset)
  if (text)
    actions.push(
      raise({type: 'remove.text', at: span.path, offset: point.offset, text}),
    )
  return actions
}
