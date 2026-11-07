import {repairDuplicateKey} from './rule.duplicate-key'
import {repairMissingKey} from './rule.missing-key'
import {repairMissingType} from './rule.missing-type'
import {repairNonObject} from './rule.non-object'
import {repairSpanText} from './rule.span-text'
import {repairMissingTextBlockChildren} from './rule.text-block-children'
import type {
  StructuralContext,
  StructuralCorrection,
  StructuralEntry,
} from './types'

/**
 * Returns the first correction that makes an entry structurally sound.
 *
 * @public
 */
export function getStructuralCorrection(
  context: StructuralContext,
  entry: StructuralEntry,
): StructuralCorrection | undefined {
  if (
    entry.path.length === 0 &&
    (entry.node === null || typeof entry.node !== 'object')
  ) {
    // Later rules read properties from the node, so a non-object root cannot reach them.
    return undefined
  }

  return (
    repairNonObject(entry) ??
    repairMissingType(context, entry) ??
    repairMissingKey(context, entry) ??
    repairDuplicateKey(context, entry) ??
    repairSpanText(context, entry) ??
    repairMissingTextBlockChildren(context, entry)
  )
}
