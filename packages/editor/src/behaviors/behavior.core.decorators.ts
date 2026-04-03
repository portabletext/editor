import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const coreDecoratorBehaviors = {
  strongShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.decorators.strong.guard(event.originEvent))
        return false
      if (
        !snapshot.context.schema.decorators.some(
          (decorator) => decorator.name === 'strong',
        )
      ) {
        return false
      }
      const focusTextBlock = getFocusTextBlock(snapshot)
      if (!focusTextBlock) return false
      const style = focusTextBlock.node.style
      const styleType = style
        ? snapshot.context.schema.styles.find((s) => s.name === style)
        : undefined
      if (
        styleType?.decorators &&
        !styleType.decorators.some((d) => d.name === 'strong')
      ) {
        return false
      }
      return true
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'strong'})]],
  }),
  emShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.decorators.em.guard(event.originEvent))
        return false
      if (
        !snapshot.context.schema.decorators.some(
          (decorator) => decorator.name === 'em',
        )
      ) {
        return false
      }
      const focusTextBlock = getFocusTextBlock(snapshot)
      if (!focusTextBlock) return false
      const style = focusTextBlock.node.style
      const styleType = style
        ? snapshot.context.schema.styles.find((s) => s.name === style)
        : undefined
      if (
        styleType?.decorators &&
        !styleType.decorators.some((d) => d.name === 'em')
      ) {
        return false
      }
      return true
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'em'})]],
  }),
  underlineShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (
        !defaultKeyboardShortcuts.decorators.underline.guard(event.originEvent)
      )
        return false
      if (
        !snapshot.context.schema.decorators.some(
          (decorator) => decorator.name === 'underline',
        )
      ) {
        return false
      }
      const focusTextBlock = getFocusTextBlock(snapshot)
      if (!focusTextBlock) return false
      const style = focusTextBlock.node.style
      const styleType = style
        ? snapshot.context.schema.styles.find((s) => s.name === style)
        : undefined
      if (
        styleType?.decorators &&
        !styleType.decorators.some((d) => d.name === 'underline')
      ) {
        return false
      }
      return true
    },
    actions: [
      () => [raise({type: 'decorator.toggle', decorator: 'underline'})],
    ],
  }),
  codeShortcut: defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.decorators.code.guard(event.originEvent))
        return false
      if (
        !snapshot.context.schema.decorators.some(
          (decorator) => decorator.name === 'code',
        )
      ) {
        return false
      }
      const focusTextBlock = getFocusTextBlock(snapshot)
      if (!focusTextBlock) return false
      const style = focusTextBlock.node.style
      const styleType = style
        ? snapshot.context.schema.styles.find((s) => s.name === style)
        : undefined
      if (
        styleType?.decorators &&
        !styleType.decorators.some((d) => d.name === 'code')
      ) {
        return false
      }
      return true
    },
    actions: [() => [raise({type: 'decorator.toggle', decorator: 'code'})]],
  }),
}
