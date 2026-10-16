import {serializePath} from '../paths/serialize-path'
import type {Path} from '../types/paths'
import type {RepairContext, RepairEntry, RepairSetFix} from './types'

/**
 * Renames the second occurrence of the node's own `_key` among its
 * siblings, addressed by numeric index since the key no longer identifies
 * one node.
 */
export function repairDuplicateKey(
  entry: RepairEntry & {siblings: ReadonlyArray<{_key?: string}>},
  context: RepairContext,
): RepairSetFix | undefined {
  const {node, path, parent, siblings} = entry
  const key = (node as Record<string, unknown>)['_key']

  if (path.length === 0 || key === undefined) {
    return undefined
  }

  // A group of zero or one child can't hold a duplicate key, so it needs
  // neither a scan nor a cache entry: re-checking it is already O(1). This
  // is the common shape for container fields (a row's single cell, a
  // cell's single content block) and single-span text blocks, so only
  // groups with two or more children ever cost a serialized id.
  if (siblings.length <= 1) {
    return undefined
  }

  const childFieldName = parent ? path[parent.path.length] : undefined
  const groupPath: Path =
    parent && typeof childFieldName === 'string'
      ? [...parent.path, childFieldName]
      : []
  // The verdict survives edits elsewhere in the tree: the engine drops it
  // only when the op stream sees this group's own membership change.
  // Caching it keeps a bulk insert of n pre-keyed siblings at O(n) instead
  // of O(n^2).
  const groupId = serializePath(groupPath)

  if (context.verifiedUniqueGroups.has(groupId)) {
    return undefined
  }

  const seenKeys = new Set<string>()
  let groupIsUnique = true
  let duplicateIndexOfKey = -1

  for (let index = 0; index < siblings.length; index++) {
    const siblingKey = siblings[index]?._key
    if (siblingKey === undefined) {
      continue
    }
    if (seenKeys.has(siblingKey)) {
      groupIsUnique = false
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
      type: 'set',
      path: [...numericPath, '_key'],
      value: context.keyGenerator(),
      inverse: {type: 'set', path: [...numericPath, '_key'], value: key},
    }
  }

  if (groupIsUnique) {
    context.verifiedUniqueGroups.add(groupId)
  }

  return undefined
}
