import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {isKeyedSegment} from './util.is-keyed-segment'
import {isSelectionCollapsed} from './util.is-selection-collapsed'

export function isAtTheBeginningOfBlock({
  context,
  block,
}: {
  context: EditorContext
  block: PortableTextBlock
}) {
  if (!isTextBlock(context, block)) {
    return false
  }

  if (!context.selection) {
    return false
  }

  if (!isSelectionCollapsed(context.selection)) {
    return false
  }

  // Resolve the focus's enclosing text block so we know we're inside `block`
  // and not in some unrelated structural position. Then read the child key
  // from the last keyed segment of the focus path; the field name (`children`,
  // or whatever the container declares) is irrelevant.
  const focusPath = context.selection.focus.path
  const ancestorTextBlock = getAncestorTextBlock(context, focusPath)

  if (!ancestorTextBlock || ancestorTextBlock.node._key !== block._key) {
    return false
  }

  const lastSegment = focusPath.at(-1)
  const focusChildKey = isKeyedSegment(lastSegment)
    ? lastSegment._key
    : undefined

  return (
    focusChildKey === block.children[0]?._key &&
    context.selection.focus.offset === 0
  )
}
