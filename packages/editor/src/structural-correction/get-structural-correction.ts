import {repairDuplicateKey} from './rule.duplicate-key'
import {repairMissingKey} from './rule.missing-key'
import {repairMissingType} from './rule.missing-type'
import {repairSpanText} from './rule.span-text'
import {repairMissingTextBlockChildren} from './rule.text-block-children'
import type {
  StructuralContext,
  StructuralCorrection,
  StructuralEntry,
} from './types'

/**
 * Returns one correction that makes a node structurally sound, or `undefined`.
 */
export function getStructuralCorrection(
  entry: StructuralEntry,
  context: StructuralContext,
): StructuralCorrection | undefined {
  return (
    repairMissingType(entry, context) ??
    repairMissingKey(entry, context) ??
    repairDuplicateKey(entry, context) ??
    repairSpanText(entry, context) ??
    repairMissingTextBlockChildren(entry, context)
  )
}
