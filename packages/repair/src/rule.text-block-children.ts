import {isTextBlockNode} from '@portabletext/schema'
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
  context: StructuralContext,
  entry: CorrectionEntry,
): StructuralCorrection | undefined {
  const {node, path} = entry

  if (
    !isTextBlockNode({schema: context.schema}, node) ||
    Array.isArray(node.children)
  ) {
    return undefined
  }

  return {
    type: 'missing-children',
    patches: [{type: 'set', path: [...path, 'children'], value: []}],
  }
}
