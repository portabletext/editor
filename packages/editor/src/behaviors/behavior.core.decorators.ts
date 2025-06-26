import {defaultKeyboardShortcuts} from '../keyboard-shortcuts/default-keyboard-shortcuts'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.strong.guard(event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'strong',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.em.guard(event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'em',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.underline.guard(event.originEvent) &&
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
      defaultKeyboardShortcuts.decorators.code.guard(event.originEvent) &&
      snapshot.context.schema.decorators.some(
        (decorator) => decorator.name === 'code',
      ),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
