import type {Patch, Path} from '@portabletext/patches'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

type Creation = {
  insertIndex: number
  itemIndex: number
  unsetIndex?: number
}

/**
 * Removes patches that sum to nothing within one mutation flush: a keyed
 * item that is both inserted and unset contributed nothing to the net
 * change, and neither did any patch scoped inside it. Receivers whose
 * delivery slices a transaction otherwise render the transient item (a
 * paste, for example, stages a temporary span and merges it away in the
 * same flush).
 *
 * Cancellation assumes keys inserted during a flush are fresh, which the
 * key generator guarantees. It bails per key when anything outside the
 * insert/unset window references the key, or when another insert uses the
 * key as its `before`/`after` anchor, since cancelling an anchor target
 * would dangle the reference.
 */
export function cancelNetZeroPatches(patches: Array<Patch>): Array<Patch> {
  const creations = new Map<string, Array<Creation>>()

  patches.forEach((patch, patchIndex) => {
    if (patch.type !== 'insert') {
      return
    }
    const parentId = serializePath(patch.path.slice(0, -1))
    patch.items.forEach((item, itemIndex) => {
      const key = getItemKey(item)
      if (key === undefined) {
        return
      }
      const id = `${parentId}/k:${key}`
      const existing = creations.get(id)
      if (existing) {
        existing.push({insertIndex: patchIndex, itemIndex})
      } else {
        creations.set(id, [{insertIndex: patchIndex, itemIndex}])
      }
    })
  })

  if (creations.size === 0) {
    return patches
  }

  patches.forEach((patch, patchIndex) => {
    if (patch.type !== 'unset') {
      return
    }
    const lastSegment = patch.path.at(-1)
    if (!isKeyedSegment(lastSegment)) {
      return
    }
    const id = `${serializePath(patch.path.slice(0, -1))}/k:${lastSegment._key}`
    const creation = creations
      .get(id)
      ?.find(
        (candidate) =>
          candidate.unsetIndex === undefined &&
          candidate.insertIndex < patchIndex,
      )
    if (creation) {
      creation.unsetIndex = patchIndex
    }
  })

  const droppedPatchIndexes = new Set<number>()
  const droppedInsertItems = new Map<number, Set<number>>()

  for (const [id, creationList] of creations) {
    const key = id.slice(id.lastIndexOf('/k:') + 3)

    for (const creation of creationList) {
      if (creation.unsetIndex === undefined) {
        continue
      }
      const insertIndex = creation.insertIndex
      const unsetIndex = creation.unsetIndex

      let bail = false
      const scopedPatchIndexes = new Set<number>()

      patches.forEach((patch, patchIndex) => {
        if (patchIndex === insertIndex || patchIndex === unsetIndex) {
          return
        }
        const role = getReferenceRole(patch, key)
        if (role === 'none') {
          return
        }
        if (
          role === 'anchor' ||
          patchIndex < insertIndex ||
          patchIndex > unsetIndex
        ) {
          bail = true
          return
        }
        scopedPatchIndexes.add(patchIndex)
      })

      if (bail) {
        continue
      }

      const existingItems = droppedInsertItems.get(creation.insertIndex)
      if (existingItems) {
        existingItems.add(creation.itemIndex)
      } else {
        droppedInsertItems.set(
          creation.insertIndex,
          new Set([creation.itemIndex]),
        )
      }
      droppedPatchIndexes.add(unsetIndex)
      for (const scopedPatchIndex of scopedPatchIndexes) {
        droppedPatchIndexes.add(scopedPatchIndex)
      }
    }
  }

  if (droppedPatchIndexes.size === 0 && droppedInsertItems.size === 0) {
    return patches
  }

  return patches.flatMap((patch, patchIndex) => {
    if (droppedPatchIndexes.has(patchIndex)) {
      return []
    }
    const droppedItems = droppedInsertItems.get(patchIndex)
    if (droppedItems && patch.type === 'insert') {
      const items = patch.items.filter(
        (_, itemIndex) => !droppedItems.has(itemIndex),
      )
      return items.length > 0 ? [{...patch, items}] : []
    }
    return [patch]
  })
}

function getReferenceRole(
  patch: Patch,
  key: string,
): 'none' | 'scoped' | 'anchor' {
  const keyedSegmentIndex = patch.path.findIndex(
    (segment) => isKeyedSegment(segment) && segment._key === key,
  )
  if (keyedSegmentIndex === -1) {
    return 'none'
  }
  if (patch.type === 'insert' && keyedSegmentIndex === patch.path.length - 1) {
    // The insert positions its items `before`/`after` the key.
    return 'anchor'
  }
  return 'scoped'
}

function getItemKey(item: unknown): string | undefined {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return undefined
  }
  const key = (item as {_key?: unknown})._key
  return typeof key === 'string' ? key : undefined
}

function serializePath(path: Path): string {
  return path
    .map((segment) => {
      if (isKeyedSegment(segment)) {
        return `k:${segment._key}`
      }
      if (typeof segment === 'number') {
        return `i:${segment}`
      }
      if (typeof segment === 'string') {
        return `s:${segment}`
      }
      return `t:${segment.join(':')}`
    })
    .join('/')
}
