import {isSpan} from '@portabletext/schema'
import type {CorrectionEntry} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getMissingMarksCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (
    !isSpan({schema: context.schema}, entry.node) ||
    Array.isArray(entry.node.marks)
  ) {
    return undefined
  }

  return setNodePropertyCorrection('missing-marks', entry.path, 'marks', [])
}
