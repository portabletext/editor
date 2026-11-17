import {isTextBlock} from '@portabletext/schema'
import {createSpan} from './create-nodes'
import type {CaretContext, CaretCorrection, CaretEntry} from './types'

/**
 * Returns the next span an inline object in the text block needs: before it,
 * then after it when it ends the block.
 */
export function getInlineObjectBracketingCorrection(
  context: CaretContext,
  entry: CaretEntry,
): CaretCorrection | undefined {
  const {node, path} = entry

  if (!isTextBlock({schema: context.schema}, node)) {
    return undefined
  }

  const children = node.children

  for (let index = 0; index < children.length; index++) {
    const child = children[index]

    if (!child || entry.childKind(child) !== 'object') {
      continue
    }

    const previous = children[index - 1]

    if (previous == null || entry.childKind(previous) !== 'span') {
      return {
        rule: 'inline-object-bracketing',
        type: 'insert',
        path: [...path, 'children', {_key: child._key}],
        node: createSpan(context),
        position: 'before',
      }
    }

    if (index === children.length - 1) {
      return {
        rule: 'inline-object-bracketing',
        type: 'insert',
        path: [...path, 'children', {_key: child._key}],
        node: createSpan(context),
        position: 'after',
      }
    }
  }

  return undefined
}
