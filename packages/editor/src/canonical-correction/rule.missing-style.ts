import {isTextBlockNode} from '@portabletext/schema'
import {setNodePropertyCorrection} from './set-node-property'
import type {
  CanonicalContext,
  CanonicalCorrection,
  CanonicalEntry,
} from './types'

export function getMissingStyleCorrection(
  context: CanonicalContext,
  entry: CanonicalEntry,
): CanonicalCorrection | undefined {
  if (
    !isTextBlockNode({schema: context.schema}, entry.node) ||
    typeof (entry.node as Record<string, unknown>)['style'] !== 'undefined'
  ) {
    return undefined
  }

  const defaultStyle = entry.defaultStyle()
  return defaultStyle
    ? setNodePropertyCorrection(
        'missing-style',
        entry.path,
        'style',
        defaultStyle,
      )
    : undefined
}
