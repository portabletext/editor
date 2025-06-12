import {Range} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import {getSelectedSpans} from '../selectors'
import type {PortableTextSlateEditor} from '../types/editor'
import {getNextSpan, getPreviousSpan} from './sibling-utils'
import {getFocusBlock, getFocusSpan, slateRangeToSelection} from './slate-utils'

export type MarkState = {
  state: 'changed' | 'unchanged'
  marks: Array<string>
}

/**
 * Given that text is inserted at the current position, what marks should
 * be applied?
 */
export function getMarkState({
  schema,
  editor,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
}): MarkState | undefined {
  if (!editor.selection) {
    return undefined
  }

  const [block, blockPath] = getFocusBlock({
    editor,
  })
  const [span, spanPath] = getFocusSpan({
    editor,
  })

  if (!block || !editor.isTextBlock(block) || !span) {
    return undefined
  }

  if (Range.isExpanded(editor.selection)) {
    const selection = editor.selection
      ? slateRangeToSelection({
          schema,
          editor,
          range: editor.selection,
        })
      : null

    const selectedSpans = getSelectedSpans({
      context: {
        value: editor.value,
        selection,
        schema,
        converters: [],
        keyGenerator: () => '',
        readOnly: false,
      },
      beta: {
        activeAnnotations: [],
        activeDecorators: [],
      },
    })

    let index = 0
    let marks: Array<string> = []

    for (const span of selectedSpans) {
      if (index === 0) {
        marks = span.node.marks ?? []
      } else {
        if (
          span.node.marks?.length === 0 ||
          (span.node.marks ?? [])?.some((mark) => !marks.includes(mark))
        ) {
          marks = []
        }
      }

      index++
    }

    return {
      state: 'unchanged',
      marks,
    }
  }

  const decorators = schema.decorators.map((decorator) => decorator.name)
  const marks = span.marks ?? []
  const marksWithoutAnnotations = marks.filter((mark) =>
    decorators.includes(mark),
  )

  const spanHasAnnotations = marks.length > marksWithoutAnnotations.length

  const spanIsEmpty = span.text.length === 0

  const atTheBeginningOfSpan = editor.selection.anchor.offset === 0
  const atTheEndOfSpan = editor.selection.anchor.offset === span.text.length

  const previousSpan = getPreviousSpan({editor, blockPath, spanPath})
  const nextSpan = getNextSpan({editor, blockPath, spanPath})
  const nextSpanAnnotations =
    nextSpan?.marks?.filter((mark) => !decorators.includes(mark)) ?? []
  const spanAnnotations = marks.filter((mark) => !decorators.includes(mark))

  const previousSpanHasAnnotations = previousSpan
    ? previousSpan.marks?.some((mark) => !decorators.includes(mark))
    : false
  const previousSpanHasSameAnnotations = previousSpan
    ? previousSpan.marks
        ?.filter((mark) => !decorators.includes(mark))
        .every((mark) => marks.includes(mark))
    : false
  const previousSpanHasSameAnnotation = previousSpan
    ? previousSpan.marks?.some(
        (mark) => !decorators.includes(mark) && marks.includes(mark),
      )
    : false

  const previousSpanHasSameMarks = previousSpan
    ? previousSpan.marks?.every((mark) => marks.includes(mark))
    : false
  const nextSpanSharesSomeAnnotations = spanAnnotations.some((mark) =>
    nextSpanAnnotations?.includes(mark),
  )

  if (spanHasAnnotations && !spanIsEmpty) {
    if (atTheBeginningOfSpan) {
      if (previousSpanHasSameMarks) {
        return {
          state: 'changed',
          marks: previousSpan?.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotations) {
        return {
          state: 'changed',
          marks: previousSpan?.marks ?? [],
        }
      } else if (previousSpanHasSameAnnotation) {
        return {
          state: 'unchanged',
          marks: span.marks ?? [],
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
          marks: nextSpan?.marks ?? [],
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
        marks: (previousSpan?.marks ?? []).filter((mark) =>
          decorators.includes(mark),
        ),
      }
    }
  }

  return {
    state: 'unchanged',
    marks: span.marks ?? [],
  }
}
