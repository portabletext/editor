import type {Operation} from '../interfaces/operation'
import type {Range, RangeTransformOptions} from '../interfaces/range'
import {transformPoint} from '../point/transform-point'
import {isCollapsedRange} from './is-collapsed-range'
import {isForwardRange} from './is-forward-range'

export function transformRange(
  range: Range | null,
  op: Operation,
  options: RangeTransformOptions = {},
): Range | null {
  if (range === null) {
    return null
  }

  const {affinity = 'inward'} = options
  let affinityAnchor: 'forward' | 'backward' | null
  let affinityFocus: 'forward' | 'backward' | null

  if (affinity === 'inward') {
    const isCollapsed = isCollapsedRange(range)
    if (isForwardRange(range)) {
      affinityAnchor = 'forward'
      affinityFocus = isCollapsed ? affinityAnchor : 'backward'
    } else {
      affinityAnchor = 'backward'
      affinityFocus = isCollapsed ? affinityAnchor : 'forward'
    }
  } else if (affinity === 'outward') {
    if (isForwardRange(range)) {
      affinityAnchor = 'backward'
      affinityFocus = 'forward'
    } else {
      affinityAnchor = 'forward'
      affinityFocus = 'backward'
    }
  } else {
    affinityAnchor = affinity
    affinityFocus = affinity
  }
  const anchor = transformPoint(range.anchor, op, {
    affinity: affinityAnchor,
  })
  const focus = transformPoint(range.focus, op, {affinity: affinityFocus})

  if (!anchor || !focus) {
    return null
  }

  return {anchor, focus}
}
