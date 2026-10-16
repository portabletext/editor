import {isSpanNode} from './node-kinds'
import type {RepairContext, RepairEntry, RepairSetFix} from './types'

export function repairSpanText(
  entry: RepairEntry,
  context: RepairContext,
): RepairSetFix | undefined {
  const {node, path} = entry

  if (!isSpanNode(context.schema, node) || typeof node.text === 'string') {
    return undefined
  }

  return {
    type: 'set',
    path: [...path, 'text'],
    value: '',
    inverse: {type: 'unset', path: [...path, 'text']},
  }
}
