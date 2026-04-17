import {isEqualMarks} from '../internal-utils/equality'
import {getNextSpan} from '../selectors'
import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getMarkState} from '../selectors/selector.get-mark-state'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreInsertBehaviors = [
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot}) => {
      const focusSpan = getFocusSpan(snapshot)

      if (!focusSpan) {
        return false
      }

      const markState = getMarkState(snapshot)
      const activeDecorators = getActiveDecorators(snapshot)
      const activeAnnotations = getActiveAnnotationsMarks(snapshot)

      if (markState && markState.state === 'unchanged') {
        const markStateDecorators = (markState.marks ?? []).filter((mark) =>
          snapshot.context.schema.decorators
            .map((decorator) => decorator.name)
            .includes(mark),
        )

        if (
          markStateDecorators.length === activeDecorators.length &&
          markStateDecorators.every((mark) => activeDecorators.includes(mark))
        ) {
          return false
        }
      }

      const activeMarks = [...activeDecorators, ...activeAnnotations]

      if (isEqualMarks(focusSpan.node.marks ?? [], activeMarks)) {
        return false
      }

      const atEndOfFocusSpan =
        snapshot.context.selection?.focus.offset === focusSpan.node.text.length

      const nextSpan = atEndOfFocusSpan ? getNextSpan(snapshot) : undefined

      return {activeMarks, nextSpan}
    },
    actions: [
      ({snapshot, event}, {activeMarks, nextSpan}) => {
        if (nextSpan && isEqualMarks(nextSpan.node.marks, activeMarks)) {
          return [
            raise({
              type: 'select',
              at: {
                anchor: {
                  path: nextSpan.path,
                  offset: 0,
                },
                focus: {
                  path: nextSpan.path,
                  offset: 0,
                },
              },
            }),
            raise(event),
          ]
        }

        return [
          raise({
            type: 'insert.child',
            child: {
              _type: snapshot.context.schema.span.name,
              text: event.text,
              marks: activeMarks,
            },
          }),
        ]
      },
    ],
  }),
]
