import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedBlocks} from './selectors'

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
    const activeMarkDefs = selectionMarkDefs.filter(
      (markDef) =>
        markDef._type === annotation &&
        snapshot.beta.activeAnnotations.includes(markDef._key),
    )

    return activeMarkDefs.length > 0
  }
}
