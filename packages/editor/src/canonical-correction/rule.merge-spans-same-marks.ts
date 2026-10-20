import {isSpan, isTextBlock} from '@portabletext/schema'
import type {CorrectionEntry} from '../structural-correction'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getMergeSpansSameMarksCorrection(
  entry: CorrectionEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  const children = entry.node.children
  for (let index = 0; index < children.length - 1; index++) {
    const child = children[index]!
    const nextChild = children[index + 1]!
    if (
      isSpan({schema: context.schema}, child) &&
      isSpan({schema: context.schema}, nextChild) &&
      child.marks?.every((mark) => nextChild.marks?.includes(mark)) &&
      nextChild.marks?.every((mark) => child.marks?.includes(mark))
    ) {
      return {
        rule: 'merge-spans-same-marks',
        type: 'merge',
        path: [...entry.path, 'children', {_key: nextChild._key}],
        position: child.text.length,
      }
    }
  }

  return undefined
}
