import {repairContainerField} from './rule.container-field'
import {repairDuplicateKey} from './rule.duplicate-key'
import {repairInlineObjectBracketing} from './rule.inline-object-bracketing'
import {repairMissingKey} from './rule.missing-key'
import {repairMissingType} from './rule.missing-type'
import {repairSpanText} from './rule.span-text'
import {
  repairEmptyTextBlockChildren,
  repairMissingTextBlockChildren,
} from './rule.text-block-children'
import type {RepairContext, RepairFix, RepairNodeEntry} from './types'

/**
 * Returns the first structural fix the node needs, or `undefined` when its
 * structure is sound. Each fix changes what the later rules see, so the
 * caller applies it and visits the node again rather than asking for more.
 */
export function repairNode(
  entry: RepairNodeEntry,
  context: RepairContext,
): RepairFix | undefined {
  return (
    repairMissingType(entry, context) ??
    repairMissingKey(entry, context) ??
    repairDuplicateKey(entry, context) ??
    repairSpanText(entry, context) ??
    repairContainerField(entry, context) ??
    repairMissingTextBlockChildren(entry, context) ??
    repairEmptyTextBlockChildren(entry, context) ??
    repairInlineObjectBracketing(entry, context)
  )
}
