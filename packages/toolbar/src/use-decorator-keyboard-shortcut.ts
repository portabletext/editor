import {useEditor, type DecoratorDefinition} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useEffect} from 'react'

/**
 * @beta
 * Registers a keyboard shortcut for a decorator.
 */
export function useDecoratorKeyboardShortcut(props: {
  definition: Pick<DecoratorDefinition, 'name'> & {
    shortcut?: KeyboardShortcut
  }
}) {
  const editor = useEditor()

  useEffect(() => {
    const shortcut = props.definition.shortcut

    if (!shortcut) {
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => shortcut.guard(event.originEvent),
        actions: [
          () => [
            raise({
              type: 'decorator.toggle',
              decorator: props.definition.name,
            }),
          ],
        ],
      }),
    })
  }, [editor, props.definition.name, props.definition.shortcut])
}
