import {isTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from './util.selection-point'

/**
 * Returns:
 *
 * - `-1` if `pointA` is before `pointB`
 * - `0` if `pointA` and `pointB` are equal
 * - `1` if `pointA` is after `pointB`.
 */
export function comparePoints(
  snapshot: EditorSnapshot,
  pointA: EditorSelectionPoint,
  pointB: EditorSelectionPoint,
): -1 | 0 | 1 {
  const blockKeyA = getBlockKeyFromSelectionPoint(pointA)
  const blockKeyB = getBlockKeyFromSelectionPoint(pointB)

  if (!blockKeyA) {
    throw new Error(`Cannot compare points: no block key found for ${pointA}`)
  }

  if (!blockKeyB) {
    throw new Error(`Cannot compare points: no block key found for ${pointB}`)
  }

  const blockIndexA = snapshot.blockPathMap.getIndex([blockKeyA])
  const blockIndexB = snapshot.blockPathMap.getIndex([blockKeyB])

  if (blockIndexA === undefined) {
    throw new Error(`Cannot compare points: block "${blockKeyA}" not found`)
  }

  if (blockIndexB === undefined) {
    throw new Error(`Cannot compare points: block "${blockKeyB}" not found`)
  }

  if (blockIndexA < blockIndexB) {
    return -1
  }

  if (blockIndexA > blockIndexB) {
    return 1
  }

  // Same block - need to compare at child level
  const block = snapshot.context.value.at(blockIndexA)

  if (!block || !isTextBlock(snapshot.context, block)) {
    // Block objects - same block means equal position
    return 0
  }

  const childKeyA = getChildKeyFromSelectionPoint(pointA)
  const childKeyB = getChildKeyFromSelectionPoint(pointB)

  if (!childKeyA) {
    throw new Error(`Cannot compare points: no child key found for ${pointA}`)
  }

  if (!childKeyB) {
    throw new Error(`Cannot compare points: no child key found for ${pointB}`)
  }

  // Find child indices
  let childIndexA: number | undefined
  let childIndexB: number | undefined

  for (let i = 0; i < block.children.length; i++) {
    const child = block.children.at(i)

    if (!child) {
      continue
    }

    if (child._key === childKeyA && child._key === childKeyB) {
      // Same child - compare offsets directly
      if (pointA.offset < pointB.offset) {
        return -1
      }

      if (pointA.offset > pointB.offset) {
        return 1
      }

      return 0
    }

    if (child._key === childKeyA) {
      childIndexA = i
    }

    if (child._key === childKeyB) {
      childIndexB = i
    }

    if (childIndexA !== undefined && childIndexB !== undefined) {
      break
    }
  }

  if (childIndexA === undefined) {
    throw new Error(`Cannot compare points: child "${childKeyA}" not found`)
  }

  if (childIndexB === undefined) {
    throw new Error(`Cannot compare points: child "${childKeyB}" not found`)
  }

  if (childIndexA < childIndexB) {
    return -1
  }

  if (childIndexA > childIndexB) {
    return 1
  }

  // Same child index but different keys (shouldn't happen)
  return 0
}
