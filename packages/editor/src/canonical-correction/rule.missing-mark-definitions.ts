import {isTextBlockNode} from '@portabletext/schema'
import type {CorrectionEntry} from '../caret-correction/correction-entry'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getMissingMarkDefinitionsCorrection(
  context: CanonicalContext,
  entry: CorrectionEntry,
): CanonicalCorrection | undefined {
  if (
    !isTextBlockNode({schema: context.schema}, entry.node) ||
    Array.isArray((entry.node as Record<string, unknown>)['markDefs'])
  ) {
    return undefined
  }

  return setNodePropertyCorrection(
    'missing-mark-definitions',
    entry.path,
    'markDefs',
    [],
  )
}
