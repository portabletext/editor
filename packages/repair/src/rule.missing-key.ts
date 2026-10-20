import {hasUsableKey} from './has-usable-key'
import type {
  CorrectionEntry,
  StructuralContext,
  StructuralCorrection,
} from './types'

export function repairMissingKey(
  context: StructuralContext,
  entry: CorrectionEntry,
): StructuralCorrection | undefined {
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
    type: 'missing-key',
    patches: [
      {type: 'set', path: [...path, '_key'], value: context.keyGenerator()},
    ],
  }
}
