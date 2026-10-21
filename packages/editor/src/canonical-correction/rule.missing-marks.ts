import {isSpan} from '@portabletext/schema'
import type {CorrectionEntry} from '../caret-correction/correction-entry'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getMissingMarksCorrection(
  context: CanonicalContext,
  entry: CorrectionEntry,
): CanonicalCorrection | undefined {
  if (
    !isSpan({schema: context.schema}, entry.node) ||
    Array.isArray(entry.node.marks)
  ) {
    return undefined
  }

  return setNodePropertyCorrection('missing-marks', entry.path, 'marks', [])
}
