import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getMarkState} from '../selectors/selector.get-mark-state'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreInsertBehaviors = [
  /**
   * When the user has toggled pending marks (decorators/annotations), convert
   * `insert.text` to `insert.child` with those marks applied.
   *
   * Skipped when `at` is provided because pending marks are relative to the
   * current selection, not the `at` target. The inserted text will inherit
   * marks from the surrounding context at the `at` location instead.
   */
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      if (event.at) {
        return false
      }

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

      return {activeDecorators, activeAnnotations}
    },
    actions: [
      ({snapshot, event}, {activeDecorators, activeAnnotations}) => [
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: event.text,
            marks: [...activeDecorators, ...activeAnnotations],
          },
        }),
      ],
    ],
  }),
]
