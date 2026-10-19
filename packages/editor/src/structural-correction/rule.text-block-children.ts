import {isTextBlockNode} from './node-kinds'
import type {
  CorrectionEntry,
  StructuralContext,
  StructuralCorrection,
} from './types'

/**
 * Runtime data can arrive without `children`, for example after an `unset`
 * patch.
 */
export function repairMissingTextBlockChildren(
  entry: CorrectionEntry,
  context: StructuralContext,
): StructuralCorrection | undefined {
  const {node, path} = entry

  if (!isTextBlockNode(context.schema, node) || Array.isArray(node.children)) {
    return undefined
  }

  return {
    rule: 'missing-children',
    type: 'set',
    path: [...path, 'children'],
    value: [],
  }
}
