import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

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
      raise({type: 'select', selection: caretWordSelection}),
      raise({type: 'annotation.add', annotation: event.annotation}),
    ],
  ],
})

export const coreAnnotationBehaviors = {
  addAnnotationOnCollapsedSelection,
}
