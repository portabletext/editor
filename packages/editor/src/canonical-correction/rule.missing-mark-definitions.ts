import {isTextBlockNode, type CorrectionEntry} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getMissingMarkDefinitionsCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (
    !isTextBlockNode(context.schema, entry.node) ||
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
