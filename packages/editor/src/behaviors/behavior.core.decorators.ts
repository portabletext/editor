import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

export const coreDecoratorBehaviors = {
  toggleDecoratorOff: defineBehavior({
    on: 'decorator.toggle',
    guard: ({context, event}) =>
      selectors.isActiveDecorator(event.decorator)({context}),
    actions: [
      ({event}) => [
        raise({type: 'decorator.remove', decorator: event.decorator}),
      ],
    ],
  }),
  toggleDecoratorOn: defineBehavior({
    on: 'decorator.toggle',
    guard: ({context, event}) =>
      !selectors.isActiveDecorator(event.decorator)({context}),
    actions: [
      ({event}) => [raise({type: 'decorator.add', decorator: event.decorator})],
    ],
  }),
  strongShortcut: defineBehavior({
    on: 'key.down',
    guard: ({context, event}) =>
      isHotkey('mod+b', event.keyboardEvent) &&
      context.schema.decorators.some(
        (decorator) => decorator.value === 'strong',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'key.down',
    guard: ({context, event}) =>
      isHotkey('mod+i', event.keyboardEvent) &&
      context.schema.decorators.some((decorator) => decorator.value === 'em'),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'key.down',
    guard: ({context, event}) =>
      isHotkey('mod+u', event.keyboardEvent) &&
      context.schema.decorators.some(
        (decorator) => decorator.value === 'underline',
      ),
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'key.down',
    guard: ({context, event}) =>
      isHotkey("mod+'", event.keyboardEvent) &&
      context.schema.decorators.some((decorator) => decorator.value === 'code'),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
