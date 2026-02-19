import {isSpan} from '@portabletext/schema'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getCaretWordSelection} from '../selectors/selector.get-caret-word-selection'
import {getNextSpan} from '../selectors/selector.get-next-span'
import {getPreviousSpan} from '../selectors/selector.get-previous-span'
import {getSelectionEndChild} from '../selectors/selector.get-selection-end-child'
import {getSelectionEndPoint} from '../selectors/selector.get-selection-end-point'
import {getSelectionStartChild} from '../selectors/selector.get-selection-start-child'
import {getSelectionStartPoint} from '../selectors/selector.get-selection-start-point'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const addAnnotationOnCollapsedSelection = defineBehavior({
  name: 'addAnnotationOnCollapsedSelection',
  on: 'annotation.add',
  guard: ({snapshot, event}) => {
    const at = event.at ?? snapshot.context.selection

    if (!at) {
      return false
    }

    const adjustedSnapshot = {
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: at,
      },
    }

    if (!isSelectionCollapsed(adjustedSnapshot)) {
      return false
    }

    const caretWordSelection = getCaretWordSelection(adjustedSnapshot)

    if (
      !caretWordSelection ||
      !isSelectionExpanded({
        ...adjustedSnapshot,
        context: {
          ...adjustedSnapshot.context,
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
  name: 'preventOverlappingAnnotations',
  // Given an `annotation.add` event
  on: 'annotation.add',
  // When the annotation is active in the selection
  guard: ({snapshot, event}) => {
    const at = event.at ?? snapshot.context.selection

    if (!at) {
      return false
    }

    const adjustedSnapshot = {
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: at,
      },
    }

    return isActiveAnnotation(event.annotation.name, {mode: 'partial'})(
      adjustedSnapshot,
    )
  },
  // Then the existing annotation is removed
  actions: [
    ({event}) => [
      raise({
        type: 'annotation.remove',
        annotation: event.annotation,
        at: event.at,
      }),
      raise(event),
    ],
  ],
})

/**
 * When deleting all text from an annotated span where adjacent spans don't
 * share the same annotation, strip the annotations from the span to prevent
 * them from being preserved upon writing again.
 */
const stripAnnotationsOnFullSpanDeletion = defineBehavior({
  name: 'stripAnnotationsOnFullSpanDeletion',
  on: 'delete',
  guard: ({snapshot, event}) => {
    const effectiveSnapshot = {
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.at ?? snapshot.context.selection,
      },
    }

    if (!isSelectionExpanded(effectiveSnapshot)) {
      return false
    }

    const startChild = getSelectionStartChild(effectiveSnapshot)
    const startPoint = getSelectionStartPoint(effectiveSnapshot)
    const endChild = getSelectionEndChild(effectiveSnapshot)
    const endPoint = getSelectionEndPoint(effectiveSnapshot)

    if (!startChild || !endChild || !startPoint || !endPoint) {
      return false
    }

    if (startChild.path[2]._key !== endChild.path[2]._key) {
      return false
    }

    if (!isSpan(snapshot.context, startChild.node)) {
      return false
    }

    const deletingAllText =
      startPoint.offset === 0 && endPoint.offset === startChild.node.text.length

    if (!deletingAllText) {
      return false
    }

    const decorators = snapshot.context.schema.decorators.map(
      (decorator) => decorator.name,
    )
    const marks = startChild.node.marks ?? []
    const spanHasAnnotations = marks.some((mark) => !decorators.includes(mark))

    if (!spanHasAnnotations) {
      return false
    }

    const previousSpan = getPreviousSpan(effectiveSnapshot)
    const nextSpan = getNextSpan(effectiveSnapshot)
    const previousSpanHasSameAnnotation = previousSpan
      ? previousSpan.node.marks?.some(
          (mark) => !decorators.includes(mark) && marks.includes(mark),
        )
      : false
    const nextSpanHasSameAnnotation = nextSpan
      ? nextSpan.node.marks?.some(
          (mark) => !decorators.includes(mark) && marks.includes(mark),
        )
      : false

    if (previousSpanHasSameAnnotation || nextSpanHasSameAnnotation) {
      return false
    }

    const activeDecorators = getActiveDecorators(effectiveSnapshot)

    return {
      spanPath: startChild.path,
      activeDecorators,
    }
  },
  actions: [
    ({event}, {spanPath, activeDecorators}) => [
      raise({
        type: 'child.set',
        at: spanPath,
        props: {marks: activeDecorators},
      }),
      forward(event),
    ],
  ],
})

export const coreAnnotationBehaviors = [
  addAnnotationOnCollapsedSelection,
  preventOverlappingAnnotations,
  stripAnnotationsOnFullSpanDeletion,
]
