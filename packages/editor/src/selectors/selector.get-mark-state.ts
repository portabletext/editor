import type {EditorSelector} from '../editor/editor-selector'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {isBlockPath} from '../types/paths'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isSelectionExpanded} from '../utils/util.is-selection-expanded'
import {getFocusSpan} from './selector.get-focus-span'
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

    // Per-span info: marks present, the decorator names declared by the
    // span's block sub-schema, and the annotation markDef keys declared on
    // the span's enclosing block. Used so that out-of-scope spans (where
    // the mark cannot apply) don't disqualify the mark across the
    // selection.
    const spanInfo = selectedSpans.map((span) => {
      const block = getAncestorTextBlock(snapshot.context, span.path)
      return {
        marks: span.node.marks ?? [],
        decoratorNames: getBlockSubSchema(
          snapshot.context,
          span.path,
        ).decorators.map((decorator) => decorator.name),
        markDefKeys: (block?.node.markDefs ?? []).map(
          (markDef) => markDef._key,
        ),
      }
    })

    // Candidate marks: union of all marks present on any selected span.
    const candidateMarks = new Set<string>()
    for (const {marks: spanMarks} of spanInfo) {
      for (const mark of spanMarks) {
        candidateMarks.add(mark)
      }
    }

    const marks: Array<string> = []
    for (const candidate of candidateMarks) {
      const isDecoratorSomewhere = spanInfo.some(({decoratorNames}) =>
        decoratorNames.includes(candidate),
      )
      let active = true
      for (const {marks: spanMarks, decoratorNames, markDefKeys} of spanInfo) {
        const inScope = isDecoratorSomewhere
          ? decoratorNames.includes(candidate)
          : markDefKeys.includes(candidate)
        if (!inScope) {
          continue
        }
        if (!spanMarks.includes(candidate)) {
          active = false
          break
        }
      }
      if (active) {
        marks.push(candidate)
      }
    }

    return {
      state: 'unchanged',
      marks,
    }
  }

  const focusSubSchema = getBlockSubSchema(snapshot.context, focusSpan.path)
  const decorators = focusSubSchema.decorators.map(
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
      if (!nextSpan) {
        return {
          state: 'changed',
          previousMarks: marks,
          marks: [],
        }
      }

      if (nextSpanAnnotations.length > 0 && !nextSpanSharesSomeAnnotations) {
        return {
          state: 'changed',
          previousMarks: marks,
          marks: [],
        }
      }

      if (
        (nextSpanSharesSomeAnnotations &&
          nextSpanAnnotations.length < spanAnnotations.length) ||
        !nextSpanSharesSomeAnnotations
      ) {
        return {
          state: 'changed',
          previousMarks: marks,
          marks: nextSpan?.node.marks ?? [],
        }
      }
    }
  }

  if (atTheBeginningOfSpan && !spanIsEmpty && !!previousSpan) {
    if (previousSpanHasAnnotations) {
      return {
        state: 'changed',
        marks,
        previousMarks: previousSpan?.node.marks ?? [],
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
