import * as selectors from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const addAnnotationOnCollapsedSelection = defineBehavior({
  on: 'annotation.add',
  guard: ({snapshot}) => {
    if (!selectors.isSelectionCollapsed(snapshot)) {
      return false
    }

    const caretWordSelection = selectors.getCaretWordSelection(snapshot)

    if (
      !caretWordSelection ||
      !selectors.isSelectionExpanded({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: caretWordSelection,
        },
      })
    ) {
      return false
    }

    return {caretWordSelection}
  },
  actions: [
    ({event}, {caretWordSelection}) => [
      raise({type: 'select', at: caretWordSelection}),
      raise({type: 'annotation.add', annotation: event.annotation}),
    ],
  ],
})

export const coreAnnotationBehaviors = {
  addAnnotationOnCollapsedSelection,
}
