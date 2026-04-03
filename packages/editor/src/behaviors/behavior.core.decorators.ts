import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'
import {isDecoratorAllowedByStyle} from './behavior.utils.style-feature-allowed'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.strong.guard(event.originEvent) &&
      isDecoratorShortcutAllowed(snapshot, 'strong'),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.em.guard(event.originEvent) &&
      isDecoratorShortcutAllowed(snapshot, 'em'),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.underline.guard(event.originEvent) &&
      isDecoratorShortcutAllowed(snapshot, 'underline'),
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.decorators.code.guard(event.originEvent) &&
      isDecoratorShortcutAllowed(snapshot, 'code'),
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}

function isDecoratorShortcutAllowed(
  snapshot: EditorSnapshot,
  decoratorName: string,
): boolean {
  if (
    !snapshot.context.schema.decorators.some(
      (decorator) => decorator.name === decoratorName,
    )
  ) {
    return false
  }
  if (!getFocusTextBlock(snapshot)) {
    return false
  }
  return isDecoratorAllowedByStyle(snapshot, decoratorName)
}
