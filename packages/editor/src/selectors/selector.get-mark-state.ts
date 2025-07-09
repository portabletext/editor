import type {EditorSelector} from '../editor/editor-selector'
import {isSelectionExpanded} from '../utils/util.is-selection-expanded'
import {getFocusSpan} from './selector.get-focus-span'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getNextSpan} from './selector.get-next-span'
import {getPreviousSpan} from './selector.get-previous-span'
import {getSelectedSpans} from './selector.get-selected-spans'

export type MarkState = {
  state: 'changed' | 'unchanged'
  marks: Array<string>
}

/**
 * Given that text is inserted at the current position, what marks should
 * be applied?
 */
export const getMarkState: EditorSelector<MarkState | undefined> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const focusTextBlock = getFocusTextBlock(snapshot)
  const focusSpan = getFocusSpan(snapshot)

  if (!focusTextBlock || !focusSpan) {
    return undefined
  }

  if (isSelectionExpanded(snapshot.context.selection)) {
    const selectedSpans = getSelectedSpans(snapshot)

    let index = 0
    let marks: Array<string> = []

    for (const span of selectedSpans) {
      if (index === 0) {
        marks = span.node.marks ?? []
      } else {
        if (span.node.marks?.length === 0) {
          marks = []
          continue
        }

        marks = marks.filter((mark) =>
          (span.node.marks ?? []).some((spanMark) => spanMark === mark),
        )
      }

      index++
    }

    return {
      state: 'unchanged',
      marks,
    }
  }

  const decorators = snapshot.context.schema.decorators.map(
    (decorator) => decorator.name,
  )
  const marks = focusSpan.node.marks ?? []
  const marksWithoutAnnotations = marks.filter((mark) =>
    decorators.includes(mark),
  )

  const spanHasAnnotations = marks.length > marksWithoutAnnotations.length

  const spanIsEmpty = focusSpan.node.text.length === 0

  const atTheBeginningOfSpan = snapshot.context.selection.anchor.offset === 0
  const atTheEndOfSpan =
    snapshot.context.selection.anchor.offset === focusSpan.node.text.length

  const previousSpan = getPreviousSpan(snapshot)
  const nextSpan = getNextSpan(snapshot)
  const nextSpanAnnotations =
    nextSpan?.node?.marks?.filter((mark) => !decorators.includes(mark)) ?? []
  const spanAnnotations = marks.filter((mark) => !decorators.includes(mark))

  const previousSpanHasAnnotations = previousSpan
    ? previousSpan.node.marks?.some((mark) => !decorators.includes(mark))
    : false
  const previousSpanHasSameAnnotations = previousSpan
    ? previousSpan.node.marks
        ?.filter((mark) => !decorators.includes(mark))
        .every((mark) => marks.includes(mark))
    : false
  const previousSpanHasSameAnnotation = previousSpan
    ? previousSpan.node.marks?.some(
        (mark) => !decorators.includes(mark) && marks.includes(mark),
      )
    : false

  const previousSpanHasSameMarks = previousSpan
    ? previousSpan.node.marks?.every((mark) => marks.includes(mark))
    : false
  const nextSpanSharesSomeAnnotations = spanAnnotations.some((mark) =>
    nextSpanAnnotations?.includes(mark),
  )

  if (spanHasAnnotations && !spanIsEmpty) {
    if (atTheBeginningOfSpan) {
      if (previousSpanHasSameMarks) {
        return {
          state: 'changed',
          marks: previousSpan?.node.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotations) {
        return {
          state: 'changed',
          marks: previousSpan?.node.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotation) {
        return {
          state: 'unchanged',
          marks: focusSpan.node.marks ?? [],
        }
      } else if (!previousSpan) {
        return {
          state: 'changed',
          marks: [],
        }
      }
    }

    if (atTheEndOfSpan) {
      if (
        (nextSpan &&
          nextSpanSharesSomeAnnotations &&
          nextSpanAnnotations.length < spanAnnotations.length) ||
        !nextSpanSharesSomeAnnotations
      ) {
        return {
          state: 'changed',
          marks: nextSpan?.node.marks ?? [],
        }
      }

      if (!nextSpan) {
        return {
          state: 'changed',
          marks: [],
        }
      }
    }
  }

  if (atTheBeginningOfSpan && !spanIsEmpty && !!previousSpan) {
    if (previousSpanHasAnnotations) {
      return {
        state: 'changed',
        marks: [],
      }
    } else {
      return {
        state: 'changed',
        marks: (previousSpan?.node.marks ?? []).filter((mark) =>
          decorators.includes(mark),
        ),
      }
    }
  }

  return {
    state: 'unchanged',
    marks: focusSpan.node.marks ?? [],
  }
}
