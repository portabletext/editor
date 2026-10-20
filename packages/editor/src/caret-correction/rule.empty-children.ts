import {isTextBlockNode, type CorrectionEntry} from '../structural-correction'
import {createSpan} from './create-nodes'
import type {CaretContext, CaretCorrection} from './types'

export function getEmptyChildrenCorrection(
  entry: CorrectionEntry,
  context: CaretContext,
): CaretCorrection | undefined {
  const {node, path} = entry

  if (
    !isTextBlockNode(context.schema, node) ||
    !Array.isArray(node.children) ||
    node.children.length > 0
  ) {
    return undefined
  }

  return {
    rule: 'empty-children',
    type: 'insert',
    path: [...path, 'children', 0],
    node: createSpan(context),
    position: 'before',
  }
}
