import {isTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getActiveAnnotationsMarks} from './selector.get-active-annotation-marks'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export function isActiveAnnotation(
  annotation: string,
  options?: {
    /**
     * By default, annotations of the same type are considered mutually
     * exclusive.
     */
    mutuallyExclusive?: ReadonlyArray<string>
  },
): EditorSelector<boolean> {
  return (snapshot) => {
    const mutuallyExclusive = options?.mutuallyExclusive ?? [annotation]
    const selectedBlocks = getSelectedBlocks(snapshot)
    const selectionMarkDefs = selectedBlocks.flatMap((block) =>
      isTextBlock(snapshot.context, block.node)
        ? (block.node.markDefs ?? [])
        : [],
    )
    const activeAnnotations = getActiveAnnotationsMarks(snapshot)
    const activeMarkDefs = selectionMarkDefs.filter(
      (markDef) =>
        markDef._type === annotation &&
        activeAnnotations.includes(markDef._key) &&
        !mutuallyExclusive.includes(markDef._type),
    )

    return activeMarkDefs.length > 0
  }
}
