import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
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

  // A child-level point ends with `'children', {_key}`. The child key is the
  // last keyed segment. For block-level points, there is no child key.
  const focusPath = context.selection.focus.path
  const lastSegment = focusPath.at(-1)
  const secondToLast = focusPath.at(-2)
  const focusSpanKey =
    secondToLast === 'children' && isKeyedSegment(lastSegment)
      ? lastSegment._key
      : undefined

  return (
    focusSpanKey === block.children[0]?._key &&
    context.selection.focus.offset === 0
  )
}
