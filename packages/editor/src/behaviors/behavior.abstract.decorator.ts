import {isActiveDecorator} from '../selectors'
import {blockOffsetsToSelection} from '../utils'
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
      const manualSelection = event.offsets
        ? blockOffsetsToSelection({
            value: snapshot.context.value,
            offsets: event.offsets,
          })
        : null

      if (manualSelection) {
        return !isActiveDecorator(event.decorator)({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: manualSelection,
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
