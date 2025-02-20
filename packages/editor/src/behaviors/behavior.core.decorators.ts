import {isHotkey} from '../internal-utils/is-hotkey'
import {defineBehavior, raise} from './behavior.types'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'key.down',
    guard: ({snapshot, event}) =>
      isHotkey('mod+b', event.keyboardEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.value === 'strong',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'key.down',
    guard: ({snapshot, event}) =>
      isHotkey('mod+i', event.keyboardEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.value === 'em',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'key.down',
    guard: ({snapshot, event}) =>
      isHotkey('mod+u', event.keyboardEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.value === 'underline',
      ),
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'key.down',
    guard: ({snapshot, event}) =>
      isHotkey("mod+'", event.keyboardEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.value === 'code',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
