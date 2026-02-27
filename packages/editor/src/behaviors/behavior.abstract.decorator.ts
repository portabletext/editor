import {isActiveDecorator} from '../selectors/selector.is-active-decorator'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDecoratorBehaviors = [
  defineBehavior({
    name: 'decoratorToggleRemove',
    on: 'decorator.toggle',
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

      return isActiveDecorator(event.decorator)(adjustedSnapshot)
    },
    actions: [
      ({event}) => [
        raise({
          type: 'decorator.remove',
          decorator: event.decorator,
          at: event.at,
        }),
      ],
    ],
  }),
  defineBehavior({
    name: 'decoratorToggleAdd',
    on: 'decorator.toggle',
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

      return !isActiveDecorator(event.decorator)(adjustedSnapshot)
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
