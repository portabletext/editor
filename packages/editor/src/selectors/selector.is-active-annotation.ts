import {isTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getActiveAnnotationsMarks} from './selector.get-active-annotation-marks'
import {getSelectedBlocks} from './selector.get-selected-blocks'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * Check whether an annotation is active in the given `snapshot`.
 *
 * @public
 */
export function isActiveAnnotation(
  annotation: string,
  options?: {
    /**
     * Choose whether the annotation has to take up the entire selection in the
     * `snapshot` or if the annotation can be partially selected.
     *
     * Defaults to 'full'
     */
    mode?: 'partial' | 'full'
  },
): EditorSelector<boolean> {
  return (snapshot) => {
    const mode = options?.mode ?? 'full'

    if (mode === 'partial') {
      const selectedValue = getSelectedValue(snapshot)

      const selectionMarkDefs = selectedValue.flatMap((block) =>
        isTextBlock(snapshot.context, block) ? (block.markDefs ?? []) : [],
      )

      return selectionMarkDefs.some((markDef) => markDef._type === annotation)
    }

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
        activeAnnotations.includes(markDef._key),
    )

    return activeMarkDefs.length > 0
  }
}
