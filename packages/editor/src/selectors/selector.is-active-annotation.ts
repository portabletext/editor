import {isPortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedSpans} from './selector.get-selected-spans'
import {isSelectionExpanded} from './selector.is-selection-expanded'
import {getFocusSpan, getSelectedBlocks} from './selectors'

/**
 * @public
 */
export function isActiveAnnotation(
  annotation: string,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection) {
      return false
    }

    const selectedBlocks = getSelectedBlocks(snapshot)
    const focusSpan = getFocusSpan(snapshot)

    const selectedSpans = isSelectionExpanded(snapshot)
      ? getSelectedSpans(snapshot)
      : focusSpan
        ? [focusSpan]
        : []

    if (selectedSpans.length === 0) {
      return false
    }

    if (
      selectedSpans.some(
        (span) => !span.node.marks || span.node.marks?.length === 0,
      )
    ) {
      return false
    }

    const selectionMarkDefs = selectedBlocks.flatMap((block) =>
      isPortableTextTextBlock(block.node) ? (block.node.markDefs ?? []) : [],
    )

    return selectedSpans.every((span) => {
      const spanMarkDefs =
        span.node.marks?.flatMap((mark) => {
          const markDef = selectionMarkDefs.find(
            (markDef) => markDef._key === mark,
          )

          return markDef ? [markDef._type] : []
        }) ?? []

      return spanMarkDefs.includes(annotation)
    })
  }
}
