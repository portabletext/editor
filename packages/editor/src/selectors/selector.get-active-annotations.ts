import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getMarkState} from './selector.get-mark-state'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * @public
 */
export const getActiveAnnotations: EditorSelector<Array<PortableTextObject>> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks = getSelectedTextBlocks(snapshot)
  const markState = getMarkState(snapshot)

  const activeAnnotations = (markState?.marks ?? []).filter(
    (mark) =>
      !snapshot.context.schema.decorators
        .map((decorator) => decorator.name)
        .includes(mark),
  )

  const selectionMarkDefs = selectedBlocks.flatMap(
    (block) => block.node.markDefs ?? [],
  )

  return selectionMarkDefs.filter((markDef) =>
    activeAnnotations.includes(markDef._key),
  )
}
