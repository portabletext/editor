import {getCaretWordSelection} from '../selectors/selector.get-caret-word-selection'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const addAnnotationOnCollapsedSelection = defineBehavior({
  on: 'annotation.add',
  guard: ({snapshot}) => {
    if (!isSelectionCollapsed(snapshot)) {
      return false
    }

    const caretWordSelection = getCaretWordSelection(snapshot)

    if (
      !caretWordSelection ||
      !isSelectionExpanded({
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

/**
 * By default, same-type annotations can overlap. This Core Behavior ensures
 * that annotations of the same type are mutually exclusive.
 */
const preventOverlappingAnnotations = defineBehavior({
  // Given an `annotation.add` event
  on: 'annotation.add',
  // When the annotation is active in the selection
  guard: ({snapshot, event}) =>
    isActiveAnnotation(event.annotation.name, {mode: 'partial'})(snapshot),
  // Then the existing annotation is removed
  actions: [
    ({event}) => [
      raise({type: 'annotation.remove', annotation: event.annotation}),
      raise(event),
    ],
  ],
})

export const coreAnnotationBehaviors = [
  addAnnotationOnCollapsedSelection,
  preventOverlappingAnnotations,
]
