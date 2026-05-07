import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getUnionSchema} from '../traversal/get-union-schema'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (
        !defaultKeyboardShortcuts.decorators.strong.guard(event.originEvent)
      ) {
        return false
      }
      return getUnionSchema(
        snapshot.context.schema,
        snapshot.context.containers,
      ).decorators.some((d) => d.name === 'strong')
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.decorators.em.guard(event.originEvent)) {
        return false
      }
      return getUnionSchema(
        snapshot.context.schema,
        snapshot.context.containers,
      ).decorators.some((d) => d.name === 'em')
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (
        !defaultKeyboardShortcuts.decorators.underline.guard(event.originEvent)
      ) {
        return false
      }
      return getUnionSchema(
        snapshot.context.schema,
        snapshot.context.containers,
      ).decorators.some((d) => d.name === 'underline')
    },
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.decorators.code.guard(event.originEvent)) {
        return false
      }
      return getUnionSchema(
        snapshot.context.schema,
        snapshot.context.containers,
      ).decorators.some((d) => d.name === 'code')
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
