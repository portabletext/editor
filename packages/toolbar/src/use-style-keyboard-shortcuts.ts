import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import type {ToolbarStyleDefinition} from './toolbar-schema-definition'

/**
 * @beta
 * Registers keyboard shortcuts for a set of style definitions.
 */
export function useStyleKeyboardShortcuts(props: {
  definitions: ReadonlyArray<ToolbarStyleDefinition>
}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = props.definitions.flatMap((definition) => {
      const shortcut = definition.shortcut

      if (!shortcut) {
        return []
      }

      return [
        editor.registerBehavior({
          behavior: defineBehavior({
            on: 'keyboard.keydown',
            guard: ({event}) => shortcut.guard(event.originEvent),
            actions: [
              () => [raise({type: 'style.toggle', style: definition.name})],
            ],
          }),
        }),
      ]
    })

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor, props.definitions])
}
