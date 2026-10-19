import {isTextBlockNode} from '../structural-correction'
import {setNodePropertyCorrection} from './set-node-property'
import type {
  CanonicalContext,
  CanonicalCorrection,
  CanonicalEntry,
} from './types'

export function getMissingStyleCorrection(
  entry: CanonicalEntry,
  context: CanonicalContext,
): CanonicalCorrection | undefined {
  if (
    !isTextBlockNode(context.schema, entry.node) ||
    typeof (entry.node as Record<string, unknown>)['style'] !== 'undefined'
  ) {
    return undefined
  }

  const defaultStyle = entry.defaultStyle()
  return defaultStyle
    ? setNodePropertyCorrection(
        'missing-style',
        entry.node,
        entry.path,
        'style',
        defaultStyle,
      )
    : undefined
}
