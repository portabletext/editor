import type {Path} from '@portabletext/patches'
import type {
  StructuralContext,
  StructuralCorrection,
  StructuralEntry,
} from './types'

/**
 * Renames the second occurrence of the node's own `_key` among its
 * siblings, addressed by numeric index since the key no longer identifies
 * one node.
 */
export function repairDuplicateKey(
  context: StructuralContext,
  entry: StructuralEntry,
): StructuralCorrection | undefined {
  const {node, path, parent} = entry
  const key = (node as Record<string, unknown>)['_key']

  if (path.length === 0 || key === undefined) {
    return undefined
  }

  const siblings = entry.siblings()

  if (!siblings || siblings.length <= 1) {
    return undefined
  }

  const childFieldName = parent ? path[parent.path.length] : undefined
  const groupPath: Path =
    parent && typeof childFieldName === 'string'
      ? [...parent.path, childFieldName]
      : []
  const seenKeys = new Set<string>()
  let duplicateIndexOfKey = -1

  for (let index = 0; index < siblings.length; index++) {
    const siblingKey = siblings[index]?._key
    if (siblingKey === undefined) {
      continue
    }
    if (seenKeys.has(siblingKey)) {
      // The second occurrence of this node's own key is the one the
      // previous per-node implementation renamed; preserve that so
      // generated keys land on the same node.
      if (siblingKey === key && duplicateIndexOfKey === -1) {
        duplicateIndexOfKey = index
      }
    } else {
      seenKeys.add(siblingKey)
    }
  }

  if (duplicateIndexOfKey !== -1) {
    const numericPath: Path = [...groupPath, duplicateIndexOfKey]
    return {
      type: 'duplicate-key',
      patches: [
        {
          type: 'set',
          path: [...numericPath, '_key'],
          value: context.keyGenerator(),
        },
      ],
    }
  }

  return undefined
}
