import {isPortableTextTextBlock, type PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedSpans} from './selector.get-selected-spans'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'
import {getFocusSpan, getSelectedBlocks} from './selectors'

/**
 * @public
 */
export const getActiveAnnotations: EditorSelector<Array<PortableTextObject>> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks = getSelectedBlocks(snapshot)
  const selectedSpans = getSelectedSpans(snapshot)
  const focusSpan = getFocusSpan(snapshot)

  if (selectedSpans.length === 0 || !focusSpan) {
    return []
  }

  if (selectedSpans.length === 1 && isSelectionCollapsed(snapshot)) {
    if (snapshot.context.selection.focus.offset === 0) {
      return []
    }
    if (
      snapshot.context.selection.focus.offset === focusSpan.node.text.length
    ) {
      return []
    }
  }

  const selectionMarkDefs = selectedBlocks.flatMap((block) =>
    isPortableTextTextBlock(block.node) ? (block.node.markDefs ?? []) : [],
  )

  return selectionMarkDefs.filter((markDef) =>
    selectedSpans.some((span) => span.node.marks?.includes(markDef._key)),
  )
}
