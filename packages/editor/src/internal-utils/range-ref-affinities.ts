import {Range} from '../slate'
import type {RangeRef} from '../slate/interfaces/range-ref'

/**
 * Resolve the per-point affinities for a RangeRef.
 *
 * This replicates the logic from Range.transform: for 'inward' affinity on a
 * forward range, the anchor uses 'forward' and the focus uses 'backward'
 * (they contract toward each other). For 'outward', the opposite. For
 * 'forward'/'backward'/null, both points use the same affinity.
 */
export function rangeRefAffinities(
  range: Range,
  affinity: RangeRef['affinity'],
): ['forward' | 'backward' | null, 'forward' | 'backward' | null] {
  if (affinity === 'inward') {
    const isCollapsed = Range.isCollapsed(range)
    if (Range.isForward(range)) {
      const anchorAffinity = 'forward'
      return [anchorAffinity, isCollapsed ? anchorAffinity : 'backward']
    } else {
      const anchorAffinity = 'backward'
      return [anchorAffinity, isCollapsed ? anchorAffinity : 'forward']
    }
  } else if (affinity === 'outward') {
    if (Range.isForward(range)) {
      return ['backward', 'forward']
    } else {
      return ['forward', 'backward']
    }
  } else {
    return [affinity, affinity]
  }
}
