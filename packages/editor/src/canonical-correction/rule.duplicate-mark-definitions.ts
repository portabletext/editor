import {isTextBlock, type PortableTextObject} from '@portabletext/schema'
import type {CorrectionEntry} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getDuplicateMarkDefinitionsCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  const markDefs = entry.node.markDefs ?? []
  const markDefKeys = new Set<string>()
  const newMarkDefs: Array<PortableTextObject> = []
  for (const markDef of markDefs) {
    if (!markDefKeys.has(markDef._key)) {
      markDefKeys.add(markDef._key)
      newMarkDefs.push(markDef)
    }
  }

  return markDefs.length === newMarkDefs.length
    ? undefined
    : setNodePropertyCorrection(
        'duplicate-mark-definitions',
        entry.path,
        'markDefs',
        newMarkDefs,
      )
}
