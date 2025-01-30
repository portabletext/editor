import {isPortableTextTextBlock, type PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedSpans} from './selector.get-selected-spans'
import {getSelectedBlocks} from './selectors'

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

  if (selectedSpans.length === 0) {
    return []
  }

  const selectionMarkDefs = selectedBlocks.flatMap((block) =>
    isPortableTextTextBlock(block.node) ? (block.node.markDefs ?? []) : [],
  )

  return selectionMarkDefs.filter((markDef) =>
    selectedSpans.some((span) => span.node.marks?.includes(markDef._key)),
  )
}
