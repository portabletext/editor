import {isHotkey} from '../internal-utils/is-hotkey'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      isHotkey('mod+b', event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'strong',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      isHotkey('mod+i', event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'em',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      isHotkey('mod+u', event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'underline',
      ),
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      isHotkey("mod+'", event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'code',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
