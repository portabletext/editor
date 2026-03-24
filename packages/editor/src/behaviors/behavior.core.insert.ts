import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getNextSpan} from '../selectors/selector.get-next-span'
import {getPreviousSpan} from '../selectors/selector.get-previous-span'
import {forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreInsertBehaviors = [
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot}) => {
      const focusSpan = getFocusSpan(snapshot)

      if (!focusSpan) {
        return false
      }

      const activeDecorators = getActiveDecorators(snapshot)
      const activeAnnotations = getActiveAnnotationsMarks(snapshot)
      const activeMarks = [...activeDecorators, ...activeAnnotations]
      const focusMarks = focusSpan.node.marks ?? []

      if (
        activeMarks.length === focusMarks.length &&
        activeMarks.every((mark) => focusMarks.includes(mark))
      ) {
        return false
      }

      const selection = snapshot.context.selection

      if (selection) {
        const offset = selection.focus.offset
        const atStart = offset === 0
        const atEnd = offset === focusSpan.node.text.length

        if (atEnd) {
          const nextSpan = getNextSpan(snapshot)

          if (nextSpan) {
            const nextMarks = nextSpan.node.marks ?? []

            if (
              activeMarks.length === nextMarks.length &&
              activeMarks.every((mark) => nextMarks.includes(mark))
            ) {
              return {
                type: 'move' as const,
                targetSpanKey: nextSpan.node._key,
                targetOffset: 0,
              }
            }
          }
        }

        if (atStart) {
          const previousSpan = getPreviousSpan(snapshot)

          if (previousSpan) {
            const prevMarks = previousSpan.node.marks ?? []

            if (
              activeMarks.length === prevMarks.length &&
              activeMarks.every((mark) => prevMarks.includes(mark))
            ) {
              return {
                type: 'move' as const,
                targetSpanKey: previousSpan.node._key,
                targetOffset: previousSpan.node.text.length,
              }
            }
          }
        }
      }

      return {type: 'insert' as const, activeDecorators, activeAnnotations}
    },
    actions: [
      ({snapshot, event}, guardResponse) => {
        if (guardResponse.type === 'move') {
          const {targetSpanKey, targetOffset} = guardResponse
          const blockPath = snapshot.context.selection!.focus.path.slice(0, 1)

          return [
            raise({
              type: 'select',
              at: {
                anchor: {
                  path: [...blockPath, 'children', {_key: targetSpanKey}],
                  offset: targetOffset,
                },
                focus: {
                  path: [...blockPath, 'children', {_key: targetSpanKey}],
                  offset: targetOffset,
                },
                backward: false,
              },
            }),
            forward(event),
          ]
        }

        const {activeDecorators, activeAnnotations} = guardResponse

        return [
          raise({
            type: 'insert.child',
            child: {
              _type: snapshot.context.schema.span.name,
              text: event.text,
              marks: [...activeDecorators, ...activeAnnotations],
            },
          }),
        ]
      },
    ],
  }),
]
