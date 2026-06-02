import type {Node} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import type {RangeDirection} from '../types/types'
import {isCollapsedRange} from './is-collapsed-range'
import {isForwardRange} from './is-forward-range'

export type PointAffinity = 'forward' | 'backward' | null

/**
 * Resolve a range-level affinity into per-point affinities.
 *
 * For 'inward' affinity on a forward range, the anchor uses 'forward' and
 * the focus uses 'backward' (they contract toward each other). For
 * 'outward', the opposite. For 'forward'/'backward'/null, both points use
 * the same affinity.
 */
export function resolveRangeAffinities(
  range: Range,
  root: {value: Array<Node>},
  affinity: RangeDirection | null,
): [PointAffinity, PointAffinity] {
  if (affinity === 'inward') {
    const isCollapsed = isCollapsedRange(range)
    if (isForwardRange(range, root)) {
      const anchorAffinity = 'forward'
      return [anchorAffinity, isCollapsed ? anchorAffinity : 'backward']
    }
    const anchorAffinity = 'backward'
    return [anchorAffinity, isCollapsed ? anchorAffinity : 'forward']
  }
  if (affinity === 'outward') {
    if (isForwardRange(range, root)) {
      return ['backward', 'forward']
    }
    return ['forward', 'backward']
  }
  return [affinity, affinity]
}
