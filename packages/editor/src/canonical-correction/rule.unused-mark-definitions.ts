import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEqualMarkDefs} from '../internal-utils/equality'
import type {CorrectionEntry} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getUnusedMarkDefinitionsCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  const node = entry.node
  const newMarkDefs = (node.markDefs || []).filter((markDef) =>
    node.children.find(
      (child) =>
        isSpan({schema: context.schema}, child) &&
        Array.isArray(child.marks) &&
        child.marks.includes(markDef._key),
    ),
  )

  return node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)
    ? setNodePropertyCorrection(
        'unused-mark-definitions',
        entry.path,
        'markDefs',
        newMarkDefs,
      )
    : undefined
}
