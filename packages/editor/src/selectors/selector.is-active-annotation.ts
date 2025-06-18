import type {EditorSelector} from '../editor/editor-selector'
import {getActiveAnnotations} from '../editor/get-active-annotations'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export function isActiveAnnotation(
  annotation: string,
): EditorSelector<boolean> {
  return (snapshot) => {
    const selectedBlocks = getSelectedBlocks(snapshot)
    const selectionMarkDefs = selectedBlocks.flatMap((block) =>
      isTextBlock(snapshot.context, block.node)
        ? (block.node.markDefs ?? [])
        : [],
    )
    const activeAnnotations = getActiveAnnotations(snapshot)
    const activeMarkDefs = selectionMarkDefs.filter(
      (markDef) =>
        markDef._type === annotation &&
        activeAnnotations.includes(markDef._key),
    )

    return activeMarkDefs.length > 0
  }
}
