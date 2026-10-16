import {hasUsableKey} from '../paths/node-segment'
import type {RepairContext, RepairEntry, RepairSetFix} from './types'

export function repairMissingKey(
  entry: RepairEntry,
  context: RepairContext,
): RepairSetFix | undefined {
  const {node, path} = entry

  if (hasUsableKey((node as Record<string, unknown>)['_key'])) {
    return undefined
  }

  if (path.length === 0) {
    return undefined
  }

  // The resolved path already identifies the node: keyed segments where
  // keys exist, numeric indices where they don't (see `nodeSegment`), so
  // the `set` applies to it as-is.
  return {
    rule: 'missing-key',
    type: 'set',
    path: [...path, '_key'],
    value: context.keyGenerator(),
    inverse: {type: 'unset', path: [...path, '_key']},
  }
}
