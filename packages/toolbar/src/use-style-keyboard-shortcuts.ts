import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import type {ToolbarStyleSchemaType} from './use-toolbar-schema'

/**
 * @beta
 * Registers keyboard shortcuts for a set of style schema types.
 */
export function useStyleKeyboardShortcuts(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = props.schemaTypes.flatMap((schemaType) => {
      const shortcut = schemaType.shortcut

      if (!shortcut) {
        return []
      }

      return [
        editor.registerBehavior({
          behavior: defineBehavior({
            on: 'keyboard.keydown',
            guard: ({event}) => shortcut.guard(event.originEvent),
            actions: [
              () => [raise({type: 'style.toggle', style: schemaType.name})],
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
  }, [editor, props.schemaTypes])
}
