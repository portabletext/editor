import {getAdjacentSpansCorrection} from './rule.adjacent-spans'
import {getDuplicateMarkDefinitionsCorrection} from './rule.duplicate-mark-definitions'
import {getEmptySpanAnnotationsCorrection} from './rule.empty-span-annotations'
import {getMergeSpansSameMarksCorrection} from './rule.merge-spans-same-marks'
import {getMissingMarkDefinitionsCorrection} from './rule.missing-mark-definitions'
import {getMissingMarksCorrection} from './rule.missing-marks'
import {getMissingStyleCorrection} from './rule.missing-style'
import {getUnusedMarkDefinitionsCorrection} from './rule.unused-mark-definitions'
import type {
  CanonicalContext,
  CanonicalCorrection,
  CanonicalEntry,
} from './types'

/**
 * Returns one correction that brings a node into canonical shape, or
 * `undefined`. The engine runs this group for local changes only.
 */
export function getCanonicalCorrection(
  entry: CanonicalEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  return (
    getMergeSpansSameMarksCorrection(entry, context) ??
    getMissingMarkDefinitionsCorrection(entry, context) ??
    getMissingStyleCorrection(entry, context) ??
    getMissingMarksCorrection(entry, context) ??
    getEmptySpanAnnotationsCorrection(entry, context) ??
    getDuplicateMarkDefinitionsCorrection(entry, context) ??
    getUnusedMarkDefinitionsCorrection(entry, context) ??
    getAdjacentSpansCorrection(entry, context)
  )
}
