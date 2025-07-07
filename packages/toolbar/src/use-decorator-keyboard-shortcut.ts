import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import type {ToolbarDecoratorSchemaType} from './use-toolbar-schema'

/**
 * @beta
 * Registers a keyboard shortcut for a decorator.
 */
export function useDecoratorKeyboardShortcut(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const editor = useEditor()

  useEffect(() => {
    const shortcut = props.schemaType.shortcut

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
              decorator: props.schemaType.name,
            }),
          ],
        ],
      }),
    })
  }, [editor, props.schemaType.name, props.schemaType.shortcut])
}
