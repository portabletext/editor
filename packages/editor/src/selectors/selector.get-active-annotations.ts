import type {PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getFocusSpan} from './selector.get-focus-span'
import {getSelectedBlocks} from './selector.get-selected-blocks'
import {getSelectedSpans} from './selector.get-selected-spans'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

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

  const activeAnnotations = snapshot.beta.activeAnnotations
  const selectionMarkDefs = selectedBlocks.flatMap((block) =>
    isTextBlock(snapshot.context, block.node)
      ? (block.node.markDefs ?? [])
      : [],
  )

  return selectionMarkDefs.filter((markDef) =>
    activeAnnotations.includes(markDef._key),
  )
}
