import {defineBehaviour} from './editor-behaviour'

/**
 * Behaviour that makes sure you can insert non-annotated text at the edge of
 * annotations aka Snorre's favourite behaviour.
 */
export const nonStickyAnnotations = defineBehaviour({
  on: 'insert text',
  transitions: [
    {
      guard: ({context}) => {
        if (!context.selection) {
          return false
        }

        const selectionCollapsed =
          context.selection.anchor.path.join('') ===
            context.selection.focus.path.join('') &&
          context.selection.anchor.offset === context.selection.focus.offset
        const selectingSpan = context.focusSpan !== undefined
        const atTheStartOfSpan = context.selection?.focus.offset === 0
        const atTheEndOfSpan =
          context.selection?.focus.offset === context.focusSpan?.text.length
        const marks = context.focusSpan?.marks ?? []
        const marksWithoutAnnotations = marks.filter((mark) =>
          context.schema.decorators.includes(mark),
        )
        const spanHasAnnotations = marks.length > marksWithoutAnnotations.length

        return (
          selectionCollapsed &&
          selectingSpan &&
          (atTheStartOfSpan || atTheEndOfSpan) &&
          spanHasAnnotations
        )
      },
      actions: ({context, event}) => [
        {
          type: 'apply insert span',
          params: {
            text: event.text,
            marks:
              context.focusSpan?.marks?.filter((mark) =>
                context.schema.decorators.includes(mark),
              ) ?? [],
          },
        },
      ],
    },
    {
      actions: ({event}) => [
        {
          type: 'apply insert text',
          params: {text: event.text},
        },
      ],
    },
  ],
})
