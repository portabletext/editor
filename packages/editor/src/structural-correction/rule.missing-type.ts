import {isTextBlock} from '@portabletext/schema'
import type {
  CorrectionEntry,
  StructuralContext,
  StructuralCorrection,
} from './types'

/**
 * Children of text blocks default to the span type, everything else to the
 * text block type.
 */
export function repairMissingType(
  entry: CorrectionEntry,
  context: StructuralContext,
): StructuralCorrection | undefined {
  const {node, path, parent} = entry

  if ((node as Record<string, unknown>)['_type'] !== undefined) {
    return undefined
  }

  if (path.length === 0) {
    return undefined
  }

  const typeName =
    parent && isTextBlock({schema: context.schema}, parent.node)
      ? context.schema.span.name
      : context.schema.block.name

  return {
    rule: 'missing-type',
    type: 'set',
    path: [...path, '_type'],
    value: typeName,
  }
}
