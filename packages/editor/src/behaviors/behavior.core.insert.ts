import {isSpan} from '@portabletext/schema'
import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
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

        const focusBlock = getFocusTextBlock(snapshot)

        if (focusBlock) {
          const children = focusBlock.node.children
          const focusIndex = children.findIndex(
            (child) => child._key === focusSpan.node._key,
          )

          if (atEnd && focusIndex < children.length - 1) {
            const nextChild = children[focusIndex + 1]

            if (nextChild && isSpan(snapshot.context, nextChild)) {
              const nextMarks = nextChild.marks ?? []

              if (
                activeMarks.length === nextMarks.length &&
                activeMarks.every((mark) => nextMarks.includes(mark))
              ) {
                return {
                  type: 'move' as const,
                  targetSpanKey: nextChild._key,
                  targetOffset: 0,
                }
              }
            }
          }

          if (atStart && focusIndex > 0) {
            const prevChild = children[focusIndex - 1]

            if (prevChild && isSpan(snapshot.context, prevChild)) {
              const prevMarks = prevChild.marks ?? []

              if (
                activeMarks.length === prevMarks.length &&
                activeMarks.every((mark) => prevMarks.includes(mark))
              ) {
                return {
                  type: 'move' as const,
                  targetSpanKey: prevChild._key,
                  targetOffset: prevChild.text.length,
                }
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
