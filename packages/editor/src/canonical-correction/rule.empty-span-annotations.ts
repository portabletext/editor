import {isSpan, isTextBlock} from '@portabletext/schema'
import type {CorrectionEntry} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getEmptySpanAnnotationsCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (
    !isSpan({schema: context.schema}, entry.node) ||
    !isTextBlock({schema: context.schema}, entry.parent?.node)
  ) {
    return undefined
  }

  const block = entry.parent.node
  // An unresolved mark might be a decorator in a collaborator's schema.
  const annotations = entry.node.marks?.filter((mark) =>
    block.markDefs?.some((markDef) => markDef._key === mark),
  )
  if (entry.node.text !== '' || !annotations || annotations.length === 0) {
    return undefined
  }

  return setNodePropertyCorrection(
    'empty-span-annotations',
    entry.node,
    entry.path,
    'marks',
    entry.node.marks?.filter((mark) => !annotations.includes(mark)),
  )
}
