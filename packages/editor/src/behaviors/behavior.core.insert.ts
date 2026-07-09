import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getMarkState} from '../selectors/selector.get-mark-state'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
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
      const focusSubSchema = getPathSubSchema(snapshot, focusSpan.path)
      const decoratorNames = focusSubSchema.decorators.map(
        (decorator) => decorator.name,
      )

      if (markState && markState.state === 'unchanged') {
        const markStateDecorators = (markState.marks ?? []).filter((mark) =>
          decoratorNames.includes(mark),
        )

        if (
          markStateDecorators.length === activeDecorators.length &&
          markStateDecorators.every((mark) => activeDecorators.includes(mark))
        ) {
          return false
        }
      }

      // Marks that are neither declared decorators nor annotations are marks
      // the schema cannot resolve. They get decorator semantics, so they
      // carry over onto the inserted text. Declared decorators are excluded
      // by name, not by active state: a toggled-off decorator must not ride
      // along.
      const unknownMarks = (markState?.marks ?? []).filter(
        (mark) =>
          !decoratorNames.includes(mark) && !activeAnnotations.includes(mark),
      )

      return {activeDecorators, activeAnnotations, unknownMarks}
    },
    actions: [
      (
        {snapshot, event},
        {activeDecorators, activeAnnotations, unknownMarks},
      ) => [
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: event.text,
            marks: [...activeDecorators, ...activeAnnotations, ...unknownMarks],
          },
        }),
      ],
    ],
  }),
]
