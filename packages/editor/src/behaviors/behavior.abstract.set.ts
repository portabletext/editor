import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSetBehaviors = [
  defineBehavior({
    on: 'block.set',
    actions: [
      ({event}) => [
        raise({
          type: 'set',
          at: event.at,
          value: event.props,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'child.set',
    actions: [
      ({event}) => [
        raise({
          type: 'set',
          at: event.at,
          value: event.props,
        }),
      ],
    ],
  }),
]
