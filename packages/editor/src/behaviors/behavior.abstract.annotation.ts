import {isActiveAnnotation} from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) =>
      isActiveAnnotation(event.annotation.name)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'annotation.remove', annotation: event.annotation}),
      ],
    ],
  }),
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) =>
      !isActiveAnnotation(event.annotation.name)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'annotation.add', annotation: event.annotation}),
      ],
    ],
  }),
]
