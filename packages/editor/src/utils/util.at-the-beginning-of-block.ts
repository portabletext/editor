import {isTextBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {getChildKeyFromSelectionPoint} from '../selection/selection-point'
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

  const focusSpanKey = getChildKeyFromSelectionPoint(context.selection.focus)

  return (
    focusSpanKey === block.children[0]._key &&
    context.selection.focus.offset === 0
  )
}
