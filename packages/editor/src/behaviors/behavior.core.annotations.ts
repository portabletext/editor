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

export const coreAnnotationBehaviors = {
  toggleAnnotationOff,
  toggleAnnotationOn,
}
