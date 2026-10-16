import {createSpan} from './create-nodes'
import {isTextBlockNode} from './node-kinds'
import type {
  RepairContext,
  RepairEntry,
  RepairInsertFix,
  RepairSetFix,
} from './types'

/**
 * Runtime data can arrive without `children`, for example after an `unset`
 * patch.
 */
export function repairMissingTextBlockChildren(
  entry: RepairEntry,
  context: RepairContext,
): RepairSetFix | undefined {
  const {node, path} = entry

  if (!isTextBlockNode(context.schema, node) || Array.isArray(node.children)) {
    return undefined
  }

  return {
    rule: 'missing-children',
    type: 'set',
    path: [...path, 'children'],
    value: [],
    inverse: {type: 'unset', path: [...path, 'children']},
  }
}

export function repairEmptyTextBlockChildren(
  entry: RepairEntry,
  context: RepairContext,
): RepairInsertFix | undefined {
  const {node, path} = entry

  if (
    !isTextBlockNode(context.schema, node) ||
    !Array.isArray(node.children) ||
    node.children.length > 0
  ) {
    return undefined
  }

  return {
    rule: 'empty-children',
    type: 'insert',
    path: [...path, 'children', 0],
    node: createSpan(context),
    position: 'before',
  }
}
