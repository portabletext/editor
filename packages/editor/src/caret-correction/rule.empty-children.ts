import {isTextBlockNode} from '@portabletext/schema'
import type {CorrectionEntry} from './correction-entry'
import {createSpan} from './create-nodes'
import type {CaretContext, CaretCorrection} from './types'

export function getEmptyChildrenCorrection(
  context: CaretContext,
  entry: CorrectionEntry,
): CaretCorrection | undefined {
  const {node, path} = entry

  if (
    !isTextBlockNode({schema: context.schema}, node) ||
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
