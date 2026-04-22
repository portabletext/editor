import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {isAvailableDecorator} from '../selectors/selector.is-available-decorator'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.strong.guard(event.originEvent) &&
      isAvailableDecorator('strong')(snapshot),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.em.guard(event.originEvent) &&
      isAvailableDecorator('em')(snapshot),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.underline.guard(event.originEvent) &&
      isAvailableDecorator('underline')(snapshot),
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.code.guard(event.originEvent) &&
      isAvailableDecorator('code')(snapshot),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
