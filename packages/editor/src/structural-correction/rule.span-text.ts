import {isSpanNode} from './node-kinds'
import type {
  CorrectionEntry,
  StructuralContext,
  StructuralCorrection,
} from './types'

export function repairSpanText(
  entry: CorrectionEntry,
  context: StructuralContext,
): StructuralCorrection | undefined {
  const {node, path} = entry

  if (!isSpanNode(context.schema, node) || typeof node.text === 'string') {
    return undefined
  }

  return {
    rule: 'span-text',
    type: 'set',
    path: [...path, 'text'],
    value: '',
  }
}
