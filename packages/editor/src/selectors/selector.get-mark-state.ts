import type {EditorSelector} from '../editor/editor-selector'
import {isBlockPath} from '../types/paths'
import {blockOffsetToSpanSelectionPoint} from '../utils'
import {isSelectionExpanded} from '../utils/util.is-selection-expanded'
import {getFocusSpan} from './selector.get-focus-span'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getNextSpan} from './selector.get-next-span'
import {getPreviousSpan} from './selector.get-previous-span'
import {getSelectedSpans} from './selector.get-selected-spans'

/**
 * @beta
 */
export type MarkState =
  | {
      state: 'unchanged'
      marks: Array<string>
    }
  | {
      state: 'changed'
      marks: Array<string>
      previousMarks: Array<string>
    }

/**
 * Given that text is inserted at the current position, what marks should
 * be applied?
 * @beta
 */
export const getMarkState: EditorSelector<MarkState | undefined> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  let selection = snapshot.context.selection
  const focusTextBlock = getFocusTextBlock(snapshot)

  if (!focusTextBlock) {
    return undefined
  }

  if (isBlockPath(selection.anchor.path)) {
    const spanSelectionPoint = blockOffsetToSpanSelectionPoint({
      context: snapshot.context,
      blockOffset: {
        path: selection.anchor.path,
        offset: selection.anchor.offset,
      },
      direction: selection.backward ? 'backward' : 'forward',
    })

    selection = spanSelectionPoint
      ? {
          ...selection,
          anchor: spanSelectionPoint,
        }
      : selection
  }

  if (isBlockPath(selection.focus.path)) {
    const spanSelectionPoint = blockOffsetToSpanSelectionPoint({
      context: snapshot.context,
      blockOffset: {
        path: selection.focus.path,
        offset: selection.focus.offset,
      },
      direction: selection.backward ? 'backward' : 'forward',
    })

    selection = spanSelectionPoint
      ? {
          ...selection,
          focus: spanSelectionPoint,
        }
      : selection
  }

  const focusSpan = getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })

  if (!focusSpan) {
    return undefined
  }

  if (isSelectionExpanded(selection)) {
    const selectedSpans = getSelectedSpans({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })

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

  const previousSpan = getPreviousSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })
  const nextSpan = getNextSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })
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
          previousMarks: marks,
          marks: previousSpan?.node.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotations) {
        return {
          state: 'changed',
          previousMarks: marks,
          marks: previousSpan?.node.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotation) {
        return {
          state: 'unchanged',
          previousMarks: marks,
          marks: focusSpan.node.marks ?? [],
        }
      } else if (!previousSpan) {
        return {
          state: 'changed',
          previousMarks: marks,
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
          previousMarks: marks,
          marks: nextSpan?.node.marks ?? [],
        }
      }

      if (!nextSpan) {
        return {
          state: 'changed',
          previousMarks: marks,
          marks: [],
        }
      }
    }
  }

  if (atTheBeginningOfSpan && !spanIsEmpty && !!previousSpan) {
    if (previousSpanHasAnnotations) {
      return {
        state: 'changed',
        previousMarks: previousSpan.node.marks ?? [],
        marks: [],
      }
    } else {
      return {
        state: 'changed',
        previousMarks: marks,
        marks: (previousSpan?.node.marks ?? []).filter((mark) =>
          decorators.includes(mark),
        ),
      }
    }
  }

  return {
    state: 'unchanged',
    marks,
  }
}
