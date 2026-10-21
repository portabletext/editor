import {isSpanNode} from '@portabletext/schema'
import type {
  CorrectionEntry,
  StructuralContext,
  StructuralCorrection,
} from './types'

export function repairSpanText(
  context: StructuralContext,
  entry: CorrectionEntry,
): StructuralCorrection | undefined {
  const {node, path} = entry

  if (
    !isSpanNode({schema: context.schema}, node) ||
    typeof node.text === 'string'
  ) {
    return undefined
  }

  return {
    type: 'span-text',
    patches: [{type: 'set', path: [...path, 'text'], value: ''}],
  }
}
