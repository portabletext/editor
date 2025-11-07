import {isActiveDecorator} from '../selectors/selector.is-active-decorator'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDecoratorBehaviors = [
  defineBehavior({
    on: 'decorator.toggle',
    guard: ({snapshot, event}) => isActiveDecorator(event.decorator)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'decorator.remove', decorator: event.decorator}),
      ],
    ],
  }),
  defineBehavior({
    on: 'decorator.toggle',
    guard: ({snapshot, event}) => {
      if (event.at) {
        return !isActiveDecorator(event.decorator)({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: event.at,
          },
        })
      }

      return !isActiveDecorator(event.decorator)(snapshot)
    },
    actions: [
      ({event}) => [
        raise({
          ...event,
          type: 'decorator.add',
        }),
      ],
    ],
  }),
]
