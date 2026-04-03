import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isActiveDecorator} from '../selectors/selector.is-active-decorator'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDecoratorBehaviors = [
  defineBehavior({
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
    on: 'decorator.toggle',
    guard: ({snapshot, event}) => {
      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)
      if (focusTextBlock) {
        const style = focusTextBlock.node.style
        const styleType = style
          ? snapshot.context.schema.styles.find((s) => s.name === style)
          : undefined
        if (
          styleType?.decorators &&
          !styleType.decorators.some((d) => d.name === event.decorator)
        ) {
          return false
        }
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
