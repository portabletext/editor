import type {PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getMarkState} from './selector.get-mark-state'
import {getSelectedBlocks} from './selector.get-selected-blocks'

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
  const markState = getMarkState(snapshot)

  const activeAnnotations = (markState?.marks ?? []).filter(
    (mark) =>
      !snapshot.context.schema.decorators
        .map((decorator) => decorator.name)
        .includes(mark),
  )

  const selectionMarkDefs = selectedBlocks.flatMap((block) =>
    isTextBlock(snapshot.context, block.node)
      ? (block.node.markDefs ?? [])
      : [],
  )

  return selectionMarkDefs.filter((markDef) =>
    activeAnnotations.includes(markDef._key),
  )
}
