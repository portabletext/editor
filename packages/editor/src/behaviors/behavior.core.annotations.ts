import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

const toggleAnnotationOff = defineBehavior({
  on: 'annotation.toggle',
  guard: ({context, event}) =>
    selectors.isActiveAnnotation(event.annotation.name)({context}),
  actions: [
    ({event}) => [
      raise({type: 'annotation.remove', annotation: event.annotation}),
    ],
  ],
})

const toggleAnnotationOn = defineBehavior({
  on: 'annotation.toggle',
  guard: ({context, event}) =>
    !selectors.isActiveAnnotation(event.annotation.name)({context}),
  actions: [
    ({event}) => [
      raise({type: 'annotation.add', annotation: event.annotation}),
    ],
  ],
})

const addAnnotationOnCollapsedSelection = defineBehavior({
  on: 'annotation.add',
  guard: ({context}) => {
    if (!selectors.isSelectionCollapsed({context})) {
      return false
    }

    const caretWordSelection = selectors.getCaretWordSelection({context})

    if (
      !caretWordSelection ||
      !selectors.isSelectionExpanded({
        context: {
          ...context,
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
  toggleAnnotationOff,
  toggleAnnotationOn,
  addAnnotationOnCollapsedSelection,
}
