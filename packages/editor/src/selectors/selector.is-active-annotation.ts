import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getActiveAnnotationsMarks} from './selector.get-active-annotation-marks'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'
import {getSelectedValue} from './selector.get-selected-value'
import {isSelectionExpanded} from './selector.is-selection-expanded'

/**
 * Check whether an annotation is active in the given `snapshot`.
 *
 * @public
 */
export function isActiveAnnotation(
  annotation: string,
  options?: {
    /**
     * Choose whether the annotation has to cover the entire selection
     * (`'full'`) or whether the selection covering at least one character
     * of the annotation suffices (`'partial'`). With a collapsed
     * selection the modes agree: the annotation is active when the caret
     * sits inside it, not at its edges.
     *
     * Defaults to `'full'`
     */
    mode?: 'partial' | 'full'
  },
): EditorSelector<boolean> {
  return (snapshot) => {
    const mode = options?.mode ?? 'full'

    if (mode === 'partial' && isSelectionExpanded(snapshot)) {
      // An expanded selection "partially selects" the annotation when it
      // covers at least one character of annotated text.
      const selectedValue = getSelectedValue(snapshot)

      return selectedValue.some((block) => {
        if (!isTextBlock(snapshot.context, block)) {
          return false
        }

        const annotationKeys = new Set(
          (block.markDefs ?? [])
            .filter((markDef) => markDef._type === annotation)
            .map((markDef) => markDef._key),
        )

        if (annotationKeys.size === 0) {
          return false
        }

        return block.children.some(
          (child) =>
            isSpan(snapshot.context, child) &&
            // Spans the selection only touches at a zero-width boundary
            // survive the slice with empty text and intact `marks`,
            // keeping their definitions alive through the slice's
            // unused-definition pruning. A boundary touch selects nothing
            // of the annotation, so those spans don't count.
            child.text.length > 0 &&
            child.marks?.some((mark) => annotationKeys.has(mark)),
        )
      })
    }

    // `'partial'` with a collapsed selection falls through to here: a
    // caret covers no characters, so the `'partial'`/`'full'` distinction
    // is meaningless and both modes share the canonical caret answer this
    // computes (active inside an annotated span, not at its edges, where
    // typing doesn't extend the annotation either).
    const selectedBlocks = getSelectedTextBlocks(snapshot)
    const selectionMarkDefs = selectedBlocks.flatMap(
      (block) => block.node.markDefs ?? [],
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
