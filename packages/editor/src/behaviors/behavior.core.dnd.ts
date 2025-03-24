import * as selectors from '../selectors'
import {defineBehavior} from './behavior.types.behavior'

export const coreDndBehaviors = [
  /**
   * When dragging over the drag origin, we don't want to show the caret in the
   * text.
   */
  defineBehavior({
    on: 'drag.dragover',
    guard: ({snapshot, event}) => {
      const dragOrigin = snapshot.beta.internalDrag?.origin
      const draggingOverDragOrigin = dragOrigin
        ? selectors.isOverlappingSelection(event.position.selection)({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragOrigin.selection,
            },
          })
        : false

      return draggingOverDragOrigin
    },
    actions: [() => [{type: 'noop'}]],
  }),
]
